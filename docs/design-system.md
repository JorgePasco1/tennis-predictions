# Design System Guidelines

This document outlines the design system guidelines for the Tennis Predictions application. All UI components and pages should adhere to these standards to maintain visual consistency and exceptional user experience.

## Core Principles

1. **Accessibility First**: Ensure all UI is usable by everyone (WCAG compliance)
2. **Usability**: Prioritize intuitive and efficient interactions
3. **Consistency**: Maintain predictable patterns across all features
4. **Aesthetics**: Create visually pleasing, professional interfaces
5. **Performance**: Optimize for fast load times and responsive interactions

## Layout & Spacing

### Mobile Navigation Clearance

**Issue**: The mobile hamburger menu button is positioned at `fixed top-4 left-4 z-40`, which can overlap with page navigation elements.

**Solution**: Pages with custom navigation bars (e.g., admin pages with "Back to..." links) must account for the mobile menu button.

**Implementation**:
```tsx
// For pages with custom navigation that includes back links
<nav className="border-b bg-white">
  <div className="container mx-auto px-4 py-4 pl-16 md:pl-4">
    <Link href="/admin">← Back to Admin Dashboard</Link>
  </div>
</nav>
```

**Affected Pages**:
- `/src/app/admin/tournaments/[id]/page.tsx`
- `/src/app/admin/tournaments/new/page.tsx`
- `/src/app/tournaments/[slug]/picks/page.tsx`

**Breakpoint Logic**:
- `pl-16`: Mobile devices (< 768px) - provides clearance for hamburger button
- `md:pl-4`: Desktop devices (≥ 768px) - normal padding (sidebar is visible, no hamburger)

### Container Spacing

Standard container spacing:
- **Horizontal padding**: `px-4` (1rem / 16px)
- **Vertical padding**: `py-4` for nav bars, `py-8` for main content
- **Container class**: `container mx-auto` for responsive max-width

## Typography

### Text Overflow & Wrapping

**Issue**: Long URLs and text content can overflow containers, breaking layouts and causing horizontal scroll.

**Solution**: Apply appropriate text breaking classes based on content type.

**URL Display**:
```tsx
// For displaying URLs that should break at any character
<a
  className="break-all text-blue-600 underline hover:text-blue-800"
  href={url}
  rel="noopener noreferrer"
  target="_blank"
>
  {url}
</a>
```

**Responsive URL Layouts**:
For better mobile experience, stack labels and URLs vertically on small screens:
```tsx
<p className="flex flex-col gap-1 sm:block">
  <span className="font-medium">ATP URL:</span>{" "}
  <a className="break-all text-blue-600 underline" href={url}>
    {url}
  </a>
</p>
```

**Text Breaking Classes**:
- `break-all`: Break at any character (use for URLs, hashes, or long strings without spaces)
- `break-words`: Break at word boundaries when possible (use for regular text content)
- `truncate`: Single-line ellipsis overflow (use sparingly, only when full text isn't critical)

**When to Use Each**:
- **URLs**: Always use `break-all` to prevent horizontal overflow
- **Player names**: Use `break-words` for long names
- **Email addresses**: Use `break-all`
- **Regular paragraphs**: No class needed (default wrapping behavior)

## Color Palette

### Status Colors

**Draft Status**:
- Background: `bg-yellow-50`
- Border: `border-yellow-200` / `border-yellow-300`
- Text: `text-yellow-800` / `text-yellow-900`
- Accent: `bg-yellow-600`

**Active/Success Status**:
- Background: `bg-green-50`
- Border: `border-green-300` / `border-green-500`
- Text: `text-green-800` / `text-green-900`
- Button: `bg-green-600 hover:bg-green-700`

**Error/Incorrect Status**:
- Background: `bg-red-50`
- Border: `border-red-300`
- Text: `text-red-800` / `text-red-900`

**Info/Primary**:
- Background: `bg-blue-50`
- Border: `border-blue-200`
- Text: `text-blue-800` / `text-blue-900`
- Links: `text-blue-600 hover:text-blue-700` / `hover:text-blue-800`

**Neutral/Archived**:
- Background: `bg-gray-50` / `bg-muted`
- Border: `border-gray-200` / `border-gray-300`
- Text: `text-gray-600` / `text-gray-700`

## Component Patterns

### Navigation Bars

**Standard Admin/Detail Page Navigation**:
```tsx
<nav className="border-b bg-white">
  <div className="container mx-auto px-4 py-4 pl-16 md:pl-4">
    <Link
      className="text-blue-600 transition hover:text-blue-700"
      href="/parent-route"
    >
      ← Back to Parent Page
    </Link>
  </div>
</nav>
```

### Buttons

**Primary Action**:
```tsx
<button className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
  Primary Action
</button>
```

**Success Action**:
```tsx
<button className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
  Submit / Confirm
</button>
```

**Secondary Action**:
```tsx
<button className="rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
  Cancel / Secondary
</button>
```

### Links

**Standard Navigation Link**:
```tsx
<Link className="text-blue-600 transition hover:text-blue-700" href="/path">
  Link Text
</Link>
```

**External Link with URL**:
```tsx
<a
  className="break-all text-blue-600 underline hover:text-blue-800"
  href={url}
  rel="noopener noreferrer"
  target="_blank"
>
  {url}
</a>
```

### Alert Boxes

**Info/Reference**:
```tsx
<div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
  <div className="mb-2 font-semibold text-blue-900">Title</div>
  <p className="text-blue-800">Content text</p>
</div>
```

**Warning**:
```tsx
<div className="mb-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
  <div className="mb-2 font-semibold text-yellow-900">⚠️ Important</div>
  <p className="text-yellow-800">Warning message</p>
</div>
```

**Success**:
```tsx
<div className="mb-8 rounded-lg border border-green-200 bg-green-50 p-6">
  <div className="mb-2 font-semibold text-green-900">✓ Success</div>
  <p className="text-green-800">Success message</p>
</div>
```

**Error**:
```tsx
<div className="mb-8 rounded-lg border border-red-300 bg-red-50 p-6">
  <h3 className="mb-2 font-semibold text-red-900">Error</h3>
  <p className="text-red-800">{error}</p>
</div>
```

## Responsive Design

### Breakpoints

Following Tailwind's default breakpoints:
- **sm**: 640px (small tablets/large phones)
- **md**: 768px (tablets)
- **lg**: 1024px (desktops)
- **xl**: 1280px (large desktops)

### Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```tsx
// Mobile: stack vertically, Desktop: horizontal layout
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  {/* Content */}
</div>

// Mobile: full width, Desktop: grid
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Cards */}
</div>
```

## Accessibility

### Focus States

All interactive elements must have visible focus states:
```tsx
className="focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
```

### Disabled States

Always include visual and interaction feedback for disabled states:
```tsx
className="disabled:cursor-not-allowed disabled:opacity-50"
```

### ARIA Labels

Provide descriptive labels for screen readers:
```tsx
<button aria-label="Close menu">
  <X className="h-4 w-4" />
