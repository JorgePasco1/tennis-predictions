"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";

export function Navigation() {
	const { user } = useUser();
	const isAdmin = user?.publicMetadata?.role === "admin";

	return (
		<nav className="border-b bg-white shadow-sm">
			<div className="container mx-auto flex items-center justify-between px-4 py-4">
				<div className="flex items-center gap-8">
					<Link href="/tournaments" className="font-bold text-xl text-blue-900">
						Tennis Predictions
					</Link>
					<div className="hidden gap-6 md:flex">
						<Link
							href="/tournaments"
							className="text-gray-700 transition hover:text-blue-900"
						>
							Tournaments
						</Link>
						<Link
							href="/leaderboards"
							className="text-gray-700 transition hover:text-blue-900"
						>
							Leaderboards
						</Link>
						{isAdmin && (
							<Link
								href="/admin"
								className="text-blue-600 transition hover:text-blue-800"
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
