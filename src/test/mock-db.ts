/**
 * Mock Database for Testing
 *
 * Provides an in-memory mock of the Drizzle database for testing
 * tRPC procedures without hitting a real database.
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { type Mock, vi } from "vitest";
import type * as schema from "~/server/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockFn = Mock<(...args: any[]) => any>;

// Type for query methods
interface MockQueryMethods {
	findFirst: MockFn;
	findMany: MockFn;
}

// Type for the mock database
export interface MockDb {
	query: {
		users: MockQueryMethods;
		tournaments: MockQueryMethods;
		rounds: MockQueryMethods;
		matches: MockQueryMethods;
		matchPicks: MockQueryMethods;
		userRoundPicks: MockQueryMethods;
		roundScoringRules: MockQueryMethods;
	};
	insert: MockFn;
	update: MockFn;
	delete: MockFn;
	select: MockFn;
	transaction: MockFn;
}

/**
 * Create a fresh mock database instance
 */
export function createMockDb(): MockDb {
	const mockInsert = vi.fn().mockReturnValue({
		values: vi.fn().mockReturnValue({
			returning: vi.fn().mockResolvedValue([]),
			onConflictDoNothing: vi.fn().mockResolvedValue([]),
			onConflictDoUpdate: vi.fn().mockResolvedValue([]),
		}),
	});

	const mockUpdate = vi.fn().mockReturnValue({
		set: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([]),
			}),
		}),
	});

	const mockDelete = vi.fn().mockReturnValue({
		where: vi.fn().mockResolvedValue([]),
	});

	const mockSelect = vi.fn().mockReturnValue({
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				groupBy: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockResolvedValue([]),
				}),
			}),
			innerJoin: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					groupBy: vi.fn().mockReturnValue({
						orderBy: vi.fn().mockResolvedValue([]),
					}),
				}),
			}),
		}),
	});

	const mockTransaction = vi.fn().mockImplementation(async (callback) => {
		const txDb = createMockDb();
		return callback(txDb);
	});

	return {
		query: {
			users: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
			tournaments: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
			rounds: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
			matches: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
			matchPicks: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
			userRoundPicks: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
			roundScoringRules: {
				findFirst: vi.fn().mockResolvedValue(null),
				findMany: vi.fn().mockResolvedValue([]),
			},
		},
		insert: mockInsert,
		update: mockUpdate,
		delete: mockDelete,
		select: mockSelect,
		transaction: mockTransaction,
	};
}

/**
 * Reset all mocks in a mock database
 */
export function resetMockDb(mockDb: MockDb): void {
	// Reset query mocks
	Object.values(mockDb.query).forEach((table) => {
		Object.values(table).forEach((method) => {
			if (typeof method.mockReset === "function") {
				method.mockReset();
			}
		});
	});

	// Reset action mocks
	mockDb.insert.mockClear();
	mockDb.update.mockClear();
	mockDb.delete.mockClear();
	mockDb.select.mockClear();
	mockDb.transaction.mockClear();
}

/**
 * Type assertion to use mock db as real db type
 */
export function asDrizzleDb(mockDb: MockDb): NodePgDatabase<typeof schema> {
	return mockDb as unknown as NodePgDatabase<typeof schema>;
}

// =============================================================================
// In-Memory Store for Integration Tests
// =============================================================================

type StoredEntity = Record<string, unknown> & { id: number | string };

interface InMemoryStore {
	users: Map<string, StoredEntity>;
	tournaments: Map<number, StoredEntity>;
	rounds: Map<number, StoredEntity>;
	matches: Map<number, StoredEntity>;
	matchPicks: Map<number, StoredEntity>;
	userRoundPicks: Map<number, StoredEntity>;
	roundScoringRules: Map<number, StoredEntity>;
}

/**
 * Create an in-memory store for testing
 */
export function createInMemoryStore(): InMemoryStore {
	return {
		users: new Map(),
		tournaments: new Map(),
		rounds: new Map(),
		matches: new Map(),
		matchPicks: new Map(),
		userRoundPicks: new Map(),
		roundScoringRules: new Map(),
	};
}

/**
 * Create a mock database backed by in-memory store
 * This provides more realistic behavior for integration tests
 */
export function createInMemoryDb(store: InMemoryStore): MockDb {
	const mockDb = createMockDb();

	// Wire up query methods to use store
	mockDb.query.users.findFirst.mockImplementation(
		async ({ where }: { where?: unknown }) => {
			// Simple implementation - returns first user
			const users = Array.from(store.users.values());
			return users[0] ?? null;
		},
	);

	mockDb.query.users.findMany.mockImplementation(async () => {
		return Array.from(store.users.values());
	});

	mockDb.query.matches.findFirst.mockImplementation(
		async ({ where }: { where?: unknown }) => {
			const matches = Array.from(store.matches.values());
			return matches[0] ?? null;
		},
	);

	mockDb.query.matches.findMany.mockImplementation(async () => {
		return Array.from(store.matches.values());
	});

	mockDb.query.matchPicks.findMany.mockImplementation(async () => {
		return Array.from(store.matchPicks.values());
	});

	mockDb.query.userRoundPicks.findFirst.mockImplementation(async () => {
		const picks = Array.from(store.userRoundPicks.values());
		return picks[0] ?? null;
	});

	mockDb.query.rounds.findFirst.mockImplementation(async () => {
		const rounds = Array.from(store.rounds.values());
		return rounds[0] ?? null;
	});

	return mockDb;
}
