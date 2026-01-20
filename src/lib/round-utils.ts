/**
 * Maps round names to ATP-style abbreviations
 *
 * @param roundName - The full round name (e.g., "Round of 128", "Semi Finals")
 * @param roundNumber - The round number as fallback
 * @returns Short abbreviation (e.g., "R128", "QF", "F")
 */
export function getRoundAbbreviation(
	roundName: string,
	roundNumber: number,
): string {
	const roundMap: Record<string, string> = {
		"Round of 128": "R128",
		"Round of 64": "R64",
		"Round of 32": "R32",
		"Round of 16": "R16",
		"Quarter Finals": "QF",
		"Semi Finals": "SF",
		Final: "F",
	};

	return roundMap[roundName] ?? `R${roundNumber}`;
}
