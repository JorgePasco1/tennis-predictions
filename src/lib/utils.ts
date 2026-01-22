import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Format a display name as "First Name + Last Initial" (e.g., "John D.")
 * For single names, returns the name as-is.
 */
export function formatDisplayName(displayName: string): string {
	const parts = displayName.trim().split(/\s+/);
	if (parts.length === 1) return parts[0] ?? displayName;
	const firstName = parts[0];
	const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase();
	return lastInitial
		? `${firstName} ${lastInitial}.`
		: (firstName ?? displayName);
}

/**
 * Format a player name with TBD fallback for empty/null values
 * Returns "TBD" if the name is empty, null, or undefined
 */
export function formatPlayerName(
	playerName: string | null | undefined,
): string {
	return playerName?.trim() || "TBD";
}

/**
 * Format a full match display with player names and seeds
 * Example: "(1) A. Player vs (2) B. Opponent"
 * Example with TBD: "A. Player vs TBD"
 */
export function formatMatchDisplay(
	player1Name: string | null | undefined,
	player1Seed: number | null | undefined,
	player2Name: string | null | undefined,
	player2Seed: number | null | undefined,
): string {
	const p1 = formatPlayerName(player1Name);
	const p2 = formatPlayerName(player2Name);
	const seed1 = player1Seed ? `(${player1Seed}) ` : "";
	const seed2 = player2Seed ? `(${player2Seed}) ` : "";
	return `${seed1}${p1} vs ${seed2}${p2}`;
}
