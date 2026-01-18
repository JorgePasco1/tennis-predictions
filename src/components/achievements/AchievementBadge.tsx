import { cn } from "~/lib/utils";

// Category icons and colors
const categoryConfig = {
	round: {
		icon: "🎯",
		bgColor: "bg-purple-100 dark:bg-purple-900/30",
		textColor: "text-purple-700 dark:text-purple-300",
	},
	streak: {
		icon: "🔥",
		bgColor: "bg-orange-100 dark:bg-orange-900/30",
		textColor: "text-orange-700 dark:text-orange-300",
	},
	milestone: {
		icon: "🏆",
		bgColor: "bg-blue-100 dark:bg-blue-900/30",
		textColor: "text-blue-700 dark:text-blue-300",
	},
	special: {
		icon: "⭐",
		bgColor: "bg-teal-100 dark:bg-teal-900/30",
		textColor: "text-teal-700 dark:text-teal-300",
	},
} as const;

const defaultConfig = categoryConfig.special;

function getCategoryConfig(category: string) {
	return (
		categoryConfig[category as keyof typeof categoryConfig] ?? defaultConfig
	);
}

// Badge color mapping
const badgeColors: Record<string, string> = {
	gold: "from-yellow-400 to-amber-500",
	silver: "from-gray-300 to-gray-400",
	bronze: "from-orange-400 to-orange-600",
	purple: "from-purple-400 to-purple-600",
	blue: "from-blue-400 to-blue-600",
	green: "from-green-400 to-green-600",
	orange: "from-orange-400 to-orange-500",
	red: "from-red-400 to-red-600",
	teal: "from-teal-400 to-teal-600",
};

interface AchievementBadgeProps {
	name: string;
	description: string;
	category: string;
	badgeColor?: string | null;
	unlocked: boolean;
	unlockedAt?: Date | string | null;
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function AchievementBadge({
	name,
	description,
	category,
	badgeColor,
	unlocked,
	unlockedAt,
	size = "md",
	className,
}: AchievementBadgeProps) {
	const config = getCategoryConfig(category);
	const gradient = badgeColor ? badgeColors[badgeColor] : badgeColors.blue;

	const sizeClasses = {
		sm: "w-12 h-12",
		md: "w-16 h-16",
		lg: "w-20 h-20",
	};

	const iconSizes = {
		sm: "text-lg",
		md: "text-2xl",
		lg: "text-3xl",
	};

	return (
		<div
			className={cn(
				"flex flex-col items-center gap-2 text-center",
				!unlocked && "opacity-50",
				className,
			)}
		>
			{/* Badge circle */}
			<div
				className={cn(
					"relative flex items-center justify-center rounded-full",
					sizeClasses[size],
					unlocked
						? `bg-gradient-to-br ${gradient} shadow-lg`
						: "bg-gray-200 dark:bg-gray-700",
				)}
			>
				<span className={cn(iconSizes[size], unlocked ? "" : "grayscale")}>
					{config.icon}
				</span>
				{!unlocked && (
					<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
						<span className="text-white text-xl">🔒</span>
					</div>
				)}
			</div>

			{/* Name and description */}
			<div className="max-w-[100px]">
				<p
					className={cn(
						"font-semibold text-sm",
						unlocked ? "text-foreground" : "text-muted-foreground",
					)}
				>
					{name}
				</p>
				{size !== "sm" && (
					<p className="line-clamp-2 text-muted-foreground text-xs">
						{description}
					</p>
				)}
			</div>

			{/* Unlock date */}
			{unlocked && unlockedAt && size === "lg" && (
				<p className="text-muted-foreground text-xs">
					Unlocked{" "}
					{new Date(unlockedAt).toLocaleDateString(undefined, {
						month: "short",
						day: "numeric",
						year: "numeric",
					})}
				</p>
			)}
		</div>
	);
}

export function AchievementBadgeCompact({
	name,
	category,
	badgeColor,
	className,
}: {
	name: string;
	category: string;
	badgeColor?: string | null;
	className?: string;
}) {
	const config = getCategoryConfig(category);
	const gradient = badgeColor ? badgeColors[badgeColor] : badgeColors.blue;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs",
				`bg-gradient-to-r ${gradient} text-white`,
				className,
			)}
			title={name}
		>
			<span>{config.icon}</span>
			<span className="max-w-[60px] truncate">{name}</span>
		</span>
	);
}
