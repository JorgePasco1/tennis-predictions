"use client";

import Link from "next/link";
import { use, useState } from "react";
import { toast } from "sonner";
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

	const updateTournamentMutation = api.admin.updateTournament.useMutation({
		onSuccess: () => {
			refetch();
			toast.success("Tournament updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update tournament");
		},
	});

	const setActiveRoundMutation = api.admin.setActiveRound.useMutation({
		onSuccess: () => refetch(),
	});

	const finalizeMatchMutation = api.admin.finalizeMatch.useMutation({
		onSuccess: () => refetch(),
	});

	const [selectedRound, setSelectedRound] = useState<number | null>(null);
	const [isEditingProperties, setIsEditingProperties] = useState(false);
	const [editForm, setEditForm] = useState({
		format: "",
		atpUrl: "",
	});
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
				<div className="text-gray-600 text-lg">Loading...</div>
			</div>
		);
	}

	const handleStatusChange = async (
		status: "draft" | "active" | "archived",
	) => {
		await updateStatusMutation.mutateAsync({ id: tournamentId, status });
	};

	const handleEditProperties = () => {
		setEditForm({
			format: tournament?.format || "bo3",
			atpUrl: tournament?.atpUrl || "",
		});
		setIsEditingProperties(true);
	};

	const handleSaveProperties = async () => {
		await updateTournamentMutation.mutateAsync({
			id: tournamentId,
			format: editForm.format as "bo3" | "bo5",
			atpUrl: editForm.atpUrl || undefined,
		});
		setIsEditingProperties(false);
	};

	const handleCancelEdit = () => {
		setIsEditingProperties(false);
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
				error instanceof Error ? error.message : "Failed to finalize match",
			);
		}
	};

	const currentRound = tournament.rounds.find((r) => r.isActive);

	return (
		<div className="min-h-screen bg-gray-50">
			<nav className="border-b bg-white">
				<div className="container mx-auto px-4 py-4">
					<Link
						className="text-blue-600 transition hover:text-blue-700"
						href="/admin"
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
					<h2 className="mb-4 font-semibold text-gray-900 text-xl">
						Tournament Status
					</h2>
					<div className="flex gap-4">
						<button
							className="rounded-lg bg-yellow-600 px-4 py-2 font-semibold text-white transition hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={
								tournament.status === "draft" || updateStatusMutation.isPending
							}
							onClick={() => handleStatusChange("draft")}
						>
							Set to Draft
						</button>
						<button
							className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={
								tournament.status === "active" || updateStatusMutation.isPending
							}
							onClick={() => handleStatusChange("active")}
						>
							Activate
						</button>
						<button
							className="rounded-lg bg-gray-600 px-4 py-2 font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={
								tournament.status === "archived" ||
								updateStatusMutation.isPending
							}
							onClick={() => handleStatusChange("archived")}
						>
							Archive
						</button>
					</div>
				</div>

				{/* Tournament Properties */}
				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="font-semibold text-gray-900 text-xl">
							Tournament Properties
						</h2>
						{!isEditingProperties && (
							<button
								className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
								onClick={handleEditProperties}
								type="button"
							>
								Edit
							</button>
						)}
					</div>

					{!isEditingProperties ? (
						<div className="space-y-2 text-gray-700">
							<p>
								<span className="font-medium">Format:</span>{" "}
								{tournament.format === "bo5" ? "Best of 5 (Grand Slam)" : "Best of 3"}
							</p>
							<p>
								<span className="font-medium">ATP URL:</span>{" "}
								{tournament.atpUrl ? (
									<a
										className="text-blue-600 underline hover:text-blue-800"
										href={tournament.atpUrl}
										rel="noopener noreferrer"
										target="_blank"
									>
										{tournament.atpUrl}
									</a>
								) : (
									<span className="text-gray-500">Not set</span>
								)}
							</p>
						</div>
					) : (
						<div className="space-y-4">
							<div>
								<label className="mb-2 block font-medium text-gray-700 text-sm">
									Tournament Format
								</label>
								<div className="flex gap-4">
									<label className="flex cursor-pointer items-center gap-2">
										<input
											checked={editForm.format === "bo3"}
											className="h-4 w-4 text-blue-600"
											name="format"
											onChange={() =>
												setEditForm((prev) => ({ ...prev, format: "bo3" }))
											}
											type="radio"
											value="bo3"
										/>
										<span className="text-gray-700">
											Best of 3 (Regular tournaments)
										</span>
									</label>
									<label className="flex cursor-pointer items-center gap-2">
										<input
											checked={editForm.format === "bo5"}
											className="h-4 w-4 text-blue-600"
											name="format"
											onChange={() =>
												setEditForm((prev) => ({ ...prev, format: "bo5" }))
											}
											type="radio"
											value="bo5"
										/>
										<span className="text-gray-700">Best of 5 (Grand Slams)</span>
									</label>
								</div>
							</div>

							<div>
								<label
									className="mb-2 block font-medium text-gray-700 text-sm"
									htmlFor="atpUrl"
								>
									ATP Tournament URL
								</label>
								<input
									className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
									id="atpUrl"
									onChange={(e) =>
										setEditForm((prev) => ({ ...prev, atpUrl: e.target.value }))
									}
									placeholder="https://www.atptour.com/..."
									type="url"
									value={editForm.atpUrl}
								/>
							</div>

							<div className="flex gap-4">
								<button
									className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={updateTournamentMutation.isPending}
									onClick={handleSaveProperties}
									type="button"
								>
									{updateTournamentMutation.isPending ? "Saving..." : "Save Changes"}
								</button>
								<button
									className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-50"
									disabled={updateTournamentMutation.isPending}
									onClick={handleCancelEdit}
									type="button"
								>
									Cancel
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Round Management */}
				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<h2 className="mb-4 font-semibold text-gray-900 text-xl">
						Active Round
					</h2>
					<p className="mb-4 text-gray-600">
						Current: {currentRound?.name ?? "None selected"}
					</p>
					<div className="flex flex-wrap gap-2">
						{tournament.rounds.map((round) => (
							<button
								className={`rounded-lg px-4 py-2 font-semibold transition disabled:cursor-not-allowed ${
									round.isActive
										? "bg-green-600 text-white"
										: "bg-gray-200 text-gray-700 hover:bg-gray-300"
								}`}
								disabled={round.isActive || setActiveRoundMutation.isPending}
								key={round.id}
								onClick={() => handleSetActiveRound(round.roundNumber)}
							>
								{round.name}
							</button>
						))}
					</div>
				</div>

				{/* Round Selection */}
				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<h2 className="mb-4 font-semibold text-gray-900 text-xl">
						Manage Results
					</h2>
					<div className="mb-4">
						<label className="mb-2 block font-medium text-gray-700 text-sm">
							Select Round
						</label>
						<select
							className="w-full rounded-lg border border-gray-300 px-4 py-2"
							onChange={(e) =>
								setSelectedRound(
									e.target.value ? Number.parseInt(e.target.value) : null,
								)
							}
							value={selectedRound ?? ""}
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
										className={`rounded-lg border p-4 ${
											match.status === "finalized"
												? "border-green-300 bg-green-50"
												: "border-gray-200 bg-white"
										}`}
										key={match.id}
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
													Winner: {match.winnerName} • Score: {match.finalScore}
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
														className="w-full rounded border px-3 py-2 text-sm"
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
														value={matchResults[match.id]?.winnerName ?? ""}
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
															className="w-full rounded border px-3 py-2 text-sm"
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
															value={matchResults[match.id]?.setsWon ?? 2}
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
															className="w-full rounded border px-3 py-2 text-sm"
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
															value={matchResults[match.id]?.setsLost ?? 0}
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
															className="w-full rounded border px-3 py-2 text-sm"
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
															placeholder="6-4, 7-6(3)"
															type="text"
															value={matchResults[match.id]?.finalScore ?? ""}
														/>
													</div>
												</div>

												<button
													className="rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
													disabled={
														!matchResults[match.id]?.winnerName ||
														!matchResults[match.id]?.finalScore ||
														finalizeMatchMutation.isPending
													}
													onClick={() => handleFinalizeMatch(match.id)}
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
