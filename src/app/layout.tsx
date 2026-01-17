import "~/styles/globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "~/components/ui/sonner";
import { TRPCReactProvider } from "~/trpc/react";
import { LayoutContent } from "./_components/LayoutContent";

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
