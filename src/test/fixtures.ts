/**
 * Test Fixtures for Tennis Predictions
 *
 * Realistic test data for tournament predictions testing.
 */

// =============================================================================
// User Fixtures
// =============================================================================

export const mockUsers = {
	admin: {
		id: "user_admin_001",
		clerkId: "user_admin_001",
		email: "admin@test.com",
		displayName: "Test Admin",
		imageUrl: "https://example.com/admin.jpg",
		role: "admin" as const,
		createdAt: new Date("2024-01-01"),
	},
	player1: {
		id: "user_player_001",
		clerkId: "user_player_001",
		email: "player1@test.com",
		displayName: "Test Player 1",
		imageUrl: null,
		role: "user" as const,
		createdAt: new Date("2024-01-15"),
	},
	player2: {
		id: "user_player_002",
		clerkId: "user_player_002",
		email: "player2@test.com",
		displayName: "Test Player 2",
		imageUrl: "https://example.com/player2.jpg",
		role: "user" as const,
		createdAt: new Date("2024-02-01"),
	},
};

// =============================================================================
// Tournament Fixtures
// =============================================================================

export const mockTournaments = {
	australian_open: {
		id: 1,
		name: "Australian Open",
		slug: "australian-open-2024",
		year: 2024,
		format: "bo5" as const,
		atpUrl: "https://www.atptour.com/en/scores/archive/australian-open/2024",
		status: "active" as const,
		currentRoundNumber: 1,
		startDate: new Date("2024-01-14"),
		endDate: new Date("2024-01-28"),
		uploadedBy: mockUsers.admin.id,
		createdAt: new Date("2024-01-01"),
		deletedAt: null,
	},
	wimbledon: {
		id: 2,
		name: "Wimbledon",
		slug: "wimbledon-2024",
		year: 2024,
		format: "bo5" as const,
		atpUrl: null,
		status: "draft" as const,
		currentRoundNumber: null,
		startDate: new Date("2024-07-01"),
		endDate: new Date("2024-07-14"),
		uploadedBy: mockUsers.admin.id,
		createdAt: new Date("2024-06-01"),
		deletedAt: null,
	},
	atp500: {
		id: 3,
		name: "Dubai Tennis Championships",
		slug: "dubai-2024",
		year: 2024,
		format: "bo3" as const,
		atpUrl: null,
		status: "active" as const,
		currentRoundNumber: 1,
		startDate: new Date("2024-02-26"),
		endDate: new Date("2024-03-02"),
		uploadedBy: mockUsers.admin.id,
		createdAt: new Date("2024-02-01"),
		deletedAt: null,
	},
};

// =============================================================================
// Round Fixtures
// =============================================================================

export const mockRounds = {
	ao_r128: {
		id: 1,
		tournamentId: mockTournaments.australian_open.id,
		roundNumber: 1,
		name: "Round of 128",
		isActive: true,
		isFinalized: false,
		createdAt: new Date("2024-01-01"),
	},
	ao_r64: {
		id: 2,
		tournamentId: mockTournaments.australian_open.id,
		roundNumber: 2,
		name: "Round of 64",
		isActive: false,
		isFinalized: false,
		createdAt: new Date("2024-01-01"),
	},
	ao_final: {
		id: 7,
		tournamentId: mockTournaments.australian_open.id,
		roundNumber: 7,
		name: "Final",
		isActive: false,
		isFinalized: false,
		createdAt: new Date("2024-01-01"),
	},
	dubai_r32: {
		id: 10,
		tournamentId: mockTournaments.atp500.id,
		roundNumber: 1,
		name: "Round of 32",
		isActive: true,
		isFinalized: false,
		createdAt: new Date("2024-02-01"),
	},
};

// =============================================================================
// Scoring Rule Fixtures
// =============================================================================

export const mockScoringRules = {
	ao_r128: {
		id: 1,
		roundId: mockRounds.ao_r128.id,
		pointsPerWinner: 2,
		pointsExactScore: 3,
		createdAt: new Date("2024-01-01"),
	},
	ao_r64: {
		id: 2,
		roundId: mockRounds.ao_r64.id,
		pointsPerWinner: 3,
		pointsExactScore: 5,
		createdAt: new Date("2024-01-01"),
	},
	ao_final: {
		id: 7,
		roundId: mockRounds.ao_final.id,
		pointsPerWinner: 30,
		pointsExactScore: 45,
		createdAt: new Date("2024-01-01"),
	},
	dubai_r32: {
		id: 10,
		roundId: mockRounds.dubai_r32.id,
		pointsPerWinner: 5,
		pointsExactScore: 8,
		createdAt: new Date("2024-02-01"),
	},
};

