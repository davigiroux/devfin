# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevFin is a financial management system built with Next.js 14 (App Router), TypeScript, TailwindCSS, and Supabase. The system calculates taxes based on "Lucro Presumido" (Brazilian tax regime) and manages partners' INSS contributions proportionally.

## Key Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:3000
npm run build            # Build for production
npm start                # Start production server

# Testing
npm test                 # Run all tests (31 unit tests)
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Run ESLint
```

## Architecture

### Tech Stack
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** TailwindCSS
- **Database:** Supabase (PostgreSQL with Row Level Security)
- **Auth:** Supabase Auth
- **Validation:** Zod schemas
- **Testing:** Jest + Testing Library

### Project Structure

```
app/                    # Next.js App Router
  (auth)/              # Auth routes group (login, register)
  (dashboard)/         # Protected routes (dashboard, faturamentos, socios)
  api/                 # API routes
lib/
  supabase/           # Supabase clients (client.ts for client components, server.ts for server components)
  calculations/       # Core business logic
    impostos.ts       # Tax calculations (IRPJ, CSLL, PIS, COFINS)
    inss.ts          # INSS calculations with progressive rates
  validations/        # Zod schemas for input validation
types/                # TypeScript type definitions
__tests__/            # Unit tests (must maintain 100% passing)
middleware.ts         # Auth middleware (protects /dashboard routes)
```

### Key Architectural Patterns

1. **Client vs Server Components**
   - Pages in `(dashboard)` use `'use client'` directive when they need interactivity
   - Supabase client usage:
     - `lib/supabase/client.ts` for client components
     - `lib/supabase/server.ts` for server components and API routes

2. **Authentication Flow**
   - Middleware protects all `/dashboard/*` routes
   - Redirects unauthenticated users to `/login`
   - Row Level Security (RLS) policies enforce data isolation per user

3. **Calculation Modules**
   - **impostos.ts**: Pure functions for tax calculations
     - Uses fixed rates: IRPJ 4.8%, CSLL 2.88%, PIS 0.65%, COFINS 3%
     - All values rounded to 2 decimal places
   - **inss.ts**: Progressive INSS calculation
     - Progressive rate table (7.5%, 9%, 12%, 14%)
     - Ceiling at R$ 7,786.02
     - Distributes pro-labore among partners proportionally

4. **Database Schema**
   - `usuarios` table: Links to Supabase auth.users
   - `socios` table: Partners with CPF and participation percentage
   - `faturamentos` table: Monthly invoices with calculated taxes
   - All tables have RLS enabled
   - Automatic trigger creates `usuarios` record on signup

5. **Form Validation**
   - All forms use Zod schemas in `lib/validations/`
   - Client-side validation before API calls
   - Server-side validation in API routes

## Development Guidelines

### When Adding Features

1. **New Calculations**
   - Add pure functions to `lib/calculations/`
   - Write tests in `__tests__/calculations/`
   - All tests must pass before committing
   - Round all currency values to 2 decimal places

2. **New Pages**
   - Dashboard pages go in `app/(dashboard)/[page-name]/`
   - Use `'use client'` only when needed (forms, state, effects)
   - Server components are preferred for data fetching

3. **Database Changes**
   - Create new migration in `supabase/migrations/`
   - Always add RLS policies
   - Update `types/database.types.ts`
   - Document in `supabase/README.md`

4. **Forms**
   - Create Zod schema in `lib/validations/`
   - Show calculated previews before submission (taxes, INSS)
   - Display error messages from validation

### Important Rules

- **Never modify tax rates without updating tests**
- Tax calculations in `impostos.ts` are based on Brazilian "Lucro Presumido" regime
- INSS calculations follow progressive table (updated for 2025)
- All currency calculations must round to 2 decimal places using `Math.round(value * 100) / 100`
- Partners' participation percentages must sum to exactly 100%

### Common Tasks

**Run a single test file:**
```bash
npm test -- __tests__/calculations/impostos.test.ts
```

**Add a new partner field:**
1. Update `sopabase/migrations/` SQL
2. Update `types/database.types.ts` and `types/index.ts`
3. Update `lib/validations/socio.ts` schema
4. Update UI in `app/(dashboard)/socios/page.tsx`

**Add a new tax:**
1. Update `ALIQUOTAS` in `lib/calculations/impostos.ts`
2. Update return type `ImpostosCalculados` in `types/index.ts`
3. Update calculation function
4. Add tests in `__tests__/calculations/impostos.test.ts`
5. Update database schema to store new tax
6. Update UI to display new tax

## Testing Strategy

- 31 unit tests cover all calculation logic
- Tests validate:
  - Correct tax calculations for various amounts
  - INSS progressive rates
  - Partner distribution
  - Input validation and error handling
  - Edge cases (zero, negative, very large values)

**All tests must pass before any commit.**

## Supabase Configuration

- Project must have Row Level Security enabled
- Run migrations from `supabase/migrations/20250111_initial_schema.sql`
- Environment variables required:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)

## Deployment

1. Set up Supabase project and run migrations
2. Configure environment variables
3. Build: `npm run build`
4. Deploy to Vercel or similar platform
5. Ensure HTTPS is enforced

## Known Limitations

- Currently supports only "Lucro Presumido" tax regime
- Single company per user (no multi-tenancy)
- Manual data entry (no integrations with accounting systems)
- INSS values based on 2024-2025 legislation (update annually)
