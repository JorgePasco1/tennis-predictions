import "~/styles/globals.css";

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { LayoutContent } from "./_components/LayoutContent";
import { Toaster } from "~/components/ui/sonner";

export const metadata: Metadata = {
	title: "Tennis Predictions",
	description: "ATP Tour singles tournament predictions platform",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<ClerkProvider>
			<html className={`${geist.variable}`} lang="en">
				<body>
					<TRPCReactProvider>
						<LayoutContent>{children}</LayoutContent>
						<Toaster />
					</TRPCReactProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
