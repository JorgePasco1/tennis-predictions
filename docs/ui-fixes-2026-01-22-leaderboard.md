# UI/UX Improvements: By Round Leaderboard Feature

**Date**: 2026-01-22
**Feature**: Per-Round Leaderboard Breakdown
**Status**: Implemented

## Overview

Comprehensive UI/UX review and improvements for the new "By Round" leaderboard feature, addressing spacing inconsistencies, visual hierarchy issues, and mobile responsiveness concerns.

## Issues Identified & Solutions

### 1. Card-Table Integration Padding

**Problem**: Inconsistent padding between Card components and Table components creating visual disconnect.

**Root Cause**:
- Card component expects semantic usage via CardContent with `px-6` padding
- Tables were wrapped in Cards with generic `<div>` wrappers using inconsistent padding
- Base Table component has `p-2` cell padding which doesn't align with Card's spacing system

**Solution**:
- Migrate all Card-wrapped tables to use CardContent with `p-0` override
- This allows Tables to control their own internal padding while Cards provide structure
- Maintains visual consistency with other Card usages across the app

**Files Updated**:
- `/src/app/tournaments/[slug]/_components/ByRoundLeaderboardView.tsx` (lines 96-97, 275-276)
- `/src/app/tournaments/[slug]/_components/TournamentTabs.tsx` (line 172-179)

**Implementation**:
```tsx
// Before
<Card>
  <div className="overflow-x-auto">
    <Table>...</Table>
  </div>
</Card>

// After
<Card>
  <CardContent className="overflow-x-auto p-0">
    <div className="inline-block min-w-full align-middle">
      <Table>...</Table>
    </div>
  </CardContent>
</Card>
```

### 2. Chart Card Semantic Structure

**Problem**: Chart card used manual heading structure (`<h3>` + `<p>`) instead of semantic Card components.

**Impact**:
- Inconsistent spacing compared to other cards
- Non-standard heading hierarchy
- Maintenance burden for spacing adjustments

**Solution**: Migrate to CardHeader/CardTitle/CardDescription pattern

**Files Updated**:
- `/src/app/tournaments/[slug]/_components/ByRoundLeaderboardView.tsx` (lines 78-91)

**Implementation**:
```tsx
// Before
<Card className="p-4">
  <div className="mb-4">
    <h3 className="font-semibold text-lg">Ranking Progression</h3>
    <p className="text-muted-foreground text-sm">Description...</p>
  </div>
  <LeaderboardProgressionChart {...props} />
</Card>

// After
<Card>
  <CardHeader>
    <CardTitle>Ranking Progression</CardTitle>
    <CardDescription>Description...</CardDescription>
  </CardHeader>
  <CardContent>
    <LeaderboardProgressionChart {...props} />
  </CardContent>
</Card>
```

### 3. Badge Size Standardization

**Problem**: Two different badge sizes used within same table row:
- Round Rank badges: `h-8 w-8` (32px)
- Overall Rank badges: `h-6 w-6` (24px)

**Visual Impact**: Creates imbalance and draws attention to inconsistency rather than data

**Solution**: Standardize all rank badges to `h-7 w-7` (28px) with consistent classes

**Files Updated**:
- `/src/app/tournaments/[slug]/_components/ByRoundLeaderboardView.tsx` (lines 183-197, 241-255)
- `/src/app/leaderboards/[tournamentId]/_components/TournamentLeaderboardClient.tsx` (lines 103-113)

**Implementation**:
```tsx
// Standardized rank badge pattern
<Badge
  className={cn(
    "flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs",
    rank === 1 ? "bg-yellow-500 hover:bg-yellow-600"
    : rank === 2 ? "bg-gray-400 hover:bg-gray-500"
    : rank === 3 ? "bg-orange-600 hover:bg-orange-700"
    : "bg-primary",
  )}
>
  {rank}
</Badge>
```

**Rationale**:
- h-7/w-7 (28px) provides optimal balance between visibility and table density
- Consistent sizing improves visual hierarchy
- `text-xs` ensures numbers remain legible at this size

### 4. Round Divider Border Refinement

**Problem**: Hard-coded gray color (`border-t-gray-400`) for round dividers doesn't respect theme

**Solution**: Use semantic border class (`border-t-2`) to inherit theme colors

