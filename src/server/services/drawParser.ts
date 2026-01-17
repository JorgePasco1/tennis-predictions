import * as cheerio from "cheerio";

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
 * This parser needs to be tested with actual ATP files and adjusted accordingly
 */
export function parseAtpDraw(htmlContent: string): ParsedDraw {
	const $ = cheerio.load(htmlContent);

	// Try to extract tournament name from title or h1
	let tournamentName = $("title").text().trim();
	if (!tournamentName) {
		tournamentName = $("h1").first().text().trim();
	}
	if (!tournamentName) {
		tournamentName = "Unknown Tournament";
	}

	// Clean up tournament name (remove "- Singles Draw" or similar suffixes)
	tournamentName = tournamentName
		.replace(/\s*-\s*(Men's\s+)?Singles(\s+Draw)?.*$/i, "")
		.trim();

	const rounds: ParsedRound[] = [];

	// Standard ATP tournament rounds for a 128-player draw (Grand Slam)
	// Adjust based on actual tournament size
	const roundNames = [
		"First Round",
		"Second Round",
		"Third Round",
		"Fourth Round",
		"Quarterfinals",
		"Semifinals",
		"Final",
	];

	// This is a placeholder parser structure
	// The actual selectors will need to be adjusted based on real ATP HTML structure
	// Common patterns to look for:
	// - Tables with match data
	// - Divs with player names
	// - Sections organized by round

	// Try to find draw sections
	const drawSections = $(".draw-section, .round, [class*='round']");

	if (drawSections.length > 0) {
		// Parse each round section
		drawSections.each((roundIndex, roundElement) => {
			const matches: ParsedMatch[] = [];
			const $round = $(roundElement);

			// Try to find matches within this round
			const matchElements = $round.find(
				".match, [class*='match'], tr:has(td:contains)",
			);

			let matchNumber = 1;
			matchElements.each((_, matchElement) => {
				const $match = $(matchElement);

				// Try to extract player names and seeds
				// This is a generic approach - adjust based on actual HTML structure
				const playerElements = $match.find(
					".player, [class*='player'], td",
				);

				if (playerElements.length >= 2) {
					const player1Text = $(playerElements[0]).text().trim();
					const player2Text = $(playerElements[1]).text().trim();

					// Extract seed numbers (usually in parentheses or brackets)
					const { name: player1Name, seed: player1Seed } =
						extractPlayerInfo(player1Text);
					const { name: player2Name, seed: player2Seed } =
						extractPlayerInfo(player2Text);

					if (player1Name && player2Name) {
						matches.push({
							matchNumber: matchNumber++,
							player1Name,
							player2Name,
							player1Seed,
							player2Seed,
						});
					}
				}
			});

			if (matches.length > 0) {
				rounds.push({
					roundNumber: roundIndex + 1,
					name: roundNames[roundIndex] ?? `Round ${roundIndex + 1}`,
					matches,
				});
			}
		});
	} else {
		// Fallback: try to parse a simple table structure
		const tables = $("table");

		tables.each((tableIndex, table) => {
			const $table = $(table);
			const matches: ParsedMatch[] = [];
			let matchNumber = 1;

			$table.find("tr").each((_, row) => {
				const $row = $(row);
				const cells = $row.find("td");

				if (cells.length >= 2) {
					const player1Text = $(cells[0]).text().trim();
					const player2Text = $(cells[1]).text().trim();

					const { name: player1Name, seed: player1Seed } =
						extractPlayerInfo(player1Text);
					const { name: player2Name, seed: player2Seed } =
						extractPlayerInfo(player2Text);

					if (player1Name && player2Name) {
						matches.push({
							matchNumber: matchNumber++,
							player1Name,
							player2Name,
							player1Seed,
							player2Seed,
						});
					}
				}
			});

			if (matches.length > 0) {
				rounds.push({
					roundNumber: tableIndex + 1,
					name: roundNames[tableIndex] ?? `Round ${tableIndex + 1}`,
					matches,
				});
			}
		});
	}

	return {
		tournamentName,
		rounds,
	};
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
