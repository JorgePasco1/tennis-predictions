import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";

export default async function ResultsPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	const tournament = await api.tournaments.getBySlug({ slug });
	const roundsData = await api.results.getTournamentResultsWithUserPicks({
		tournamentId: tournament.id,
	});

	return (
		<HydrateClient>
			<div className="min-h-screen bg-muted/30">
				<main className="container mx-auto px-4 py-8">
					<div className="mb-8">
						<Button asChild className="mb-4 -ml-4" variant="link">
							<Link href={`/tournaments/${slug}`}>
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Tournament
							</Link>
						</Button>
						<h1 className="mb-2 font-bold text-4xl">Results & Your Picks</h1>
						<p className="text-muted-foreground">{tournament.name}</p>
					</div>

					{roundsData.length === 0 ? (
						<Card className="p-12 text-center">
							<div className="mb-4 text-6xl">📊</div>
							<h2 className="mb-2 font-semibold text-2xl">No Results Yet</h2>
							<p className="text-muted-foreground">
								Results will appear here once matches are finalized
							</p>
						</Card>
					) : (
						<div className="space-y-8">
							{roundsData.map((round) => {
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
																{round.matches.length}
															</span>
															<span className="text-muted-foreground">
																Exact Scores: {round.userRoundPick.exactScores}
															</span>
														</div>
													)}
												</div>
												{hasPicks ? (
													<Badge className="bg-green-600">
														Picks Submitted
													</Badge>
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
																		{match.player1Seed &&
																			`(${match.player1Seed}) `}
																		{match.player1Name}
																		<span className="mx-2 text-muted-foreground">
																			vs
																		</span>
																		{match.player2Seed &&
																			`(${match.player2Seed}) `}
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
				</main>
			</div>
		</HydrateClient>
	);
}
