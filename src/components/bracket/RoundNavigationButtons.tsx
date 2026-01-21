"use client";

import { getRoundAbbreviation } from "~/lib/round-utils";
import { cn } from "~/lib/utils";
import type { RoundData } from "./bracket-types";

interface RoundNavigationButtonsProps {
	rounds: RoundData[];
	selectedIndex: number;
	onSelectRound: (index: number) => void;
}

export function RoundNavigationButtons({
	rounds,
	selectedIndex,
	onSelectRound,
}: RoundNavigationButtonsProps) {
	return (
		<div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
			{rounds.map((round, index) => (
				<button
					aria-label={`${round.name}${round.isActive ? " (Active)" : ""}${round.isFinalized ? " (Finalized)" : ""}`}
					aria-pressed={selectedIndex === index}
					className={cn(
						"flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
						"border-2 font-semibold text-sm transition-all",
						selectedIndex === index
							? "border-primary bg-primary text-primary-foreground"
							: "border-border bg-background text-foreground hover:border-primary/50",
					)}
					key={round.id}
					onClick={() => onSelectRound(index)}
					type="button"
				>
					{getRoundAbbreviation(round.name, round.roundNumber)}
				</button>
			))}
		</div>
	);
}
