# Tennis Predictions 🎾

A full-stack web application for predicting ATP Tour tennis tournament results. Compete with friends by submitting match predictions, earning points for correct picks, and climbing the leaderboards.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![tRPC](https://img.shields.io/badge/tRPC-11-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-blue)

## ✨ Features

### For Players
- **Tournament Predictions**: Submit winner and score predictions for each match in ATP tournaments
- **Real-time Scoring**: Earn 10 points for correct winners, +5 bonus for exact score predictions
- **Leaderboards**: Track your ranking globally and per-tournament
- **Results Tracking**: View your prediction accuracy with color-coded match cards
- **Responsive Design**: Full mobile support with modern UI components

### For Administrators
- **Draw Upload**: Parse and import tournament draws from MHTML files
- **Round Management**: Open/close prediction rounds and set active tournaments
- **Result Entry**: Record match outcomes and automatically calculate user scores
- **Tournament Lifecycle**: Manage draft, active, and archived tournament states

## 🛠️ Tech Stack

### Core Framework
- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[React 19](https://react.dev/)** - UI library with Server Components

### Backend & Data
- **[tRPC](https://trpc.io)** - End-to-end type-safe APIs
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe database toolkit
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[TanStack Query](https://tanstack.com/query)** - Data fetching & caching

### UI & Styling
- **[Tailwind CSS v4](https://tailwindcss.com)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com)** - Beautiful, accessible component library
- **[Radix UI](https://www.radix-ui.com/)** - Unstyled, accessible primitives
- **[Lucide Icons](https://lucide.dev/)** - Beautiful icon set

### Authentication & Validation
- **[Clerk](https://clerk.com)** - Complete authentication solution
- **[Zod](https://zod.dev)** - TypeScript-first schema validation

### Development Tools
- **[Biome](https://biomejs.dev/)** - Fast linter and formatter
- **[Turbopack](https://turbo.build/pack)** - Next-gen bundler for development
- **[pnpm](https://pnpm.io/)** - Fast, disk-efficient package manager

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or later ([Download](https://nodejs.org/))
- **pnpm** 10.23.0 ([Install](https://pnpm.io/installation))
- **Docker** or **Podman** (for local PostgreSQL database)
- **Clerk Account** ([Sign up](https://clerk.com))

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd tennis-predictions
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Database (leave as-is for local development)
DATABASE_URL="postgresql://postgres:password@localhost:5432/tennis-predictions"

# Clerk Authentication (get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
```

### 4. Start the Database

Using the provided script (requires Docker or Podman):

```bash
./start-database.sh
```

Or manually with Docker:

```bash
docker run --name tennis-predictions-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=tennis-predictions \
  -p 5432:5432 \
  -d postgres:16-alpine
```

### 5. Run Database Migrations

```bash
pnpm db:push
```

### 6. Start the Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app! 🎉

## 📁 Project Structure

```
tennis-predictions/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── _components/          # Shared components (Sidebar, etc.)
│   │   ├── admin/                # Admin dashboard & management
│   │   ├── api/                  # API routes (webhooks, tRPC handler)
│   │   ├── leaderboards/         # Leaderboard pages
│   │   ├── sign-in/              # Clerk sign-in page
│   │   ├── sign-up/              # Clerk sign-up page
│   │   ├── tournaments/          # Tournament pages
│   │   │   └── [slug]/           # Dynamic tournament routes
│   │   │       ├── picks/        # Pick submission
│   │   │       └── results/      # Results & scoring
│   │   ├── layout.tsx            # Root layout with sidebar
│   │   └── page.tsx              # Landing page
│   │
│   ├── components/               # Reusable components
│   │   └── ui/                   # shadcn/ui components
│   │
│   ├── server/                   # Backend code
│   │   ├── api/                  # tRPC API
│   │   │   ├── routers/          # API route handlers
│   │   │   ├── root.ts           # API router composition
│   │   │   └── trpc.ts           # tRPC context & middleware
│   │   ├── db/                   # Database
│   │   │   ├── schema.ts         # Drizzle schema definitions
│   │   │   └── index.ts          # Database client
│   │   └── services/             # Business logic services
│   │       ├── parser.ts         # MHTML draw parser
│   │       └── scoring.ts        # Points calculation
│   │
│   ├── trpc/                     # tRPC setup
│   │   ├── react.tsx             # Client-side tRPC (for Client Components)
│   │   └── server.ts             # Server-side tRPC (for Server Components)
│   │
│   ├── lib/                      # Utility libraries
│   │   └── utils.ts              # Helper functions (cn, etc.)
│   │
│   ├── hooks/                    # Custom React hooks
│   │
│   ├── styles/                   # Global styles
│   │   └── globals.css           # Tailwind imports + theme variables
│   │
│   └── env.js                    # Environment variable validation
│
├── public/                       # Static assets
├── drizzle/                      # Database migrations
├── .env.example                  # Environment template
├── components.json               # shadcn/ui configuration
├── drizzle.config.ts             # Drizzle ORM configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── biome.json                    # Biome linter/formatter config
└── package.json                  # Dependencies & scripts
```

## 🏗️ Architecture & Key Patterns

### tRPC Setup (End-to-End Type Safety)

This project uses **two different tRPC entry points** for maximum flexibility:

#### Server Components (`~/trpc/server`)
```typescript
import { api } from "~/trpc/server";

// Direct server-side call, no HTTP overhead
const tournaments = await api.tournaments.list();
```

#### Client Components (`~/trpc/react`)
```typescript
"use client";
import { api } from "~/trpc/react";

// HTTP-based with automatic batching & caching
const { data } = api.tournaments.list.useQuery();
```

### Database Schema

All tables are prefixed with `tennis-predictions_*`:
- **users**: User profiles (synced from Clerk)
- **tournaments**: Tournament metadata
- **rounds**: Tournament rounds (e.g., "Round of 64")
- **matches**: Individual match data
- **scoringRules**: Points configuration per round
- **roundPicks**: User predictions for a round
- **matchPicks**: Individual match predictions

### Authentication Flow

1. Clerk handles all auth (sign-up, sign-in, sessions)
2. Webhook at `/api/webhooks/clerk` syncs user data to database
3. `useUser()` hook provides auth state in components
4. Admin role stored in `user.publicMetadata.role`

### UI Component Architecture

- **shadcn/ui components** in `src/components/ui/`
- **Sidebar navigation** conditionally shown (hidden on landing/auth pages)
- **Theme system** via CSS variables in `globals.css`
- **Responsive design** with Tailwind's mobile-first approach

## 📜 Available Scripts

### Development

```bash
pnpm dev              # Start dev server with Turbopack
pnpm build            # Build for production
pnpm start            # Start production server
pnpm preview          # Build and start production locally
pnpm typecheck        # Run TypeScript compiler (no emit)
```

### Database

```bash
pnpm db:push          # Push schema changes (development)
pnpm db:generate      # Generate migration files
pnpm db:migrate       # Apply migrations (production)
pnpm db:studio        # Open Drizzle Studio (database GUI)
```

### Code Quality

```bash
pnpm check            # Run Biome linter & formatter
pnpm check:write      # Auto-fix safe issues
pnpm check:unsafe     # Auto-fix including unsafe changes
```

## 🗃️ Database Management

### Development Workflow

1. **Modify schema** in `src/server/db/schema.ts`
2. **Push changes**: `pnpm db:push` (skips migration files)
3. **View database**: `pnpm db:studio`

### Production Workflow

1. **Modify schema** in `src/server/db/schema.ts`
2. **Generate migration**: `pnpm db:generate`
3. **Review migration** in `drizzle/` folder
4. **Apply migration**: `pnpm db:migrate`

### Table Naming Convention

All tables use the prefix `tennis-predictions_` as configured in `drizzle.config.ts`:

```typescript
tableFilter: ["tennis-predictions_*"]
```

This prevents conflicts in shared database environments.

## 🎨 Theming & Customization

### CSS Variables

All colors are defined as CSS variables in `src/styles/globals.css`:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  /* ... */
}
```

### Dark Mode Support

The theme system includes dark mode variables. To enable:

1. Add theme toggle component
2. Use `next-themes` provider (already installed)
3. Update Clerk appearance to match theme

### Adding shadcn Components

```bash
pnpm dlx shadcn@latest add [component-name]
```

Example:
```bash
pnpm dlx shadcn@latest add dropdown-menu
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

Vercel automatically:
- Detects Next.js configuration
- Runs build scripts
- Provides PostgreSQL database (Vercel Postgres)

### Environment Variables for Production

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `CLERK_WEBHOOK_SECRET` - Clerk webhook signing secret

### Database Setup (Vercel Postgres)

1. Enable Vercel Postgres in project settings
2. Copy `DATABASE_URL` to environment variables
3. Run migrations: `pnpm db:migrate`

### Clerk Webhook Setup

**Important**: Configure webhooks for user data sync:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Your App → Webhooks
2. Click "Add Endpoint"
3. Enter your production URL: `https://your-app.vercel.app/api/webhooks/clerk`
4. Subscribe to events: `user.created` and `user.updated`
5. Copy the signing secret (starts with `whsec_...`)
6. Add to Vercel environment variables as `CLERK_WEBHOOK_SECRET`

**Note**: While the app includes automatic user upsert as a fallback, webhooks ensure immediate user sync and better reliability.

## 👥 User Roles

### Making a User Admin

1. Sign up for an account
2. Go to [Clerk Dashboard](https://dashboard.clerk.com)
3. Navigate to Users → Select user
4. Go to "Metadata" tab
5. Add public metadata:
   ```json
   {
     "role": "admin"
   }
   ```
6. Admin features will appear immediately

## 🔐 Security Notes

- Never commit `.env` file
- Rotate Clerk webhook secret regularly
- Use environment variables for all secrets
- Database credentials should be secure (not default password)
- Biome linter helps catch security issues

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps

# Restart database
./start-database.sh

# Check connection string in .env
echo $DATABASE_URL
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Type Errors

```bash
# Run type checker
pnpm typecheck

# Regenerate tRPC types
# (usually happens automatically)
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run code quality checks:
   ```bash
   pnpm typecheck
   pnpm check
   ```
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- This project uses **Biome** for linting and formatting
- Run `pnpm check:write` before committing
- TypeScript strict mode is enabled
- Follow existing patterns for consistency

## 📚 Additional Resources

### T3 Stack Documentation
- [T3 Stack Docs](https://create.t3.gg/)
- [Next.js Docs](https://nextjs.org/docs)
- [tRPC Docs](https://trpc.io/docs)
- [Drizzle Docs](https://orm.drizzle.team/docs/overview)

### Component Libraries
- [shadcn/ui](https://ui.shadcn.com)
- [Radix UI](https://www.radix-ui.com/)
- [Lucide Icons](https://lucide.dev/)

### Authentication
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Setup](https://clerk.com/docs/quickstarts/nextjs)

## 📄 License

This project is private and proprietary.

---

Built with ❤️ using the [T3 Stack](https://create.t3.gg/)
