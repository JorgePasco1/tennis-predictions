import {
	BarChart3,
	CheckCircle2,
	Target,
	TrendingUp,
	Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface OverviewData {
	totalParticipants: number;
	totalPredictions: number;
	totalMatches: number;
	finalizedMatches: number;
	seededMatches: number;
	averageAccuracy: number;
	upsetRate: number;
}

interface TournamentOverviewProps {
	overview: OverviewData;
}

export function TournamentOverview({ overview }: TournamentOverviewProps) {
	const stats = [
		{
			label: "Participants",
			value: overview.totalParticipants,
			icon: Users,
			color: "text-blue-500",
			bgColor: "bg-blue-50",
		},
		{
			label: "Predictions Made",
			value: overview.totalPredictions.toLocaleString(),
			icon: Target,
			color: "text-green-500",
			bgColor: "bg-green-50",
		},
		{
			label: "Matches Played",
			value: `${overview.finalizedMatches}/${overview.totalMatches}`,
			icon: CheckCircle2,
			color: "text-purple-500",
			bgColor: "bg-purple-50",
		},
		{
			label: "Average Accuracy",
			value: `${overview.averageAccuracy.toFixed(1)}%`,
			icon: BarChart3,
			color: "text-amber-500",
			bgColor: "bg-amber-50",
		},
		{
			label: "Upset Rate",
			value: `${overview.upsetRate.toFixed(1)}%`,
			subValue:
				overview.seededMatches > 0
					? `of ${overview.seededMatches} seeded`
					: "no seeded matches",
			icon: TrendingUp,
			color: "text-red-500",
			bgColor: "bg-red-50",
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<BarChart3 className="h-5 w-5 text-muted-foreground" />
					Tournament Stats
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
					{stats.map((stat) => {
						const IconComponent = stat.icon;
						return (
							<div
								className="flex flex-col items-center rounded-lg border p-4 text-center"
								key={stat.label}
							>
								<div
									className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${stat.bgColor}`}
								>
									<IconComponent className={`h-5 w-5 ${stat.color}`} />
								</div>
								<p className="font-bold text-2xl">{stat.value}</p>
								<p className="text-muted-foreground text-xs">{stat.label}</p>
								{"subValue" in stat && stat.subValue && (
									<p className="mt-0.5 text-muted-foreground text-xs">
										{stat.subValue}
									</p>
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
