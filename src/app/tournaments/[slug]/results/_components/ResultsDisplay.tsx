"use client";

import { CheckCircle2, Search, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
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
};

interface ResultsDisplayProps {
	roundsData: Round[];
}

export function ResultsDisplay({ roundsData }: ResultsDisplayProps) {
	const [searchQuery, setSearchQuery] = useState("");

	// Filter rounds and matches based on search query
	const filteredRoundsData = roundsData.map((round) => ({
		...round,
		matches: round.matches.filter((match) => {
			if (!searchQuery.trim()) return true;

			const query = searchQuery.toLowerCase();
			return (
				match.player1Name.toLowerCase().includes(query) ||
				match.player2Name.toLowerCase().includes(query)
			);
		}),
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
			<div className="relative">
				<Search className="absolute top-3 left-3 h-5 w-5 text-muted-foreground" />
				<Input
					className="pl-10 text-base"
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search by player name..."
					type="text"
					value={searchQuery}
				/>
			</div>

			{/* Search results info */}
			{searchQuery.trim() && (
				<div className="text-muted-foreground text-sm">
					Showing {filteredMatchCount} of {totalMatches} matches
					{filteredMatchCount === 0 && " - No matches found"}
				</div>
			)}

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
						const hasResults = round.matches.some(
							(m) => m.status === "finalized",
						);
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
														{
															roundsData.find((r) => r.id === round.id)?.matches
																.length
														}
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
