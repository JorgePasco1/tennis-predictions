"use client";

import { Area, AreaChart, CartesianGrid, Label, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
} from "~/components/ui/chart";

interface ProgressionDataPoint {
	matchIndex: number;
	label: string;
	rankings: Array<{
		userId: string;
		displayName: string;
		imageUrl: string | null;
		cumulativePoints: number;
		rank: number;
	}>;
}

interface LeaderboardProgressionChartProps {
	progressionData: ProgressionDataPoint[];
	topN?: number;
}

// Custom dot component to render user avatars
interface CustomDotProps {
	cx?: number;
	cy?: number;
	payload?: Record<string, unknown>;
	dataKey?: string;
	userImages: Map<string, string | null>;
}

function CustomDot({ cx, cy, dataKey, userImages }: CustomDotProps) {
	if (cx === undefined || cy === undefined || !dataKey) return null;

	const imageUrl = userImages.get(dataKey);
	const size = 28;

	return (
		<foreignObject
			height={size + 4}
			width={size + 4}
			x={cx - size / 2 - 2}
			y={cy - size / 2 - 2}
		>
			<div
				style={{
					width: size + 4,
					height: size + 4,
					borderRadius: "50%",
					backgroundColor: "white",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
				}}
			>
				{imageUrl ? (
					// biome-ignore lint/performance/noImgElement: Using img inside SVG foreignObject where Next.js Image doesn't work
					<img
						alt={dataKey}
						src={imageUrl}
						style={{
							width: size,
							height: size,
							borderRadius: "50%",
							objectFit: "cover",
						}}
					/>
				) : (
					<div
						style={{
							width: size,
							height: size,
							borderRadius: "50%",
							backgroundColor: "#9ca3af",
						}}
					/>
				)}
			</div>
		</foreignObject>
	);
}

// Color palette for users - distinct, vibrant colors
const CHART_COLORS = [
	"#2563eb", // Blue
	"#dc2626", // Red
	"#16a34a", // Green
	"#9333ea", // Purple
	"#ea580c", // Orange
	"#0891b2", // Cyan
	"#c026d3", // Fuchsia
	"#ca8a04", // Yellow
	"#4f46e5", // Indigo
	"#059669", // Emerald
];

// Custom tooltip that shows players sorted by rank with their points
interface TooltipPayloadEntry {
	dataKey?: string | number;
	value?: unknown;
	color?: string;
}

interface CustomTooltipProps {
	active?: boolean;
	payload?: TooltipPayloadEntry[];
	label?: string;
	pointsData: Map<string, Map<string, number>>; // label -> displayName -> points
}

function CustomTooltip({
	active,
	payload,
	label,
	pointsData,
}: CustomTooltipProps) {
	if (!active || !payload || !label) return null;

	// Get points for this label and sort by rank (which is the value)
	const validPayload = payload.filter(
		(
			p,
		): p is TooltipPayloadEntry & { dataKey: string | number; value: number } =>
			p.dataKey !== undefined && typeof p.value === "number",
	);
	const sortedPayload = [...validPayload].sort((a, b) => a.value - b.value);
	const labelPoints = pointsData.get(String(label));

	return (
		<div className="rounded-lg border bg-background p-2 shadow-sm">
			<div className="mb-2 font-medium text-sm">{label} matches</div>
			<div className="space-y-1">
				{sortedPayload.map((entry) => {
					const dataKey = String(entry.dataKey);
					const points = labelPoints?.get(dataKey) ?? 0;
					return (
						<div
							className="flex items-center justify-between gap-4 text-sm"
							key={dataKey}
						>
							<div className="flex items-center gap-2">
								<div
									className="h-3 w-3 rounded-full"
									style={{ backgroundColor: entry.color }}
								/>
								<span>{dataKey}</span>
							</div>
							<span className="font-medium">{points} pts</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export function LeaderboardProgressionChart({
	progressionData,
	topN = 10,
}: LeaderboardProgressionChartProps) {
	if (progressionData.length === 0) {
		return (
			<div className="flex h-[300px] items-center justify-center text-muted-foreground">
				No data available for chart
			</div>
		);
	}

	// Get top N users from the final data point
	const finalPoint = progressionData[progressionData.length - 1];
	const topUsers = finalPoint?.rankings.slice(0, topN) ?? [];

	if (topUsers.length === 0) {
		return (
			<div className="flex h-[300px] items-center justify-center text-muted-foreground">
				No data available for chart
			</div>
		);
	}

	// Prepare chart data: each progression point is a data point
	// Also build a map of points for the tooltip
	const pointsData = new Map<string, Map<string, number>>();

	const chartData = progressionData.map((point) => {
		const dataPoint: Record<string, string | number> = {
			label: point.label,
		};

		const labelPoints = new Map<string, number>();

		for (const topUser of topUsers) {
			const userRanking = point.rankings.find(
				(r) => r.userId === topUser.userId,
			);
			dataPoint[topUser.displayName] = userRanking?.rank ?? 0;
			labelPoints.set(topUser.displayName, userRanking?.cumulativePoints ?? 0);
		}

		pointsData.set(point.label, labelPoints);
		return dataPoint;
	});

	// Build chart config for colors
	const chartConfig: ChartConfig = {};
	const userImages = new Map<string, string | null>();

	for (let i = 0; i < topUsers.length; i++) {
		const user = topUsers[i];
		if (user) {
			chartConfig[user.displayName] = {
				label: user.displayName,
				color: CHART_COLORS[i % CHART_COLORS.length],
			};
			userImages.set(user.displayName, user.imageUrl);
		}
	}

	return (
		<ChartContainer
			className="h-[350px] w-full sm:h-[450px]"
			config={chartConfig}
		>
			<AreaChart
				data={chartData}
				margin={{ top: 25, right: 20, left: 10, bottom: 30 }}
			>
				<CartesianGrid strokeDasharray="3 3" />
				<XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={8}>
					<Label offset={-20} position="insideBottom" value="Matches Played" />
				</XAxis>
				<YAxis
					allowDecimals={false}
					axisLine={false}
					domain={[1, "auto"]}
					label={{ value: "Rank", angle: -90, position: "insideLeft" }}
					reversed
					tickLine={false}
					tickMargin={8}
				/>
				<ChartTooltip
					content={(props) => (
						<CustomTooltip {...props} pointsData={pointsData} />
					)}
				/>
				{topUsers.map((user, index) => (
					<Area
						connectNulls={false}
						dataKey={user.displayName}
						dot={(props) => <CustomDot {...props} userImages={userImages} />}
						fill="transparent"
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
