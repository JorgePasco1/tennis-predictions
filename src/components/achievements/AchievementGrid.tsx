"use client";

import { cn } from "~/lib/utils";
import { AchievementBadge } from "./AchievementBadge";

interface Achievement {
	id: number;
	code: string;
	name: string;
	description: string;
	category: string;
	badgeColor: string | null;
	threshold: number | null;
}

interface UserAchievement {
	achievementId: number;
	unlockedAt: Date | string;
}

interface AchievementGridProps {
	achievements: Achievement[];
	userAchievements: UserAchievement[];
	showLocked?: boolean;
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function AchievementGrid({
	achievements,
	userAchievements,
	showLocked = true,
	size = "md",
	className,
}: AchievementGridProps) {
	const unlockedMap = new Map(
		userAchievements.map((ua) => [ua.achievementId, ua]),
	);

	// Group by category
	const grouped = achievements.reduce(
		(acc, achievement) => {
			const category = achievement.category;
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push(achievement);
			return acc;
		},
		{} as Record<string, Achievement[]>,
	);

	const categoryOrder = ["round", "streak", "milestone", "special"];
	const categoryLabels: Record<string, string> = {
		round: "Round Achievements",
		streak: "Streak Achievements",
		milestone: "Milestone Achievements",
		special: "Special Achievements",
	};

	return (
		<div className={cn("space-y-8", className)}>
			{categoryOrder.map((category) => {
				const categoryAchievements = grouped[category];
				if (!categoryAchievements || categoryAchievements.length === 0) {
					return null;
				}

				const visibleAchievements = showLocked
					? categoryAchievements
					: categoryAchievements.filter((a) => unlockedMap.has(a.id));

				if (visibleAchievements.length === 0) return null;

				return (
					<div key={category}>
						<h3 className="mb-4 font-semibold text-lg text-muted-foreground">
							{categoryLabels[category] || category}
						</h3>
						<div
							className={cn(
								"grid gap-6",
								size === "sm"
									? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8"
									: size === "md"
										? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
										: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
							)}
						>
							{visibleAchievements.map((achievement) => {
								const userAchievement = unlockedMap.get(achievement.id);
								return (
									<AchievementBadge
										badgeColor={achievement.badgeColor}
										category={achievement.category}
										description={achievement.description}
										key={achievement.id}
										name={achievement.name}
										size={size}
										unlocked={!!userAchievement}
										unlockedAt={userAchievement?.unlockedAt}
									/>
								);
							})}
						</div>
					</div>
				);
			})}
		</div>
	);
}

interface AchievementProgressProps {
	total: number;
	unlocked: number;
	className?: string;
}

export function AchievementProgress({
	total,
	unlocked,
	className,
}: AchievementProgressProps) {
	const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

	return (
		<div className={cn("space-y-2", className)}>
			<div className="flex items-center justify-between text-sm">
				<span className="text-muted-foreground">Progress</span>
				<span className="font-medium">
					{unlocked} / {total} ({percentage}%)
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-muted">
				<div
					className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}
