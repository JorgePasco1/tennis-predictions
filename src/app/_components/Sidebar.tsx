"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import {
	BarChart3,
	Home,
	Menu,
	Settings,
	TrendingUp,
	Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";

function SidebarContent({
	onNavigate,
	onUserButtonClick,
}: {
	onNavigate?: () => void;
	onUserButtonClick?: () => void;
}) {
	const pathname = usePathname();
	const { user } = useUser();
	const isAdmin = user?.publicMetadata?.role === "admin";
	const userButtonRef = useRef<HTMLDivElement>(null);

	// Listen for clicks on UserButton menu items
	useEffect(() => {
		if (!onUserButtonClick) return;

		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			// Check if click is on a Clerk menu item
			if (
				target.closest('[role="menuitem"]') &&
				userButtonRef.current?.contains(target)
			) {
				// Close the sheet before the action executes
				onUserButtonClick();
			}
		};

		document.addEventListener("click", handleClick, true);
		return () => document.removeEventListener("click", handleClick, true);
	}, [onUserButtonClick]);

	const navItems = [
		{
			href: "/home",
			label: "Home",
			icon: Home,
		},
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
		{
			href: "/stats",
			label: "My Stats",
			icon: TrendingUp,
		},
	];

	return (
		<div className="flex h-full flex-col">
			{/* Logo */}
			<div className="p-6">
				<Link
					className="flex items-center gap-2"
					href="/home"
					onClick={onNavigate}
				>
					<Trophy className="h-6 w-6 text-primary" />
					<h2 className="font-bold text-xl">Tennis Predictions</h2>
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
							asChild
							className="w-full justify-start"
							key={item.href}
							variant={isActive ? "secondary" : "ghost"}
						>
							<Link href={item.href} onClick={onNavigate}>
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
							asChild
							className="w-full justify-start"
							variant={pathname.startsWith("/admin") ? "secondary" : "ghost"}
						>
							<Link href="/admin" onClick={onNavigate}>
								<Settings className="mr-2 h-4 w-4" />
								Admin
							</Link>
						</Button>
					</>
				)}
			</nav>

			<Separator />

			{/* User profile */}
			<div className="p-4" ref={userButtonRef}>
				<UserButton
					afterSignOutUrl="/"
					appearance={{
						elements: {
							avatarBox: "h-10 w-10",
						},
					}}
				>
					<UserButton.MenuItems>
						<UserButton.Link
							href="/stats"
							label="My Stats"
							labelIcon={<TrendingUp className="h-4 w-4" />}
						/>
						<UserButton.Action label="manageAccount" />
					</UserButton.MenuItems>
				</UserButton>
			</div>
		</div>
	);
}

export function Sidebar() {
	// Delay rendering the mobile sheet until after hydration to avoid ID mismatch
	const [mounted, setMounted] = useState(false);
	const [sheetOpen, setSheetOpen] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<>
			{/* Desktop Sidebar */}
			<aside className="hidden w-60 flex-col border-r bg-background md:flex">
				<SidebarContent />
			</aside>

			{/* Mobile Sidebar - only render after hydration to avoid Radix ID mismatch */}
			{mounted && (
				<div className="md:hidden">
					<Sheet onOpenChange={setSheetOpen} open={sheetOpen}>
						<SheetTrigger asChild>
							<Button
								className="fixed top-4 left-4 z-40"
								size="icon"
								variant="outline"
							>
								<Menu className="h-5 w-5" />
								<span className="sr-only">Toggle navigation menu</span>
							</Button>
						</SheetTrigger>
						<SheetContent className="w-60 p-0" side="left">
							<SidebarContent
								onNavigate={() => setSheetOpen(false)}
								onUserButtonClick={() => setSheetOpen(false)}
							/>
						</SheetContent>
					</Sheet>
				</div>
			)}
		</>
	);
}
