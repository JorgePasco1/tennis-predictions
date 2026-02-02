import { Calendar, Trophy } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { getInitials, ServerAvatar } from "./ServerAvatar";

interface RoundWinner {
	roundId: number;
	roundName: string;
	roundNumber: number;
	winner: {
		userId: string;
		displayName: string;
		imageUrl: string | null;
		totalPoints: number;
	} | null;
}

interface RoundWinnersTimelineProps {
	roundWinners: RoundWinner[];
}

export function RoundWinnersTimeline({
	roundWinners,
}: RoundWinnersTimelineProps) {
	if (roundWinners.length === 0) {
		return null;
	}

	// Check for users who won multiple rounds
	const winCounts = new Map<string, number>();
	for (const round of roundWinners) {
		if (round.winner) {
			const count = winCounts.get(round.winner.userId) ?? 0;
			winCounts.set(round.winner.userId, count + 1);
		}
	}

	const multipleWinners = new Set(
		Array.from(winCounts.entries())
			.filter(([, count]) => count > 1)
			.map(([userId]) => userId),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Calendar className="h-5 w-5 text-blue-500" />
					Round Winners
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* Horizontal scroll on mobile, grid on larger screens */}
				<div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-4 md:overflow-x-visible lg:grid-cols-7">
					{roundWinners.map((round, index) => (
						<div
							className={cn(
								"relative flex min-w-[140px] flex-col items-center rounded-lg border p-4 md:min-w-0",
								round.winner && multipleWinners.has(round.winner.userId)
									? "border-amber-200 bg-amber-50/50"
									: "bg-card",
							)}
							key={round.roundId}
						>
							{/* Round indicator */}
							<div className="mb-2 flex items-center gap-1">
								<div
									className={cn(
										"flex h-6 w-6 items-center justify-center rounded-full text-white text-xs",
										index === roundWinners.length - 1
											? "bg-amber-500"
											: "bg-blue-500",
									)}
								>
									{round.roundNumber}
								</div>
							</div>

							<p className="mb-3 text-center font-medium text-sm">
								{round.roundName}
							</p>

							{round.winner ? (
								<>
									<ServerAvatar
										alt={round.winner.displayName}
										className="mb-2 h-12 w-12"
										fallback={getInitials(round.winner.displayName)}
										fallbackClassName="text-sm"
										src={round.winner.imageUrl}
									/>

									<p className="mb-1 text-center font-medium text-sm">
										{round.winner.displayName}
									</p>

									<Badge className="mb-1" variant="secondary">
										{round.winner.totalPoints} pts
									</Badge>

									{multipleWinners.has(round.winner.userId) && (
										<div className="mt-1 flex items-center gap-1">
											<Trophy className="h-3 w-3 text-amber-500" />
											<span className="text-amber-600 text-xs">
												x{winCounts.get(round.winner.userId)}
											</span>
										</div>
									)}
								</>
							) : (
								<div className="flex h-20 items-center justify-center text-center text-muted-foreground text-sm">
									No picks
								</div>
							)}

							{/* Connecting line (hidden on mobile) */}
							{index < roundWinners.length - 1 && (
								<div className="absolute top-1/2 -right-2 hidden h-0.5 w-4 bg-border md:block" />
							)}
						</div>
					))}
				</div>

				{/* Legend for multiple winners */}
				{multipleWinners.size > 0 && (
					<div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
						<Trophy className="h-4 w-4 text-amber-500" />
						<span>Highlighted users won multiple rounds</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
