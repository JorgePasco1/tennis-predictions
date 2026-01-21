/**
 * Bracket Test Fixtures
 *
 * Test data specifically for bracket component and functionality testing.
 */

import type { MatchData, RoundData } from "~/components/bracket/bracket-types";

// =============================================================================
// Match Data Fixtures
// =============================================================================

/**
 * Creates a basic pending match without user picks
 */
export function createPendingMatch(overrides: Partial<MatchData> = {}): MatchData {
	return {
		id: 1,
		matchNumber: 1,
		player1Name: "Novak Djokovic",
		player2Name: "Dino Prizmic",
		player1Seed: 1,
		player2Seed: null,
		status: "pending",
		winnerName: null,
		finalScore: null,
		isRetirement: false,
		userPick: null,
		...overrides,
	};
}

/**
 * Creates a finalized match with a winner
 */
export function createFinalizedMatch(overrides: Partial<MatchData> = {}): MatchData {
	return {
		id: 2,
		matchNumber: 2,
		player1Name: "Carlos Alcaraz",
		player2Name: "Richard Gasquet",
		player1Seed: 2,
		player2Seed: null,
		status: "finalized",
		winnerName: "Carlos Alcaraz",
		finalScore: "3-0",
		isRetirement: false,
		userPick: null,
		...overrides,
	};
}

/**
 * Creates a match that ended in retirement
 */
export function createRetirementMatch(overrides: Partial<MatchData> = {}): MatchData {
	return {
		id: 3,
		matchNumber: 3,
		player1Name: "Rafael Nadal",
		player2Name: "Alexander Zverev",
		player1Seed: 3,
		player2Seed: 4,
		status: "finalized",
		winnerName: "Alexander Zverev",
		finalScore: "2-1",
		isRetirement: true,
		userPick: null,
		...overrides,
	};
}

/**
 * Creates a match with user pick that was correct
 */
export function createMatchWithCorrectPick(overrides: Partial<MatchData> = {}): MatchData {
	return {
		id: 4,
		matchNumber: 4,
		player1Name: "Jannik Sinner",
		player2Name: "Andrey Rublev",
		player1Seed: 4,
		player2Seed: 5,
		status: "finalized",
		winnerName: "Jannik Sinner",
		finalScore: "3-1",
		isRetirement: false,
		userPick: {
			predictedWinner: "Jannik Sinner",
			predictedSetsWon: 3,
			predictedSetsLost: 1,
			isWinnerCorrect: true,
			isExactScore: true,
			pointsEarned: 15,
		},
		...overrides,
	};
}

/**
 * Creates a match with user pick that was wrong
 */
export function createMatchWithWrongPick(overrides: Partial<MatchData> = {}): MatchData {
	return {
		id: 5,
		matchNumber: 5,
		player1Name: "Daniil Medvedev",
		player2Name: "Stefanos Tsitsipas",
		player1Seed: 6,
		player2Seed: 7,
		status: "finalized",
		winnerName: "Stefanos Tsitsipas",
		finalScore: "3-2",
		isRetirement: false,
		userPick: {
			predictedWinner: "Daniil Medvedev",
			predictedSetsWon: 3,
			predictedSetsLost: 0,
			isWinnerCorrect: false,
			isExactScore: false,
			pointsEarned: 0,
		},
		...overrides,
	};
}

/**
 * Creates a match with pending user pick (not yet finalized)
 */
export function createMatchWithPendingPick(overrides: Partial<MatchData> = {}): MatchData {
	return {
		id: 6,
		matchNumber: 6,
		player1Name: "Holger Rune",
		player2Name: "Taylor Fritz",
		player1Seed: 8,
		player2Seed: 9,
		status: "pending",
		winnerName: null,
		finalScore: null,
		isRetirement: false,
		userPick: {
			predictedWinner: "Holger Rune",
			predictedSetsWon: 3,
			predictedSetsLost: 2,
			isWinnerCorrect: null,
			isExactScore: null,
			pointsEarned: 0,
		},
		...overrides,
	};
}

/**
 * Creates a match with correct winner but wrong score
 */
export function createMatchWithPartialCorrectPick(overrides: Partial<MatchData> = {}): MatchData {
	return {
		id: 7,
		matchNumber: 7,
		player1Name: "Casper Ruud",
		player2Name: "Alex de Minaur",
		player1Seed: 10,
		player2Seed: null,
		status: "finalized",
		winnerName: "Casper Ruud",
		finalScore: "3-0",
		isRetirement: false,
		userPick: {
			predictedWinner: "Casper Ruud",
			predictedSetsWon: 3,
			predictedSetsLost: 2,
			isWinnerCorrect: true,
			isExactScore: false,
			pointsEarned: 10,
		},
		...overrides,
	};
}

