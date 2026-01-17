"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
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

	const handleSubmit = async () => {
		if (!allPicksComplete) {
			alert("Please complete all picks before submitting");
			return;
		}

		const confirmed = confirm(
			"Once submitted, your picks cannot be changed. Are you sure you want to submit?",
		);

		if (!confirmed) return;

		try {
			await submitPicksMutation.mutateAsync({
				roundId: activeRound.id,
				picks: activeRound.matches.map((match) => ({
					matchId: match.id,
					predictedWinner: picks[match.id]!.predictedWinner,
					predictedSetsWon: picks[match.id]!.predictedSetsWon,
					predictedSetsLost: picks[match.id]!.predictedSetsLost,
				})),
			});

			alert("Picks submitted successfully!");
			router.push(`/tournaments/${slug}`);
		} catch (error) {
			alert(error instanceof Error ? error.message : "Failed to submit picks");
		}
	};

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
															prev[match.id]?.predictedSetsWon ?? 2,
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
															prev[match.id]?.predictedSetsWon ?? 2,
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
										<div className="grid grid-cols-3 gap-4">
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
							onClick={handleSubmit}
						>
							{submitPicksMutation.isPending
								? "Submitting..."
								: "Submit All Picks"}
						</button>
					</div>
				</div>
			</main>
		</div>
	);
}
