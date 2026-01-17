# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a tennis predictions application built with the T3 Stack, a full-stack Next.js framework that combines:
- **Next.js 15** with App Router (React Server Components)
- **tRPC** for end-to-end type-safe APIs
- **Drizzle ORM** with PostgreSQL
- **TanStack Query** for data fetching
- **Tailwind CSS** for styling
- **Biome** for linting and formatting
- **pnpm** as the package manager (v10.23.0)

## Development Commands

### Setup
```bash
# Install dependencies
pnpm install

# Create .env file from example
cp .env.example .env

# Start local PostgreSQL database using Docker/Podman
./start-database.sh

# Generate database migrations
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Push schema changes directly (development)
pnpm db:push

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

### Development
```bash
# Start development server with Turbopack
pnpm dev

# Build for production
pnpm build

# Preview production build locally
pnpm preview

# Start production server
pnpm start

# Type checking
pnpm typecheck
```

### Code Quality
```bash
# Check code with Biome (lint + format)
pnpm check

# Auto-fix safe issues
pnpm check:write

# Auto-fix including unsafe changes
pnpm check:unsafe
```

## Architecture

### tRPC Setup

This project uses tRPC for type-safe API communication with two different entry points:

**Server Components (`src/trpc/server.ts`):**
- Use `api` from `~/trpc/server` in React Server Components
- Direct server-side caller, no HTTP overhead
- Provides `HydrateClient` for streaming data to client

**Client Components (`src/trpc/react.tsx`):**
- Use `api` from `~/trpc/react` in Client Components
- HTTP-based communication via `/api/trpc` endpoint
- Wrapped in `TRPCReactProvider` (already set up in root layout)
- Uses `httpBatchStreamLink` for automatic batching

**API Endpoint (`src/app/api/trpc/[trpc]/route.ts`):**
- Handles HTTP requests from client-side tRPC calls
- Uses Next.js App Router route handlers

### Adding New tRPC Routers

1. Create router in `src/server/api/routers/[name].ts`:
```typescript
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const yourRouter = createTRPCRouter({
  yourProcedure: publicProcedure
    .input(z.object({ /* ... */ }))
    .query(async ({ ctx, input }) => {
      // ctx.db is available for database access
      return await ctx.db.query.yourTable.findMany();
    }),
});
```

2. Add to `src/server/api/root.ts`:
```typescript
export const appRouter = createTRPCRouter({
  post: postRouter,
  your: yourRouter, // Add here
});
```

Type safety is automatically maintained across the entire stack.

### Database with Drizzle ORM

**Schema location:** `src/server/db/schema.ts`
**Database client:** `src/server/db/index.ts` exports `db` instance

**Table naming convention:** All tables are prefixed with `tennis-predictions_*` (configured in `drizzle.config.ts`)

**Workflow:**
1. Update schema in `src/server/db/schema.ts`
2. Generate migration: `pnpm db:generate`
3. Apply migration: `pnpm db:migrate` (or `pnpm db:push` for development)

The database connection is cached in development to avoid issues with Next.js HMR.

### Environment Variables

All environment variables are validated at build time using `@t3-oss/env-nextjs` in `src/env.js`.

**Adding new variables:**
1. Add schema to `src/env.js` (`server` or `client` object)
2. Add to `runtimeEnv` mapping
3. Add to `.env.example`
4. Update your `.env` file

**Client-side variables** must be prefixed with `NEXT_PUBLIC_`.

### Middleware System

The tRPC setup includes a timing middleware (`src/server/api/trpc.ts:82-97`) that:
- Adds artificial delay in development (100-500ms) to simulate network latency
- Logs execution time for all procedures
- Helps catch unwanted waterfalls during development

You can remove this middleware if not needed, but it's useful for catching performance issues early.

### Context

The tRPC context (`src/server/api/trpc.ts:27-32`) provides:
- `db`: Drizzle database instance
- `headers`: Request headers

Extend the context in `createTRPCContext` if you need to add authentication, sessions, or other request-scoped data.

## Key Patterns

### Type Inference

Use the type helpers from `~/trpc/react`:
```typescript
import type { RouterInputs, RouterOutputs } from "~/trpc/react";

type PostCreateInput = RouterInputs['post']['create'];
type PostOutput = RouterOutputs['post']['getById'];
```

### Server vs Client Components

- **Server Components**: Default in App Router, use `api` from `~/trpc/server`
- **Client Components**: Need `"use client"` directive, use `api` from `~/trpc/react`

### Database Access

Always access the database through the context (`ctx.db`) in tRPC procedures, never import `db` directly in API routes.

## Code Style

- Biome is configured with auto-sorting for imports and class names
- Uses Tailwind CSS class sorting for utility functions like `clsx`, `cva`, `cn`
- Run `pnpm check` before committing to ensure code quality
