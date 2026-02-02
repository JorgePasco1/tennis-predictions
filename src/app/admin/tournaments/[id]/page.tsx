"use client";

import Link from "next/link";
import { use, useState } from "react";
import { toast } from "sonner";
import {
	filterMatchesByPlayerName,
	SearchInput,
	SearchResultsCount,
} from "~/components/match-search";
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
import { formatPlayerName } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function AdminTournamentManagePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const tournamentId = Number.parseInt(id, 10);

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

	const unfinalizeMatchMutation = api.admin.unfinalizeMatch.useMutation({
		onSuccess: () => refetch(),
	});

	const closeSubmissionsMutation = api.admin.closeRoundSubmissions.useMutation({
		onSuccess: (result) => {
			refetch();
			toast.success(
				`Submissions closed! ${result.draftsFinalized} draft(s) were automatically finalized.`,
			);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to close submissions");
		},
	});

	const reopenSubmissionsMutation = api.admin.reopenRoundSubmissions.useMutation(
		{
			onSuccess: (result) => {
				refetch();
				if (result.finalizedMatches > 0) {
					toast.success(
						`Submissions reopened! ${result.pendingMatches} of ${result.totalMatches} matches are available for voting (${result.finalizedMatches} already finalized).`,
					);
				} else {
					toast.success("Submissions reopened for all matches!");
				}
			},
			onError: (error) => {
				toast.error(error.message || "Failed to reopen submissions");
			},
		},
	);

	// TODO: Remove closeRound UI - rounds now auto-finalize when all matches complete
	// Stub mutation to prevent TypeScript errors - does not actually call API
	const closeRoundMutation = {
		isPending: false,
		mutateAsync: async () => {
			toast.info("Rounds now auto-finalize when all matches are complete");
		},
	};

	const updateRoundDatesMutation = api.admin.updateRoundDates.useMutation({
		onSuccess: () => {
			refetch();
			toast.success("Round dates updated successfully");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update round dates");
		},
	});

	const createRoundMutation = api.admin.createRound.useMutation({
		onSuccess: (result) => {
			refetch();
			toast.success(
				`Round "${result.name}" created with ${result.matchCount} matches`,
			);
			setShowCreateRoundDialog(false);
			setCreateRoundForm({
				name: "",
				matchCount: 32,
				opensAt: "",
				deadline: "",
			});
		},
		onError: (error) => {
			toast.error(error.message || "Failed to create round");
		},
	});

	const deleteTournamentMutation = api.admin.deleteTournament.useMutation({
		onSuccess: (result) => {
			toast.success(
				`Tournament "${result.tournamentName}" deleted successfully.${result.picksAffected > 0 ? ` ${result.picksAffected} user picks affected.` : ""}`,
			);
			// Redirect to admin dashboard
			window.location.href = "/admin";
		},
		onError: (error) => {
			toast.error(error.message || "Failed to delete tournament");
		},
	});

	const closeTournamentMutation = api.admin.closeTournament.useMutation({
		onSuccess: (result) => {
			refetch();
			toast.success(
				`Tournament closed successfully! Summary: ${result.summary.totalRounds} rounds, ${result.summary.totalMatches} matches, ${result.summary.totalParticipants} participants.`,
			);
			setShowCloseTournamentDialog(false);
		},
		onError: (error) => {
			toast.error(error.message || "Failed to close tournament");
		},
	});

	const reopenTournamentMutation = api.admin.reopenTournament.useMutation({
		onSuccess: () => {
			refetch();
			toast.success("Tournament reopened successfully!");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to reopen tournament");
		},
	});

	const [selectedRound, setSelectedRound] = useState<number | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
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
				setsWon?: number;
				setsLost?: number;
				isRetirement?: boolean;
			}
		>
	>({});
	const [showCloseDialog, setShowCloseDialog] = useState(false);
	const [closeDialogData, setCloseDialogData] = useState<{
		roundId: number;
		roundName: string;
	} | null>(null);
	const [showReopenDialog, setShowReopenDialog] = useState(false);
	const [reopenDialogData, setReopenDialogData] = useState<{
		roundId: number;
		roundName: string;
		pendingMatches: number;
		finalizedMatches: number;
	} | null>(null);
	const [showUnfinalizeDialog, setShowUnfinalizeDialog] = useState(false);
	const [unfinalizeMatchId, setUnfinalizeMatchId] = useState<number | null>(
		null,
	);
	const [showCloseRoundDialog, setShowCloseRoundDialog] = useState(false);
	// TODO: Remove closeRound UI - rounds now auto-finalize when all matches complete
	const [closeRoundDialogData, setCloseRoundDialogData] = useState<{
		roundId: number;
		roundName: string;
		hasNextRound: boolean;
	} | null>(null);
	const [activateNextRound, setActivateNextRound] = useState(false);
	const [showCreateRoundDialog, setShowCreateRoundDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showCloseTournamentDialog, setShowCloseTournamentDialog] =
		useState(false);
	const [createRoundForm, setCreateRoundForm] = useState({
		name: "",
		matchCount: 32,
		opensAt: "",
		deadline: "",
	});
	const [editingRoundDates, setEditingRoundDates] = useState<number | null>(
		null,
	);
	const [roundDatesForm, setRoundDatesForm] = useState({
		opensAt: "",
		deadline: "",
	});

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

	const handleScoreSelect = (
		matchId: number,
		setsWon: number,
		setsLost: number,
	) => {
		setMatchResults((prev) => ({
			...prev,
			[matchId]: {
				...prev[matchId],
				winnerName: prev[matchId]?.winnerName ?? "",
				setsWon,
				setsLost,
			},
		}));
	};

	const handleFinalizeMatch = async (matchId: number) => {
		const result = matchResults[matchId];
		if (
			!result ||
			result.setsWon === undefined ||
			result.setsLost === undefined
		)
			return;

		// Generate simple finalScore from setsWon-setsLost
		const finalScore = `${result.setsWon}-${result.setsLost}`;

		try {
			await finalizeMatchMutation.mutateAsync({
				matchId,
				winnerName: result.winnerName,
				setsWon: result.setsWon,
				setsLost: result.setsLost,
				finalScore,
				isRetirement: result.isRetirement ?? false,
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

	const handleUnfinalizeMatch = (matchId: number) => {
		setUnfinalizeMatchId(matchId);
		setShowUnfinalizeDialog(true);
	};

	const handleConfirmUnfinalize = async () => {
		if (!unfinalizeMatchId) return;

		setShowUnfinalizeDialog(false);

		try {
			await unfinalizeMatchMutation.mutateAsync({ matchId: unfinalizeMatchId });
			toast.success("Match unfinalized successfully");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to unfinalize match",
			);
		}
	};

	const handleCloseSubmissions = (roundId: number, roundName: string) => {
		setCloseDialogData({ roundId, roundName });
		setShowCloseDialog(true);
	};

	const handleConfirmClose = async () => {
		if (!closeDialogData) return;

		setShowCloseDialog(false);

		try {
			await closeSubmissionsMutation.mutateAsync({
				roundId: closeDialogData.roundId,
			});
		} catch (error) {
			// Error toast is already handled by the mutation's onError
			console.error("Failed to close submissions:", error);
		}
	};

	const handleReopenSubmissions = (
		roundId: number,
		roundName: string,
		pendingMatches: number,
		finalizedMatches: number,
	) => {
		setReopenDialogData({ roundId, roundName, pendingMatches, finalizedMatches });
		setShowReopenDialog(true);
	};

	const handleConfirmReopen = async () => {
		if (!reopenDialogData) return;

		setShowReopenDialog(false);

		try {
			await reopenSubmissionsMutation.mutateAsync({
				roundId: reopenDialogData.roundId,
			});
		} catch (error) {
			// Error toast is already handled by the mutation's onError
			console.error("Failed to reopen submissions:", error);
		}
	};

	// TODO: Remove closeRound UI
	const handleOpenCloseRoundDialog = (
		roundId: number,
		roundName: string,
		hasNextRound: boolean,
	) => {
		setCloseRoundDialogData({ roundId, roundName, hasNextRound });
		setActivateNextRound(false);
		setShowCloseRoundDialog(true);
	};

	const handleConfirmCloseRound = async () => {
		if (!closeRoundDialogData) return;
		setShowCloseRoundDialog(false);

		try {
			await closeRoundMutation.mutateAsync();
		} catch (error) {
			console.error("Failed to close round:", error);
		}
	};

	const handleCreateRound = async () => {
		if (!createRoundForm.name || createRoundForm.matchCount < 1) {
			toast.error("Please enter a round name and match count");
			return;
		}

		try {
			await createRoundMutation.mutateAsync({
				tournamentId,
				name: createRoundForm.name,
				matchCount: createRoundForm.matchCount,
				opensAt: createRoundForm.opensAt || null,
				deadline: createRoundForm.deadline || null,
			});
		} catch (error) {
			console.error("Failed to create round:", error);
		}
	};

	const handleStartEditRoundDates = (roundId: number) => {
		const round = tournament.rounds.find((r) => r.id === roundId);
		if (!round) return;

		setEditingRoundDates(roundId);
		setRoundDatesForm({
			opensAt: round.opensAt
				? new Date(round.opensAt).toISOString().slice(0, 16)
				: "",
			deadline: round.deadline
				? new Date(round.deadline).toISOString().slice(0, 16)
				: "",
		});
	};

	const handleSaveRoundDates = async (roundId: number) => {
		try {
			await updateRoundDatesMutation.mutateAsync({
				roundId,
				opensAt: roundDatesForm.opensAt
					? new Date(roundDatesForm.opensAt).toISOString()
					: null,
				deadline: roundDatesForm.deadline
					? new Date(roundDatesForm.deadline).toISOString()
					: null,
			});
			setEditingRoundDates(null);
		} catch (error) {
			console.error("Failed to update round dates:", error);
		}
	};

	const handleCancelEditRoundDates = () => {
		setEditingRoundDates(null);
		setRoundDatesForm({ opensAt: "", deadline: "" });
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
						{tournament.closedAt && (
							<span className="ml-2 text-green-600">
								• Closed: {new Date(tournament.closedAt).toLocaleDateString()}
							</span>
						)}
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
						<button
							className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={deleteTournamentMutation.isPending}
							onClick={() => setShowDeleteDialog(true)}
							type="button"
						>
							Delete Tournament
						</button>
						{tournament.status === "active" && (
							<button
								className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={closeTournamentMutation.isPending}
								onClick={() => setShowCloseTournamentDialog(true)}
								type="button"
							>
								Close Tournament
							</button>
						)}
						{tournament.status === "archived" && tournament.closedAt && (
							<button
								className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={reopenTournamentMutation.isPending}
								onClick={async () => {
									try {
										await reopenTournamentMutation.mutateAsync({
											tournamentId,
										});
									} catch {
										// Error handled by onError
									}
								}}
								type="button"
							>
								{reopenTournamentMutation.isPending
									? "Reopening..."
									: "Reopen Tournament"}
							</button>
						)}
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
								{tournament.format === "bo5"
									? "Best of 5 (Grand Slam)"
									: "Best of 3"}
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
										<span className="text-gray-700">
											Best of 5 (Grand Slams)
										</span>
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
									{updateTournamentMutation.isPending
										? "Saving..."
										: "Save Changes"}
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
					<div className="mb-4 flex items-center justify-between">
						<h2 className="font-semibold text-gray-900 text-xl">
							Active Round
						</h2>
						<button
							className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
							onClick={() => setShowCreateRoundDialog(true)}
							type="button"
						>
							+ Create Round
						</button>
					</div>
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
								type="button"
							>
								{round.name}
							</button>
						))}
					</div>
				</div>

				{/* Round Schedule */}
				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<h2 className="mb-4 font-semibold text-gray-900 text-xl">
						Round Schedule
					</h2>
					<p className="mb-4 text-gray-600 text-sm">
						Set when each round opens for submissions and its deadline.
					</p>
					<div className="space-y-4">
						{tournament.rounds.map((round) => (
							<div
								className="rounded border border-gray-200 p-4"
								key={round.id}
							>
								<div className="flex items-center justify-between">
									<div>
										<span className="font-medium">{round.name}</span>
										{editingRoundDates !== round.id && (
											<div className="mt-1 text-gray-500 text-sm">
												<span>
													Opens:{" "}
													{round.opensAt
														? new Date(round.opensAt).toLocaleString()
														: "Not set"}
												</span>
												<span className="mx-2">|</span>
												<span>
													Deadline:{" "}
													{round.deadline
														? new Date(round.deadline).toLocaleString()
														: "Not set"}
												</span>
											</div>
										)}
									</div>
									{editingRoundDates !== round.id && (
										<button
											className="rounded bg-gray-100 px-3 py-1 text-gray-700 text-sm hover:bg-gray-200"
											onClick={() => handleStartEditRoundDates(round.id)}
											type="button"
										>
											Edit Dates
										</button>
									)}
								</div>

								{editingRoundDates === round.id && (
									<div className="mt-4 space-y-3">
										<div className="grid gap-4 md:grid-cols-2">
											<div>
												<label
													className="mb-1 block font-medium text-gray-700 text-sm"
													htmlFor={`opensAt-${round.id}`}
												>
													Opens At
												</label>
												<input
													className="w-full rounded border border-gray-300 px-3 py-2"
													id={`opensAt-${round.id}`}
													onChange={(e) =>
														setRoundDatesForm((prev) => ({
															...prev,
															opensAt: e.target.value,
														}))
													}
													type="datetime-local"
													value={roundDatesForm.opensAt}
												/>
											</div>
											<div>
												<label
													className="mb-1 block font-medium text-gray-700 text-sm"
													htmlFor={`deadline-${round.id}`}
												>
													Deadline
												</label>
												<input
													className="w-full rounded border border-gray-300 px-3 py-2"
													id={`deadline-${round.id}`}
													onChange={(e) =>
														setRoundDatesForm((prev) => ({
															...prev,
															deadline: e.target.value,
														}))
													}
													type="datetime-local"
													value={roundDatesForm.deadline}
												/>
											</div>
										</div>
										<div className="flex gap-2">
											<button
												className="rounded bg-green-600 px-4 py-2 font-medium text-sm text-white hover:bg-green-700 disabled:opacity-50"
												disabled={updateRoundDatesMutation.isPending}
												onClick={() => handleSaveRoundDates(round.id)}
												type="button"
											>
												{updateRoundDatesMutation.isPending
													? "Saving..."
													: "Save"}
											</button>
											<button
												className="rounded bg-gray-200 px-4 py-2 font-medium text-gray-700 text-sm hover:bg-gray-300"
												onClick={handleCancelEditRoundDates}
												type="button"
											>
												Cancel
											</button>
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Submission Control */}
				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<h2 className="mb-4 font-semibold text-gray-900 text-xl">
						Submission Control
					</h2>
					<p className="mb-4 text-gray-600 text-sm">
						Close submissions for a round to prevent new picks and automatically
						finalize all existing drafts. Reopen to allow submissions for
						pending matches.
					</p>
					<div className="flex flex-wrap gap-4">
						{tournament.rounds.map((round) => {
							const isClosed = !!round.submissionsClosedAt;
							const canClose = round.isActive && !isClosed;
							const activeMatches = round.matches.filter((m) => !m.deletedAt);
							const pendingMatches = activeMatches.filter(
								(m) => m.status === "pending",
							);
							const finalizedMatches = activeMatches.filter(
								(m) => m.status === "finalized",
							);
							const canReopen = isClosed && round.isActive;

							return (
								<div
									className="flex flex-col rounded border border-gray-200 p-3"
									key={round.id}
								>
									<span className="mb-2 font-medium">{round.name}</span>
									<div className="flex gap-2">
										{!isClosed ? (
											<button
												className={`rounded px-4 py-2 font-medium text-sm transition ${
													canClose
														? "bg-red-500 text-white hover:bg-red-600"
														: "cursor-not-allowed bg-gray-200 text-gray-500"
												}`}
												disabled={
													!canClose || closeSubmissionsMutation.isPending
												}
												onClick={() =>
													handleCloseSubmissions(round.id, round.name)
												}
												type="button"
											>
												Close
											</button>
										) : (
											<>
												<span className="rounded bg-gray-100 px-3 py-2 text-gray-600 text-sm">
													✓ Closed
												</span>
												{canReopen && (
													<button
														className="rounded bg-green-500 px-4 py-2 font-medium text-sm text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
														disabled={reopenSubmissionsMutation.isPending}
														onClick={() =>
															handleReopenSubmissions(
																round.id,
																round.name,
																pendingMatches.length,
																finalizedMatches.length,
															)
														}
														type="button"
													>
														Reopen
													</button>
												)}
											</>
										)}
									</div>
									{isClosed && round.submissionsClosedAt && (
										<span className="mt-2 text-gray-500 text-xs">
											Closed:{" "}
											{new Date(round.submissionsClosedAt).toLocaleString()}
										</span>
									)}
									{isClosed && finalizedMatches.length > 0 && (
										<span className="mt-1 text-orange-600 text-xs">
											{finalizedMatches.length} of {activeMatches.length}{" "}
											matches finalized
										</span>
									)}
								</div>
							);
						})}
					</div>
				</div>

				{/* Round Finalization */}
				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<h2 className="mb-4 font-semibold text-gray-900 text-xl">
						Round Finalization
					</h2>
					<p className="mb-4 text-gray-600 text-sm">
						Close a round after all matches are finalized. This will propagate
						winners to the next round.
					</p>
					<div className="space-y-3">
						{tournament.rounds.map((round) => {
							const activeMatches = round.matches.filter((m) => !m.deletedAt);
							const pendingMatches = activeMatches.filter(
								(m) => m.status === "pending",
							);
							const allFinalized = pendingMatches.length === 0;
							const isClosed = round.isFinalized;
							const canClose = allFinalized && !isClosed;
							const nextRound = tournament.rounds.find(
								(r) => r.roundNumber === round.roundNumber + 1,
							);

							return (
								<div
									className="flex items-center justify-between rounded border border-gray-200 p-3"
									key={round.id}
								>
									<div>
										<span className="font-medium">{round.name}</span>
										<span className="ml-2 text-gray-500 text-sm">
											{isClosed ? (
												<span className="text-green-600">✓ Closed</span>
											) : allFinalized ? (
												<span className="text-blue-600">
													Ready to close ({activeMatches.length}/
													{activeMatches.length} finalized)
												</span>
											) : (
												<span className="text-orange-600">
													{pendingMatches.length} match(es) pending
												</span>
											)}
										</span>
									</div>
									<button
										className="cursor-not-allowed rounded bg-gray-200 px-4 py-2 font-medium text-gray-500 text-sm transition"
										disabled={true}
										title="Rounds auto-finalize when all matches are complete"
										type="button"
									>
										{isClosed ? "Closed" : "Auto-finalizes"}
									</button>
								</div>
							);
						})}
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
									e.target.value ? Number.parseInt(e.target.value, 10) : null,
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

					{/* Search */}
					{selectedRound && (
						<div className="mb-4">
							<SearchInput onChange={setSearchQuery} value={searchQuery} />
						</div>
					)}

					{/* Matches */}
					{selectedRound &&
						(() => {
							const selectedRoundData = tournament.rounds.find(
								(r) => r.id === selectedRound,
							);
							const allMatches = selectedRoundData?.matches || [];
							const filteredMatches = filterMatchesByPlayerName(
								allMatches,
								searchQuery,
							);
							const totalMatches = allMatches.length;
							const filteredCount = filteredMatches.length;

							return (
								<>
									<SearchResultsCount
										filteredCount={filteredCount}
										searchQuery={searchQuery}
										totalCount={totalMatches}
									/>
									<div className="space-y-4">
										{filteredMatches.map((match) => (
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
																{formatPlayerName(match.player1Name)} vs{" "}
																{match.player2Seed && `(${match.player2Seed}) `}
																{formatPlayerName(match.player2Name)}
															</div>
														</div>
														{match.status === "finalized" && (
															<div className="flex gap-2">
																{match.isRetirement && (
																	<span className="rounded-full bg-red-600 px-3 py-1 font-medium text-white text-xs">
																		RET
																	</span>
																)}
																<span className="rounded-full bg-green-600 px-3 py-1 font-medium text-white text-xs">
																	Finalized
																</span>
															</div>
														)}
													</div>
													{match.status === "finalized" && (
														<div className="mt-2 space-y-2">
															<div className="text-green-800 text-sm">
																Winner: {match.winnerName} • Score:{" "}
																{match.finalScore}
															</div>
															{match.isRetirement && (
																<div className="text-orange-700 text-sm">
																	No points awarded for this match due to
																	retirement
																</div>
															)}
															<button
																className="rounded bg-red-600 px-3 py-1.5 font-semibold text-sm text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
																disabled={unfinalizeMatchMutation.isPending}
																onClick={() => handleUnfinalizeMatch(match.id)}
																type="button"
															>
																{unfinalizeMatchMutation.isPending
																	? "Unfinalizing..."
																	: "Unfinalize Match"}
															</button>
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

														{matchResults[match.id]?.winnerName && (
															<>
																{/* Retirement checkbox */}
																<label className="flex cursor-pointer items-center gap-2">
																	<input
																		checked={
																			matchResults[match.id]?.isRetirement ??
																			false
																		}
																		className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
																		onChange={(e) =>
																			setMatchResults((prev) => ({
																				...prev,
																				[match.id]: {
																					...prev[match.id],
																					winnerName:
																						prev[match.id]?.winnerName ?? "",
																					isRetirement: e.target.checked,
																					// Reset score when toggling retirement
																					setsWon: undefined,
																					setsLost: undefined,
																				},
																			}))
																		}
																		type="checkbox"
																	/>
																	<span className="text-gray-700 text-sm">
																		Match ended by retirement
																	</span>
																</label>

																{matchResults[match.id]?.isRetirement && (
																	<div className="rounded bg-orange-50 p-2 text-orange-700 text-sm">
																		No points will be awarded for this match
																	</div>
																)}

																<div>
																	<label className="mb-2 block text-gray-700 text-sm">
																		Score
																	</label>
																	{matchResults[match.id]?.isRetirement ? (
																		// Retirement score options - all possible scores
																		<div className="grid grid-cols-4 gap-2">
																			{(
																				(tournament.format === "bo3"
																					? [
																							[0, 0],
																							[1, 0],
																							[0, 1],
																							[1, 1],
																							[2, 0],
																							[2, 1],
																							[0, 2],
																							[1, 2],
																						]
																					: [
																							[0, 0],
																							[1, 0],
																							[0, 1],
																							[1, 1],
																							[2, 0],
																							[2, 1],
																							[0, 2],
																							[1, 2],
																							[2, 2],
																							[3, 0],
																							[3, 1],
																							[3, 2],
																							[0, 3],
																							[1, 3],
																							[2, 3],
																						]) as [number, number][]
																			).map(([won, lost]) => (
																				<button
																					className={`rounded-lg border-2 px-3 py-1.5 font-semibold text-sm transition ${
																						matchResults[match.id]?.setsWon ===
																							won &&
																						matchResults[match.id]?.setsLost ===
																							lost
																							? "border-orange-600 bg-orange-50 text-orange-900"
																							: "border-gray-300 text-gray-700 hover:border-gray-400"
																					}`}
																					key={`${won}-${lost}`}
																					onClick={() =>
																						handleScoreSelect(
																							match.id,
																							won,
																							lost,
																						)
																					}
																					type="button"
																				>
																					{won}-{lost}
																				</button>
																			))}
																		</div>
																	) : (
																		// Normal score options - only winning scores
																		<div
																			className={`grid gap-3 ${tournament.format === "bo5" ? "grid-cols-3" : "grid-cols-2"}`}
																		>
																			{tournament.format === "bo3" ? (
																				<>
																					<button
																						className={`rounded-lg border-2 px-4 py-2 font-semibold transition ${
																							matchResults[match.id]
																								?.setsWon === 2 &&
																							matchResults[match.id]
																								?.setsLost === 0
																								? "border-blue-600 bg-blue-50 text-blue-900"
																								: "border-gray-300 text-gray-700 hover:border-gray-400"
																						}`}
																						onClick={() =>
																							handleScoreSelect(match.id, 2, 0)
																						}
																						type="button"
																					>
																						2-0
																					</button>
																					<button
																						className={`rounded-lg border-2 px-4 py-2 font-semibold transition ${
																							matchResults[match.id]
																								?.setsWon === 2 &&
																							matchResults[match.id]
																								?.setsLost === 1
																								? "border-blue-600 bg-blue-50 text-blue-900"
																								: "border-gray-300 text-gray-700 hover:border-gray-400"
																						}`}
																						onClick={() =>
																							handleScoreSelect(match.id, 2, 1)
																						}
																						type="button"
																					>
																						2-1
																					</button>
																				</>
																			) : (
																				<>
																					<button
																						className={`rounded-lg border-2 px-4 py-2 font-semibold transition ${
																							matchResults[match.id]
																								?.setsWon === 3 &&
																							matchResults[match.id]
																								?.setsLost === 0
																								? "border-blue-600 bg-blue-50 text-blue-900"
																								: "border-gray-300 text-gray-700 hover:border-gray-400"
																						}`}
																						onClick={() =>
																							handleScoreSelect(match.id, 3, 0)
																						}
																						type="button"
																					>
																						3-0
																					</button>
																					<button
																						className={`rounded-lg border-2 px-4 py-2 font-semibold transition ${
																							matchResults[match.id]
																								?.setsWon === 3 &&
																							matchResults[match.id]
																								?.setsLost === 1
																								? "border-blue-600 bg-blue-50 text-blue-900"
																								: "border-gray-300 text-gray-700 hover:border-gray-400"
																						}`}
																						onClick={() =>
																							handleScoreSelect(match.id, 3, 1)
																						}
																						type="button"
																					>
																						3-1
																					</button>
																					<button
																						className={`rounded-lg border-2 px-4 py-2 font-semibold transition ${
																							matchResults[match.id]
																								?.setsWon === 3 &&
																							matchResults[match.id]
																								?.setsLost === 2
																								? "border-blue-600 bg-blue-50 text-blue-900"
																								: "border-gray-300 text-gray-700 hover:border-gray-400"
																						}`}
																						onClick={() =>
																							handleScoreSelect(match.id, 3, 2)
																						}
																						type="button"
																					>
																						3-2
																					</button>
																				</>
																			)}
																		</div>
																	)}
																</div>
															</>
														)}

														<button
															className="rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
															disabled={
																!matchResults[match.id]?.winnerName ||
																matchResults[match.id]?.setsWon === undefined ||
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
								</>
							);
						})()}
				</div>
			</main>

			{/* Close Submissions Confirmation Dialog */}
			<AlertDialog onOpenChange={setShowCloseDialog} open={showCloseDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Close Submissions?</AlertDialogTitle>
						<AlertDialogDescription>
							Close submissions for {closeDialogData?.roundName}?
							<div className="mt-3 space-y-2 text-left">
								<p className="font-medium">This will:</p>
								<ul className="list-inside list-disc space-y-1">
									<li>Prevent new picks or draft saves</li>
									<li>Automatically finalize all existing drafts</li>
								</ul>
								<p className="mt-3 font-medium text-yellow-700">
									This action cannot be easily undone.
								</p>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-600 hover:bg-red-700"
							onClick={handleConfirmClose}
						>
							Close Submissions
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Reopen Submissions Confirmation Dialog */}
			<AlertDialog onOpenChange={setShowReopenDialog} open={showReopenDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reopen Submissions?</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="text-muted-foreground text-sm">
								<p>
									Reopen submissions for {reopenDialogData?.roundName}?
								</p>
								<div className="mt-3 space-y-2 text-left">
									<p className="font-medium text-foreground">This will allow:</p>
									<ul className="list-inside list-disc space-y-1">
										<li>Users to submit or modify picks for pending matches</li>
										<li>Draft saves for matches not yet finalized</li>
									</ul>
									{reopenDialogData?.finalizedMatches &&
									reopenDialogData.finalizedMatches > 0 ? (
										<div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
											<p className="font-medium text-orange-900">
												⚠️ Partial Round Warning
											</p>
											<p className="mt-1 text-orange-800 text-sm">
												{reopenDialogData.finalizedMatches} match(es) have
												already been finalized and cannot be voted on.
												Only {reopenDialogData.pendingMatches} pending
												match(es) will be available for picks.
											</p>
										</div>
									) : (
										<p className="mt-3 text-green-700">
											All matches are pending and available for picks.
										</p>
									)}
								</div>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-green-600 hover:bg-green-700"
							onClick={handleConfirmReopen}
						>
							Reopen Submissions
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Unfinalize Match Confirmation Dialog */}
			<AlertDialog
				onOpenChange={setShowUnfinalizeDialog}
				open={showUnfinalizeDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Unfinalize Match?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to unfinalize this match? This will reset
							all user scores for this match.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-600 hover:bg-red-700"
							onClick={handleConfirmUnfinalize}
						>
							Unfinalize Match
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Auto-finalize Information Dialog (kept for compatibility) */}
			<AlertDialog
				onOpenChange={setShowCloseRoundDialog}
				open={showCloseRoundDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Rounds Auto-Finalize</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="text-muted-foreground text-sm">
								<p className="mb-3">
									{closeRoundDialogData?.roundName} will automatically finalize
									when all matches are complete.
								</p>
								<div className="mt-3 space-y-2 text-left">
									<p className="font-medium text-foreground">
										Automatic finalization will:
									</p>
									<ul className="list-inside list-disc space-y-1">
										<li>Mark the round as finalized</li>
										{closeRoundDialogData?.hasNextRound && (
											<li>Propagate winners to the next round</li>
										)}
									</ul>
									<p className="mt-3 text-blue-700">
										No manual action required.
									</p>
								</div>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction onClick={() => setShowCloseRoundDialog(false)}>
							Got it
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Create Round Dialog */}
			<AlertDialog
				onOpenChange={setShowCreateRoundDialog}
				open={showCreateRoundDialog}
			>
				<AlertDialogContent className="max-w-md">
					<AlertDialogHeader>
						<AlertDialogTitle>Create New Round</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-4 pt-4">
								<div>
									<label
										className="mb-1 block font-medium text-gray-700 text-sm"
										htmlFor="roundName"
									>
										Round Name
									</label>
									<select
										className="w-full rounded border border-gray-300 px-3 py-2"
										id="roundName"
										onChange={(e) =>
											setCreateRoundForm((prev) => ({
												...prev,
												name: e.target.value,
											}))
										}
										value={createRoundForm.name}
									>
										<option value="">Select a round name...</option>
										<option value="Round of 128">Round of 128</option>
										<option value="Round of 64">Round of 64</option>
										<option value="Round of 32">Round of 32</option>
										<option value="Round of 16">Round of 16</option>
										<option value="Quarter Finals">Quarter Finals</option>
										<option value="Semi Finals">Semi Finals</option>
										<option value="Final">Final</option>
									</select>
								</div>
								<div>
									<label
										className="mb-1 block font-medium text-gray-700 text-sm"
										htmlFor="matchCount"
									>
										Number of Matches
									</label>
									<input
										className="w-full rounded border border-gray-300 px-3 py-2"
										id="matchCount"
										max={128}
										min={1}
										onChange={(e) =>
											setCreateRoundForm((prev) => ({
												...prev,
												matchCount: Number.parseInt(e.target.value, 10) || 1,
											}))
										}
										type="number"
										value={createRoundForm.matchCount}
									/>
								</div>
								<div>
									<label
										className="mb-1 block font-medium text-gray-700 text-sm"
										htmlFor="createOpensAt"
									>
										Opens At (optional)
									</label>
									<input
										className="w-full rounded border border-gray-300 px-3 py-2"
										id="createOpensAt"
										onChange={(e) =>
											setCreateRoundForm((prev) => ({
												...prev,
												opensAt: e.target.value,
											}))
										}
										type="datetime-local"
										value={createRoundForm.opensAt}
									/>
								</div>
								<div>
									<label
										className="mb-1 block font-medium text-gray-700 text-sm"
										htmlFor="createDeadline"
									>
										Deadline (optional)
									</label>
									<input
										className="w-full rounded border border-gray-300 px-3 py-2"
										id="createDeadline"
										onChange={(e) =>
											setCreateRoundForm((prev) => ({
												...prev,
												deadline: e.target.value,
											}))
										}
										type="datetime-local"
										value={createRoundForm.deadline}
									/>
								</div>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() =>
								setCreateRoundForm({
									name: "",
									matchCount: 32,
									opensAt: "",
									deadline: "",
								})
							}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-blue-600 hover:bg-blue-700"
							disabled={!createRoundForm.name || createRoundMutation.isPending}
							onClick={handleCreateRound}
						>
							{createRoundMutation.isPending ? "Creating..." : "Create Round"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Tournament Confirmation Dialog */}
			<AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Tournament?</AlertDialogTitle>
						<AlertDialogDescription>
							<div className="space-y-3">
								<p>
									Are you sure you want to delete{" "}
									<span className="font-semibold">{tournament?.name}</span>?
								</p>
								<div className="rounded-lg border border-red-200 bg-red-50 p-3">
									<p className="font-medium text-red-900 text-sm">
										⚠️ This action will soft delete the tournament
									</p>
									<ul className="mt-2 list-inside list-disc space-y-1 text-red-800 text-sm">
										<li>Tournament will be hidden from all views</li>
										<li>All matches will be soft deleted</li>
										<li>User picks will be preserved but hidden</li>
										<li>Data can be restored from database if needed</li>
									</ul>
								</div>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-red-600 hover:bg-red-700"
							disabled={deleteTournamentMutation.isPending}
							onClick={async () => {
								try {
									await deleteTournamentMutation.mutateAsync({
										id: tournamentId,
									});
									setShowDeleteDialog(false);
								} catch {
									// Error is handled by onError callback
								}
							}}
						>
							{deleteTournamentMutation.isPending
								? "Deleting..."
								: "Delete Tournament"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Close Tournament Confirmation Dialog */}
			<AlertDialog
				onOpenChange={setShowCloseTournamentDialog}
				open={showCloseTournamentDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Close Tournament?</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="text-muted-foreground text-sm">
								<p>
									Close{" "}
									<span className="font-semibold text-foreground">
										{tournament?.name}
									</span>
									?
								</p>

								{/* Pre-validation status */}
								{(() => {
									const unfinalizedRounds = tournament.rounds.filter(
										(r) => !r.isFinalized,
									);
									const pendingMatches = tournament.rounds.flatMap((r) =>
										r.matches
											.filter((m) => !m.deletedAt && m.status !== "finalized")
											.map((m) => ({ roundName: r.name, matchNumber: m.matchNumber })),
									);
									const isReady =
										unfinalizedRounds.length === 0 &&
										pendingMatches.length === 0 &&
										tournament.rounds.length > 0;

									if (isReady) {
										return (
											<div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
												<p className="font-medium text-green-900">
													✓ Ready to close
												</p>
												<ul className="mt-2 list-inside list-disc space-y-1 text-green-800 text-sm">
													<li>All {tournament.rounds.length} rounds are finalized</li>
													<li>
														All{" "}
														{tournament.rounds.reduce(
															(sum, r) =>
																sum + r.matches.filter((m) => !m.deletedAt).length,
															0,
														)}{" "}
														matches are finalized
													</li>
												</ul>
											</div>
										);
									}

									return (
										<div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
											<p className="font-medium text-red-900">
												✗ Cannot close tournament
											</p>
											<ul className="mt-2 list-inside list-disc space-y-1 text-red-800 text-sm">
												{tournament.rounds.length === 0 && (
													<li>Tournament has no rounds</li>
												)}
												{unfinalizedRounds.length > 0 && (
													<li>
														{unfinalizedRounds.length} round(s) not finalized:{" "}
														{unfinalizedRounds.map((r) => r.name).join(", ")}
													</li>
												)}
												{pendingMatches.length > 0 && (
													<li>
														{pendingMatches.length} match(es) pending:{" "}
														{pendingMatches
															.slice(0, 3)
															.map(
																(m) => `${m.roundName} #${m.matchNumber}`,
															)
															.join(", ")}
														{pendingMatches.length > 3 &&
															` and ${pendingMatches.length - 3} more`}
													</li>
												)}
											</ul>
										</div>
									);
								})()}

								<div className="mt-3 space-y-2 text-left">
									<p className="font-medium text-foreground">
										Closing the tournament will:
									</p>
									<ul className="list-inside list-disc space-y-1">
										<li>Archive the tournament</li>
										<li>Record the closure date and admin</li>
										<li>Make it read-only for users</li>
									</ul>
									<p className="mt-3 text-yellow-700">
										You can reopen it later if needed.
									</p>
								</div>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-purple-600 hover:bg-purple-700"
							disabled={
								closeTournamentMutation.isPending ||
								tournament.rounds.filter((r) => !r.isFinalized).length > 0 ||
								tournament.rounds.flatMap((r) =>
									r.matches.filter(
										(m) => !m.deletedAt && m.status !== "finalized",
									),
								).length > 0 ||
								tournament.rounds.length === 0
							}
							onClick={async () => {
								try {
									await closeTournamentMutation.mutateAsync({
										tournamentId,
									});
								} catch {
									// Error handled by onError
								}
							}}
						>
							{closeTournamentMutation.isPending
								? "Closing..."
								: "Close Tournament"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
