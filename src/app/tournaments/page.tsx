import { Info } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { api, HydrateClient } from "~/trpc/server";

export default async function TournamentsPage() {
	const activeTournaments = await api.tournaments.list({ status: "active" });

	return (
		<HydrateClient>
			<div className="min-h-screen bg-muted/30">
				<main className="container mx-auto px-4 py-8">
					<div className="mb-8">
						<h1 className="mb-2 font-bold text-4xl">Active Tournaments</h1>
						<p className="text-muted-foreground">
							Select a tournament to view details and submit your predictions
						</p>
					</div>

					{activeTournaments.length === 0 ? (
						<Card className="p-12 text-center">
							<div className="mb-4 text-6xl">🎾</div>
							<h2 className="mb-2 font-semibold text-2xl">
								No Active Tournaments
							</h2>
							<p className="text-muted-foreground">
								Check back soon for upcoming ATP tournaments
							</p>
						</Card>
					) : (
						<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{activeTournaments.map((tournament) => (
								<Link
									className="group"
									href={`/tournaments/${tournament.slug}`}
									key={tournament.id}
								>
									<Card className="overflow-hidden transition-shadow hover:shadow-lg">
										<CardHeader className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
											<CardTitle className="mb-2 text-2xl">
												{tournament.name}
											</CardTitle>
											<p className="text-blue-100">{tournament.year}</p>
										</CardHeader>
										<CardContent className="p-6">
											<div className="mb-4 flex items-center gap-2">
												<Badge
													className="bg-green-600 hover:bg-green-700"
													variant="default"
												>
													Active
												</Badge>
												{tournament.currentRoundNumber && (
													<span className="text-muted-foreground text-sm">
														Round {tournament.currentRoundNumber}
													</span>
												)}
											</div>
											<p className="text-muted-foreground text-sm">
												Uploaded by {tournament.uploadedByUser.displayName}
											</p>
											<div className="mt-4 font-medium text-primary group-hover:underline">
												View Tournament →
											</div>
										</CardContent>
									</Card>
								</Link>
							))}
						</div>
					)}

					<Alert className="mt-12">
						<Info className="h-4 w-4" />
						<AlertTitle>How to Play</AlertTitle>
						<AlertDescription>
							<ul className="mt-2 space-y-2">
								<li>• Select a tournament and wait for a round to open</li>
								<li>
									• Submit your predictions for each match before the deadline
								</li>
								<li>
									• Points increase each round: R128→2, R64→3, R32→5, R16→8,
									QF→12, SF→18, F→30
								</li>
								<li>• Bonus: Predict the exact score for +50% extra points</li>
								<li>• Check the leaderboard to see your ranking</li>
							</ul>
						</AlertDescription>
					</Alert>
				</main>
			</div>
		</HydrateClient>
	);
}