**Files Updated**:
- `/src/app/tournaments/[slug]/_components/ByRoundLeaderboardView.tsx` (line 147)

**Impact**: Ensures proper contrast in both light and dark themes

### 5. Typography Consistency

**Problem**: Inconsistent text sizing - player names used `text-sm` while other cells had default sizing

**Solution**: Remove explicit `text-sm` from player cell to match table's default text sizing

**Files Updated**:
- `/src/app/tournaments/[slug]/_components/ByRoundLeaderboardView.tsx` (line 204)
- `/src/app/tournaments/[slug]/_components/ByRoundLeaderboardView.tsx` (lines 254-265)

**Rationale**: Table component sets `text-sm` on the entire table, so cell-level overrides create confusion

### 6. Mobile Responsiveness - Sticky Round Column

**Problem**: 8-column table requires horizontal scrolling on mobile with no navigation aid

**Solution**: Make "Round" column sticky on horizontal scroll

**Files Updated**:
- `/src/app/tournaments/[slug]/_components/ByRoundLeaderboardView.tsx` (lines 100-101, 159-172)

**Implementation**:
```tsx
// Table header
<TableHead className="sticky left-0 z-10 bg-background">
  Round
</TableHead>

// Table cell (with rowSpan)
<TableCell
  className="sticky left-0 z-10 bg-background align-top font-medium"
  rowSpan={usersInRound.length}
>
  {/* Round content */}
</TableCell>
```

**Technical Details**:
- `sticky left-0`: Anchors column to left edge during horizontal scroll
- `z-10`: Ensures sticky column overlays scrolling content
- `bg-background`: Prevents visual bleed-through from overlapped cells
- `align-top`: Aligns rowSpan cells to top for better visual grouping

**User Experience**: Users can scroll horizontally to see all stats while maintaining context of which round they're viewing

### 7. Round Name Cell Improvements

**Problem**: Round name cell with rowSpan had inconsistent spacing and alignment

**Solution**:
- Add `align-top` for vertical alignment consistency
- Add `gap-2` between round name and "In Progress" badge
- Use `whitespace-nowrap` to prevent round name breaking

**Files Updated**:
- `/src/app/tournaments/[slug]/_components/ByRoundLeaderboardView.tsx` (lines 159-172)

### 8. View Toggle Button Consistency

**Problem**: View toggle Card used ad-hoc `p-4` padding instead of CardContent

**Solution**: Wrap toggle buttons in CardContent for consistent spacing

**Files Updated**:
- `/src/app/tournaments/[slug]/_components/TournamentTabs.tsx` (lines 99-116)

**Implementation**:
```tsx
// Before
<Card className="mb-4 p-4">
  <div className="flex flex-col gap-2 sm:flex-row">
    {/* Buttons */}
  </div>
</Card>

// After
<Card>
  <CardContent className="flex flex-col gap-2 sm:flex-row">
    {/* Buttons */}
  </CardContent>
</Card>
```

### 9. Current User Row Highlighting

**Problem**: Overall Tournament table didn't highlight current user's row

**Solution**: Add `bg-muted/50` background to current user's row for consistency with By Round view

**Files Updated**:
- `/src/app/leaderboards/[tournamentId]/_components/TournamentLeaderboardClient.tsx` (line 99)

## Design Patterns Established

### Table-Card Integration Pattern

When embedding tables in Cards:

```tsx
<Card>
  <CardContent className="overflow-x-auto p-0">
    <div className="inline-block min-w-full align-middle">
      <Table>
        {/* Table content */}
      </Table>
    </div>
  </CardContent>
</Card>
```

**Key Points**:
- CardContent with `p-0` removes default padding
- Inner div with `inline-block min-w-full align-middle` ensures proper table rendering
- overflow-x-auto on CardContent handles horizontal scroll
- Table controls its own internal spacing via TableHead/TableCell padding

### Sticky Column Pattern

For tables requiring horizontal scroll:

```tsx
// Header
<TableHead className="sticky left-0 z-10 bg-background">
  Column Name
</TableHead>

// Cell
<TableCell className="sticky left-0 z-10 bg-background">
  Cell Content
</TableCell>
```

**Requirements**:
- `sticky left-0`: Creates sticky behavior
- `z-10`: Ensures proper layering
- `bg-background`: Prevents transparency issues
- Works with rowSpan - apply to TableCell, not wrapper div

