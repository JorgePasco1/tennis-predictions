import { achievementsRouter } from "~/server/api/routers/achievements";
import { adminRouter } from "~/server/api/routers/admin";
import { leaderboardsRouter } from "~/server/api/routers/leaderboards";
import { picksRouter } from "~/server/api/routers/picks";
import { resultsRouter } from "~/server/api/routers/results";
import { scheduleRouter } from "~/server/api/routers/schedule";
import { tournamentsRouter } from "~/server/api/routers/tournaments";
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
	schedule: scheduleRouter,
	achievements: achievementsRouter,
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
