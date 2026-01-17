import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { api, HydrateClient } from "~/trpc/server";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";

export default async function AdminDashboard() {
	const user = await currentUser();

	if (!user || user.publicMetadata.role !== "admin") {
		redirect("/tournaments");
	}

	const allTournaments = await api.tournaments.list();

	const draftTournaments = allTournaments.filter((t) => t.status === "draft");
	const activeTournaments = allTournaments.filter((t) => t.status === "active");
	const archivedTournaments = allTournaments.filter(
		(t) => t.status === "archived",
	);

	return (
		<HydrateClient>
			<div className="min-h-screen bg-muted/30">
				<main className="container mx-auto px-4 py-8">
					<div className="mb-8 flex items-center justify-between">
						<div>
							<h1 className="mb-2 font-bold text-4xl">Admin Dashboard</h1>
							<p className="text-muted-foreground">
								Manage tournaments, rounds, and match results
							</p>
						</div>
						<Button asChild>
							<Link href="/admin/tournaments/new">
								<Plus className="mr-2 h-4 w-4" />
								Upload Draw
							</Link>
						</Button>
					</div>

					{/* Stats Cards */}
					<div className="mb-8 grid gap-6 md:grid-cols-3">
						<Card>
							<CardContent className="p-6">
								<div className="mb-2 font-semibold text-muted-foreground text-sm uppercase">
									Draft Tournaments
								</div>
								<div className="font-bold text-3xl">
									{draftTournaments.length}
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-6">
								<div className="mb-2 font-semibold text-muted-foreground text-sm uppercase">
									Active Tournaments
								</div>
								<div className="font-bold text-3xl text-primary">
									{activeTournaments.length}
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardContent className="p-6">
								<div className="mb-2 font-semibold text-muted-foreground text-sm uppercase">
									Total Tournaments
								</div>
								<div className="font-bold text-3xl">
									{allTournaments.length}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Active Tournaments */}
					{activeTournaments.length > 0 && (
						<div className="mb-8">
							<h2 className="mb-4 font-bold text-2xl">Active Tournaments</h2>
							<div className="space-y-4">
								{activeTournaments.map((tournament) => (
									<Card key={tournament.id}>
										<CardContent className="p-6">
											<div className="flex items-start justify-between">
												<div>
													<h3 className="mb-2 font-semibold text-xl">
														{tournament.name}
													</h3>
													<p className="mb-2 text-muted-foreground">
														Year: {tournament.year} • Current Round:{" "}
														{tournament.currentRoundNumber ?? "Not set"}
													</p>
												</div>
												<Button asChild>
													<Link href={`/admin/tournaments/${tournament.id}`}>
														Manage
													</Link>
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					)}

					{/* Draft Tournaments */}
					{draftTournaments.length > 0 && (
						<div className="mb-8">
							<h2 className="mb-4 font-bold text-2xl">Draft Tournaments</h2>
							<div className="space-y-4">
								{draftTournaments.map((tournament) => (
									<Card
										key={tournament.id}
										className="border-yellow-200 bg-yellow-50"
									>
										<CardContent className="p-6">
											<div className="flex items-start justify-between">
												<div>
													<h3 className="mb-2 font-semibold text-xl">
														{tournament.name}
													</h3>
													<p className="mb-2 text-muted-foreground">
														Year: {tournament.year}
													</p>
													<Badge
														variant="outline"
														className="border-yellow-600 bg-yellow-200 text-yellow-800"
													>
														Draft
													</Badge>
												</div>
												<Button asChild>
													<Link href={`/admin/tournaments/${tournament.id}`}>
														Manage
													</Link>
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					)}

					{/* Archived Tournaments */}
					{archivedTournaments.length > 0 && (
						<div>
							<h2 className="mb-4 font-bold text-2xl">
								Archived Tournaments
							</h2>
							<div className="space-y-4">
								{archivedTournaments.map((tournament) => (
									<Card key={tournament.id} className="bg-muted">
										<CardContent className="p-6">
											<div className="flex items-start justify-between">
												<div>
													<h3 className="mb-2 font-semibold text-xl text-muted-foreground">
														{tournament.name}
													</h3>
													<p className="text-muted-foreground">
														Year: {tournament.year}
													</p>
												</div>
												<Button variant="link" asChild>
													<Link href={`/admin/tournaments/${tournament.id}`}>
														View
													</Link>
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</div>
					)}
				</main>
			</div>
		</HydrateClient>
	);
}
