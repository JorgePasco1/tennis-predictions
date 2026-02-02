import { Crown, Medal, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

interface PodiumEntry {
	rank: number;
	userId: string;
	displayName: string;
	imageUrl: string | null;
	totalPoints: number;
	correctWinners: number;
	exactScores: number;
	roundsPlayed: number;
	marginFromPrevious: number;
}

interface PodiumDisplayProps {
	podium: PodiumEntry[];
}

const podiumConfig = {
	1: {
		color: "from-amber-400 to-yellow-500",
		borderColor: "border-amber-400",
		bgColor: "bg-amber-50",
		textColor: "text-amber-700",
		icon: Crown,
		label: "Champion",
		height: "h-40",
		zIndex: "z-30",
	},
	2: {
		color: "from-slate-300 to-slate-400",
		borderColor: "border-slate-400",
		bgColor: "bg-slate-50",
		textColor: "text-slate-700",
		icon: Medal,
		label: "Runner-up",
		height: "h-32",
		zIndex: "z-20",
	},
	3: {
		color: "from-orange-400 to-orange-500",
		borderColor: "border-orange-400",
		bgColor: "bg-orange-50",
		textColor: "text-orange-700",
		icon: Trophy,
		label: "Third Place",
		height: "h-24",
		zIndex: "z-10",
	},
} as const;

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function PodiumDisplay({ podium }: PodiumDisplayProps) {
	if (podium.length === 0) {
		return null;
	}

	// Reorder for podium display: 2nd, 1st, 3rd (visual ordering)
	const displayOrder = [
		podium.find((p) => p.rank === 2),
		podium.find((p) => p.rank === 1),
		podium.find((p) => p.rank === 3),
	].filter(Boolean) as PodiumEntry[];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-2xl">
					<Trophy className="h-6 w-6 text-amber-500" />
					Final Podium
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* Desktop Podium */}
				<div className="hidden items-end justify-center gap-4 md:flex">
					{displayOrder.map((entry) => {
						const config = podiumConfig[entry.rank as 1 | 2 | 3];
						const IconComponent = config.icon;

						return (
							<div
								className={cn(
									"flex flex-col items-center",
									config.zIndex,
									entry.rank === 1
										? "order-2"
										: entry.rank === 2
											? "order-1"
											: "order-3",
								)}
								key={entry.userId}
							>
								{/* Avatar and Name */}
								<div className="mb-4 flex flex-col items-center">
									<div
										className={cn(
											"mb-2 rounded-full border-4 p-1",
											config.borderColor,
										)}
									>
										<Avatar
											className={cn(
												entry.rank === 1 ? "h-24 w-24" : "h-20 w-20",
											)}
										>
											<AvatarImage
												alt={entry.displayName}
												src={entry.imageUrl ?? undefined}
											/>
											<AvatarFallback className={cn("text-lg", config.bgColor)}>
												{getInitials(entry.displayName)}
											</AvatarFallback>
										</Avatar>
									</div>
									<p className="text-center font-semibold text-lg">
										{entry.displayName}
									</p>
									<p className={cn("text-sm", config.textColor)}>
										{config.label}
									</p>
								</div>

								{/* Podium Block */}
								<div
									className={cn(
										"flex w-36 flex-col items-center justify-end rounded-t-lg bg-gradient-to-t p-4",
										config.color,
										config.height,
									)}
								>
									<IconComponent className="mb-2 h-8 w-8 text-white drop-shadow-md" />
									<p className="font-bold text-2xl text-white drop-shadow-md">
										{entry.totalPoints}
									</p>
									<p className="text-white/80 text-xs">points</p>
								</div>

								{/* Stats */}
								<div className="mt-2 text-center text-muted-foreground text-xs">
									<p>
										{entry.correctWinners} correct • {entry.exactScores} exact
									</p>
									{entry.marginFromPrevious > 0 && (
										<p className="text-red-500">
											-{entry.marginFromPrevious} from{" "}
											{entry.rank === 2 ? "1st" : "2nd"}
										</p>
									)}
								</div>
							</div>
						);
					})}
				</div>

				{/* Mobile List View */}
				<div className="space-y-4 md:hidden">
					{podium.map((entry) => {
						const config = podiumConfig[entry.rank as 1 | 2 | 3];
						const IconComponent = config.icon;

						return (
							<div
								className={cn(
									"flex items-center gap-4 rounded-lg border p-4",
									config.borderColor,
									config.bgColor,
								)}
								key={entry.userId}
							>
								<div
									className={cn(
										"flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br",
										config.color,
									)}
								>
									<IconComponent className="h-6 w-6 text-white" />
								</div>

								<div className="flex-1">
									<div className="flex items-center gap-2">
										<Avatar className="h-10 w-10">
											<AvatarImage
												alt={entry.displayName}
												src={entry.imageUrl ?? undefined}
											/>
											<AvatarFallback className={cn("text-sm", config.bgColor)}>
												{getInitials(entry.displayName)}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="font-semibold">{entry.displayName}</p>
											<p className={cn("text-sm", config.textColor)}>
												{config.label}
											</p>
										</div>
									</div>
								</div>

								<div className="text-right">
									<p className="font-bold text-2xl">{entry.totalPoints}</p>
									<p className="text-muted-foreground text-xs">
										{entry.correctWinners} correct
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
