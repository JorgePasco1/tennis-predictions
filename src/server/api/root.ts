import { tournamentsRouter } from "~/server/api/routers/tournaments";
import { adminRouter } from "~/server/api/routers/admin";
import { picksRouter } from "~/server/api/routers/picks";
import { leaderboardsRouter } from "~/server/api/routers/leaderboards";
import { resultsRouter } from "~/server/api/routers/results";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	tournaments: tournamentsRouter,
	admin: adminRouter,
	picks: picksRouter,
	leaderboards: leaderboardsRouter,
	results: resultsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
