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
