import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { api, HydrateClient } from "~/trpc/server";
import { ResultsDisplay } from "./_components/ResultsDisplay";

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
						<ResultsDisplay roundsData={roundsData} />
					)}
				</main>
			</div>
		</HydrateClient>
	);
}
