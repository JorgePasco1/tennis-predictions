"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "~/components/ui/chart";

interface RoundData {
	roundId: number;
	roundNumber: number;
	roundName: string;
	totalPoints: number;
	correctWinners: number;
	exactScores: number;
	submittedAt: Date | null;
	cumulativePoints: number;
	hasSubmitted: boolean;
	rank: number | null;
	cumulativeRank: number | null;
}

interface UserRoundData {
	userId: string;
	displayName: string;
	imageUrl: string | null;
	rounds: RoundData[];
	totalPoints: number;
	finalRank: number;
}

interface LeaderboardProgressionChartProps {
	userRoundData: UserRoundData[];
	rounds: Array<{
		roundId: number;
		roundName: string;
		roundNumber: number;
	}>;
	topN?: number;
}

// Color palette for users
const CHART_COLORS = [
	"hsl(var(--chart-1))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
	"hsl(220, 70%, 50%)",
	"hsl(340, 75%, 50%)",
	"hsl(160, 60%, 45%)",
	"hsl(280, 65%, 55%)",
	"hsl(30, 80%, 50%)",
];

export function LeaderboardProgressionChart({
	userRoundData,
	rounds,
	topN = 10,
}: LeaderboardProgressionChartProps) {
	// Take top N users by final rank
	const topUsers = userRoundData.slice(0, topN);

	// Prepare chart data: each round is a data point
	const chartData = rounds.map((round) => {
		const dataPoint: Record<string, string | number> = {
			roundName: round.roundName,
		};

		for (const user of topUsers) {
			const roundData = user.rounds.find((r) => r.roundId === round.roundId);
			dataPoint[user.displayName] = roundData?.cumulativePoints ?? 0;
		}

		return dataPoint;
	});

	// Build chart config for colors
	const chartConfig: ChartConfig = {};
	for (let i = 0; i < topUsers.length; i++) {
		const user = topUsers[i];
		if (user) {
			chartConfig[user.displayName] = {
				label: user.displayName,
				color: CHART_COLORS[i % CHART_COLORS.length],
			};
		}
	}

	if (topUsers.length === 0 || chartData.length === 0) {
		return (
			<div className="flex h-[300px] items-center justify-center text-muted-foreground">
				No data available for chart
			</div>
		);
	}

	return (
		<ChartContainer
			className="h-[300px] w-full sm:h-[400px]"
			config={chartConfig}
		>
			<AreaChart
				data={chartData}
				margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
			>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis
					axisLine={false}
					dataKey="roundName"
					tickFormatter={(value: string) => {
						// Shorten round names for mobile
						return value
							.replace("Round of ", "R")
							.replace("Quarter Finals", "QF")
							.replace("Semi Finals", "SF");
					}}
					tickLine={false}
					tickMargin={8}
				/>
				<YAxis
					axisLine={false}
					label={{ value: "Points", angle: -90, position: "insideLeft" }}
					tickLine={false}
					tickMargin={8}
				/>
				<ChartTooltip content={<ChartTooltipContent />} />
				<ChartLegend content={<ChartLegendContent />} />
				{topUsers.map((user, index) => (
					<Area
						connectNulls={false}
						dataKey={user.displayName}
						fill={CHART_COLORS[index % CHART_COLORS.length]}
						fillOpacity={0.2}
						key={user.userId}
						stroke={CHART_COLORS[index % CHART_COLORS.length]}
						strokeWidth={2}
						type="monotone"
					/>
				))}
			</AreaChart>
		</ChartContainer>
	);
}
