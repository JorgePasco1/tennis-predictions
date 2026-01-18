/**
 * Test Context Utilities
 *
 * Provides utilities for creating mock tRPC contexts for testing procedures.
 */

import { mockUsers } from "./fixtures";
import { createMockDb, type MockDb } from "./mock-db";

// User context type matching the real context
export interface MockUser {
	id: string;
	email: string;
	displayName: string;
	role: "user" | "admin";
}

// Full context type for tRPC procedures
export interface MockTRPCContext {
	db: MockDb;
	user: MockUser | null;
	headers: Headers;
}

/**
 * Create a mock context for unauthenticated requests
 */
export function createPublicContext(
	overrides: Partial<MockTRPCContext> = {},
): MockTRPCContext {
	return {
		db: createMockDb(),
		user: null,
		headers: new Headers(),
		...overrides,
	};
}

/**
 * Create a mock context for authenticated user requests
 */
export function createUserContext(
	user: Partial<MockUser> = {},
	overrides: Partial<Omit<MockTRPCContext, "user">> = {},
): MockTRPCContext {
	return {
		db: createMockDb(),
		user: {
			id: mockUsers.player1.id,
			email: mockUsers.player1.email,
			displayName: mockUsers.player1.displayName,
			role: "user",
			...user,
		},
		headers: new Headers(),
		...overrides,
	};
}

/**
 * Create a mock context for admin requests
 */
export function createAdminContext(
	user: Partial<MockUser> = {},
	overrides: Partial<Omit<MockTRPCContext, "user">> = {},
): MockTRPCContext {
	return {
		db: createMockDb(),
		user: {
			id: mockUsers.admin.id,
			email: mockUsers.admin.email,
			displayName: mockUsers.admin.displayName,
			role: "admin",
			...user,
		},
		headers: new Headers(),
		...overrides,
	};
}

/**
 * Create context with custom database mock
 */
export function createContextWithDb(
	mockDb: MockDb,
	user: MockUser | null = null,
): MockTRPCContext {
	return {
		db: mockDb,
		user,
		headers: new Headers(),
	};
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Helper to await and catch tRPC errors
 */
export async function expectTRPCError<T>(
	promise: Promise<T>,
	expectedCode?: string,
): Promise<Error> {
	try {
		await promise;
		throw new Error("Expected promise to reject, but it resolved");
	} catch (error) {
		if (error instanceof Error && error.message.includes("Expected promise")) {
			throw error;
		}
		if (expectedCode) {
			const err = error as { code?: string };
			if (err.code !== expectedCode) {
				throw new Error(
					`Expected error code "${expectedCode}" but got "${err.code}"`,
				);
			}
		}
		return error as Error;
	}
}

/**
 * Helper to verify an operation throws with a specific message
 */
export async function expectErrorMessage(
	promise: Promise<unknown>,
	expectedMessage: string | RegExp,
): Promise<void> {
	try {
		await promise;
		throw new Error("Expected promise to reject, but it resolved");
	} catch (error) {
		if (error instanceof Error && error.message.includes("Expected promise")) {
			throw error;
		}
		const actualMessage =
			error instanceof Error ? error.message : String(error);
		if (typeof expectedMessage === "string") {
			if (!actualMessage.includes(expectedMessage)) {
				throw new Error(
					`Expected error message to include "${expectedMessage}" but got "${actualMessage}"`,
				);
			}
		} else if (!expectedMessage.test(actualMessage)) {
			throw new Error(
				`Expected error message to match ${expectedMessage} but got "${actualMessage}"`,
			);
		}
	}
}

/**
 * Helper to create a delay for async operations
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