// =============================================================================
// Round Data Fixtures
// =============================================================================

/**
 * Creates an empty round (no matches)
 */
export function createEmptyRound(overrides: Partial<RoundData> = {}): RoundData {
	return {
		id: 1,
		name: "Round of 128",
		roundNumber: 1,
		isFinalized: false,
		isActive: true,
		matches: [],
		...overrides,
	};
}

/**
 * Creates a round with pending matches
 */
export function createActiveRound(overrides: Partial<RoundData> = {}): RoundData {
	return {
		id: 2,
		name: "Round of 64",
		roundNumber: 2,
		isFinalized: false,
		isActive: true,
		matches: [
			createPendingMatch({ id: 10, matchNumber: 1 }),
			createPendingMatch({ id: 11, matchNumber: 2, player1Name: "Player A", player2Name: "Player B" }),
			createPendingMatch({ id: 12, matchNumber: 3, player1Name: "Player C", player2Name: "Player D" }),
			createPendingMatch({ id: 13, matchNumber: 4, player1Name: "Player E", player2Name: "Player F" }),
		],
		...overrides,
	};
}

/**
 * Creates a finalized round
 */
export function createFinalizedRound(overrides: Partial<RoundData> = {}): RoundData {
	return {
		id: 3,
		name: "Round of 32",
		roundNumber: 3,
		isFinalized: true,
		isActive: false,
		matches: [
			createFinalizedMatch({ id: 20, matchNumber: 1 }),
			createFinalizedMatch({ id: 21, matchNumber: 2, player1Name: "Winner A", player2Name: "Winner B", winnerName: "Winner A" }),
		],
		...overrides,
	};
}

/**
 * Creates a round with mixed match states
 */
export function createMixedRound(overrides: Partial<RoundData> = {}): RoundData {
	return {
		id: 4,
		name: "Quarter Finals",
		roundNumber: 4,
		isFinalized: false,
		isActive: true,
		matches: [
			createFinalizedMatch({ id: 30, matchNumber: 1 }),
			createMatchWithCorrectPick({ id: 31, matchNumber: 2 }),
			createMatchWithWrongPick({ id: 32, matchNumber: 3 }),
			createPendingMatch({ id: 33, matchNumber: 4 }),
		],
		...overrides,
	};
}

// =============================================================================
// Full Tournament Bracket Fixtures
// =============================================================================

/**
 * Creates a complete tournament bracket with all rounds
 */
export function createFullTournamentBracket(): RoundData[] {
	return [
		{
			id: 1,
			name: "Round of 128",
			roundNumber: 1,
			isFinalized: true,
			isActive: false,
			matches: Array.from({ length: 64 }, (_, i) =>
				createFinalizedMatch({
					id: 100 + i,
					matchNumber: i + 1,
					player1Name: `Player ${i * 2 + 1}`,
					player2Name: `Player ${i * 2 + 2}`,
					winnerName: `Player ${i * 2 + 1}`,
				})
			),
		},
		{
			id: 2,
			name: "Round of 64",
			roundNumber: 2,
			isFinalized: true,
			isActive: false,
			matches: Array.from({ length: 32 }, (_, i) =>
				createFinalizedMatch({
					id: 200 + i,
					matchNumber: i + 1,
					player1Name: `Winner R1-${i * 2 + 1}`,
					player2Name: `Winner R1-${i * 2 + 2}`,
					winnerName: `Winner R1-${i * 2 + 1}`,
				})
			),
		},
		{
			id: 3,
			name: "Round of 32",
			roundNumber: 3,
			isFinalized: true,
			isActive: false,
			matches: Array.from({ length: 16 }, (_, i) =>
				createFinalizedMatch({
					id: 300 + i,
					matchNumber: i + 1,
				})
			),
		},
		{
			id: 4,
			name: "Round of 16",
			roundNumber: 4,
			isFinalized: true,
			isActive: false,
			matches: Array.from({ length: 8 }, (_, i) =>
				createFinalizedMatch({
					id: 400 + i,
					matchNumber: i + 1,
				})
			),
		},
		{
			id: 5,
			name: "Quarter Finals",
			roundNumber: 5,
			isFinalized: false,
			isActive: true,
			matches: [
				createPendingMatch({ id: 501, matchNumber: 1 }),
				createPendingMatch({ id: 502, matchNumber: 2, player1Name: "QF Player 3", player2Name: "QF Player 4" }),
				createPendingMatch({ id: 503, matchNumber: 3, player1Name: "QF Player 5", player2Name: "QF Player 6" }),
				createPendingMatch({ id: 504, matchNumber: 4, player1Name: "QF Player 7", player2Name: "QF Player 8" }),
			],
		},
		{
			id: 6,
			name: "Semi Finals",
			roundNumber: 6,
			isFinalized: false,
			isActive: false,
			matches: [
				createPendingMatch({ id: 601, matchNumber: 1, player1Name: "TBD", player2Name: "TBD" }),
				createPendingMatch({ id: 602, matchNumber: 2, player1Name: "TBD", player2Name: "TBD" }),
			],
		},
		{
			id: 7,
			name: "Final",
			roundNumber: 7,
			isFinalized: false,
			isActive: false,
			matches: [
				createPendingMatch({ id: 701, matchNumber: 1, player1Name: "TBD", player2Name: "TBD" }),
			],
		},
	];
}

