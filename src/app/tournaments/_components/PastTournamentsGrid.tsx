"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface PastTournament {
	id: number;
	slug: string;
	name: string;
	year: number;
	closedAt: string | null;
	uploadedBy: string;
}

interface PastTournamentsGridProps {
	tournaments: PastTournament[];
	initialCount?: number;
	increment?: number;
}

function formatClosedAt(dateString: string | null) {
	if (!dateString) return "date unavailable";
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function PastTournamentsGrid({
	tournaments,
	initialCount = 6,
	increment = 6,
}: PastTournamentsGridProps) {
	const [visibleCount, setVisibleCount] = useState(initialCount);
	const visibleTournaments = tournaments.slice(0, visibleCount);
	const hasMore = visibleCount < tournaments.length;

	return (
		<div>
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{visibleTournaments.map((tournament) => (
					<Link
						className="group"
						href={`/tournaments/${tournament.slug}`}
						key={tournament.id}
					>
						<Card className="overflow-hidden transition-shadow hover:shadow-lg">
							<CardHeader className="bg-gradient-to-br from-slate-600 to-slate-700 p-6 text-white">
								<CardTitle className="mb-2 text-2xl">
									{tournament.name}
								</CardTitle>
								<p className="text-slate-200">{tournament.year}</p>
							</CardHeader>
							<CardContent className="p-6">
								<div className="mb-4 flex items-center gap-2">
									<Badge className="bg-slate-600" variant="default">
										Archived
									</Badge>
									<span className="text-muted-foreground text-sm">
										Closed {formatClosedAt(tournament.closedAt)}
									</span>
								</div>
								<p className="text-muted-foreground text-sm">
									Uploaded by {tournament.uploadedBy}
								</p>
								<div className="mt-4 font-medium text-primary group-hover:underline">
									View Tournament →
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>

			{hasMore && (
				<div className="mt-6 flex justify-center">
					<Button
						onClick={() =>
							setVisibleCount((count) =>
								Math.min(count + increment, tournaments.length),
							)
						}
						variant="outline"
					>
						Load more
					</Button>
				</div>
			)}
		</div>
	);
}