</button>
```

### Color Contrast

Ensure sufficient contrast ratios:
- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

## Best Practices

### Text Content

1. **Never let URLs overflow** - Always use `break-all` on URL displays
2. **Stack on mobile** - Use `flex flex-col sm:block` for label + URL patterns
3. **Provide context** - Include descriptive labels before URLs or important data

### Spacing

1. **Consistent gaps** - Use spacing scale: `gap-2` (0.5rem), `gap-4` (1rem), `gap-6` (1.5rem), `gap-8` (2rem)
2. **Account for floating elements** - Add appropriate padding when fixed/absolute positioned elements exist
3. **Breathing room** - Don't pack elements too tightly, use generous spacing

### Loading & Error States

1. **Loading indicators** - Always show feedback during async operations
2. **Error boundaries** - Gracefully handle and display errors
3. **Empty states** - Provide helpful messaging when no data exists

## Design Decision Log

### 2026-01-17: Mobile Navigation Clearance

**Problem**: Floating hamburger menu (fixed at top-4 left-4) overlaps with "Back to..." navigation links in admin pages.

**Solution**: Add responsive left padding (`pl-16 md:pl-4`) to navigation container divs in pages with custom nav bars.

**Rationale**:
- Maintains clean, uncluttered layouts on mobile
- Prevents click target overlap
- Doesn't affect desktop layout where sidebar is always visible
- Uses existing Tailwind utilities for consistency

**Files Updated**:
- `/src/app/admin/tournaments/[id]/page.tsx`
- `/src/app/admin/tournaments/new/page.tsx`
- `/src/app/tournaments/[slug]/picks/page.tsx`

### 2026-01-17: URL Text Overflow

**Problem**: Long ATP URLs overflow their containers, creating horizontal scroll and breaking layouts.

**Solution**: Apply `break-all` class to all URL anchor tags, and use responsive flex layout (`flex flex-col gap-1 sm:block`) for label + URL combinations.

**Rationale**:
- URLs have no natural break points, requiring character-level breaking
- Responsive layout improves mobile readability
- Maintains compact inline display on desktop
- Prevents layout breakage across all viewport sizes

**Files Updated**:
- `/src/app/admin/tournaments/[id]/page.tsx` (display and preview sections)
- `/src/app/admin/tournaments/new/page.tsx`
- `/src/app/tournaments/[slug]/picks/page.tsx` (multiple instances)

## Implementation Checklist

When creating or updating UI components:

- [ ] Mobile navigation clearance accounted for (if custom nav present)
- [ ] URLs use `break-all` class
- [ ] Long text content has appropriate wrapping
- [ ] Sufficient color contrast for all text
- [ ] Focus states visible on all interactive elements
- [ ] Disabled states have proper visual feedback
- [ ] Responsive behavior defined for mobile, tablet, desktop
- [ ] Loading states implemented for async operations
- [ ] Error states handled gracefully
- [ ] Empty states provide helpful guidance
- [ ] Spacing follows consistent scale
- [ ] Components match established patterns
