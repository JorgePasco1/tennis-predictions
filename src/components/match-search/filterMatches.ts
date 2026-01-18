/**
 * Filter matches by player name (case-insensitive)
 */
export function filterMatchesByPlayerName<
	T extends { player1Name: string; player2Name: string },
>(matches: T[], searchQuery: string): T[] {
	if (!searchQuery.trim()) return matches;

	const query = searchQuery.toLowerCase();
	return matches.filter(
		(match) =>
			match.player1Name.toLowerCase().includes(query) ||
			match.player2Name.toLowerCase().includes(query),
	);
}
