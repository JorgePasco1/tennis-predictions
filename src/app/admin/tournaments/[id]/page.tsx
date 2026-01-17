"use client";

import { use, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function AdminTournamentManagePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const tournamentId = Number.parseInt(id);

	const { data: tournament, refetch } = api.tournaments.getById.useQuery({
		id: tournamentId,
	});

	const updateStatusMutation = api.tournaments.updateStatus.useMutation({
		onSuccess: () => refetch(),
	});

	const setActiveRoundMutation = api.admin.setActiveRound.useMutation({
		onSuccess: () => refetch(),
	});

	const finalizeMatchMutation = api.admin.finalizeMatch.useMutation({
		onSuccess: () => refetch(),
	});

	const [selectedRound, setSelectedRound] = useState<number | null>(null);
	const [matchResults, setMatchResults] = useState<
		Record<
			number,
			{
				winnerName: string;
				finalScore: string;
				setsWon: number;
				setsLost: number;
			}
		>
	>({});

	if (!tournament) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-lg text-gray-600">Loading...</div>
			</div>
		);
	}

	const handleStatusChange = async (status: "draft" | "active" | "archived") => {
		await updateStatusMutation.mutateAsync({ id: tournamentId, status });
	};

	const handleSetActiveRound = async (roundNumber: number) => {
		await setActiveRoundMutation.mutateAsync({
			tournamentId,
			roundNumber,
		});
	};

	const handleFinalizeMatch = async (matchId: number) => {
		const result = matchResults[matchId];
		if (!result) return;

		try {
			await finalizeMatchMutation.mutateAsync({
				matchId,
				...result,
			});
			// Clear the form
			setMatchResults((prev) => {
				const { [matchId]: _, ...rest } = prev;
				return rest;
			});
		} catch (error) {
			alert(
				error instanceof Error
					? error.message
					: "Failed to finalize match",
			);
		}
	};

	const currentRound = tournament.rounds.find((r) => r.isActive);

	return (
		<div className="min-h-screen bg-gray-50">
			<nav className="border-b bg-white">
				<div className="container mx-auto px-4 py-4">
					<Link
						href="/admin"
						className="text-blue-600 transition hover:text-blue-700"
					>
						← Back to Admin Dashboard
					</Link>
				</div>
			</nav>

			<main className="container mx-auto px-4 py-8">
				<div className="mb-8">
					<h1 className="mb-2 font-bold text-4xl text-gray-900">
						{tournament.name}
					</h1>
					<p className="text-gray-600">
						Year: {tournament.year} • Status: {tournament.status}
					</p>
				</div>

				{/* Status Management */}
				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<h2 className="mb-4 font-semibold text-xl text-gray-900">
						Tournament Status
					</h2>
					<div className="flex gap-4">
						<button
							onClick={() => handleStatusChange("draft")}
							disabled={
								tournament.status === "draft" || updateStatusMutation.isPending
							}
							className="rounded-lg bg-yellow-600 px-4 py-2 font-semibold text-white transition hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Set to Draft
						</button>
						<button
							onClick={() => handleStatusChange("active")}
							disabled={
								tournament.status === "active" || updateStatusMutation.isPending
							}
							className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Activate
						</button>
						<button
							onClick={() => handleStatusChange("archived")}
							disabled={
								tournament.status === "archived" ||
								updateStatusMutation.isPending
							}
							className="rounded-lg bg-gray-600 px-4 py-2 font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Archive
						</button>
					</div>
				</div>

				{/* Round Management */}
				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<h2 className="mb-4 font-semibold text-xl text-gray-900">
						Active Round
					</h2>
					<p className="mb-4 text-gray-600">
						Current: {currentRound?.name ?? "None selected"}
					</p>
					<div className="flex flex-wrap gap-2">
						{tournament.rounds.map((round) => (
							<button
								key={round.id}
								onClick={() => handleSetActiveRound(round.roundNumber)}
								disabled={round.isActive || setActiveRoundMutation.isPending}
								className={`rounded-lg px-4 py-2 font-semibold transition disabled:cursor-not-allowed ${
									round.isActive
										? "bg-green-600 text-white"
										: "bg-gray-200 text-gray-700 hover:bg-gray-300"
								}`}
							>
								{round.name}
							</button>
						))}
					</div>
				</div>

				{/* Round Selection */}
				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<h2 className="mb-4 font-semibold text-xl text-gray-900">
						Manage Results
					</h2>
					<div className="mb-4">
						<label className="mb-2 block font-medium text-gray-700 text-sm">
							Select Round
						</label>
						<select
							value={selectedRound ?? ""}
							onChange={(e) =>
								setSelectedRound(
									e.target.value ? Number.parseInt(e.target.value) : null,
								)
							}
							className="w-full rounded-lg border border-gray-300 px-4 py-2"
						>
							<option value="">Choose a round...</option>
							{tournament.rounds.map((round) => (
								<option key={round.id} value={round.id}>
									{round.name} ({round.matches.length} matches)
								</option>
							))}
						</select>
					</div>

					{/* Matches */}
					{selectedRound && (
						<div className="space-y-4">
							{tournament.rounds
								.find((r) => r.id === selectedRound)
								?.matches.map((match) => (
									<div
										key={match.id}
										className={`rounded-lg border p-4 ${
											match.status === "finalized"
												? "border-green-300 bg-green-50"
												: "border-gray-200 bg-white"
										}`}
									>
										<div className="mb-4">
											<div className="mb-2 flex items-start justify-between">
												<div>
													<div className="font-semibold text-gray-900">
														Match {match.matchNumber}
													</div>
													<div className="text-gray-600">
														{match.player1Seed && `(${match.player1Seed}) `}
														{match.player1Name} vs{" "}
														{match.player2Seed && `(${match.player2Seed}) `}
														{match.player2Name}
													</div>
												</div>
												{match.status === "finalized" && (
													<span className="rounded-full bg-green-600 px-3 py-1 font-medium text-white text-xs">
														Finalized
													</span>
												)}
											</div>
											{match.status === "finalized" && (
												<div className="mt-2 text-green-800 text-sm">
													Winner: {match.winnerName} • Score:{" "}
													{match.finalScore}
												</div>
											)}
										</div>

										{match.status === "pending" && (
											<div className="space-y-3 border-t pt-4">
												<div>
													<label className="mb-1 block text-gray-700 text-sm">
														Winner
													</label>
													<select
														value={matchResults[match.id]?.winnerName ?? ""}
														onChange={(e) =>
															setMatchResults((prev) => ({
																...prev,
																[match.id]: {
																	...prev[match.id],
																	winnerName: e.target.value,
																	finalScore: prev[match.id]?.finalScore ?? "",
																	setsWon: prev[match.id]?.setsWon ?? 2,
																	setsLost: prev[match.id]?.setsLost ?? 0,
																},
															}))
														}
														className="w-full rounded border px-3 py-2 text-sm"
													>
														<option value="">Select winner...</option>
														<option value={match.player1Name}>
															{match.player1Name}
														</option>
														<option value={match.player2Name}>
															{match.player2Name}
														</option>
													</select>
												</div>

												<div className="grid grid-cols-3 gap-3">
													<div>
														<label className="mb-1 block text-gray-700 text-sm">
															Sets Won
														</label>
														<select
															value={matchResults[match.id]?.setsWon ?? 2}
															onChange={(e) =>
																setMatchResults((prev) => ({
																	...prev,
																	[match.id]: {
																		...prev[match.id],
																		winnerName:
																			prev[match.id]?.winnerName ?? "",
																		finalScore:
																			prev[match.id]?.finalScore ?? "",
																		setsWon: Number.parseInt(e.target.value),
																		setsLost: prev[match.id]?.setsLost ?? 0,
																	},
																}))
															}
															className="w-full rounded border px-3 py-2 text-sm"
														>
															<option value={2}>2</option>
															<option value={3}>3</option>
														</select>
													</div>
													<div>
														<label className="mb-1 block text-gray-700 text-sm">
															Sets Lost
														</label>
														<select
															value={matchResults[match.id]?.setsLost ?? 0}
															onChange={(e) =>
																setMatchResults((prev) => ({
																	...prev,
																	[match.id]: {
																		...prev[match.id],
																		winnerName:
																			prev[match.id]?.winnerName ?? "",
																		finalScore:
																			prev[match.id]?.finalScore ?? "",
																		setsWon: prev[match.id]?.setsWon ?? 2,
																		setsLost: Number.parseInt(e.target.value),
																	},
																}))
															}
															className="w-full rounded border px-3 py-2 text-sm"
														>
															<option value={0}>0</option>
															<option value={1}>1</option>
															<option value={2}>2</option>
														</select>
													</div>
													<div>
														<label className="mb-1 block text-gray-700 text-sm">
															Final Score
														</label>
														<input
															type="text"
															placeholder="6-4, 7-6(3)"
															value={matchResults[match.id]?.finalScore ?? ""}
															onChange={(e) =>
																setMatchResults((prev) => ({
																	...prev,
																	[match.id]: {
																		...prev[match.id],
																		winnerName:
																			prev[match.id]?.winnerName ?? "",
																		finalScore: e.target.value,
																		setsWon: prev[match.id]?.setsWon ?? 2,
																		setsLost: prev[match.id]?.setsLost ?? 0,
																	},
																}))
															}
															className="w-full rounded border px-3 py-2 text-sm"
														/>
													</div>
												</div>

												<button
													onClick={() => handleFinalizeMatch(match.id)}
													disabled={
														!matchResults[match.id]?.winnerName ||
														!matchResults[match.id]?.finalScore ||
														finalizeMatchMutation.isPending
													}
													className="rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
												>
													Finalize Result
												</button>
											</div>
										)}
									</div>
								))}
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
