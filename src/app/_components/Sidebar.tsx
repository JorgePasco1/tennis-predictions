"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Trophy, BarChart3, Settings, Menu } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetTrigger,
} from "~/components/ui/sheet";
import { cn } from "~/lib/utils";

function SidebarContent() {
	const pathname = usePathname();
	const { user } = useUser();
	const isAdmin = user?.publicMetadata?.role === "admin";

	const navItems = [
		{
			href: "/tournaments",
			label: "Tournaments",
			icon: Trophy,
		},
		{
			href: "/leaderboards",
			label: "Leaderboards",
			icon: BarChart3,
		},
	];

	return (
		<div className="flex h-full flex-col">
			{/* Logo */}
			<div className="p-6">
				<Link href="/tournaments" className="flex items-center gap-2">
					<Trophy className="h-6 w-6 text-primary" />
					<h2 className="text-xl font-bold">Tennis Predictions</h2>
				</Link>
			</div>

			<Separator />

			{/* Navigation */}
			<nav className="flex-1 space-y-2 p-4">
				{navItems.map((item) => {
					const isActive = pathname.startsWith(item.href);
					const Icon = item.icon;

					return (
						<Button
							key={item.href}
							variant={isActive ? "secondary" : "ghost"}
							className="w-full justify-start"
							asChild
						>
							<Link href={item.href}>
								<Icon className="mr-2 h-4 w-4" />
								{item.label}
							</Link>
						</Button>
					);
				})}

				{isAdmin && (
					<>
						<Separator className="my-4" />
						<Button
							variant={pathname.startsWith("/admin") ? "secondary" : "ghost"}
							className="w-full justify-start"
							asChild
						>
							<Link href="/admin">
								<Settings className="mr-2 h-4 w-4" />
								Admin
							</Link>
						</Button>
					</>
				)}
			</nav>

			<Separator />

			{/* User profile */}
			<div className="p-4">
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
	);
}

export function Sidebar() {
	return (
		<>
			{/* Desktop Sidebar */}
			<aside className="hidden w-60 flex-col border-r bg-background md:flex">
				<SidebarContent />
			</aside>

			{/* Mobile Sidebar */}
			<div className="md:hidden">
				<Sheet>
					<SheetTrigger asChild>
						<Button
							variant="outline"
							size="icon"
							className="fixed left-4 top-4 z-40"
						>
							<Menu className="h-5 w-5" />
							<span className="sr-only">Toggle navigation menu</span>
						</Button>
					</SheetTrigger>
					<SheetContent side="left" className="w-60 p-0">
						<SidebarContent />
					</SheetContent>
				</Sheet>
			</div>
		</>
	);
}
