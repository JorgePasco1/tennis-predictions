import { env } from "~/env";

type FootballDataScoreline = {
	home: number | null;
	away: number | null;
};

type FootballDataMatch = {
	id: number;
	utcDate: string;
	status: string;
	stage: string | null;
	homeTeam: {
		id: number | null;
		name: string | null;
	};
	awayTeam: {
		id: number | null;
		name: string | null;
	};
	score: {
		winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
		duration?: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
		fullTime?: FootballDataScoreline | null;
		regularTime?: FootballDataScoreline | null;
		extraTime?: FootballDataScoreline | null;
		penalties?: FootballDataScoreline | null;
	};
};

type FootballDataMatchesResponse = {
	competition: {
		name: string;
		code: string;
	};
	filters?: {
		season?: string;
	};
	matches: FootballDataMatch[];
};

export type NormalizedFootballLeg = {
	fixtureId: number;
	label: string;
	homeTeam: string;
	awayTeam: string;
	homeGoals: number | null;
	awayGoals: number | null;
	status: string;
	kickoff: string;
};

export type NormalizedFootballTie = {
	matchNumber: number;
	player1Name: string;
	player2Name: string;
	winnerName?: string;
	setsWon?: number;
	setsLost?: number;
	finalScore?: string;
	kind: "two_leg_tie" | "single_match";
	metadata: {
		externalTieKey: string;
		externalFixtureIds: number[];
		roundLabel: string;
		scoreLabel: string;
		legs: NormalizedFootballLeg[];
	};
};

export type NormalizedFootballRound = {
	roundNumber: number;
	name: string;
	matches: NormalizedFootballTie[];
};

export type NormalizedFootballTournament = {
	tournamentName: string;
	year: number;
	competitionCode: string;
	season: number;
	rounds: NormalizedFootballRound[];
};

const FOOTBALL_DATA_BASE_URL =
	env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org/v4/";

const KNOCKOUT_STAGE_ORDER = [
	"PRELIMINARY_FINAL",
	"PRELIMINARY_SEMI_FINALS",
	"QUALIFICATION",
	"QUALIFICATION_ROUND_1",
	"QUALIFICATION_ROUND_2",
	"QUALIFICATION_ROUND_3",
	"PLAYOFFS",
	"LAST_64",
	"LAST_32",
	"LAST_16",
	"QUARTER_FINALS",
	"SEMI_FINALS",
	"THIRD_PLACE",
	"FINAL",
] as const;

const KNOCKOUT_STAGE_SET = new Set<string>(KNOCKOUT_STAGE_ORDER);

const ROUND_LABELS: Record<string, string> = {
	PLAYOFFS: "Playoffs",
	LAST_64: "Round of 64",
	LAST_32: "Round of 32",
	LAST_16: "Round of 16",
	QUARTER_FINALS: "Quarter Finals",
	SEMI_FINALS: "Semi Finals",
	THIRD_PLACE: "Third Place",
	FINAL: "Final",
};

function getFootballDataHeaders() {
	if (!env.FOOTBALL_DATA_API_TOKEN) {
		throw new Error("FOOTBALL_DATA_API_TOKEN is not configured");
	}

	return {
		"X-Auth-Token": env.FOOTBALL_DATA_API_TOKEN,
	};
}

async function footballDataGet<T>(
	path: string,
	params: Record<string, string | number>,
): Promise<T> {
	const url = new URL(path, FOOTBALL_DATA_BASE_URL);
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, String(value));
	}

	const response = await fetch(url.toString(), {
		headers: getFootballDataHeaders(),
		cache: "no-store",
	});

	if (!response.ok) {
		let message = `football-data.org request failed: ${response.status} ${response.statusText}`;

		try {
			const data = (await response.json()) as { message?: string };
			if (data.message) {
				message = data.message;
			}
		} catch {
			// Ignore JSON parse failures and keep the HTTP error.
		}

		if (response.status === 404) {
			message = `${message} football-data.org seasons use the competition start year, for example 2025 for the 2025/26 Champions League.`;
		}

		throw new Error(message);
	}

	return (await response.json()) as T;
}

function normalizeCompetitionCode(code: string) {
	return code.trim().toUpperCase();
}

function isKnockoutStage(stage: string | null | undefined) {
	return typeof stage === "string" && KNOCKOUT_STAGE_SET.has(stage);
}

function getRoundName(stage: string) {
	return ROUND_LABELS[stage] ?? stage.replaceAll("_", " ");
}

function getRoundOrder(stage: string) {
	const knownIndex = KNOCKOUT_STAGE_ORDER.indexOf(
		stage as (typeof KNOCKOUT_STAGE_ORDER)[number],
	);
	return knownIndex === -1 ? Number.MAX_SAFE_INTEGER : knownIndex;
}

function getTieSortKey(match: FootballDataMatch) {
	return [match.homeTeam.id ?? 0, match.awayTeam.id ?? 0]
		.sort((a, b) => a - b)
		.join("::");
}

function getDisplayTeamName(name: string | null | undefined) {
	return name?.trim() || "TBD";
}

