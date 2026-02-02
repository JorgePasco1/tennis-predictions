import { Award, Flame, Medal, Star, Target, Trophy, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

type AchievementCategory = "round" | "streak" | "milestone" | "special";

interface Achievement {
	id: number;
	userId: string;
	achievementId: number;
	unlockedAt: Date;
	tournamentId: number | null;
	roundId: number | null;
	achievement: {
		id: number;
		code: string;
		name: string;
		description: string;
		category: AchievementCategory;
		iconUrl: string | null;
		badgeColor: string | null;
		threshold: number | null;
	};
	user: {
		id: string;
		displayName: string;
		imageUrl: string | null;
	};
}

interface AchievementsSectionProps {
	achievements: Achievement[];
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

const categoryConfig = {
	round: {
		icon: Target,
		label: "Round Achievements",
		defaultColor: "bg-amber-500",
	},
	streak: {
		icon: Flame,
		label: "Streak Achievements",
		defaultColor: "bg-orange-500",
	},
	milestone: {
		icon: Trophy,
		label: "Milestone Achievements",
		defaultColor: "bg-purple-500",
	},
	special: {
		icon: Star,
		label: "Special Achievements",
		defaultColor: "bg-teal-500",
	},
} as const;

function getBadgeColorClasses(badgeColor: string | null): string {
	switch (badgeColor) {
		case "gold":
			return "bg-amber-100 text-amber-800 border-amber-300";
		case "silver":
			return "bg-slate-100 text-slate-800 border-slate-300";
		case "bronze":
			return "bg-orange-100 text-orange-800 border-orange-300";
		case "teal":
			return "bg-teal-100 text-teal-800 border-teal-300";
		case "purple":
			return "bg-purple-100 text-purple-800 border-purple-300";
		case "orange":
			return "bg-orange-100 text-orange-800 border-orange-300";
		case "blue":
			return "bg-blue-100 text-blue-800 border-blue-300";
		case "green":
			return "bg-green-100 text-green-800 border-green-300";
		case "red":
			return "bg-red-100 text-red-800 border-red-300";
		default:
			return "bg-gray-100 text-gray-800 border-gray-300";
	}
}

function getIconForAchievement(code: string): React.ElementType {
	if (code.includes("perfect") || code.includes("round")) return Medal;
	if (code.includes("streak") || code.includes("fire")) return Flame;
	if (code.includes("upset")) return Zap;
	if (code.includes("score") || code.includes("exact")) return Target;
	return Award;
}

export function AchievementsSection({
	achievements,
}: AchievementsSectionProps) {
	if (achievements.length === 0) {
		return null;
	}

	// Group achievements by category
	const groupedAchievements = achievements.reduce(
		(acc, achievement) => {
			const category = achievement.achievement.category;
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push(achievement);
			return acc;
		},
		{} as Record<string, Achievement[]>,
	);

	const categories = Object.keys(groupedAchievements) as Array<
		keyof typeof categoryConfig
	>;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Award className="h-5 w-5 text-amber-500" />
					Tournament Achievements
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					{categories.map((category) => {
						const config = categoryConfig[category];
						const categoryAchievements = groupedAchievements[category];
						if (!categoryAchievements || categoryAchievements.length === 0)
							return null;

						const CategoryIcon = config.icon;

						return (
							<div key={category}>
								<div className="mb-3 flex items-center gap-2">
									<div
										className={cn(
											"flex h-6 w-6 items-center justify-center rounded-full",
											config.defaultColor,
										)}
									>
										<CategoryIcon className="h-3.5 w-3.5 text-white" />
									</div>
									<h3 className="font-medium text-sm">{config.label}</h3>
									<Badge className="ml-auto text-xs" variant="secondary">
										{categoryAchievements.length}
									</Badge>
								</div>

								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{categoryAchievements.map((achievement) => {
										const AchievementIcon = getIconForAchievement(
											achievement.achievement.code,
										);
										return (
											<div
												className={cn(
													"flex items-center gap-3 rounded-lg border p-3",
													getBadgeColorClasses(
														achievement.achievement.badgeColor,
													),
												)}
												key={achievement.id}
											>
												<Avatar className="h-8 w-8">
													<AvatarImage
														alt={achievement.user.displayName}
														src={achievement.user.imageUrl ?? undefined}
													/>
													<AvatarFallback className="text-xs">
														{getInitials(achievement.user.displayName)}
													</AvatarFallback>
												</Avatar>

												<div className="min-w-0 flex-1">
													<p className="truncate font-medium text-sm">
														{achievement.user.displayName}
													</p>
													<div className="flex items-center gap-1">
														<AchievementIcon className="h-3 w-3" />
														<span className="truncate text-xs">
															{achievement.achievement.name}
														</span>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