/**
 * Creates a small bracket for simple testing
 */
export function createSmallBracket(): RoundData[] {
	return [
		{
			id: 1,
			name: "Semi Finals",
			roundNumber: 1,
			isFinalized: true,
			isActive: false,
			matches: [
				createFinalizedMatch({ id: 1, matchNumber: 1, player1Name: "Player A", player2Name: "Player B", winnerName: "Player A" }),
				createFinalizedMatch({ id: 2, matchNumber: 2, player1Name: "Player C", player2Name: "Player D", winnerName: "Player D" }),
			],
		},
		{
			id: 2,
			name: "Final",
			roundNumber: 2,
			isFinalized: false,
			isActive: true,
			matches: [
				createPendingMatch({ id: 3, matchNumber: 1, player1Name: "Player A", player2Name: "Player D" }),
			],
		},
	];
}

/**
 * Creates a bracket with user picks for testing scoring display
 */
export function createBracketWithPicks(): RoundData[] {
	return [
		{
			id: 1,
			name: "Round of 16",
			roundNumber: 1,
			isFinalized: true,
			isActive: false,
			matches: [
				createMatchWithCorrectPick({ id: 1, matchNumber: 1 }),
				createMatchWithWrongPick({ id: 2, matchNumber: 2 }),
				createMatchWithPartialCorrectPick({ id: 3, matchNumber: 3 }),
				createRetirementMatch({ id: 4, matchNumber: 4 }),
			],
		},
		{
			id: 2,
			name: "Quarter Finals",
			roundNumber: 2,
			isFinalized: false,
			isActive: true,
			matches: [
				createMatchWithPendingPick({ id: 5, matchNumber: 1 }),
				createPendingMatch({ id: 6, matchNumber: 2 }),
			],
		},
	];
}

// =============================================================================
// Edge Case Fixtures
// =============================================================================

/**
 * Creates a bracket with special character player names
 */
export function createBracketWithSpecialNames(): RoundData[] {
	return [
		{
			id: 1,
			name: "Round 1",
			roundNumber: 1,
			isFinalized: false,
			isActive: true,
			matches: [
				createPendingMatch({
					id: 1,
					matchNumber: 1,
					player1Name: "Gael Monfils",
					player2Name: "Botic van de Zandschulp",
				}),
				createPendingMatch({
					id: 2,
					matchNumber: 2,
					player1Name: "Alejandro Davidovich Fokina",
					player2Name: "Sebastian Ofner",
				}),
				createPendingMatch({
					id: 3,
					matchNumber: 3,
					player1Name: "Joao Sousa",
					player2Name: "Jiri Lehecka",
				}),
			],
		},
	];
}

/**
 * Creates a single round bracket (edge case)
 */
export function createSingleRoundBracket(): RoundData[] {
	return [
		{
			id: 1,
			name: "Final",
			roundNumber: 1,
			isFinalized: false,
			isActive: true,
			matches: [
				createPendingMatch({
					id: 1,
					matchNumber: 1,
					player1Name: "Finalist A",
					player2Name: "Finalist B",
					player1Seed: 1,
					player2Seed: 2,
				}),
			],
		},
	];
}

/**
 * Creates a bracket with odd number of matches
 */
export function createOddMatchesBracket(): RoundData[] {
	return [
		{
			id: 1,
			name: "Round 1",
			roundNumber: 1,
			isFinalized: false,
			isActive: true,
			matches: [
				createPendingMatch({ id: 1, matchNumber: 1 }),
				createPendingMatch({ id: 2, matchNumber: 2, player1Name: "Player C", player2Name: "Player D" }),
				createPendingMatch({ id: 3, matchNumber: 3, player1Name: "Player E", player2Name: "Player F" }),
			],
		},
	];
}

/**
 * Creates matches with various seed configurations
 */
export function createBracketWithSeeds(): RoundData[] {
	return [
		{
			id: 1,
			name: "Round of 16",
			roundNumber: 1,
			isFinalized: false,
			isActive: true,
			matches: [
				createPendingMatch({ id: 1, matchNumber: 1, player1Seed: 1, player2Seed: null }),
				createPendingMatch({ id: 2, matchNumber: 2, player1Seed: 8, player2Seed: 9 }),
				createPendingMatch({ id: 3, matchNumber: 3, player1Seed: null, player2Seed: 5 }),
				createPendingMatch({ id: 4, matchNumber: 4, player1Seed: null, player2Seed: null }),
			],
		},
	];
}

