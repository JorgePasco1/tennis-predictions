import type { RouterOutputs } from "~/trpc/react";
import { AchievementsSection } from "./AchievementsSection";
import { CreativeStatsSection } from "./CreativeStatsSection";
import { PodiumDisplay } from "./PodiumDisplay";
import { RoundWinnersTimeline } from "./RoundWinnersTimeline";
import { TopPerformersGrid } from "./TopPerformersGrid";
import { TournamentOverview } from "./TournamentOverview";

type SummaryData = RouterOutputs["summary"]["getTournamentSummary"];

interface TournamentSummaryViewProps {
	data: SummaryData;
}

export function TournamentSummaryView({ data }: TournamentSummaryViewProps) {
	const hasParticipants = data.overview.totalParticipants > 0;

	return (
		<div className="space-y-8">
			{/* Tournament Overview Stats - always show */}
			<TournamentOverview overview={data.overview} />

			{/* No participants message */}
			{!hasParticipants && (
				<div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
					<p className="text-muted-foreground">
						No participants submitted picks for this tournament.
					</p>
				</div>
			)}

			{/* Podium - Top 3 */}
			{hasParticipants && <PodiumDisplay podium={data.podium} />}

			{/* Top Performers Grid */}
			{hasParticipants && data.topPerformers && (
				<TopPerformersGrid topPerformers={data.topPerformers} />
			)}

			{/* Round Winners Timeline */}
			{hasParticipants && data.roundWinners.length > 0 && (
				<RoundWinnersTimeline roundWinners={data.roundWinners} />
			)}

			{/* Creative Stats */}
			{hasParticipants && data.creativeStats && (
				<CreativeStatsSection creativeStats={data.creativeStats} />
			)}

			{/* Achievements */}
			{data.achievements && data.achievements.length > 0 && (
				<AchievementsSection achievements={data.achievements} />
			)}
		</div>
	);
}
