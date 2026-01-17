"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function NewTournamentPage() {
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [year, setYear] = useState(new Date().getFullYear());
	const [parsedDraw, setParsedDraw] = useState<{
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
	} | null>(null);
	const [error, setError] = useState<string | null>(null);

	const uploadMutation = api.admin.uploadDraw.useMutation();
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
		const reader = new FileReader();

		reader.onload = async (e) => {
			const htmlContent = e.target?.result as string;

			try {
				const result = await uploadMutation.mutateAsync({
					htmlContent,
					year,
				});

				setParsedDraw(result);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to parse draw",
				);
			}
		};

		reader.readAsText(file);
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
						href="/admin"
						className="text-blue-600 transition hover:text-blue-700"
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
					<h2 className="mb-4 font-semibold text-xl text-gray-900">
						Step 1: Upload ATP Draw File
					</h2>

					<div className="space-y-4">
						<div>
							<label
								htmlFor="year"
								className="mb-2 block font-medium text-gray-700 text-sm"
							>
								Tournament Year
							</label>
							<input
								type="number"
								id="year"
								value={year}
								onChange={(e) => setYear(Number.parseInt(e.target.value))}
								className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
								min={2000}
								max={2100}
							/>
						</div>

						<div>
							<label
								htmlFor="file"
								className="mb-2 block font-medium text-gray-700 text-sm"
							>
								ATP Draw File (HTML or MHTML)
							</label>
							<input
								type="file"
								id="file"
								accept=".html,.mhtml"
								onChange={handleFileChange}
								className="w-full rounded-lg border border-gray-300 px-4 py-2"
							/>
						</div>

						<button
							onClick={handleParse}
							disabled={!file || uploadMutation.isPending}
							className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{uploadMutation.isPending ? "Parsing..." : "Parse Draw"}
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
						<h2 className="mb-4 font-semibold text-xl text-gray-900">
							Step 2: Preview & Confirm
						</h2>

						<div className="mb-6 rounded-lg bg-blue-50 p-4">
							<h3 className="mb-2 font-semibold text-lg text-blue-900">
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
							{parsedDraw.rounds.map((round) => (
								<div
									key={round.roundNumber}
									className="rounded-lg border border-gray-200 p-4"
								>
									<h4 className="mb-2 font-semibold text-gray-900">
										{round.name} ({round.matches.length} matches)
									</h4>
									<div className="grid gap-2 text-sm">
										{round.matches.slice(0, 3).map((match) => (
											<div
												key={match.matchNumber}
												className="text-gray-600"
											>
												Match {match.matchNumber}:{" "}
												{match.player1Seed && `(${match.player1Seed}) `}
												{match.player1Name} vs{" "}
												{match.player2Seed && `(${match.player2Seed}) `}
												{match.player2Name}
											</div>
										))}
										{round.matches.length > 3 && (
											<div className="text-gray-500">
												... and {round.matches.length - 3} more matches
											</div>
										)}
									</div>
								</div>
							))}
						</div>

						<button
							onClick={handleCommit}
							disabled={commitMutation.isPending}
							className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{commitMutation.isPending
								? "Creating Tournament..."
								: "Confirm & Create Tournament"}
						</button>
					</div>
				)}

				{/* Instructions */}
				<div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
					<h3 className="mb-2 font-semibold text-lg text-blue-900">
						Instructions
					</h3>
					<ol className="list-inside list-decimal space-y-2 text-blue-800">
						<li>Download the ATP draw HTML file from the official ATP website</li>
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
