"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export function Navigation() {
	const { user } = useUser();
	const isAdmin = user?.publicMetadata?.role === "admin";

	return (
		<nav className="border-b bg-white shadow-sm">
			<div className="container mx-auto flex items-center justify-between px-4 py-4">
				<div className="flex items-center gap-8">
					<Link className="font-bold text-blue-900 text-xl" href="/tournaments">
						Tennis Predictions
					</Link>
					<div className="hidden gap-6 md:flex">
						<Link
							className="text-gray-700 transition hover:text-blue-900"
							href="/tournaments"
						>
							Tournaments
						</Link>
						<Link
							className="text-gray-700 transition hover:text-blue-900"
							href="/leaderboards"
						>
							Leaderboards
						</Link>
						{isAdmin && (
							<Link
								className="text-blue-600 transition hover:text-blue-800"
								href="/admin"
							>
								Admin
							</Link>
						)}
					</div>
				</div>
				<div className="flex items-center gap-4">
					<UserButton
						afterSignOutUrl="/"
						appearance={{
							elements: {
								avatarBox: "h-10 w-10",
							},
						}}
					/>
				</div>
			</div>
		</nav>
	);
}