// =============================================================================
// Match Fixtures - Realistic Tennis Player Names
// =============================================================================

export const mockMatches = {
	// Australian Open R128 matches
	ao_match1: {
		id: 1,
		roundId: mockRounds.ao_r128.id,
		matchNumber: 1,
		player1Name: "Novak Djokovic",
		player2Name: "Dino Prizmic",
		player1Seed: 1,
		player2Seed: null,
		winnerName: null,
		finalScore: null,
		setsWon: null,
		setsLost: null,
		status: "pending" as const,
		finalizedAt: null,
		finalizedBy: null,
		deletedAt: null,
		createdAt: new Date("2024-01-01"),
	},
	ao_match2: {
		id: 2,
		roundId: mockRounds.ao_r128.id,
		matchNumber: 2,
		player1Name: "Jannik Sinner",
		player2Name: "Botic van de Zandschulp",
		player1Seed: 4,
		player2Seed: null,
		winnerName: null,
		finalScore: null,
		setsWon: null,
		setsLost: null,
		status: "pending" as const,
		finalizedAt: null,
		finalizedBy: null,
		deletedAt: null,
		createdAt: new Date("2024-01-01"),
	},
	ao_match3_finalized: {
		id: 3,
		roundId: mockRounds.ao_r128.id,
		matchNumber: 3,
		player1Name: "Carlos Alcaraz",
		player2Name: "Richard Gasquet",
		player1Seed: 2,
		player2Seed: null,
		winnerName: "Carlos Alcaraz",
		finalScore: "6-1, 6-4, 6-2",
		setsWon: 3,
		setsLost: 0,
		status: "finalized" as const,
		finalizedAt: new Date("2024-01-15"),
		finalizedBy: mockUsers.admin.id,
		deletedAt: null,
		createdAt: new Date("2024-01-01"),
	},
	// Dubai match (Best of 3)
	dubai_match1: {
		id: 100,
		roundId: mockRounds.dubai_r32.id,
		matchNumber: 1,
		player1Name: "Andrey Rublev",
		player2Name: "Alejandro Davidovich Fokina",
		player1Seed: 1,
		player2Seed: null,
		winnerName: null,
		finalScore: null,
		setsWon: null,
		setsLost: null,
		status: "pending" as const,
		finalizedAt: null,
		finalizedBy: null,
		deletedAt: null,
		createdAt: new Date("2024-02-01"),
	},
};

// =============================================================================
// User Round Pick Fixtures
// =============================================================================

export const mockUserRoundPicks = {
	player1_ao_r128: {
		id: 1,
		userId: mockUsers.player1.id,
		roundId: mockRounds.ao_r128.id,
		isDraft: false,
		submittedAt: new Date("2024-01-13T10:00:00Z"),
		totalPoints: 5,
		correctWinners: 2,
		exactScores: 1,
		scoredAt: new Date("2024-01-15"),
		createdAt: new Date("2024-01-13"),
	},
	player1_ao_r128_draft: {
		id: 2,
		userId: mockUsers.player1.id,
		roundId: mockRounds.ao_r64.id,
		isDraft: true,
		submittedAt: new Date("2024-01-13T11:00:00Z"),
		totalPoints: 0,
		correctWinners: 0,
		exactScores: 0,
		scoredAt: null,
		createdAt: new Date("2024-01-13"),
	},
	player2_ao_r128: {
		id: 3,
		userId: mockUsers.player2.id,
		roundId: mockRounds.ao_r128.id,
		isDraft: false,
		submittedAt: new Date("2024-01-13T12:00:00Z"),
		totalPoints: 2,
		correctWinners: 1,
		exactScores: 0,
		scoredAt: new Date("2024-01-15"),
		createdAt: new Date("2024-01-13"),
	},
};

// =============================================================================
// Match Pick Fixtures
// =============================================================================

