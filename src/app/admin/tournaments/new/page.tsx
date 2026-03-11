"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPlayerName } from "~/lib/utils";
import { api } from "~/trpc/react";

type ParsedDraw = {
	tournamentName: string;
	year: number;
	rounds: Array<{
		roundNumber: number;
		name: string;
		matches: Array<{
			matchNumber: number;
			player1Name: string;
			player2Name: string;
			player1Seed: number | null;
			player2Seed: number | null;
			winnerName?: string;
			setsWon?: number;
			setsLost?: number;
			finalScore?: string;
			kind?: "standard" | "two_leg_tie" | "single_match";
			metadata?: {
				scoreLabel?: string;
				legs?: Array<{
					fixtureId: number;
					label: string;
					homeTeam: string;
					awayTeam: string;
					homeGoals: number | null;
					awayGoals: number | null;
					status: string;
					kickoff?: string;
				}>;
			};
		}>;
	}>;
};

type Sport = "tennis" | "football";

const FOOTBALL_DATA_COMPETITION_OPTIONS = [
	{ code: "CL", name: "UEFA Champions League" },
] as const;

function getDefaultFootballSeasonYear() {
	const now = new Date();
	return now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
}

export default function NewTournamentPage() {
	const router = useRouter();
	const [sport, setSport] = useState<Sport>("tennis");
	const [file, setFile] = useState<File | null>(null);
	const [year, setYear] = useState(new Date().getFullYear());
	const [format, setFormat] = useState<"bo3" | "bo5">("bo3");
	const [atpUrl, setAtpUrl] = useState("");
	const [competitionCode, setCompetitionCode] = useState<string>(
		FOOTBALL_DATA_COMPETITION_OPTIONS[0]?.code ?? "CL",
	);
	const [footballPreviewData, setFootballPreviewData] = useState<any | null>(
		null,
	);
	const [parsedDraw, setParsedDraw] = useState<ParsedDraw | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

	const commitMutation = api.admin.commitDraw.useMutation();
	const previewFootballQuery = api.admin.previewFootballImport.useQuery(
		{
			competitionCode,
			season: year,
		},
		{ enabled: false, retry: false },
	);
	const importFootballMutation = api.admin.importFootballTournament.useMutation();

	const toggleRoundExpanded = (roundNumber: number) => {
		setExpandedRounds((prev) => {
			const next = new Set(prev);
			if (next.has(roundNumber)) {
				next.delete(roundNumber);
			} else {
				next.add(roundNumber);
			}
			return next;
		});
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			setFile(selectedFile);
			setParsedDraw(null);
			setError(null);
		}
	};

	const handleParseTennis = async () => {
		if (!file) return;

		setError(null);
		setIsUploading(true);

		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("year", year.toString());

			const response = await fetch("/api/admin/upload-draw", {
				method: "POST",
				body: formData,
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Failed to parse draw");
			}

			setParsedDraw(result as ParsedDraw);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to parse draw");
		} finally {
			setIsUploading(false);
		}
	};

	const handlePreviewFootball = async () => {
		if (!competitionCode.trim()) {
			setError("Enter a football-data.org competition code first");
			return;
		}

		setError(null);
		setIsUploading(true);

		try {
			const result = await previewFootballQuery.refetch();
			if (result.error) {
				throw result.error;
			}
			if (!result.data) {
				throw new Error("No football data returned");
			}
			setFootballPreviewData(result.data);
			setParsedDraw({
				tournamentName: result.data.tournamentName,
				year: result.data.year,
				rounds: result.data.rounds.map((round) => ({
					roundNumber: round.roundNumber,
					name: round.name,
					matches: round.matches.map((match) => ({
						matchNumber: match.matchNumber,
						player1Name: match.player1Name,
						player2Name: match.player2Name,
						player1Seed: null,
						player2Seed: null,
						winnerName: match.winnerName,
						setsWon: match.setsWon,
						setsLost: match.setsLost,
						finalScore: match.finalScore,
						kind: match.kind,
						metadata: match.metadata,
					})),
				})),
			});
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to preview football import",
			);
		} finally {
			setIsUploading(false);
		}
	};

	const handleCommit = async () => {
		if (!parsedDraw) return;

		try {
			if (sport === "football") {
				if (!footballPreviewData) {
					throw new Error("Preview the football import before creating it");
				}

				const tournament = await importFootballMutation.mutateAsync({
					parsedTournament: footballPreviewData,
					overwriteExisting: false,
				});

				router.push(`/admin/tournaments/${tournament.id}`);
				return;
			}

			const tournament = await commitMutation.mutateAsync({
				parsedDraw,
				format,
				atpUrl: atpUrl || undefined,
				overwriteExisting: false,
			});

			router.push(`/admin/tournaments/${tournament.id}`);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to create tournament",
			);
		}
	};

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
				<h1 className="mb-8 font-bold text-4xl text-gray-900">
					Create Tournament
				</h1>

				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<h2 className="mb-4 font-semibold text-gray-900 text-xl">
						Step 1: Select Sport & Source
					</h2>

					<div className="space-y-4">
						<div>
							<label className="mb-2 block font-medium text-gray-700 text-sm">
								Sport
							</label>
							<div className="flex gap-4">
								<label className="flex cursor-pointer items-center gap-2">
									<input
										checked={sport === "tennis"}
										name="sport"
										onChange={() => {
											setSport("tennis");
											setParsedDraw(null);
											setFootballPreviewData(null);
											setError(null);
										}}
										type="radio"
									/>
									<span>Tennis via parser</span>
								</label>
								<label className="flex cursor-pointer items-center gap-2">
									<input
										checked={sport === "football"}
										name="sport"
										onChange={() => {
											setSport("football");
											setYear(getDefaultFootballSeasonYear());
											setParsedDraw(null);
											setFootballPreviewData(null);
											setError(null);
										}}
										type="radio"
									/>
									<span>Football via football-data.org</span>
								</label>
							</div>
						</div>

						<div>
							<label
								className="mb-2 block font-medium text-gray-700 text-sm"
								htmlFor="year"
							>
								{sport === "football"
									? "football-data.org Season (start year)"
									: "Tournament Year"}
							</label>
							<input
								className="w-full rounded-lg border border-gray-300 px-4 py-2"
								id="year"
								max={2100}
								min={2000}
								onChange={(e) => setYear(Number.parseInt(e.target.value, 10))}
								type="number"
								value={year}
							/>
						</div>

						{sport === "tennis" ? (
							<>
								<div>
									<label className="mb-2 block font-medium text-gray-700 text-sm">
										Tournament Format
									</label>
									<div className="flex gap-4">
										<label className="flex cursor-pointer items-center gap-2">
											<input
												checked={format === "bo3"}
												name="format"
												onChange={() => setFormat("bo3")}
												type="radio"
											/>
											<span>Best of 3</span>
										</label>
										<label className="flex cursor-pointer items-center gap-2">
											<input
												checked={format === "bo5"}
												name="format"
												onChange={() => setFormat("bo5")}
												type="radio"
											/>
											<span>Best of 5</span>
										</label>
									</div>
								</div>

								<div>
									<label
										className="mb-2 block font-medium text-gray-700 text-sm"
										htmlFor="atpUrl"
									>
										ATP Tournament URL (Optional)
									</label>
									<input
										className="w-full rounded-lg border border-gray-300 px-4 py-2"
										id="atpUrl"
										onChange={(e) => setAtpUrl(e.target.value)}
										placeholder="https://www.atptour.com/..."
										type="url"
										value={atpUrl}
									/>
								</div>

								<div>
									<label
										className="mb-2 block font-medium text-gray-700 text-sm"
										htmlFor="file"
									>
										ATP Draw File (HTML or MHTML)
									</label>
									<input
										accept=".html,.mhtml"
										className="w-full rounded-lg border border-gray-300 px-4 py-2"
										id="file"
										onChange={handleFileChange}
										type="file"
									/>
								</div>

								<button
									className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={!file || isUploading}
									onClick={handleParseTennis}
									type="button"
								>
									{isUploading ? "Parsing..." : "Parse Draw"}
								</button>
							</>
						) : (
							<>
								<div>
									<label
										className="mb-2 block font-medium text-gray-700 text-sm"
										htmlFor="competitionCode"
									>
										Competition Code
									</label>
									<div className="flex flex-col gap-3">
										<select
											className="w-full rounded-lg border border-gray-300 px-4 py-2"
											onChange={(e) => {
												setCompetitionCode(e.target.value);
												setParsedDraw(null);
												setFootballPreviewData(null);
												setError(null);
											}}
											value={competitionCode}
										>
											{FOOTBALL_DATA_COMPETITION_OPTIONS.map((competition) => (
												<option key={competition.code} value={competition.code}>
													{competition.name} ({competition.code})
												</option>
											))}
										</select>
										<input
											className="w-full rounded-lg border border-gray-300 px-4 py-2 font-mono"
											id="competitionCode"
											onChange={(e) => {
												setCompetitionCode(e.target.value.toUpperCase());
												setParsedDraw(null);
												setFootballPreviewData(null);
												setError(null);
											}}
											placeholder="CL"
											type="text"
											value={competitionCode}
										/>
									</div>
									<p className="mt-2 text-gray-500 text-sm">
										Use the football-data.org competition code. For Champions
										League, use <span className="font-mono">CL</span>. Seasons use
										the competition start year, so the 2025/26 Champions League is{" "}
										<span className="font-mono">2025</span>. This flow makes one
										request for preview and reuses that data on create.
									</p>
								</div>

								<button
									className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={!competitionCode.trim() || isUploading}
									onClick={handlePreviewFootball}
									type="button"
								>
									{isUploading
										? "Loading..."
										: "Preview football-data.org Import"}
								</button>
							</>
						)}
					</div>
				</div>

				{error && (
					<div className="mb-8 rounded-lg border border-red-300 bg-red-50 p-6">
						<h3 className="mb-2 font-semibold text-red-900">Error</h3>
						<p className="text-red-800">{error}</p>
					</div>
				)}

				{parsedDraw && (
					<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
						<h2 className="mb-4 font-semibold text-gray-900 text-xl">
							Step 2: Preview & Confirm
						</h2>

						<div className="mb-6 rounded-lg bg-blue-50 p-4">
							<h3 className="mb-2 font-semibold text-blue-900 text-lg">
								{parsedDraw.tournamentName}
							</h3>
							<p className="text-blue-800">
								{sport === "football" ? "Football" : "Tennis"} • {parsedDraw.year}
							</p>
							{sport === "tennis" && (
								<p className="text-blue-800">
									Format: {format === "bo3" ? "Best of 3" : "Best of 5"}
								</p>
							)}
							{sport === "football" && competitionCode && (
								<p className="text-blue-800">
									football-data.org competition code:{" "}
									{competitionCode.toUpperCase()}
								</p>
							)}
						</div>

						<div className="space-y-4">
							{parsedDraw.rounds.map((round) => {
								const completedMatches = round.matches.filter((match) => match.winnerName).length;
								const isExpanded = expandedRounds.has(round.roundNumber);

								return (
									<div className="rounded-lg border border-gray-200" key={round.roundNumber}>
										<button
											className="flex w-full items-center justify-between p-4 text-left"
											onClick={() => toggleRoundExpanded(round.roundNumber)}
											type="button"
										>
											<div>
												<div className="font-semibold text-gray-900">{round.name}</div>
												<div className="text-gray-500 text-sm">
													{round.matches.length} matches • {completedMatches} completed
												</div>
											</div>
											<span className="text-gray-500">{isExpanded ? "−" : "+"}</span>
										</button>

										{isExpanded && (
											<div className="space-y-3 border-t border-gray-200 p-4">
												{round.matches.map((match) => (
													<div className="rounded border border-gray-200 p-3" key={match.matchNumber}>
														<div className="font-medium text-gray-900">
															{sport === "football" ? "Tie" : "Match"} {match.matchNumber}
														</div>
														<div className="mt-1 text-gray-700">
															{match.player1Seed ? `(${match.player1Seed}) ` : ""}
															{formatPlayerName(match.player1Name)}
															<span className="mx-2 text-gray-400">vs</span>
															{match.player2Seed ? `(${match.player2Seed}) ` : ""}
															{formatPlayerName(match.player2Name)}
														</div>
														{match.metadata?.legs && match.metadata.legs.length > 0 && (
															<div className="mt-2 space-y-1 text-gray-600 text-sm">
																{match.metadata.legs.map((leg) => (
																	<div key={leg.fixtureId}>
																		{leg.label}: {leg.homeTeam} {leg.homeGoals ?? "-"}-{leg.awayGoals ?? "-"} {leg.awayTeam}
																	</div>
																))}
															</div>
														)}
														{match.winnerName && (
															<div className="mt-2 text-green-700 text-sm">
																Winner: {match.winnerName}
																{match.finalScore ? ` • ${match.finalScore}` : ""}
															</div>
														)}
													</div>
												))}
											</div>
										)}
									</div>
								);
							})}
						</div>

						<div className="mt-6 flex justify-end">
							<button
								className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={commitMutation.isPending || importFootballMutation.isPending}
								onClick={handleCommit}
								type="button"
							>
								{commitMutation.isPending || importFootballMutation.isPending
									? "Creating..."
									: "Create Tournament"}
							</button>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
