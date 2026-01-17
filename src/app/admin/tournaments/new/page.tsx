"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
		}>;
	}>;
};

export default function NewTournamentPage() {
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [year, setYear] = useState(new Date().getFullYear());
	const [parsedDraw, setParsedDraw] = useState<ParsedDraw | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

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

	const commitMutation = api.admin.commitDraw.useMutation();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			setFile(selectedFile);
			setParsedDraw(null);
			setError(null);
		}
	};

	const handleParse = async () => {
		if (!file) return;

		setError(null);
		setIsUploading(true);

		try {
			// Use FormData to upload the file directly (avoids JSON body size limits)
			const formData = new FormData();
			formData.append("file", file);
			formData.append("year", year.toString());

			// Use REST endpoint instead of tRPC to avoid streaming bug with large payloads
			// https://github.com/trpc/trpc/issues/5725
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

	const handleCommit = async () => {
		if (!parsedDraw) return;

		try {
			const tournament = await commitMutation.mutateAsync({
				parsedDraw,
				overwriteExisting: false,
			});

			router.push(`/admin/tournaments/${tournament.id}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to commit draw");
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
					Upload New Tournament
				</h1>

				{/* Upload Form */}
				<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
					<h2 className="mb-4 font-semibold text-gray-900 text-xl">
						Step 1: Upload ATP Draw File
					</h2>

					<div className="space-y-4">
						<div>
							<label
								className="mb-2 block font-medium text-gray-700 text-sm"
								htmlFor="year"
							>
								Tournament Year
							</label>
							<input
								className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
								id="year"
								max={2100}
								min={2000}
								onChange={(e) => setYear(Number.parseInt(e.target.value))}
								type="number"
								value={year}
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
							onClick={handleParse}
							type="button"
						>
							{isUploading ? "Parsing..." : "Parse Draw"}
						</button>
					</div>
				</div>

				{/* Error Display */}
				{error && (
					<div className="mb-8 rounded-lg border border-red-300 bg-red-50 p-6">
						<h3 className="mb-2 font-semibold text-red-900">Error</h3>
						<p className="text-red-800">{error}</p>
					</div>
				)}

				{/* Preview */}
				{parsedDraw && (
					<div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
						<h2 className="mb-4 font-semibold text-gray-900 text-xl">
							Step 2: Preview & Confirm
						</h2>

						<div className="mb-6 rounded-lg bg-blue-50 p-4">
							<h3 className="mb-2 font-semibold text-blue-900 text-lg">
								{parsedDraw.tournamentName}
							</h3>
							<p className="text-blue-800">Year: {parsedDraw.year}</p>
							<p className="text-blue-800">
								Rounds: {parsedDraw.rounds.length}
							</p>
							<p className="text-blue-800">
								Total Matches:{" "}
								{parsedDraw.rounds.reduce(
									(sum, r) => sum + r.matches.length,
									0,
								)}
							</p>
						</div>

						{/* Rounds Preview */}
						<div className="mb-6 space-y-4">
							{parsedDraw.rounds.map((round) => {
								const isExpanded = expandedRounds.has(round.roundNumber);
								const matchesToShow = isExpanded
									? round.matches
									: round.matches.slice(0, 3);
								const hiddenCount = round.matches.length - 3;

								return (
									<div
										className="rounded-lg border border-gray-200 p-4"
										key={round.roundNumber}
									>
										<div className="mb-2 flex items-center justify-between">
											<h4 className="font-semibold text-gray-900">
												{round.name} ({round.matches.length} matches)
											</h4>
											{round.matches.length > 3 && (
												<button
													className="text-blue-600 text-sm hover:text-blue-800"
													onClick={() => toggleRoundExpanded(round.roundNumber)}
													type="button"
												>
													{isExpanded ? "Show less" : `Show all ${round.matches.length}`}
												</button>
											)}
										</div>
										<div className="grid gap-2 text-sm">
											{matchesToShow.map((match) => (
												<div className="text-gray-600" key={match.matchNumber}>
													Match {match.matchNumber}:{" "}
													{match.player1Seed && `(${match.player1Seed}) `}
													{match.player1Name} vs{" "}
													{match.player2Seed && `(${match.player2Seed}) `}
													{match.player2Name}
												</div>
											))}
											{!isExpanded && hiddenCount > 0 && (
												<button
													className="text-left text-blue-600 hover:text-blue-800"
													onClick={() => toggleRoundExpanded(round.roundNumber)}
													type="button"
												>
													... and {hiddenCount} more matches (click to expand)
												</button>
											)}
										</div>
									</div>
								);
							})}
						</div>

						<button
							className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={commitMutation.isPending}
							onClick={handleCommit}
							type="button"
						>
							{commitMutation.isPending
								? "Creating Tournament..."
								: "Confirm & Create Tournament"}
						</button>
					</div>
				)}

				{/* Instructions */}
				<div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
					<h3 className="mb-2 font-semibold text-blue-900 text-lg">
						Instructions
					</h3>
					<ol className="list-inside list-decimal space-y-2 text-blue-800">
						<li>
							Download the ATP draw HTML file from the official ATP website
						</li>
						<li>Select the tournament year</li>
						<li>Upload the file and click "Parse Draw"</li>
						<li>Review the parsed data to ensure it's correct</li>
						<li>Click "Confirm & Create Tournament" to save</li>
					</ol>
					<p className="mt-4 text-blue-700 text-sm">
						Note: The parser is configured for standard ATP draw formats. If
						parsing fails, the file format may need manual adjustment.
					</p>
				</div>
			</main>
		</div>
	);
}
