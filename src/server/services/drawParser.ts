import * as cheerio from "cheerio";
import { decodeMhtml } from "./mhtmlDecoder";

export interface ParsedMatch {
	matchNumber: number;
	player1Name: string;
	player2Name: string;
	player1Seed: number | null;
	player2Seed: number | null;
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
	let tournamentName = $("title").text().trim();

	// Clean up tournament name (remove "| Draws | ATP Tour | Tennis" suffix)
	tournamentName = tournamentName
		.replace(/\s*\|.*$/i, "")
		.trim();

	if (!tournamentName || tournamentName === "") {
		tournamentName = "Unknown Tournament";
	}

	const rounds: ParsedRound[] = [];

	// ATP website uses class="draw draw-round-1", "draw draw-round-2", etc.
	// Find all round containers by looking for elements with classes starting with "draw-round-"
	// We need to select by multiple class names as cheerio's [class*=] doesn't work as expected
	const allDivs = $("div[class]");
	const roundElements: cheerio.Element[] = [];

	allDivs.each((_, el) => {
		const className = $(el).attr("class") || "";
		// Only match divs that start with "draw draw-round-" to avoid nested elements
		if (/^draw draw-round-\d+/.test(className)) {
			roundElements.push(el);
		}
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
		const roundName = $round.find(".draw-header").text().trim() || `Round ${roundIndex + 1}`;

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
				const player1Info = parsePlayerFromStatsItem($player1, $);

				// Parse player 2
				const $player2 = $(playerElements[1]);
				const player2Info = parsePlayerFromStatsItem($player2, $);

				// Only add if both players have names
				if (player1Info.name && player2Info.name) {
					matches.push({
						matchNumber: matchIndex + 1,
						player1Name: player1Info.name,
						player2Name: player2Info.name,
						player1Seed: player1Info.seed,
						player2Seed: player2Info.seed,
					});
				}
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
function parsePlayerFromStatsItem($statsItem: cheerio.Cheerio, $: cheerio.CheerioAPI): {
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
	let name = $link.text().trim();

	// Get the seed from the span (if exists)
	const $seedSpan = $nameDiv.find("span");
	let seed: number | null = null;

	if ($seedSpan.length > 0) {
		const seedText = $seedSpan.text().trim();
		// Seed is in format "(1)" or "(32)"
		const seedMatch = seedText.match(/\((\d+)\)/);
		if (seedMatch && seedMatch[1]) {
			seed = Number.parseInt(seedMatch[1], 10);
		}
	}

	return { name, seed };
}

/**
 * Extract player name and seed from text like "Novak Djokovic (1)" or "[1] Novak Djokovic"
 */
function extractPlayerInfo(text: string): {
	name: string;
	seed: number | null;
} {
	if (!text) {
		return { name: "", seed: null };
	}

	let name = text;
	let seed: number | null = null;

	// Pattern 1: "Name (Seed)" - e.g., "Novak Djokovic (1)"
	const pattern1 = /^(.+?)\s*\((\d+)\)\s*$/;
	const match1 = text.match(pattern1);
	if (match1) {
		name = match1[1]?.trim() ?? text;
		seed = Number.parseInt(match1[2] ?? "", 10) || null;
		return { name, seed };
	}

	// Pattern 2: "[Seed] Name" - e.g., "[1] Novak Djokovic"
	const pattern2 = /^\[(\d+)\]\s*(.+)$/;
	const match2 = text.match(pattern2);
	if (match2) {
		name = match2[2]?.trim() ?? text;
		seed = Number.parseInt(match2[1] ?? "", 10) || null;
		return { name, seed };
	}

	// Pattern 3: "(Seed) Name" - e.g., "(1) Novak Djokovic"
	const pattern3 = /^\((\d+)\)\s*(.+)$/;
	const match3 = text.match(pattern3);
	if (match3) {
		name = match3[2]?.trim() ?? text;
		seed = Number.parseInt(match3[1] ?? "", 10) || null;
		return { name, seed };
	}

	return { name: name.trim(), seed: null };
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

		for (const match of round.matches) {
			if (!match.player1Name || !match.player2Name) {
				errors.push(
					`Match ${match.matchNumber} in round ${round.roundNumber} is missing player names`,
				);
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