### Rank Badge Pattern

Standard rank badge for leaderboards:

```tsx
<Badge
  className={cn(
    "flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs",
    rank === 1 ? "bg-yellow-500 hover:bg-yellow-600"  // Gold
    : rank === 2 ? "bg-gray-400 hover:bg-gray-500"    // Silver
    : rank === 3 ? "bg-orange-600 hover:bg-orange-700" // Bronze
    : "bg-primary",                                    // Default
  )}
>
  {rank}
</Badge>
```

**Specifications**:
- Size: `h-7 w-7` (28px) for optimal balance
- Text: `font-bold text-xs` for legibility
- Colors: Consistent gold/silver/bronze palette
- Layout: `flex items-center justify-center` for perfect centering

## Accessibility Improvements

1. **Semantic HTML**: CardHeader/CardTitle provide proper heading hierarchy
2. **Theme Support**: Removed hard-coded colors in favor of theme-aware classes
3. **Sticky Navigation**: Maintains context during horizontal scroll
4. **Consistent Focus States**: All interactive elements inherit proper focus styles

## Mobile Experience

### Before
- 8 columns compressed into viewport
- No navigation context while scrolling
- Inconsistent touch targets

### After
- Round column sticky for constant context
- Consistent badge sizes improve touch targets
- Proper CardContent spacing on mobile
- Horizontal scroll hint via overflow-x-auto

## Performance Considerations

- No JavaScript required for sticky positioning (pure CSS)
- CardContent structure enables better React Server Component caching
- Semantic structure reduces DOM depth
- Badge size standardization reduces layout thrashing

## Testing Checklist

- [x] View toggle buttons have consistent spacing
- [x] Chart card uses proper semantic structure
- [x] By Round table scrolls horizontally with sticky Round column
- [x] Overall Tournament table has consistent badge sizes
- [x] Current user row highlighted in both views
- [x] Round dividers respect theme colors
- [x] All rank badges are 28px (h-7 w-7)
- [x] Typography is consistent across table
- [x] CardContent pattern used consistently
- [x] Code passes Biome linting

## Future Considerations

### Potential Enhancements

1. **Column Prioritization**: Consider hiding less critical columns on mobile (Correct/Exact) with a "Show More" toggle
2. **Virtual Scrolling**: For tournaments with 100+ participants, implement virtual scrolling for table body
3. **Sortable Columns**: Allow users to sort by different metrics (Round Points, Cumulative, etc.)
4. **Responsive Grid View**: Alternative card-based view for mobile instead of table scrolling
5. **Export Functionality**: Allow users to export leaderboard data as CSV

### Mobile Optimization Ideas

- Add swipe gesture hint on first load
- Consider compact mode toggle for denser data display
- Implement pull-to-refresh for live tournaments
- Add jump-to-round quick navigation

## Related Documentation

- `/docs/design-system.md` - Overall design system guidelines
- `/docs/SCORING.md` - Scoring logic that drives leaderboard data
- Component documentation for Card, Table, Badge components

## Files Changed Summary

### Modified
1. `/src/app/tournaments/[slug]/_components/ByRoundLeaderboardView.tsx`
   - Semantic Card structure
   - Sticky round column
   - Standardized badges
   - Typography consistency

2. `/src/app/tournaments/[slug]/_components/TournamentTabs.tsx`
   - View toggle CardContent pattern
   - Overall table CardContent integration

3. `/src/app/leaderboards/[tournamentId]/_components/TournamentLeaderboardClient.tsx`
   - Standardized badge sizes
   - Current user row highlighting

### Impact Analysis

**Visual Consistency**: All tables now use consistent patterns
**Maintainability**: Semantic structure easier to update
**User Experience**: Better mobile navigation, clearer visual hierarchy
**Accessibility**: Improved theme support and semantic HTML

## Lessons Learned

1. **Component Patterns Matter**: Inconsistent use of Card components creates technical debt
2. **Theme First**: Always use theme-aware classes instead of hard-coded colors
3. **Mobile Testing**: Desktop-first thinking led to missed horizontal scroll UX
4. **Standardization**: Small inconsistencies (badge sizes) compound into noticeable issues

## Sign-off

**Reviewed by**: UI/UX Design Systems Expert
**Date**: 2026-01-22
**Status**: Ready for Production
**Breaking Changes**: None - purely visual improvements
