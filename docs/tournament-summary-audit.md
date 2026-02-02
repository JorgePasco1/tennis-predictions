# Tournament Summary Feature Audit

Date: 2026-02-02

## Scope
- Summary page route and layout: `src/app/tournaments/[slug]/summary/page.tsx`
- Summary UI components: `src/app/tournaments/[slug]/summary/_components/*.tsx`
- Summary data aggregation: `src/server/api/routers/summary.ts`
- Auth context and procedures: `src/server/api/trpc.ts`
- Data model references: `src/server/db/schema.ts`
- Router registration: `src/server/api/root.ts`

## Method
- Static code inspection only (no runtime execution, no DB access).

## Summary
- The feature is fully wired end-to-end: routing, data aggregation, and UI composition are cohesive.
- Most core outputs (podium, top performers, overview, round winners, fun stats) are implemented.
- A few correctness, UX, and performance risks exist around data definitions, authorization behavior, and unused payload.

## Findings

### High
- Upset rate is underreported when seed data is missing.
  - Evidence: `upsetMatches` excludes matches without seeds, but `upsetRate` divides by all finalized matches in `src/server/api/routers/summary.ts`.
  - Impact: The metric can be systematically low for tournaments with incomplete seeding.
  - Recommendation: Compute upset rate using only seed-eligible matches, or explicitly display "X of Y seeded matches".

### Medium
- Longest streak is global, not tournament-scoped.
  - Evidence: `user_streak` is unique per user and not tied to tournament (`src/server/db/schema.ts`), but summary uses `userStreaks.longestStreak` (`src/server/api/routers/summary.ts`).
  - Impact: "Longest Streak" in the summary can reflect all-time streaks rather than the tournament.
  - Recommendation: Compute streaks from tournament-scoped match picks or relabel as "All-time longest streak".

- Achievements are queried but not displayed in the summary UI.
  - Evidence: Summary API returns `achievements`, but `TournamentSummaryView` and children do not render it (`src/server/api/routers/summary.ts`, `src/app/tournaments/[slug]/summary/_components/TournamentSummaryView.tsx`).
  - Impact: Extra query/serialization cost and missing content in the UI.
  - Recommendation: Render achievements in the summary page or remove from the API payload.

- Unauthorized users get a 404 instead of a sign-in or access-required state.
  - Evidence: `getTournamentSummary` is a protected procedure; the page catches errors and calls `notFound()` (`src/server/api/routers/summary.ts`, `src/app/tournaments/[slug]/summary/page.tsx`).
  - Impact: Logged-out users see "not found," which may be confusing if the page is intended to be available to authenticated users only.
  - Recommendation: Redirect to sign-in or render a clear access-required state; document if this is intentional.

### Low
- "No participants" state hides all tournament stats.
  - Evidence: `TournamentSummaryView` returns early if `totalParticipants` is 0, so overview stats are not shown (`src/app/tournaments/[slug]/summary/_components/TournamentSummaryView.tsx`).
  - Impact: Tournaments with matches but no participants lose high-level context.
  - Recommendation: Render the overview even with zero participants or show a minimal stats block.

- Summary UI is fully client-rendered despite static data.
  - Evidence: Summary components are `use client` and receive pre-fetched data from the server (`src/app/tournaments/[slug]/summary/_components/*.tsx`, `src/app/tournaments/[slug]/summary/page.tsx`).
  - Impact: Extra JS bundle and hydration cost for a mostly static view.
  - Recommendation: Move non-interactive sections to server components, or split client-only UI primitives into smaller islands.

- No dedicated tests found for summary aggregation or UI.
  - Evidence: No summary-specific test files in the repository (`**/*summary*.{test,spec}.{ts,tsx,js,jsx}`).
  - Impact: Regression risk for complex aggregation logic.
  - Recommendation: Add targeted tests for summary calculations and empty/edge states.

### Observations / Strengths
- The summary is only accessible after the tournament is closed, which prevents partial or misleading results (`src/app/tournaments/[slug]/summary/page.tsx`).
- Aggregations cover multiple perspectives (podium, consistency, contrarian picks, round winners), providing good variety.
- The UI has reasonable mobile behavior (horizontal scroll for round winners) and clear visual hierarchy.

## Follow-ups (Optional)
- Confirm whether summary should be visible to logged-out users; adjust auth handling accordingly.
- Decide whether achievements should be part of the summary UI; remove or render consistently.
- Define a single source of truth for tournament-scoped vs global stats and label them clearly.
