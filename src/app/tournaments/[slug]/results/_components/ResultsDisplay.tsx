"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import {
	filterMatchesByPlayerName,
	SearchInput,
	SearchResultsCount,
} from "~/components/match-search";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

type Match = {
	id: number;
	matchNumber: number;
	player1Name: string;
	player2Name: string;
	player1Seed: number | null;
	player2Seed: number | null;
	status: string;
	winnerName: string | null;
	finalScore: string | null;
	userPick: {
		predictedWinner: string;
		predictedSetsWon: number;
		predictedSetsLost: number;
		isWinnerCorrect: boolean | null;
		isExactScore: boolean | null;
		pointsEarned: number;
	} | null;
};

type Round = {
	id: number;
	name: string;
	matches: Match[];
	userRoundPick: {
		totalPoints: number;
		correctWinners: number;
		exactScores: number;
	} | null;
	totalMatches: number;
	finalizedMatches: number;
};

interface ResultsDisplayProps {
	roundsData: Round[];
}

export function ResultsDisplay({ roundsData }: ResultsDisplayProps) {
	const [searchQuery, setSearchQuery] = useState("");

	// Filter rounds and matches based on search query
	const filteredRoundsData = roundsData.map((round) => ({
		...round,
		matches: filterMatchesByPlayerName(round.matches, searchQuery),
	}));

	// Only show rounds that have matching matches
	const visibleRounds = filteredRoundsData.filter(
		(round) => round.matches.length > 0,
	);

	// Count total matches across all rounds for stats
	const totalMatches = roundsData.reduce(
		(sum, round) => sum + round.matches.length,
		0,
	);
	const filteredMatchCount = visibleRounds.reduce(
		(sum, round) => sum + round.matches.length,
		0,
	);

	return (
		<div className="space-y-6">
			{/* Search Input */}
			<SearchInput onChange={setSearchQuery} value={searchQuery} />

			{/* Search results info */}
			<SearchResultsCount
				className="text-muted-foreground text-sm"
				filteredCount={filteredMatchCount}
				searchQuery={searchQuery}
				totalCount={totalMatches}
			/>

			{/* Results */}
			{visibleRounds.length === 0 && searchQuery.trim() ? (
				<Card className="p-12 text-center">
					<div className="mb-4 text-6xl">🔍</div>
					<h2 className="mb-2 font-semibold text-2xl">No Matches Found</h2>
					<p className="text-muted-foreground">
						No matches found with player name "{searchQuery}"
					</p>
				</Card>
			) : (
				<div className="space-y-8">
					{visibleRounds.map((round) => {
						const hasPicks = round.userRoundPick !== null;

						return (
							<Card key={round.id}>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="mb-2 text-2xl">
												{round.name}
											</CardTitle>
											{hasPicks && round.userRoundPick && (
												<div className="flex gap-4 text-sm">
													<span className="text-muted-foreground">
														Your Score:{" "}
														<span className="font-semibold text-primary">
															{round.userRoundPick.totalPoints} points
														</span>
													</span>
													<span className="text-muted-foreground">
														Correct: {round.userRoundPick.correctWinners}/
														{round.finalizedMatches}
														{round.finalizedMatches < round.totalMatches && (
															<span className="ml-1 text-muted-foreground/70">
																({round.finalizedMatches}/{round.totalMatches}{" "}
																played)
															</span>
														)}
													</span>
													<span className="text-muted-foreground">
														Exact Scores: {round.userRoundPick.exactScores}
													</span>
												</div>
											)}
										</div>
										{hasPicks ? (
											<Badge className="bg-green-600">Picks Submitted</Badge>
										) : (
											<Badge variant="secondary">No Picks</Badge>
										)}
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									{round.matches.map((match) => {
										const userPick = match.userPick;
										const isFinalized = match.status === "finalized";

										return (
											<Card
												className={cn(
													isFinalized
														? userPick?.isWinnerCorrect
															? "border-green-300 bg-green-50"
															: userPick
																? "border-red-300 bg-red-50"
																: "bg-muted"
														: "",
												)}
												key={match.id}
											>
												<CardContent className="p-4">
													<div className="mb-3 flex items-start justify-between">
														<div>
															<div className="mb-1 font-semibold">
																Match {match.matchNumber}
															</div>
															<div>
																{match.player1Seed && `(${match.player1Seed}) `}
																{match.player1Name}
																<span className="mx-2 text-muted-foreground">
																	vs
																</span>
																{match.player2Seed && `(${match.player2Seed}) `}
																{match.player2Name}
															</div>
														</div>
														{isFinalized && (
															<Badge variant="secondary">Final</Badge>
														)}
													</div>

													{isFinalized && (
														<div className="mb-3 rounded bg-background p-3">
															<div className="mb-1 font-semibold text-sm">
																Result
															</div>
															<div>
																Winner:{" "}
																<span className="font-semibold">
																	{match.winnerName}
																</span>{" "}
																• Score: {match.finalScore}
															</div>
														</div>
													)}

													{userPick && (
														<div
															className={cn(
																"rounded p-3",
																isFinalized
																	? userPick.isWinnerCorrect
																		? "bg-green-100"
																		: "bg-red-100"
																	: "bg-blue-50",
															)}
														>
															<div className="mb-1 flex items-center justify-between">
																<div className="font-semibold text-sm">
																	Your Pick
																</div>
																{isFinalized && (
																	<div className="flex items-center gap-2">
																		{userPick.isWinnerCorrect ? (
																			<span className="flex items-center text-green-700 text-sm">
																				<CheckCircle2 className="mr-1 h-4 w-4" />
																				Correct
																			</span>
																		) : (
																			<span className="flex items-center text-red-700 text-sm">
																				<XCircle className="mr-1 h-4 w-4" />
																				Incorrect
																			</span>
																		)}
																		{userPick.isExactScore && (
																			<Badge className="bg-green-600">
																				Exact!
																			</Badge>
																		)}
																	</div>
																)}
															</div>
															<div>
																Winner: {userPick.predictedWinner} • Score:{" "}
																{userPick.predictedSetsWon}-
																{userPick.predictedSetsLost}
															</div>
															{isFinalized && (
																<div className="mt-1 font-semibold text-sm">
																	Points Earned: {userPick.pointsEarned}
																</div>
															)}
														</div>
													)}

													{!userPick && !isFinalized && (
														<div className="rounded bg-muted p-3 text-center text-muted-foreground text-sm">
															No pick submitted for this match
														</div>
													)}
												</CardContent>
											</Card>
										);
									})}
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
