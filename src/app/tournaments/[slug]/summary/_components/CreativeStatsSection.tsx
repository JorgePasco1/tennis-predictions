import {
	AlertTriangle,
	Heart,
	Sparkles,
	Swords,
	TrendingUp,
	Users,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { getInitials, ServerAvatar } from "./ServerAvatar";

interface CreativeStatsData {
	upsetCallers: Array<{
		userId: string;
		displayName: string;
		imageUrl: string | null;
		count: number;
	}>;
	consensusFavorites: Array<{
		playerName: string;
		pickCount: number;
	}>;
	contrarianWinners: Array<{
		userId: string;
		displayName: string;
		imageUrl: string | null;
		count: number;
	}>;
	closestCompetition: {
		user1: {
			userId: string;
			displayName: string;
			imageUrl: string | null;
			totalPoints: number;
		};
		user2: {
			userId: string;
			displayName: string;
			imageUrl: string | null;
			totalPoints: number;
		};
		pointGap: number;
	} | null;
	totalUpsets: number;
}

interface CreativeStatsSectionProps {
	creativeStats: CreativeStatsData;
}

export function CreativeStatsSection({
	creativeStats,
}: CreativeStatsSectionProps) {
	const hasContent =
		creativeStats.upsetCallers.length > 0 ||
		creativeStats.consensusFavorites.length > 0 ||
		creativeStats.contrarianWinners.length > 0 ||
		creativeStats.closestCompetition;

	if (!hasContent) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Sparkles className="h-5 w-5 text-pink-500" />
					Fun Stats & Insights
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-6 md:grid-cols-2">
					{/* Upset Callers */}
					{creativeStats.upsetCallers.length > 0 && (
						<div className="rounded-lg border bg-gradient-to-br from-red-50 to-orange-50 p-4">
							<div className="mb-3 flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
									<AlertTriangle className="h-4 w-4 text-red-600" />
								</div>
								<div>
									<p className="font-semibold">Upset Callers</p>
									<p className="text-muted-foreground text-xs">
										Correctly predicted the most upsets (
										{creativeStats.totalUpsets} total)
									</p>
								</div>
							</div>
							<div className="space-y-2">
								{creativeStats.upsetCallers.map((user, idx) => (
									<div
										className={cn(
											"flex items-center gap-2",
											idx === 0 && "font-medium",
										)}
										key={user.userId}
									>
										<span className="w-4 text-muted-foreground text-sm">
											{idx + 1}.
										</span>
										<ServerAvatar
											alt={user.displayName}
											className="h-6 w-6"
											fallback={getInitials(user.displayName)}
											fallbackClassName="text-xs"
											src={user.imageUrl}
										/>
										<span className="flex-1 text-sm">{user.displayName}</span>
										<Badge variant={idx === 0 ? "default" : "secondary"}>
											{user.count} upsets
										</Badge>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Consensus Favorites */}
					{creativeStats.consensusFavorites.length > 0 && (
						<div className="rounded-lg border bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
							<div className="mb-3 flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
									<Users className="h-4 w-4 text-blue-600" />
								</div>
								<div>
									<p className="font-semibold">Consensus Favorites</p>
									<p className="text-muted-foreground text-xs">
										Most picked players overall
									</p>
								</div>
							</div>
							<div className="space-y-2">
								{creativeStats.consensusFavorites.map((player, idx) => (
									<div
										className={cn(
											"flex items-center gap-2",
											idx === 0 && "font-medium",
										)}
										key={player.playerName}
									>
										<span className="w-4 text-muted-foreground text-sm">
											{idx + 1}.
										</span>
										<span className="flex-1 text-sm">{player.playerName}</span>
										<Badge variant={idx === 0 ? "default" : "secondary"}>
											{player.pickCount} picks
										</Badge>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Contrarian Winners */}
					{creativeStats.contrarianWinners.length > 0 && (
						<div className="rounded-lg border bg-gradient-to-br from-purple-50 to-pink-50 p-4">
							<div className="mb-3 flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
									<TrendingUp className="h-4 w-4 text-purple-600" />
								</div>
								<div>
									<p className="font-semibold">Contrarian Winners</p>
									<p className="text-muted-foreground text-xs">
										Successfully picked underdogs others ignored
									</p>
								</div>
							</div>
							<div className="space-y-2">
								{creativeStats.contrarianWinners.map((user, idx) => (
									<div
										className={cn(
											"flex items-center gap-2",
											idx === 0 && "font-medium",
										)}
										key={user.userId}
									>
										<span className="w-4 text-muted-foreground text-sm">
											{idx + 1}.
										</span>
										<ServerAvatar
											alt={user.displayName}
											className="h-6 w-6"
											fallback={getInitials(user.displayName)}
											fallbackClassName="text-xs"
											src={user.imageUrl}
										/>
										<span className="flex-1 text-sm">{user.displayName}</span>
										<Badge variant={idx === 0 ? "default" : "secondary"}>
											{user.count} picks
										</Badge>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Closest Competition */}
					{creativeStats.closestCompetition && (
						<div className="rounded-lg border bg-gradient-to-br from-amber-50 to-yellow-50 p-4">
							<div className="mb-3 flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
									<Swords className="h-4 w-4 text-amber-600" />
								</div>
								<div>
									<p className="font-semibold">Closest Rivalry</p>
									<p className="text-muted-foreground text-xs">
										The tightest competition in the tournament
									</p>
								</div>
							</div>

							<div className="flex items-center justify-between gap-4">
								<div className="flex-1 text-center">
									<ServerAvatar
										alt={creativeStats.closestCompetition.user1.displayName}
										className="mx-auto mb-2 h-12 w-12"
										fallback={getInitials(
											creativeStats.closestCompetition.user1.displayName,
										)}
										src={creativeStats.closestCompetition.user1.imageUrl}
									/>
									<p className="font-medium text-sm">
										{creativeStats.closestCompetition.user1.displayName}
									</p>
									<p className="font-bold text-lg">
										{creativeStats.closestCompetition.user1.totalPoints} pts
									</p>
								</div>

								<div className="flex flex-col items-center">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200">
										<Heart className="h-5 w-5 text-amber-700" />
									</div>
									<p className="mt-1 font-bold text-amber-700 text-sm">
										{creativeStats.closestCompetition.pointGap === 0
											? "TIE!"
											: `${creativeStats.closestCompetition.pointGap} pts`}
									</p>
								</div>

								<div className="flex-1 text-center">
									<ServerAvatar
										alt={creativeStats.closestCompetition.user2.displayName}
										className="mx-auto mb-2 h-12 w-12"
										fallback={getInitials(
											creativeStats.closestCompetition.user2.displayName,
										)}
										src={creativeStats.closestCompetition.user2.imageUrl}
									/>
									<p className="font-medium text-sm">
										{creativeStats.closestCompetition.user2.displayName}
									</p>
									<p className="font-bold text-lg">
										{creativeStats.closestCompetition.user2.totalPoints} pts
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
