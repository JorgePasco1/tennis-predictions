"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { api } from "~/trpc/react";

export default function PicksPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = use(params);
	const router = useRouter();

	const { data: tournament } = api.tournaments.getBySlug.useQuery({ slug });
	const submitPicksMutation = api.picks.submitRoundPicks.useMutation();

	const activeRound = tournament?.rounds.find((r) => r.isActive);

	// Query for existing user picks for the active round
	const { data: existingPicks } = api.picks.getUserRoundPicks.useQuery(
		{ roundId: activeRound?.id ?? 0 },
		{ enabled: !!activeRound?.id }
	);

	const [showConfirmDialog, setShowConfirmDialog] = useState(false);

	const [picks, setPicks] = useState<
		Record<
			number,
			{
				predictedWinner: string;
				predictedSetsWon: number;
				predictedSetsLost: number;
			}
		>
	>({});

	if (!tournament) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-gray-600 text-lg">Loading...</div>
			</div>
		);
	}

	if (!activeRound) {
		return (
			<div className="min-h-screen bg-gray-50">
				<nav className="border-b bg-white">
					<div className="container mx-auto px-4 py-4">
						<Link
							className="text-blue-600 transition hover:text-blue-700"
							href={`/tournaments/${slug}`}
						>
							← Back to Tournament
						</Link>
					</div>
				</nav>
				<main className="container mx-auto px-4 py-8">
					<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-12 text-center">
						<div className="mb-4 text-6xl">⏸️</div>
						<h1 className="mb-2 font-bold text-2xl text-gray-900">
							No Active Round
						</h1>
						<p className="text-gray-600">
							There is currently no round accepting picks. Check back soon!
						</p>
					</div>
				</main>
			</div>
		);
	}

	const allPicksComplete =
		activeRound.matches.length > 0 &&
		activeRound.matches.every((match) => picks[match.id]?.predictedWinner);

	const handleSubmitClick = () => {
		if (!allPicksComplete) {
			toast.error("Please complete all picks before submitting");
			return;
		}
		setShowConfirmDialog(true);
	};

	const handleConfirmSubmit = async () => {
		setShowConfirmDialog(false);

		try {
			await submitPicksMutation.mutateAsync({
				roundId: activeRound!.id,
				picks: activeRound!.matches.map((match) => ({
					matchId: match.id,
					predictedWinner: picks[match.id]!.predictedWinner,
					predictedSetsWon: picks[match.id]!.predictedSetsWon,
					predictedSetsLost: picks[match.id]!.predictedSetsLost,
				})),
			});

			toast.success("Picks submitted successfully!");
			router.push(`/tournaments/${slug}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to submit picks");
		}
	};

	// If user has already submitted picks for this round, show readonly view
	if (existingPicks) {
		return (
			<div className="min-h-screen bg-gray-50">
				<nav className="border-b bg-white">
					<div className="container mx-auto px-4 py-4">
						<Link
							className="text-blue-600 transition hover:text-blue-700"
							href={`/tournaments/${slug}`}
						>
							← Back to Tournament
						</Link>
					</div>
				</nav>

				<main className="container mx-auto px-4 py-8">
					<div className="mb-8">
						<h1 className="mb-2 font-bold text-4xl text-gray-900">
							Your Picks
						</h1>
						<p className="text-gray-600">
							{tournament.name} • {activeRound.name}
						</p>
					</div>

					{/* Success Alert */}
					<div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-6">
						<div className="mb-2 font-semibold text-green-900">✓ Submitted</div>
						<p className="text-green-800">
							You submitted your picks on{" "}
							{new Date(existingPicks.submittedAt).toLocaleDateString("en-US", {
								month: "long",
								day: "numeric",
								year: "numeric",
								hour: "numeric",
								minute: "2-digit",
							})}
						</p>
					</div>

					{/* Matches - Readonly */}
					<div className="mb-8 space-y-4">
						{existingPicks.matchPicks.map((pick) => (
							<div
								className="rounded-lg border border-gray-200 bg-white p-6"
								key={pick.matchId}
							>
								<div className="mb-4">
									<div className="mb-2 font-semibold text-gray-900">
										Match {pick.match.matchNumber}
									</div>
									<div className="text-gray-700 text-lg">
										{pick.match.player1Seed && `(${pick.match.player1Seed}) `}
										{pick.match.player1Name}
										<span className="mx-2 text-gray-400">vs</span>
										{pick.match.player2Seed && `(${pick.match.player2Seed}) `}
										{pick.match.player2Name}
									</div>
								</div>

								<div className="space-y-4">
									{/* Winner Display */}
									<div>
										<label className="mb-2 block font-medium text-gray-700 text-sm">
											Your Predicted Winner
										</label>
										<div className="flex gap-4">
											<div
												className={`flex-1 rounded-lg border-2 px-4 py-3 font-semibold ${
													pick.predictedWinner === pick.match.player1Name
														? "border-blue-600 bg-blue-50 text-blue-900"
														: "border-gray-200 bg-gray-50 text-gray-500"
												}`}
											>
												{pick.match.player1Seed && `(${pick.match.player1Seed}) `}
												{pick.match.player1Name}
											</div>
											<div
												className={`flex-1 rounded-lg border-2 px-4 py-3 font-semibold ${
													pick.predictedWinner === pick.match.player2Name
														? "border-blue-600 bg-blue-50 text-blue-900"
														: "border-gray-200 bg-gray-50 text-gray-500"
												}`}
											>
												{pick.match.player2Seed && `(${pick.match.player2Seed}) `}
												{pick.match.player2Name}
											</div>
										</div>
									</div>

									{/* Score Display */}
									<div>
										<label className="mb-2 block font-medium text-gray-700 text-sm">
											Your Predicted Score
										</label>
										<div className="rounded-lg border-2 border-blue-600 bg-blue-50 px-4 py-2 font-semibold text-blue-900 text-center">
											{pick.predictedSetsWon}-{pick.predictedSetsLost}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<nav className="border-b bg-white">
				<div className="container mx-auto px-4 py-4">
					<Link
						className="text-blue-600 transition hover:text-blue-700"
						href={`/tournaments/${slug}`}
					>
						← Back to Tournament
					</Link>
				</div>
			</nav>

			<main className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<h1 className="mb-2 font-bold text-4xl text-gray-900">
						Submit Your Picks
					</h1>
					<p className="text-gray-600">
						{tournament.name} • {activeRound.name}
					</p>
				</div>

				{/* Warning */}
				<div className="mb-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
					<div className="mb-2 font-semibold text-yellow-900">⚠️ Important</div>
					<p className="text-yellow-800">
						Once you submit your picks, they cannot be changed. Make sure all
						your predictions are correct before submitting!
					</p>
				</div>

				{/* Matches */}
				<div className="mb-8 space-y-4">
					{activeRound.matches.map((match) => (
						<div
							className="rounded-lg border border-gray-200 bg-white p-6"
							key={match.id}
						>
							<div className="mb-4">
								<div className="mb-2 font-semibold text-gray-900">
									Match {match.matchNumber}
								</div>
								<div className="text-gray-700 text-lg">
									{match.player1Seed && `(${match.player1Seed}) `}
									{match.player1Name}
									<span className="mx-2 text-gray-400">vs</span>
									{match.player2Seed && `(${match.player2Seed}) `}
									{match.player2Name}
								</div>
							</div>

							<div className="space-y-4">
								{/* Winner Selection */}
								<div>
									<label className="mb-2 block font-medium text-gray-700 text-sm">
										Predicted Winner
									</label>
									<div className="flex gap-4">
										<button
											className={`flex-1 rounded-lg border-2 px-4 py-3 font-semibold transition ${
												picks[match.id]?.predictedWinner === match.player1Name
													? "border-blue-600 bg-blue-50 text-blue-900"
													: "border-gray-300 text-gray-700 hover:border-gray-400"
											}`}
											onClick={() =>
												setPicks((prev) => ({
													...prev,
													[match.id]: {
														predictedWinner: match.player1Name,
														predictedSetsWon:
															prev[match.id]?.predictedSetsWon ?? (tournament.format === "bo5" ? 3 : 2),
														predictedSetsLost:
															prev[match.id]?.predictedSetsLost ?? 0,
													},
												}))
											}
										>
											{match.player1Seed && `(${match.player1Seed}) `}
											{match.player1Name}
										</button>
										<button
											className={`flex-1 rounded-lg border-2 px-4 py-3 font-semibold transition ${
												picks[match.id]?.predictedWinner === match.player2Name
													? "border-blue-600 bg-blue-50 text-blue-900"
													: "border-gray-300 text-gray-700 hover:border-gray-400"
											}`}
											onClick={() =>
												setPicks((prev) => ({
													...prev,
													[match.id]: {
														predictedWinner: match.player2Name,
														predictedSetsWon:
															prev[match.id]?.predictedSetsWon ?? (tournament.format === "bo5" ? 3 : 2),
														predictedSetsLost:
															prev[match.id]?.predictedSetsLost ?? 0,
													},
												}))
											}
										>
											{match.player2Seed && `(${match.player2Seed}) `}
											{match.player2Name}
										</button>
									</div>
								</div>

								{/* Score Prediction */}
								{picks[match.id]?.predictedWinner && (
									<div>
										<label className="mb-2 block font-medium text-gray-700 text-sm">
											Predicted Score
										</label>
										<div className={`grid gap-4 ${tournament.format === "bo5" ? "grid-cols-3" : "grid-cols-2"}`}>
											{tournament.format === "bo3" ? (
												<>
													<button
														className={`rounded-lg border-2 px-4 py-2 font-semibold transition ${
															picks[match.id]?.predictedSetsWon === 2 &&
															picks[match.id]?.predictedSetsLost === 0
																? "border-blue-600 bg-blue-50 text-blue-900"
																: "border-gray-300 text-gray-700 hover:border-gray-400"
														}`}
														onClick={() =>
															setPicks((prev) => ({
																...prev,
																[match.id]: {
																	...prev[match.id]!,
																	predictedSetsWon: 2,
																	predictedSetsLost: 0,
																},
															}))
														}
													>
														2-0
													</button>
													<button
														className={`rounded-lg border-2 px-4 py-2 font-semibold transition ${
															picks[match.id]?.predictedSetsWon === 2 &&
															picks[match.id]?.predictedSetsLost === 1
																? "border-blue-600 bg-blue-50 text-blue-900"
																: "border-gray-300 text-gray-700 hover:border-gray-400"
														}`}
														onClick={() =>
															setPicks((prev) => ({
																...prev,
																[match.id]: {
																	...prev[match.id]!,
																	predictedSetsWon: 2,
																	predictedSetsLost: 1,
																},
															}))
														}
													>
														2-1
													</button>
												</>
											) : (
												<>
													<button
														className={`rounded-lg border-2 px-4 py-2 font-semibold transition ${
															picks[match.id]?.predictedSetsWon === 3 &&
															picks[match.id]?.predictedSetsLost === 0
																? "border-blue-600 bg-blue-50 text-blue-900"
																: "border-gray-300 text-gray-700 hover:border-gray-400"
														}`}
														onClick={() =>
															setPicks((prev) => ({
																...prev,
																[match.id]: {
																	...prev[match.id]!,
																	predictedSetsWon: 3,
																	predictedSetsLost: 0,
																},
															}))
														}
													>
														3-0
													</button>
													<button
														className={`rounded-lg border-2 px-4 py-2 font-semibold transition ${
															picks[match.id]?.predictedSetsWon === 3 &&
															picks[match.id]?.predictedSetsLost === 1
																? "border-blue-600 bg-blue-50 text-blue-900"
																: "border-gray-300 text-gray-700 hover:border-gray-400"
														}`}
														onClick={() =>
															setPicks((prev) => ({
																...prev,
																[match.id]: {
																	...prev[match.id]!,
																	predictedSetsWon: 3,
																	predictedSetsLost: 1,
																},
															}))
														}
													>
														3-1
													</button>
													<button
														className={`rounded-lg border-2 px-4 py-2 font-semibold transition ${
															picks[match.id]?.predictedSetsWon === 3 &&
															picks[match.id]?.predictedSetsLost === 2
																? "border-blue-600 bg-blue-50 text-blue-900"
																: "border-gray-300 text-gray-700 hover:border-gray-400"
														}`}
														onClick={() =>
															setPicks((prev) => ({
																...prev,
																[match.id]: {
																	...prev[match.id]!,
																	predictedSetsWon: 3,
																	predictedSetsLost: 2,
																},
															}))
														}
													>
														3-2
													</button>
												</>
											)}
										</div>
									</div>
								)}
							</div>
						</div>
					))}
				</div>

				{/* Submit Button */}
				<div className="sticky bottom-4 rounded-lg border border-gray-200 bg-white p-6 shadow-lg">
					<div className="flex items-center justify-between">
						<div>
							<div className="font-semibold text-gray-900">
								{Object.keys(picks).length} of {activeRound.matches.length}{" "}
								picks completed
							</div>
							<div className="text-gray-600 text-sm">
								{activeRound.scoringRule &&
									`${activeRound.scoringRule.pointsPerWinner} points per correct winner, +${activeRound.scoringRule.pointsExactScore} for exact score`}
							</div>
						</div>
						<button
							className="rounded-lg bg-green-600 px-8 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={!allPicksComplete || submitPicksMutation.isPending}
							onClick={handleSubmitClick}
						>
							{submitPicksMutation.isPending
								? "Submitting..."
								: "Submit All Picks"}
						</button>
					</div>
				</div>

				{/* Confirmation Dialog */}
				<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Confirm Submission</AlertDialogTitle>
							<AlertDialogDescription>
								Once submitted, your picks cannot be changed. Are you sure you want to submit?
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								className="bg-green-600 hover:bg-green-700"
								onClick={handleConfirmSubmit}
							>
								Submit Picks
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</main>
		</div>
	);
}