// =============================================================================
// Player Name Formatting Test Cases
// =============================================================================

export const playerNameTestCases = {
	shortNames: [
		{ name: "Novak Djokovic", seed: 1, maxLength: 20, expected: "(1) Novak Djokovic" },
		{ name: "Sinner", seed: null, maxLength: 20, expected: "Sinner" },
	],
	longNames: [
		{
			name: "Alejandro Davidovich Fokina",
			seed: null,
			maxLength: 16,
			expected: "Alejandro David..." // truncated
		},
		{
			name: "Botic van de Zandschulp",
			seed: 15,
			maxLength: 16,
			expected: "(15) Botic van..." // truncated with seed
		},
	],
	specialCharacters: [
		{ name: "Gael Monfils", seed: null, maxLength: 20, expected: "Gael Monfils" },
		{ name: "Joao Sousa", seed: null, maxLength: 20, expected: "Joao Sousa" },
	],
};

// =============================================================================
// Round Abbreviation Test Cases
// =============================================================================

export const roundAbbreviationTestCases = [
	{ roundName: "Round of 128", roundNumber: 1, expected: "R128" },
	{ roundName: "Round of 64", roundNumber: 2, expected: "R64" },
	{ roundName: "Round of 32", roundNumber: 3, expected: "R32" },
	{ roundName: "Round of 16", roundNumber: 4, expected: "R16" },
	{ roundName: "Quarter Finals", roundNumber: 5, expected: "QF" },
	{ roundName: "Semi Finals", roundNumber: 6, expected: "SF" },
	{ roundName: "Final", roundNumber: 7, expected: "F" },
	{ roundName: "Unknown Round", roundNumber: 8, expected: "R8" }, // fallback
];

// =============================================================================
// Match Picks Modal Test Data
// =============================================================================

export const mockMatchPicksModalData = {
	matchWithPicks: {
		match: {
			id: 1,
			matchNumber: 1,
			player1Name: "Novak Djokovic",
			player2Name: "Carlos Alcaraz",
			player1Seed: 1,
			player2Seed: 2,
			winnerName: "Carlos Alcaraz",
			finalScore: "3-2",
			status: "finalized",
			isRetirement: false,
		},
		round: {
			id: 1,
			name: "Final",
		},
		tournament: {
			id: 1,
			name: "Australian Open 2024",
		},
		picks: [
			{
				user: {
					id: "user-1",
					displayName: "John Doe",
					imageUrl: "https://example.com/john.jpg",
				},
				pick: {
					predictedWinner: "Carlos Alcaraz",
					predictedSetsWon: 3,
					predictedSetsLost: 2,
					isWinnerCorrect: true,
					isExactScore: true,
					pointsEarned: 15,
				},
			},
			{
				user: {
					id: "user-2",
					displayName: "Jane Smith",
					imageUrl: null,
				},
				pick: {
					predictedWinner: "Novak Djokovic",
					predictedSetsWon: 3,
					predictedSetsLost: 1,
					isWinnerCorrect: false,
					isExactScore: false,
					pointsEarned: 0,
				},
			},
		],
	},
	matchWithRetirement: {
		match: {
			id: 2,
			matchNumber: 1,
			player1Name: "Rafael Nadal",
			player2Name: "Alexander Zverev",
			player1Seed: 3,
			player2Seed: 4,
			winnerName: "Alexander Zverev",
			finalScore: "2-1",
			status: "finalized",
			isRetirement: true,
		},
		round: {
			id: 1,
			name: "Quarter Finals",
		},
		tournament: {
			id: 1,
			name: "Australian Open 2024",
		},
		picks: [
			{
				user: {
					id: "user-1",
					displayName: "John Doe",
					imageUrl: null,
				},
				pick: {
					predictedWinner: "Rafael Nadal",
					predictedSetsWon: 3,
					predictedSetsLost: 0,
					isWinnerCorrect: false,
					isExactScore: false,
					pointsEarned: 0,
				},
			},
		],
	},
	matchWithNoPicks: {
		match: {
			id: 3,
			matchNumber: 1,
			player1Name: "Jannik Sinner",
			player2Name: "Daniil Medvedev",
			player1Seed: 4,
			player2Seed: 5,
			winnerName: null,
			finalScore: null,
			status: "pending",
			isRetirement: false,
		},
		round: {
			id: 2,
			name: "Semi Finals",
		},
		tournament: {
			id: 1,
			name: "Australian Open 2024",
		},
		picks: [],
	},
};
