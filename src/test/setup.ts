/**
 * Vitest Global Setup
 *
 * This file runs before all tests and sets up global mocks and configuration.
 */

import { vi } from "vitest";

// Mock environment variables for tests
vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost:5432/test");
vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_mock");
vi.stubEnv("CLERK_SECRET_KEY", "sk_test_mock");

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
	currentUser: vi.fn().mockResolvedValue(null),
	auth: vi.fn().mockResolvedValue({ userId: null }),
}));

// Console output cleanup - suppress expected errors in tests
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
	// Filter out expected test errors
	const message = String(args[0]);
	if (message.includes("[TRPC]") || message.includes("Expected error")) {
		return;
	}
	originalConsoleError.apply(console, args);
};
