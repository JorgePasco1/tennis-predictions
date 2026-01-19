# Scoring System

This document explains how points are calculated in tennis predictions.

## Quick Reference

| Round | Winner Points | Exact Score Bonus | Max Per Match |
|-------|---------------|-------------------|---------------|
| Round of 128 | 10 | 5 | 15 |
| Round of 64 | 10 | 5 | 15 |
| Round of 32 | 10 | 5 | 15 |
| Round of 16 | 10 | 5 | 15 |
| Quarter Finals | 10 | 5 | 15 |
| Semi Finals | 12 | 6 | 18 |
| Final | 15 | 8 | 23 |

## How Scoring Works

### Winner Points

You earn **winner points** when you correctly predict which player wins the match. This is the base score for any correct prediction.

### Exact Score Bonus

If you correctly predict the winner **and** the exact score (e.g., 2-1 in a best-of-3 match), you earn a bonus on top of the winner points. The bonus is approximately 50% of the winner points.

**Note**: The exact score bonus requires a correct winner prediction. You cannot earn the bonus if you picked the wrong winner.

### Examples

**Scenario 1: Correct winner, wrong score**
- Your pick: Player A wins 2-0
- Actual result: Player A wins 2-1
- Points earned: **10** (winner only, no exact bonus)

**Scenario 2: Correct winner and exact score**
- Your pick: Player A wins 2-0
- Actual result: Player A wins 2-0
- Points earned: **15** (10 winner + 5 exact bonus)

**Scenario 3: Wrong prediction**
- Your pick: Player A wins 2-1
- Actual result: Player B wins 2-0
- Points earned: **0**

**Scenario 4: Final match, correct winner only**
- Your pick: Player A wins 3-1
- Actual result: Player A wins 3-2
- Points earned: **15** (Finals have higher base points)

**Scenario 5: Final match, perfect prediction**
- Your pick: Player A wins 3-1
- Actual result: Player A wins 3-1
- Points earned: **23** (15 winner + 8 exact bonus)

## Design Philosophy

### Why a Hybrid System?

Our scoring system blends two competing philosophies:

#### Flat Scoring Benefits
- **Rewards deep knowledge**: Early rounds contain ~50% of tournament matches. Knowing lower-ranked players and spotting upsets early is valuable.
- **Encourages bold predictions**: No incentive to "pick chalk" (always pick favorites) in early rounds.
- **Simple and memorable**: 10/5 is the default for most rounds.

#### Progressive Scoring Benefits
- **Championship drama**: Semi Finals and Final feel more significant.
- **Come-from-behind potential**: Late rounds can still shift the leaderboard.
- **Familiar format**: Mirrors popular bracket contests.

### Our Approach

We chose a **predominantly flat system with slight late-round increases**:

1. **R128 through Quarter Finals (5 rounds)**: Flat 10/5 scoring
   - Most of the tournament uses consistent, simple scoring
   - Rewards comprehensive draw knowledge

2. **Semi Finals and Final (2 rounds)**: Modest increases
   - SF: +20% over base (12 vs 10)
   - Final: +50% over base (15 vs 10)
   - Creates excitement without overwhelming early performance

### Key Design Principles

- **Simplicity**: 10/5 for 5 of 7 rounds - easy to remember
- **Skill over luck**: ~67% of points come from winner prediction
- **Engagement**: Every round matters, championship still feels special
- **Balance**: Early rounds contribute majority of points due to match volume

## Leaderboard & Tie-Breaking

### Point Aggregation
- Total points = sum of all match points across the tournament
- Points are calculated immediately when matches are finalized

### Tie-Breaking Rules
When players have the same total points, ties are broken by **earliest submission time**. The player who submitted their first pick earliest wins the tie-breaker.

## For Developers

### File Locations

| File | Purpose |
|------|---------|
| `src/server/utils/scoring-config.ts` | Point values per round |
| `src/server/utils/scoring-config.test.ts` | Unit tests |
| `src/server/scripts/recalculate-scores.ts` | Database migration script |

### How to Modify Scoring

1. Update values in `scoring-config.ts`
2. Update test expectations in `scoring-config.test.ts`
3. Run tests: `pnpm vitest run src/server/utils/scoring-config.test.ts`
4. Run migration for existing data: `pnpm tsx --env-file=.env src/server/scripts/recalculate-scores.ts`

### Configuration Structure

```typescript
// scoring-config.ts
export function getScoringForRound(roundName: string): {
  pointsPerWinner: number;
  pointsExactScore: number;
}
```

The function returns fixed values for known rounds and defaults to 10/5 for unknown round names.
