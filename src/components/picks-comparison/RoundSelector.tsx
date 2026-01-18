"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";

interface Round {
	id: number;
	name: string;
	roundNumber: number;
	isActive: boolean;
	isFinalized: boolean;
}

interface RoundSelectorProps {
	rounds: Round[];
	selectedRoundId: number | null;
	onRoundChange: (roundId: number) => void;
}

export function RoundSelector({
	rounds,
	selectedRoundId,
	onRoundChange,
}: RoundSelectorProps) {
	return (
		<div className="flex items-center gap-2">
			<label className="text-muted-foreground text-sm" htmlFor="round-select">
				Round:
			</label>
			<Select
				onValueChange={(value) => onRoundChange(Number(value))}
				value={selectedRoundId?.toString() ?? ""}
			>
				<SelectTrigger className="w-full" id="round-select">
					<SelectValue placeholder="Select a round" />
				</SelectTrigger>
				<SelectContent>
					{rounds.map((round) => (
						<SelectItem key={round.id} value={round.id.toString()}>
							{round.name}
							{round.isFinalized && " (Finalized)"}
							{round.isActive && !round.isFinalized && " (Active)"}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
