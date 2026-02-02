"use client";

import type { RouterOutputs } from "~/trpc/react";
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

	if (!hasParticipants) {
		return (
			<div className="rounded-lg border border-dashed bg-muted/50 p-12 text-center">
				<p className="text-lg text-muted-foreground">
					No participants found for this tournament.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Podium - Top 3 */}
			<PodiumDisplay podium={data.podium} />

			{/* Tournament Overview Stats */}
			<TournamentOverview overview={data.overview} />

			{/* Top Performers Grid */}
			{data.topPerformers && (
				<TopPerformersGrid topPerformers={data.topPerformers} />
			)}

			{/* Round Winners Timeline */}
			{data.roundWinners.length > 0 && (
				<RoundWinnersTimeline roundWinners={data.roundWinners} />
			)}

			{/* Creative Stats */}
			{data.creativeStats && (
				<CreativeStatsSection creativeStats={data.creativeStats} />
			)}
		</div>
	);
}
