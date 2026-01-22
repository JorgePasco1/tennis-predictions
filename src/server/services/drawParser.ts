import * as cheerio from "cheerio";
import { decodeMhtml } from "./mhtmlDecoder";

export interface ParsedMatch {
	matchNumber: number;
	player1Name: string;
	player2Name: string;
	player1Seed: number | null;
	player2Seed: number | null;
	// Optional match result fields (only present if match is completed)
	winnerName?: string;
	setsWon?: number;
	setsLost?: number;
	finalScore?: string;
}

/**
 * Sanitize text extracted from HTML to ensure it's safe for JSON serialization
 * Removes control characters, normalizes whitespace, and handles special characters
 */
function sanitizeText(text: string): string {
	if (!text) return "";

	return (
		text
			// Remove null bytes and other problematic control characters
			.replace(/\x00/g, "")
			// Remove other control characters except newlines and tabs (which we'll handle next)
			.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
			// Replace newlines and tabs with spaces
			.replace(/[\n\r\t]/g, " ")
			// Replace multiple spaces with a single space
			.replace(/\s+/g, " ")
			// Remove any remaining invisible or zero-width characters
			.replace(/[\u200B-\u200D\uFEFF]/g, "")
			// Remove backslashes that could cause JSON issues
			.replace(/\\/g, "")
			// Replace any other potentially problematic characters
			.replace(/[\uFFFD\uFFFE\uFFFF]/g, "") // Replacement character and non-characters
			// Trim whitespace
			.trim()
	);
}

export interface ParsedRound {
	roundNumber: number;
	name: string;
	matches: ParsedMatch[];
}

export interface ParsedDraw {
	tournamentName: string;
	rounds: ParsedRound[];
}

/**
 * Parse ATP draw HTML/MHTML content
 * Supports the official ATP Tour website draw format
 */
export function parseAtpDraw(htmlOrMhtmlContent: string): ParsedDraw {
	// Decode MHTML if needed
	const htmlContent = decodeMhtml(htmlOrMhtmlContent);

	const $ = cheerio.load(htmlContent);

	// Extract tournament name from title
	let tournamentName = sanitizeText($("title").text());

	// Clean up tournament name (remove "| Draws | ATP Tour | Tennis" suffix)
	tournamentName = tournamentName.replace(/\s*\|.*$/i, "").trim();

	if (!tournamentName || tournamentName === "") {
		tournamentName = "Unknown Tournament";
	}

	const rounds: ParsedRound[] = [];

	// ATP website uses class="draw draw-round-1", "draw draw-round-2", etc.
	// Find all round containers by looking for elements with classes starting with "draw-round-"
	// We need to select by multiple class names as cheerio's [class*=] doesn't work as expected
	const allDivs = $("div[class]");
	const roundElements = allDivs.toArray().filter((el) => {
		const className = $(el).attr("class") || "";
		// Only match divs that start with "draw draw-round-" to avoid nested elements
		return /^draw draw-round-\d+/.test(className);
	});

	if (roundElements.length === 0) {
		// No rounds found
		return {
			tournamentName,
			rounds: [],
		};
	}

	for (let roundIndex = 0; roundIndex < roundElements.length; roundIndex++) {
		const roundElement = roundElements[roundIndex];
		if (!roundElement) continue;

		const $round = $(roundElement);

		// Get round name from draw-header
		const roundName =
			sanitizeText($round.find(".draw-header").text()) ||
			`Round ${roundIndex + 1}`;

		// Find all matches in this round (each draw-item is a match)
		const matchItems = $round.find(".draw-item");
		const matches: ParsedMatch[] = [];

		matchItems.each((matchIndex, matchElement) => {
			const $match = $(matchElement);

			// Each match has two stats-item elements (one for each player)
			const playerElements = $match.find(".stats-item");

			if (playerElements.length >= 2) {
				// Parse player 1
				const $player1 = $(playerElements[0]);
				const player1Info = parsePlayerFromStatsItem($player1);

				// Parse player 2
				const $player2 = $(playerElements[1]);
				const player2Info = parsePlayerFromStatsItem($player2);

				// Include all matches - empty player names will be normalized to "TBD" during commit
				// This ensures complete bracket structure even when players haven't advanced yet
				// Check for match completion and extract scores
				const $player1Winner = $player1.find(".player-info .winner");
				const $player2Winner = $player2.find(".player-info .winner");

				const hasWinner =
					$player1Winner.length > 0 || $player2Winner.length > 0;
				let matchResult: {
					winnerName?: string;
					setsWon?: number;
					setsLost?: number;
					finalScore?: string;
				} | null = null;

				if (hasWinner) {
					// Extract scores
					const scores = extractMatchScores($player1, $player2);

					if (scores) {
						// Determine winner (player with .winner div)
						const isPlayer1Winner = $player1Winner.length > 0;
						const winnerName = isPlayer1Winner
							? player1Info.name
							: player2Info.name;
						const setsWon = isPlayer1Winner
							? scores.player1SetsWon
							: scores.player2SetsWon;
						const setsLost = isPlayer1Winner
							? scores.player2SetsWon
							: scores.player1SetsWon;
						const finalScore = `${setsWon}-${setsLost}`;

						matchResult = {
							winnerName,
							setsWon,
							setsLost,
							finalScore,
						};
					}
				}

				// Create match object with optional result fields
				const match: ParsedMatch = {
					matchNumber: matchIndex + 1,
					player1Name: player1Info.name,
					player2Name: player2Info.name,
					player1Seed: player1Info.seed,
					player2Seed: player2Info.seed,
					...(matchResult && {
						winnerName: matchResult.winnerName,
						setsWon: matchResult.setsWon,
						setsLost: matchResult.setsLost,
						finalScore: matchResult.finalScore,
					}),
				};

				matches.push(match);
			}
		});

		if (matches.length > 0) {
			rounds.push({
				roundNumber: roundIndex + 1,
				name: roundName,
				matches,
			});
		}
	}

	return {
		tournamentName,
		rounds,
	};
}

