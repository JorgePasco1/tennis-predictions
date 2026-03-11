type MatchKind = "standard" | "two_leg_tie" | "single_match";

type MatchMetadata = {
	legs?: Array<{
		status: string;
	}>;
} | null;

export type ScoringProfileKey =
	| "classic_round_points_v1"
	| "football_aggregate_v1";

export type ScoringVariantKey = "normal" | "late_after_leg1";

export type TournamentScoringSettings = {
	lateTieWinnerPoints?: number;
} | null | undefined;

export type PickScoringSnapshot = {
	scoringVariantKey: ScoringVariantKey;
	snapshotPointsPerWinner: number;
	snapshotPointsExactScore: number;
	snapshotContext: {
		completedLegs?: number;
		totalLegs?: number;
		matchKind: MatchKind;
	};
};

const FINISHED_FOOTBALL_LEG_STATUSES = new Set([
	"FINISHED",
	"FT",
	"AET",
	"PEN",
]);

export function getDefaultScoringProfileKey(
	sport: "tennis" | "football",
): ScoringProfileKey {
	return sport === "football"
		? "football_aggregate_v1"
		: "classic_round_points_v1";
}

export function getScoringProfileLabel(profileKey: ScoringProfileKey) {
	return profileKey === "football_aggregate_v1"
		? "Football Aggregate v1"
		: "Classic Round Points v1";
}

export function normalizeScoringSettings(
	settings: TournamentScoringSettings,
): { lateTieWinnerPoints?: number } {
	if (!settings) {
		return {};
	}

	return {
		lateTieWinnerPoints:
			typeof settings.lateTieWinnerPoints === "number"
				? settings.lateTieWinnerPoints
				: undefined,
	};
}

export function getCompletedFootballLegs(metadata?: MatchMetadata) {
	if (!metadata?.legs?.length) {
		return 0;
	}

	return metadata.legs.filter((leg) =>
		FINISHED_FOOTBALL_LEG_STATUSES.has(leg.status),
	).length;
}

export function resolvePickScoringSnapshot(input: {
	profileKey: ScoringProfileKey;
	scoringSettings: TournamentScoringSettings;
	matchKind: MatchKind;
	matchMetadata?: MatchMetadata;
	isFinalized: boolean;
	pointsPerWinner: number;
	pointsExactScore: number;
}): PickScoringSnapshot {
	const normalizedSettings = normalizeScoringSettings(input.scoringSettings);
	const completedLegs = getCompletedFootballLegs(input.matchMetadata);
	const totalLegs = input.matchMetadata?.legs?.length ?? 0;

	if (
		input.profileKey === "football_aggregate_v1" &&
		input.matchKind === "two_leg_tie" &&
		!input.isFinalized &&
		completedLegs === 1
	) {
		return {
			scoringVariantKey: "late_after_leg1",
			snapshotPointsPerWinner:
				normalizedSettings.lateTieWinnerPoints ??
				Math.max(1, Math.floor(input.pointsPerWinner / 2)),
			snapshotPointsExactScore: 0,
			snapshotContext: {
				completedLegs,
				totalLegs,
				matchKind: input.matchKind,
			},
		};
	}

	return {
		scoringVariantKey: "normal",
		snapshotPointsPerWinner: input.pointsPerWinner,
		snapshotPointsExactScore: input.pointsExactScore,
		snapshotContext: {
			completedLegs,
			totalLegs,
			matchKind: input.matchKind,
		},
	};
}

export function getRoundScoringDescription(input: {
	profileKey: ScoringProfileKey;
	scoringSettings: TournamentScoringSettings;
	pointsPerWinner: number;
	pointsExactScore: number;
	isFootball: boolean;
}) {
	const baseDescription = `${input.pointsPerWinner} points per correct ${input.isFootball ? "advancing team" : "winner"}, +${input.pointsExactScore} for exact score`;

	if (input.profileKey !== "football_aggregate_v1") {
		return baseDescription;
	}

	const normalizedSettings = normalizeScoringSettings(input.scoringSettings);
	const lateTieWinnerPoints =
		normalizedSettings.lateTieWinnerPoints ??
		Math.max(1, Math.floor(input.pointsPerWinner / 2));

	return `${baseDescription}. Late football tie picks after one completed leg are worth ${lateTieWinnerPoints} winner points and 0 exact-score points.`;
}

export function getMatchScoringNotice(input: {
	profileKey: ScoringProfileKey;
	scoringSettings: TournamentScoringSettings;
	matchKind: MatchKind;
	matchMetadata?: MatchMetadata;
	isFinalized: boolean;
	pointsPerWinner: number;
	pointsExactScore: number;
}) {
	const snapshot = resolvePickScoringSnapshot({
		profileKey: input.profileKey,
		scoringSettings: input.scoringSettings,
		matchKind: input.matchKind,
		matchMetadata: input.matchMetadata,
		isFinalized: input.isFinalized,
		pointsPerWinner: input.pointsPerWinner,
		pointsExactScore: input.pointsExactScore,
	});

	if (snapshot.scoringVariantKey !== "late_after_leg1") {
		return null;
	}

	return `Late tie pick: ${snapshot.snapshotPointsPerWinner} winner points, 0 exact-score points.`;
}
