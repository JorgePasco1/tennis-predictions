import { cn } from "~/lib/utils";

interface StreakDisplayProps {
	currentStreak: number;
	longestStreak?: number;
	showLongest?: boolean;
	size?: "sm" | "md" | "lg";
	className?: string;
}

function getStreakColor(streak: number): string {
	if (streak >= 10) return "text-orange-500";
	if (streak >= 5) return "text-amber-500";
	if (streak >= 3) return "text-yellow-500";
	if (streak > 0) return "text-green-500";
	return "text-muted-foreground";
}

function getStreakBadgeBg(streak: number): string {
	if (streak >= 10)
		return "bg-orange-100 border-orange-200 dark:bg-orange-950/50 dark:border-orange-800";
	if (streak >= 5)
		return "bg-amber-100 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800";
	if (streak >= 3)
		return "bg-yellow-100 border-yellow-200 dark:bg-yellow-950/50 dark:border-yellow-800";
	if (streak > 0)
		return "bg-green-100 border-green-200 dark:bg-green-950/50 dark:border-green-800";
	return "bg-muted/50 border-muted-foreground/20";
}

function getStreakEmoji(streak: number): string {
	if (streak >= 10) return "🔥";
	if (streak >= 5) return "⚡";
	if (streak >= 3) return "✨";
	if (streak > 0) return "👍";
	return "💤";
}

const sizeClasses = {
	sm: "text-xs px-1.5 py-0.5",
	md: "text-sm px-2 py-1",
	lg: "text-base px-3 py-1.5",
};

export function StreakDisplay({
	currentStreak,
	longestStreak,
	showLongest = false,
	size = "md",
	className,
}: StreakDisplayProps) {
	const streakColor = getStreakColor(currentStreak);
	const badgeBg = getStreakBadgeBg(currentStreak);
	const emoji = getStreakEmoji(currentStreak);

	return (
		<div className={cn("inline-flex items-center gap-2", className)}>
			<span
				className={cn(
					"inline-flex items-center gap-1 rounded-full border font-medium",
					badgeBg,
					sizeClasses[size],
				)}
			>
				<span>{emoji}</span>
				<span className={streakColor}>{currentStreak}</span>
				{size !== "sm" && <span className="text-muted-foreground">streak</span>}
			</span>
			{showLongest && longestStreak !== undefined && longestStreak > 0 && (
				<span
					className={cn(
						"text-muted-foreground",
						size === "sm" ? "text-xs" : "text-sm",
					)}
				>
					(best: {longestStreak})
				</span>
			)}
		</div>
	);
}

export function StreakBadge({
	currentStreak,
	className,
}: {
	currentStreak: number;
	className?: string;
}) {
	if (currentStreak === 0) return null;

	const emoji = getStreakEmoji(currentStreak);
	const streakColor = getStreakColor(currentStreak);

	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 font-medium text-sm",
				streakColor,
				className,
			)}
			title={`${currentStreak} correct predictions in a row`}
		>
			<span>{emoji}</span>
			<span>{currentStreak}</span>
		</span>
	);
}

export function StreakCard({
	currentStreak,
	longestStreak,
	className,
}: {
	currentStreak: number;
	longestStreak: number;
	className?: string;
}) {
	const emoji = getStreakEmoji(currentStreak);
	const badgeBg = getStreakBadgeBg(currentStreak);
	const streakColor = getStreakColor(currentStreak);

	return (
		<div className={cn("rounded-lg border p-4", badgeBg, className)}>
			<div className="flex items-center justify-between">
				<div>
					<h3 className="font-semibold text-muted-foreground text-sm">
						Current Streak
					</h3>
					<div className={cn("font-bold text-3xl", streakColor)}>
						{emoji} {currentStreak}
					</div>
				</div>
				<div className="text-right">
					<h3 className="font-semibold text-muted-foreground text-sm">
						Best Streak
					</h3>
					<div className="font-bold text-2xl text-foreground">
						{longestStreak}
					</div>
				</div>
			</div>
			{currentStreak > 0 && (
				<p className="mt-2 text-muted-foreground text-sm">
					{currentStreak >= 10
						? "Incredible! You're on fire! 🔥"
						: currentStreak >= 5
							? "Amazing streak! Keep it up!"
							: currentStreak >= 3
								? "Nice streak! You're getting hot!"
								: "Keep predicting to build your streak!"}
				</p>
			)}
		</div>
	);
}
