"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

interface MatchPicksModalProps {
	matchId: number | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function formatPlayerName(name: string, seed: number | null) {
	return seed ? `(${seed}) ${name}` : name;
}

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function MatchPicksModal({
	matchId,
	open,
	onOpenChange,
}: MatchPicksModalProps) {
	const { data, isLoading, error } = api.picks.getAllPicksForMatch.useQuery(
		{ matchId: matchId ?? 0 },
		{
			enabled: open && matchId !== null,
		},
	);

	const isFinalized = data?.match.status === "finalized";
	const isRetirement = data?.match.isRetirement;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{data
							? `Match ${data.match.matchNumber}: ${data.round.name}`
							: "Match Predictions"}
					</DialogTitle>
					<DialogDescription>
						{data
							? `${formatPlayerName(data.match.player1Name, data.match.player1Seed)} vs ${formatPlayerName(data.match.player2Name, data.match.player2Seed)}`
							: "Loading..."}
					</DialogDescription>
				</DialogHeader>

				{isLoading && (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				)}

				{error && (
					<div className="py-8 text-center text-muted-foreground">
						{error.message}
					</div>
				)}

				{data && (
					<div className="space-y-4">
						{/* Match result if finalized */}
						{isFinalized && data.match.winnerName && (
							<div
								className={cn(
									"rounded-lg p-3 text-sm",
									isRetirement ? "bg-gray-100" : "bg-green-50",
								)}
							>
								<span className="font-medium">Result: </span>
								{data.match.winnerName} wins {data.match.finalScore}
								{isRetirement && " (Retirement)"}
							</div>
						)}

						{/* Participants list */}
						<div>
							<div className="mb-2 font-medium text-muted-foreground text-sm">
								Predictions ({data.picks.length} participant
								{data.picks.length !== 1 ? "s" : ""})
							</div>
							<div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
								{data.picks.map((p) => (
									<div
										className={cn(
											"flex items-center justify-between rounded-lg border p-3",
											isFinalized &&
												!isRetirement &&
												(p.pick.isWinnerCorrect
													? "border-green-200 bg-green-50"
													: "border-red-200 bg-red-50"),
										)}
										key={p.user.id}
									>
										<div className="flex items-center gap-3">
											<Avatar className="h-8 w-8">
												{p.user.imageUrl && (
													<AvatarImage
														alt={p.user.displayName}
														src={p.user.imageUrl}
													/>
												)}
												<AvatarFallback className="text-xs">
													{getInitials(p.user.displayName)}
												</AvatarFallback>
											</Avatar>
											<div>
												<div className="font-medium text-sm">
													{p.user.displayName}
												</div>
												<div className="text-muted-foreground text-xs">
													{p.pick.predictedWinner} ({p.pick.predictedSetsWon}-
													{p.pick.predictedSetsLost})
												</div>
											</div>
										</div>
										<div className="flex items-center gap-2">
											{isFinalized && !isRetirement && (
												<>
													{p.pick.isWinnerCorrect ? (
														<CheckCircle2 className="h-5 w-5 text-green-600" />
													) : (
														<XCircle className="h-5 w-5 text-red-600" />
													)}
													{p.pick.isExactScore && (
														<span className="rounded bg-green-600 px-1.5 py-0.5 font-medium text-white text-xs">
															Exact
														</span>
													)}
												</>
											)}
											{isFinalized && isRetirement && (
												<span className="text-muted-foreground text-xs">
													Voided
												</span>
											)}
										</div>
									</div>
								))}
								{data.picks.length === 0 && (
									<div className="py-4 text-center text-muted-foreground text-sm">
										No predictions submitted for this match
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
