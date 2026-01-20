"use client";

import { Info } from "lucide-react";
import { TournamentLeaderboardClient } from "~/app/leaderboards/[tournamentId]/_components/TournamentLeaderboardClient";
import { type RoundData, TournamentBracket } from "~/components/bracket";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Card } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

interface LeaderboardEntry {
	userId: string;
	displayName: string;
	imageUrl: string | null;
	totalPoints: number;
	correctWinners: number;
	exactScores: number;
	roundsPlayed: number;
	earliestSubmission: Date;
	rank: number;
}

interface TournamentStats {
	totalMatches: number;
	finalizedMatches: number;
	maxPossiblePoints: number;
	rounds: Array<{
		roundId: number;
		roundName: string;
		roundNumber: number;
		totalMatches: number;
		finalizedMatches: number;
		pointsPerWinner: number;
		pointsExactScore: number;
		maxPossiblePoints: number;
	}>;
}

interface TournamentTabsProps {
	bracketRounds: RoundData[];
	leaderboardEntries: LeaderboardEntry[];
	currentUserSubmittedRoundIds: number[];
	tournamentId: number;
	tournamentStats: TournamentStats;
	defaultTab: "bracket" | "leaderboard";
}

export function TournamentTabs({
	bracketRounds,
	leaderboardEntries,
	currentUserSubmittedRoundIds,
	tournamentId,
	tournamentStats,
	defaultTab,
}: TournamentTabsProps) {
	return (
		<Tabs className="w-full" defaultValue={defaultTab}>
			<TabsList>
				<TabsTrigger value="bracket">Bracket</TabsTrigger>
				<TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
			</TabsList>

			<TabsContent className="mt-4" value="bracket">
				<Card className="p-4">
					<TournamentBracket rounds={bracketRounds} />
				</Card>
			</TabsContent>

			<TabsContent className="mt-4" value="leaderboard">
				{/* Tournament Progress */}
				{tournamentStats.totalMatches > 0 && (
					<Card className="mb-6 p-4">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div className="flex flex-wrap gap-6">
								<div>
									<div className="font-semibold text-2xl">
										{tournamentStats.finalizedMatches}/
										{tournamentStats.totalMatches}
									</div>
									<div className="text-muted-foreground text-sm">
										Matches Played
									</div>
								</div>
								<div>
									<div className="font-semibold text-2xl">
										{tournamentStats.maxPossiblePoints}
									</div>
									<div className="text-muted-foreground text-sm">
										Max Possible Points
									</div>
								</div>
								<div>
									<div className="font-semibold text-2xl">
										{tournamentStats.totalMatches > 0
											? Math.round(
													(tournamentStats.finalizedMatches /
														tournamentStats.totalMatches) *
														100,
												)
											: 0}
										%
									</div>
									<div className="text-muted-foreground text-sm">Complete</div>
								</div>
							</div>
						</div>
					</Card>
				)}

				{leaderboardEntries.length === 0 ? (
					<Card className="p-12 text-center">
						<div className="mb-4 text-6xl">🏆</div>
						<h2 className="mb-2 font-semibold text-2xl">No Rankings Yet</h2>
						<p className="text-muted-foreground">
							Rankings will appear once players submit picks
						</p>
					</Card>
				) : (
					<Card>
						<div className="overflow-x-auto">
							<TournamentLeaderboardClient
								currentUserSubmittedRoundIds={currentUserSubmittedRoundIds}
								entries={leaderboardEntries}
								tournamentId={tournamentId}
							/>
						</div>
					</Card>
				)}

				<Alert className="mt-6">
					<Info className="h-4 w-4" />
					<AlertTitle>How Scoring Works</AlertTitle>
					<AlertDescription>
						<div className="mt-2 space-y-3">
							<p className="text-sm">
								Earn points by predicting match winners correctly. Get a bonus
								for predicting the exact score.
							</p>
							<div className="rounded border bg-muted/50 p-3">
								<div className="mb-2 font-medium text-sm">
									Points per match:
								</div>
								<ul className="space-y-1 text-sm">
									<li>
										• R128 – QF: <strong>10</strong> pts/winner, +
										<strong>5</strong> exact score
									</li>
									<li>
										• Semi Finals: <strong>12</strong> pts/winner, +
										<strong>6</strong> exact score
									</li>
									<li>
										• Final: <strong>15</strong> pts/winner, +<strong>8</strong>{" "}
										exact score
									</li>
								</ul>
							</div>
							<ul className="space-y-1 text-muted-foreground text-sm">
								<li>• Ties broken by earliest submission time</li>
								<li>• Click a player's name to compare picks</li>
							</ul>
						</div>
					</AlertDescription>
				</Alert>
			</TabsContent>
		</Tabs>
	);
}