export const mockMatchPicks = {
	// Player 1 picks for AO R128
	player1_match1_correct: {
		id: 1,
		userRoundPickId: mockUserRoundPicks.player1_ao_r128.id,
		matchId: mockMatches.ao_match3_finalized.id,
		predictedWinner: "Carlos Alcaraz",
		predictedSetsWon: 3,
		predictedSetsLost: 0,
		isWinnerCorrect: true,
		isExactScore: true,
		pointsEarned: 5, // 2 (winner) + 3 (exact)
		createdAt: new Date("2024-01-13"),
	},
	player1_match2_wrong: {
		id: 2,
		userRoundPickId: mockUserRoundPicks.player1_ao_r128.id,
		matchId: mockMatches.ao_match1.id,
		predictedWinner: "Dino Prizmic",
		predictedSetsWon: 3,
		predictedSetsLost: 2,
		isWinnerCorrect: null,
		isExactScore: null,
		pointsEarned: 0,
		createdAt: new Date("2024-01-13"),
	},
	// Player 2 picks for AO R128
	player2_match1_correct_wrong_score: {
		id: 3,
		userRoundPickId: mockUserRoundPicks.player2_ao_r128.id,
		matchId: mockMatches.ao_match3_finalized.id,
		predictedWinner: "Carlos Alcaraz",
		predictedSetsWon: 3,
		predictedSetsLost: 1, // Wrong score (actual was 3-0)
		isWinnerCorrect: true,
		isExactScore: false,
		pointsEarned: 2, // Only winner points
		createdAt: new Date("2024-01-13"),
	},
};

// =============================================================================
// Parsed Draw Fixtures (for Draw Parser tests)
// =============================================================================

export const mockParsedDraws = {
	valid_draw: {
		tournamentName: "Australian Open 2024",
		rounds: [
			{
				roundNumber: 1,
				name: "Round of 128",
				matches: [
					{
						matchNumber: 1,
						player1Name: "Novak Djokovic",
						player2Name: "Dino Prizmic",
						player1Seed: 1,
						player2Seed: null,
					},
					{
						matchNumber: 2,
						player1Name: "Jannik Sinner",
						player2Name: "Botic van de Zandschulp",
						player1Seed: 4,
						player2Seed: null,
					},
				],
			},
			{
				roundNumber: 2,
				name: "Round of 64",
				matches: [
					{
						matchNumber: 1,
						player1Name: "Winner M1",
						player2Name: "Winner M2",
						player1Seed: null,
						player2Seed: null,
					},
				],
			},
		],
	},
	empty_draw: {
		tournamentName: "Unknown Tournament",
		rounds: [],
	},
	partial_draw: {
		tournamentName: "Test Tournament",
		rounds: [
			{
				roundNumber: 1,
				name: "Round 1",
				matches: [],
			},
		],
	},
};

// =============================================================================
// HTML Content Fixtures (for Draw Parser tests)
// =============================================================================

export const mockHtmlContent = {
	valid_draw: `
<!DOCTYPE html>
<html>
<head>
  <title>Australian Open 2024 | Draws | ATP Tour | Tennis</title>
</head>
<body>
  <div class="draw draw-round-1">
    <div class="draw-header">Round of 128</div>
    <div class="draw-item">
      <div class="stats-item">
        <div class="player-info">
          <div class="name"><a href="/player">Novak Djokovic</a><span>(1)</span></div>
        </div>
      </div>
      <div class="stats-item">
        <div class="player-info">
          <div class="name"><a href="/player">Dino Prizmic</a></div>
        </div>
      </div>
    </div>
    <div class="draw-item">
      <div class="stats-item">
        <div class="player-info">
          <div class="name"><a href="/player">Carlos Alcaraz</a><span>(2)</span></div>
        </div>
      </div>
      <div class="stats-item">
        <div class="player-info">
          <div class="name"><a href="/player">Richard Gasquet</a></div>
        </div>
      </div>
    </div>
  </div>
  <div class="draw draw-round-2">
    <div class="draw-header">Round of 64</div>
    <div class="draw-item">
      <div class="stats-item">
        <div class="player-info">
          <div class="name"><a href="/player">TBD</a></div>
        </div>
      </div>
      <div class="stats-item">
        <div class="player-info">
          <div class="name"><a href="/player">TBD</a></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`,
	empty_html: `
<!DOCTYPE html>
<html>
<head><title></title></head>
<body></body>
</html>
`,
	no_rounds: `
<!DOCTYPE html>
<html>
<head><title>Test Tournament</title></head>
<body>
  <div class="content">No draws available</div>
</body>
</html>
`,
	special_characters: `
<!DOCTYPE html>
<html>
<head>
  <title>Roland-Garros 2024 | Draws | ATP Tour | Tennis</title>
</head>
<body>
  <div class="draw draw-round-1">
    <div class="draw-header">Round of 128</div>
    <div class="draw-item">
      <div class="stats-item">
        <div class="player-info">
          <div class="name"><a href="/player">Rafael Nadal</a><span>(3)</span></div>
        </div>
      </div>
      <div class="stats-item">
        <div class="player-info">
          <div class="name"><a href="/player">Gaël Monfils</a></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`,
};

