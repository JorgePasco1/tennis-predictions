import { Award, Trophy, Users } from "lucide-react";
import {
	AchievementGrid,
	AchievementProgress,
} from "~/components/achievements";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { api, HydrateClient } from "~/trpc/server";

export default async function AchievementsPage() {
	const [
		allAchievements,
		userAchievements,
		summary,
		leaderboard,
		recentUnlocks,
	] = await Promise.all([
		api.achievements.getAll(),
		api.achievements.getUserAchievements(),
		api.achievements.getUserSummary(),
		api.achievements.getLeaderboard({ limit: 10 }),
		api.achievements.getRecentUnlocks({ limit: 5 }),
	]);

	// Transform user achievements for the grid component
	const userAchievementsForGrid = userAchievements.map((ua) => ({
		achievementId: ua.achievementId,
		unlockedAt: ua.unlockedAt,
	}));

	return (
		<HydrateClient>
			<div className="min-h-screen bg-muted/30">
				<main className="container mx-auto px-4 py-8">
					{/* Header */}
					<div className="mb-8">
						<h1 className="mb-2 flex items-center gap-2 font-bold text-4xl">
							<Award className="h-10 w-10" />
							Achievements
						</h1>
						<p className="text-muted-foreground">
							Track your progress and unlock achievements by making accurate
							predictions
						</p>
					</div>

					{/* Summary Cards */}
					<div className="mb-8 grid gap-4 md:grid-cols-4">
						<Card>
							<CardContent className="p-6">
								<div className="flex items-center gap-4">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
										<Trophy className="h-6 w-6 text-primary" />
									</div>
									<div>
										<p className="text-muted-foreground text-sm">
											Total Unlocked
										</p>
										<p className="font-bold text-2xl">
											{summary.unlockedCount} / {summary.totalAchievements}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-6">
								<div className="flex items-center gap-4">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
										<span className="text-2xl">🎯</span>
									</div>
									<div>
										<p className="text-muted-foreground text-sm">Round</p>
										<p className="font-bold text-2xl">
											{summary.byCategory.round.unlocked} /{" "}
											{summary.byCategory.round.total}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-6">
								<div className="flex items-center gap-4">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
										<span className="text-2xl">🔥</span>
									</div>
									<div>
										<p className="text-muted-foreground text-sm">Streak</p>
										<p className="font-bold text-2xl">
											{summary.byCategory.streak.unlocked} /{" "}
											{summary.byCategory.streak.total}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-6">
								<div className="flex items-center gap-4">
									<div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
										<span className="text-2xl">🏆</span>
									</div>
									<div>
										<p className="text-muted-foreground text-sm">Milestone</p>
										<p className="font-bold text-2xl">
											{summary.byCategory.milestone.unlocked} /{" "}
											{summary.byCategory.milestone.total}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Progress Bar */}
					<Card className="mb-8">
						<CardContent className="p-6">
							<AchievementProgress
								total={summary.totalAchievements}
								unlocked={summary.unlockedCount}
							/>
						</CardContent>
					</Card>

					<div className="grid gap-8 lg:grid-cols-3">
						{/* Main content - all achievements */}
						<div className="lg:col-span-2">
							<h2 className="mb-4 font-semibold text-xl">All Achievements</h2>
							<Card>
								<CardContent className="p-6">
									<AchievementGrid
										achievements={allAchievements}
										size="md"
										userAchievements={userAchievementsForGrid}
									/>
								</CardContent>
							</Card>
						</div>

						{/* Sidebar */}
						<div className="space-y-6">
							{/* Achievement Leaderboard */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-lg">
										<Users className="h-5 w-5" />
										Top Collectors
									</CardTitle>
								</CardHeader>
								<CardContent>
									{leaderboard.length === 0 ? (
										<p className="text-center text-muted-foreground text-sm">
											No achievements unlocked yet
										</p>
									) : (
										<div className="space-y-3">
											{leaderboard.map((user, index) => (
												<div
													className="flex items-center justify-between"
													key={user.userId}
												>
													<div className="flex items-center gap-3">
														<span
															className={cn(
																"flex h-6 w-6 items-center justify-center rounded-full font-semibold text-sm",
																index === 0
																	? "bg-yellow-100 text-yellow-700"
																	: index === 1
																		? "bg-gray-100 text-gray-700"
																		: index === 2
																			? "bg-orange-100 text-orange-700"
																			: "bg-muted text-muted-foreground",
															)}
														>
															{index + 1}
														</span>
														<Avatar className="h-8 w-8">
															<AvatarImage src={user.imageUrl ?? undefined} />
															<AvatarFallback>
																{user.displayName.charAt(0).toUpperCase()}
															</AvatarFallback>
														</Avatar>
														<span className="font-medium">
															{user.displayName}
														</span>
													</div>
													<span className="font-semibold text-primary">
														{user.count}
													</span>
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>

							{/* Recent Unlocks */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-lg">
										<Award className="h-5 w-5" />
										Recent Unlocks
									</CardTitle>
								</CardHeader>
								<CardContent>
									{recentUnlocks.length === 0 ? (
										<p className="text-center text-muted-foreground text-sm">
											No recent achievements
										</p>
									) : (
										<div className="space-y-4">
											{recentUnlocks.map((unlock) => (
												<div
													className="flex items-center gap-3"
													key={`${unlock.userId}-${unlock.achievementId}`}
												>
													<Avatar className="h-8 w-8">
														<AvatarImage
															src={unlock.user.imageUrl ?? undefined}
														/>
														<AvatarFallback>
															{unlock.user.displayName.charAt(0).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<div className="min-w-0 flex-1">
														<p className="truncate font-medium text-sm">
															{unlock.user.displayName}
														</p>
														<p className="text-muted-foreground text-xs">
															Unlocked{" "}
															<span className="font-medium text-foreground">
																{unlock.achievement.name}
															</span>
														</p>
													</div>
													<span className="whitespace-nowrap text-muted-foreground text-xs">
														{new Date(unlock.unlockedAt).toLocaleDateString(
															undefined,
															{
																month: "short",
																day: "numeric",
															},
														)}
													</span>
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</div>
				</main>
			</div>
		</HydrateClient>
	);
}