/**
 * Parse player information from a stats-item element
 */
function parsePlayerFromStatsItem($statsItem: cheerio.Cheerio<any>): {
	name: string;
	seed: number | null;
} {
	// Find the player name element
	const $nameDiv = $statsItem.find(".player-info .name");

	if ($nameDiv.length === 0) {
		return { name: "", seed: null };
	}

	// Get the player name from the link text
	const $link = $nameDiv.find("a");
	const name = sanitizeText($link.text());

	// Get the seed from the span (if exists)
	const $seedSpan = $nameDiv.find("span");
	let seed: number | null = null;

	if ($seedSpan.length > 0) {
		const seedText = sanitizeText($seedSpan.text());
		// Seed is in format "(1)" or "(32)"
		const seedMatch = seedText.match(/\((\d+)\)/);
		if (seedMatch?.[1]) {
			seed = Number.parseInt(seedMatch[1], 10);
		}
	}

	return { name, seed };
}

interface MatchScores {
	player1Sets: number[];
	player2Sets: number[];
	player1SetsWon: number;
	player2SetsWon: number;
}

/**
 * Extract set scores from a match's score divs
 * Returns set counts and winner information
 */
function extractMatchScores(
	$player1Stat: cheerio.Cheerio<any>,
	$player2Stat: cheerio.Cheerio<any>,
): MatchScores | null {
	const $player1Scores = $player1Stat.find(".scores .score-item");
	const $player2Scores = $player2Stat.find(".scores .score-item");

	// If no score divs, match hasn't been played
	if ($player1Scores.length === 0 || $player2Scores.length === 0) {
		return null;
	}

	const player1Sets: number[] = [];
	const player2Sets: number[] = [];
	let player1SetsWon = 0;
	let player2SetsWon = 0;

	// Parse each set
	$player1Scores.each((i, elem) => {
		const $player1SetDiv = cheerio.load(elem);
		const $player1Spans = $player1SetDiv("span");

		// First span = main score, second span = tiebreak score (if present)
		const player1Score = sanitizeText($player1Spans.eq(0).text());

		// Get player 2's corresponding score
		const $player2SetDiv = $player2Scores.eq(i);
		const player2Score = sanitizeText($player2SetDiv.find("span").eq(0).text());

		// Empty scores mean match not played yet
		if (!player1Score || !player2Score) {
			return; // Skip this set
		}

		const p1 = Number.parseInt(player1Score, 10);
		const p2 = Number.parseInt(player2Score, 10);

		if (!Number.isNaN(p1) && !Number.isNaN(p2)) {
			player1Sets.push(p1);
			player2Sets.push(p2);

			// Determine who won this set (higher score wins, or 7-6 for tiebreak)
			if (p1 > p2) {
				player1SetsWon++;
			} else if (p2 > p1) {
				player2SetsWon++;
			}
		}
	});

	// If no valid sets parsed, return null
	if (player1Sets.length === 0) {
		return null;
	}

	return {
		player1Sets,
		player2Sets,
		player1SetsWon,
		player2SetsWon,
	};
}

/**
 * Validate parsed draw structure
 */
export function validateParsedDraw(draw: ParsedDraw): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!draw.tournamentName || draw.tournamentName === "Unknown Tournament") {
		errors.push("Tournament name could not be extracted");
	}

	if (draw.rounds.length === 0) {
		errors.push("No rounds found in the draw");
	}

	for (const round of draw.rounds) {
		if (round.matches.length === 0) {
			errors.push(`Round ${round.roundNumber} has no matches`);
		}

		// Empty player names are allowed - they will be filled with "TBD" during commit
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
