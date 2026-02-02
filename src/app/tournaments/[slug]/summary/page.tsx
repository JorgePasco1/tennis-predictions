import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";
import { api, HydrateClient } from "~/trpc/server";
import { TournamentSummaryView } from "./_components/TournamentSummaryView";

export default async function TournamentSummaryPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	// Check authentication first - redirect to sign-in if not logged in
	const { userId } = await auth();
	if (!userId) {
		redirect(`/sign-in?redirect_url=/tournaments/${slug}/summary`);
	}

	const tournament = await api.tournaments
		.getBySlug({ slug })
		.catch(() => null);

	if (!tournament) {
		notFound();
	}

	// Redirect if tournament is not closed
	if (!tournament.closedAt) {
		redirect(`/tournaments/${slug}`);
	}

	// Fetch summary data
	const summaryData = await api.summary
		.getTournamentSummary({
			tournamentId: tournament.id,
		})
		.catch(() => null);

	if (!summaryData) {
		notFound();
	}

	return (
		<HydrateClient>
			<div className="min-h-screen bg-muted/30">
				<main className="container mx-auto px-4 py-8">
					{/* Back Navigation */}
					<Button asChild className="mb-6" variant="ghost">
						<Link href={`/tournaments/${slug}`}>
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Tournament
						</Link>
					</Button>

					{/* Tournament Header */}
					<Card className="mb-8 border-none bg-gradient-to-br from-amber-500 to-amber-600 text-white">
						<CardHeader className="p-8">
							<CardTitle className="mb-2 text-4xl">
								{tournament.name} {tournament.year}
							</CardTitle>
							<p className="text-amber-100">
								Tournament Summary & Final Results
							</p>
							{tournament.closedAt && (
								<p className="mt-2 text-amber-200 text-sm">
									Closed on{" "}
									{new Date(tournament.closedAt).toLocaleDateString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
									})}
								</p>
							)}
						</CardHeader>
					</Card>

					{/* Summary Content */}
					<TournamentSummaryView data={summaryData} />
				</main>
			</div>
		</HydrateClient>
	);
}
