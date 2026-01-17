"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function LayoutContent({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	// Don't show sidebar on landing page or auth pages
	const showSidebar =
		pathname !== "/" &&
		!pathname.startsWith("/sign-in") &&
		!pathname.startsWith("/sign-up");

	if (!showSidebar) {
		return <>{children}</>;
	}

	return (
		<div className="flex h-screen">
			<Sidebar />
			<main className="flex-1 overflow-auto pt-8 md:pt-0">{children}</main>
		</div>
	);
}