// =============================================================================
// MHTML Content Fixtures
// =============================================================================

export const mockMhtmlContent = {
	simple_mhtml: `MIME-Version: 1.0
Content-Type: multipart/related; boundary="----=_Part_0"

------=_Part_0
Content-Type: text/html
Content-Transfer-Encoding: quoted-printable

<!DOCTYPE html>
<html>
<head><title>Test Tournament</title></head>
<body>
<div class=3D"draw draw-round-1">
  <div class=3D"draw-header">Round 1</div>
  <div class=3D"draw-item">
    <div class=3D"stats-item">
      <div class=3D"player-info">
        <div class=3D"name"><a href=3D"/player">Player A</a></div>
      </div>
    </div>
    <div class=3D"stats-item">
      <div class=3D"player-info">
        <div class=3D"name"><a href=3D"/player">Player B</a></div>
      </div>
    </div>
  </div>
</div>
</body>
</html>

------=_Part_0--
`,
	plain_html: `
<!DOCTYPE html>
<html>
<head><title>Plain HTML</title></head>
<body>Not MHTML</body>
</html>
`,
};

// =============================================================================
// Score Test Cases
// =============================================================================

export const scoreTestCases = {
	// Best of 3 valid scores
	bo3_valid: [
		{ setsWon: 2, setsLost: 0 },
		{ setsWon: 2, setsLost: 1 },
	],
	// Best of 3 invalid scores
	bo3_invalid: [
		{ setsWon: 3, setsLost: 0, reason: "Cannot win 3 sets in BO3" },
		{ setsWon: 2, setsLost: 2, reason: "Winner must have more sets" },
		{ setsWon: 1, setsLost: 0, reason: "Need 2 sets to win" },
	],
	// Best of 5 valid scores
	bo5_valid: [
		{ setsWon: 3, setsLost: 0 },
		{ setsWon: 3, setsLost: 1 },
		{ setsWon: 3, setsLost: 2 },
	],
	// Best of 5 invalid scores
	bo5_invalid: [
		{ setsWon: 2, setsLost: 0, reason: "Need 3 sets to win in BO5" },
		{ setsWon: 3, setsLost: 3, reason: "Winner must have more sets" },
		{ setsWon: 4, setsLost: 0, reason: "Cannot win 4 sets" },
	],
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a mock match with custom properties
 */
export function createMockMatch(
	overrides: Partial<(typeof mockMatches)["ao_match1"]> = {},
): (typeof mockMatches)["ao_match1"] {
	return {
		...mockMatches.ao_match1,
		id: Math.floor(Math.random() * 10000),
		...overrides,
	};
}

/**
 * Create a mock user round pick with custom properties
 */
export function createMockUserRoundPick(
	overrides: Partial<(typeof mockUserRoundPicks)["player1_ao_r128"]> = {},
): (typeof mockUserRoundPicks)["player1_ao_r128"] {
	return {
		...mockUserRoundPicks.player1_ao_r128,
		id: Math.floor(Math.random() * 10000),
		...overrides,
	};
}

/**
 * Create a mock match pick with custom properties
 */
export function createMockMatchPick(
	overrides: Partial<(typeof mockMatchPicks)["player1_match1_correct"]> = {},
): (typeof mockMatchPicks)["player1_match1_correct"] {
	return {
		...mockMatchPicks.player1_match1_correct,
		id: Math.floor(Math.random() * 10000),
		...overrides,
	};
}
