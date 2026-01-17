import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default async function Home() {
	const user = await currentUser();

	// If logged in, redirect to tournaments page
	if (user) {
		redirect("/tournaments");
	}

	// Landing page for non-authenticated users
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-blue-950">
			<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
				<div className="flex flex-col items-center gap-4 text-center">
					<h1 className="font-extrabold text-5xl text-white tracking-tight sm:text-6xl">
						Tennis Predictions
					</h1>
					<p className="max-w-2xl text-blue-200 text-xl">
						Compete with friends by predicting ATP Tour tournament results.
						Submit your picks, earn points, and climb the leaderboard.
					</p>
				</div>

				<div className="flex flex-col gap-4 sm:flex-row">
					<Button
						asChild
						className="bg-white px-8 text-blue-900 hover:bg-blue-50"
						size="lg"
					>
						<Link href="/sign-up">Get Started</Link>
					</Button>
					<Button
						asChild
						className="border-2 border-white bg-transparent px-8 text-white hover:bg-white/10 hover:text-white"
						size="lg"
						variant="outline"
					>
						<Link href="/sign-in">Sign In</Link>
					</Button>
				</div>

				<div className="mt-12 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
					<Card className="border-white/20 bg-white/10 backdrop-blur-sm">
						<CardHeader>
							<div className="mb-2 text-3xl">🎾</div>
							<CardTitle className="text-white">Predict Matches</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-blue-200">
								Pick winners and predict exact scores for every match in ATP
								tournaments
							</p>
						</CardContent>
					</Card>
					<Card className="border-white/20 bg-white/10 backdrop-blur-sm">
						<CardHeader>
							<div className="mb-2 text-3xl">📊</div>
							<CardTitle className="text-white">Earn Points</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-blue-200">
								Score points for correct predictions with bonus points for exact
								scores
							</p>
						</CardContent>
					</Card>
					<Card className="border-white/20 bg-white/10 backdrop-blur-sm">
						<CardHeader>
							<div className="mb-2 text-3xl">🏆</div>
							<CardTitle className="text-white">Climb Rankings</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-blue-200">
								Compete on tournament leaderboards and track your all-time
								performance
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
}
