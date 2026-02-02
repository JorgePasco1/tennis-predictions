"use client";

import { Award, Flame, Sparkles, Target } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

interface TopPerformersData {
	mostExactScores: {
		userId: string;
		displayName: string;
		imageUrl: string | null;
		exactScores: number;
		totalPredictions: number;
	} | null;
	bestRoundAccuracy: {
		userId: string;
		displayName: string;
		imageUrl: string | null;
		roundName: string;
		accuracy: number;
		correctWinners: number;
		totalMatches: number;
	} | null;
	mostConsistent: {
		userId: string;
		displayName: string;
		imageUrl: string | null;
		variance: number;
		roundsPlayed: number;
		averagePoints: number;
	} | null;
	longestStreak: {
		userId: string;
		displayName: string;
		imageUrl: string | null;
		streak: number;
	} | null;
}

interface TopPerformersGridProps {
	topPerformers: TopPerformersData;
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

interface PerformerCardProps {
	title: string;
	icon: React.ReactNode;
	iconBgColor: string;
	user: {
		displayName: string;
		imageUrl: string | null;
	} | null;
	mainStat: string | number;
	mainStatLabel: string;
	secondaryStat?: string;
}

function PerformerCard({
	title,
	icon,
	iconBgColor,
	user,
	mainStat,
	mainStatLabel,
	secondaryStat,
}: PerformerCardProps) {
	if (!user) return null;

	return (
		<div className="flex flex-col items-center rounded-lg border bg-card p-6 text-center">
			<div
				className={cn(
					"mb-3 flex h-12 w-12 items-center justify-center rounded-full",
					iconBgColor,
				)}
			>
				{icon}
			</div>
			<p className="mb-3 font-medium text-muted-foreground text-sm">{title}</p>

			<Avatar className="mb-2 h-14 w-14">
				<AvatarImage alt={user.displayName} src={user.imageUrl ?? undefined} />
				<AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
			</Avatar>

			<p className="mb-1 font-semibold">{user.displayName}</p>

			<p className="font-bold text-2xl text-primary">{mainStat}</p>
			<p className="text-muted-foreground text-xs">{mainStatLabel}</p>

			{secondaryStat && (
				<p className="mt-1 text-muted-foreground text-xs">{secondaryStat}</p>
			)}
		</div>
	);
}

export function TopPerformersGrid({ topPerformers }: TopPerformersGridProps) {
	const hasAnyPerformer =
		topPerformers.mostExactScores ||
		topPerformers.bestRoundAccuracy ||
		topPerformers.mostConsistent ||
		topPerformers.longestStreak;

	if (!hasAnyPerformer) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Award className="h-5 w-5 text-purple-500" />
					Top Performers
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{topPerformers.mostExactScores && (
						<PerformerCard
							icon={<Target className="h-6 w-6 text-green-600" />}
							iconBgColor="bg-green-100"
							mainStat={topPerformers.mostExactScores.exactScores}
							mainStatLabel="Exact Scores"
							secondaryStat={`${((topPerformers.mostExactScores.exactScores / topPerformers.mostExactScores.totalPredictions) * 100).toFixed(1)}% rate`}
							title="Most Exact Scores"
							user={topPerformers.mostExactScores}
						/>
					)}

					{topPerformers.bestRoundAccuracy && (
						<PerformerCard
							icon={<Sparkles className="h-6 w-6 text-amber-600" />}
							iconBgColor="bg-amber-100"
							mainStat={`${topPerformers.bestRoundAccuracy.accuracy.toFixed(0)}%`}
							mainStatLabel={topPerformers.bestRoundAccuracy.roundName}
							secondaryStat={`${topPerformers.bestRoundAccuracy.correctWinners}/${topPerformers.bestRoundAccuracy.totalMatches} correct`}
							title="Best Round Accuracy"
							user={topPerformers.bestRoundAccuracy}
						/>
					)}

					{topPerformers.mostConsistent && (
						<PerformerCard
							icon={<Award className="h-6 w-6 text-blue-600" />}
							iconBgColor="bg-blue-100"
							mainStat={topPerformers.mostConsistent.averagePoints.toFixed(1)}
							mainStatLabel="Avg Points/Round"
							secondaryStat={`${topPerformers.mostConsistent.roundsPlayed} rounds played`}
							title="Most Consistent"
							user={topPerformers.mostConsistent}
						/>
					)}

					{topPerformers.longestStreak && (
						<PerformerCard
							icon={<Flame className="h-6 w-6 text-red-600" />}
							iconBgColor="bg-red-100"
							mainStat={topPerformers.longestStreak.streak}
							mainStatLabel="Consecutive Wins"
							title="Longest Streak"
							user={topPerformers.longestStreak}
						/>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