function isSingleMatchStage(stage: string) {
	return stage === "FINAL" || stage === "THIRD_PLACE";
}

function getLabelForLeg(index: number, totalLegs: number) {
	if (totalLegs <= 1) {
		return "Match";
	}

	return index === 0 ? "1st leg" : "2nd leg";
}

function isFinished(status: string) {
	return status === "FINISHED";
}

function sumNullable(values: Array<number | null | undefined>) {
	if (values.some((value) => value == null)) {
		return null;
	}

	return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function getGoalsFromScoreline(scoreline?: FootballDataScoreline | null) {
	return {
		home: scoreline?.home ?? null,
		away: scoreline?.away ?? null,
	};
}

function resolveMatchGoals(match: FootballDataMatch): FootballDataScoreline {
	const regularTime = getGoalsFromScoreline(match.score.regularTime);
	const extraTime = getGoalsFromScoreline(match.score.extraTime);
	const fullTime = getGoalsFromScoreline(match.score.fullTime);

	if (match.score.duration === "PENALTY_SHOOTOUT") {
		return {
			home: sumNullable([regularTime.home, extraTime.home ?? 0]),
			away: sumNullable([regularTime.away, extraTime.away ?? 0]),
		};
	}

	if (match.score.duration === "EXTRA_TIME") {
		return {
			home: sumNullable([regularTime.home, extraTime.home ?? 0]),
			away: sumNullable([regularTime.away, extraTime.away ?? 0]),
		};
	}

	if (fullTime.home != null && fullTime.away != null) {
		return fullTime;
	}

	return regularTime;
}

function resolveWinnerName(
	match: FootballDataMatch,
	homeGoals: number | null,
	awayGoals: number | null,
) {
	if (match.score.winner === "HOME_TEAM" && match.homeTeam.name) {
		return match.homeTeam.name;
	}

	if (match.score.winner === "AWAY_TEAM" && match.awayTeam.name) {
		return match.awayTeam.name;
	}

	if (homeGoals != null && awayGoals != null && homeGoals !== awayGoals) {
		const teamName = homeGoals > awayGoals ? match.homeTeam.name : match.awayTeam.name;
		return teamName ?? undefined;
	}

	return undefined;
}

function hasKnownTeams(
	match: FootballDataMatch,
): boolean {
	return Boolean(
		match.homeTeam.id != null &&
			match.awayTeam.id != null &&
			match.homeTeam.name &&
			match.awayTeam.name,
	);
}

function groupStageMatchesIntoTies(stage: string, stageMatches: FootballDataMatch[]) {
	const sortedMatches = [...stageMatches].sort(
		(a, b) =>
			new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime() || a.id - b.id,
	);

	if (isSingleMatchStage(stage)) {
		return sortedMatches.map((match, index) => ({
			externalTieKey: `${stage}:${index + 1}:${match.id}`,
			tieMatches: [match],
		}));
	}

	const knownGroups = new Map<string, FootballDataMatch[]>();
	const unknownMatches: FootballDataMatch[] = [];

	for (const match of sortedMatches) {
		if (hasKnownTeams(match)) {
			const tieKey = `${stage}:${getTieSortKey(match)}`;
			const existingMatches = knownGroups.get(tieKey);
			if (existingMatches) {
				existingMatches.push(match);
			} else {
				knownGroups.set(tieKey, [match]);
			}
			continue;
		}

		unknownMatches.push(match);
	}

	const groupedTies = Array.from(knownGroups.entries()).map(
		([externalTieKey, tieMatches]) => ({
			externalTieKey,
			tieMatches: [...tieMatches].sort(
				(a, b) =>
					new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime() ||
					a.id - b.id,
			),
		}),
	);

	for (let index = 0; index < unknownMatches.length; index += 2) {
		const tieMatches = unknownMatches.slice(index, index + 2);
		if (tieMatches.length === 0) {
			continue;
		}

		groupedTies.push({
			externalTieKey: `${stage}:placeholder:${Math.floor(index / 2) + 1}`,
			tieMatches,
		});
	}

	return groupedTies.sort(
		(a, b) =>
			new Date(a.tieMatches[0]!.utcDate).getTime() -
				new Date(b.tieMatches[0]!.utcDate).getTime() ||
			a.tieMatches[0]!.id - b.tieMatches[0]!.id,
	);
}

function buildFinalScore(
	winnerName: string,
	player1Name: string,
	player2Name: string,
	player1Score: number,
	player2Score: number,
	kind: "two_leg_tie" | "single_match",
) {
	const winnerScore = winnerName === player1Name ? player1Score : player2Score;
	const loserScore = winnerName === player1Name ? player2Score : player1Score;
	return kind === "two_leg_tie"
		? `${winnerScore}-${loserScore} agg`
		: `${winnerScore}-${loserScore}`;
}

export async function importFootballTournamentFromFootballData(input: {
	competitionCode: string;
	season: number;
}): Promise<NormalizedFootballTournament> {
	const competitionCode = normalizeCompetitionCode(input.competitionCode);

	const response = await footballDataGet<FootballDataMatchesResponse>(
		`competitions/${competitionCode}/matches`,
		{ season: input.season },
	);

	const knockoutMatches = response.matches.filter((match) =>
		isKnockoutStage(match.stage),
	);

	if (knockoutMatches.length === 0) {
		throw new Error(
			"No knockout matches found for the selected competition and season",
		);
	}

	const roundsMap = new Map<string, FootballDataMatch[]>();

	for (const match of knockoutMatches) {
		const stage = match.stage;
		if (!stage) {
			continue;
		}

		const existingMatches = roundsMap.get(stage);
		if (existingMatches) {
			existingMatches.push(match);
		} else {
			roundsMap.set(stage, [match]);
		}
	}

	const rounds = Array.from(roundsMap.entries())
		.sort(([stageA], [stageB]) => getRoundOrder(stageA) - getRoundOrder(stageB))
		.map(([stage, stageMatches], roundIndex) => {
			const matches = groupStageMatchesIntoTies(stage, stageMatches)
				.map(({ externalTieKey, tieMatches }, tieIndex): NormalizedFootballTie => {
					const sortedMatches = [...tieMatches];
					const firstMatch = sortedMatches[0]!;
					const kind = isSingleMatchStage(stage) ? "single_match" : "two_leg_tie";
					const player1Name = getDisplayTeamName(firstMatch.homeTeam.name);
					const player2Name = getDisplayTeamName(firstMatch.awayTeam.name);
					const legs = sortedMatches.map((match, legIndex) => {
						const score = resolveMatchGoals(match);

						return {
							fixtureId: match.id,
							label: getLabelForLeg(legIndex, sortedMatches.length),
							homeTeam: getDisplayTeamName(match.homeTeam.name),
							awayTeam: getDisplayTeamName(match.awayTeam.name),
							homeGoals: score.home,
							awayGoals: score.away,
							status: match.status,
							kickoff: match.utcDate,
						};
					});

					let winnerName: string | undefined;
					let setsWon: number | undefined;
					let setsLost: number | undefined;
					let finalScore: string | undefined;

					if (kind === "single_match") {
						const onlyMatch = sortedMatches[0]!;
						const score = resolveMatchGoals(onlyMatch);
						winnerName = resolveWinnerName(onlyMatch, score.home, score.away);

						if (
							isFinished(onlyMatch.status) &&
							winnerName &&
							score.home != null &&
							score.away != null
						) {
							setsWon =
								winnerName === getDisplayTeamName(onlyMatch.homeTeam.name)
									? score.home
									: score.away;
							setsLost =
								winnerName === getDisplayTeamName(onlyMatch.homeTeam.name)
									? score.away
									: score.home;
							finalScore = buildFinalScore(
								winnerName,
								player1Name,
								player2Name,
								score.home,
								score.away,
								kind,
							);
						}
					} else {
						const aggregateScores = new Map<string, number>();
						let allFinished = true;

						for (const match of sortedMatches) {
							const score = resolveMatchGoals(match);
							if (
								!isFinished(match.status) ||
								score.home == null ||
								score.away == null
							) {
								allFinished = false;
								break;
							}

							aggregateScores.set(
								getDisplayTeamName(match.homeTeam.name),
								(aggregateScores.get(getDisplayTeamName(match.homeTeam.name)) ?? 0) +
									score.home,
							);
							aggregateScores.set(
								getDisplayTeamName(match.awayTeam.name),
								(aggregateScores.get(getDisplayTeamName(match.awayTeam.name)) ?? 0) +
									score.away,
							);
						}

						if (allFinished) {
							const player1Score = aggregateScores.get(player1Name) ?? 0;
							const player2Score = aggregateScores.get(player2Name) ?? 0;

							if (player1Score !== player2Score) {
								winnerName =
									player1Score > player2Score ? player1Name : player2Name;
							} else {
								const decidingMatch = sortedMatches[sortedMatches.length - 1]!;
								const decidingScore = resolveMatchGoals(decidingMatch);
								winnerName = resolveWinnerName(
									decidingMatch,
									decidingScore.home,
									decidingScore.away,
								);
							}

							if (winnerName) {
								setsWon =
									winnerName === player1Name ? player1Score : player2Score;
								setsLost =
									winnerName === player1Name ? player2Score : player1Score;
								finalScore = buildFinalScore(
									winnerName,
									player1Name,
									player2Name,
									player1Score,
									player2Score,
									kind,
								);
							}
						}
					}

					return {
						matchNumber: tieIndex + 1,
						player1Name,
						player2Name,
						winnerName,
						setsWon,
						setsLost,
						finalScore,
						kind,
						metadata: {
							externalTieKey,
							externalFixtureIds: sortedMatches.map((match) => match.id),
							roundLabel: getRoundName(stage),
							scoreLabel: kind === "two_leg_tie" ? "Aggregate" : "Match",
							legs,
						},
					};
				})
				.sort((a, b) => a.matchNumber - b.matchNumber);

			return {
				roundNumber: roundIndex + 1,
				name: getRoundName(stage),
				matches,
			};
		});

	return {
		tournamentName: response.competition.name,
		year: input.season,
		competitionCode,
		season: input.season,
		rounds,
	};
}
