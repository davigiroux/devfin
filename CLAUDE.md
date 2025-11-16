- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

## Project Context

DevFin is a financial management app for Brazilian companies (Lucro Presumido regime).

**Tech Stack:**
- Next.js 14 (App Router), TypeScript, TailwindCSS
- Supabase (PostgreSQL + Auth)
- Jest + Testing Library
- Brazilian formatting (pt-BR locale, R$ currency)

**Key Features:**
- Revenue tracking with automatic tax calculations (IRPJ, CSLL, PIS, COFINS)
- Partner (sócios) management with profit distribution
- Monthly expense tracking (recurring & one-off)
- Payment status tracking
- INSS calculations

**Code Patterns:**
- `/app/(dashboard)/[feature]/page.tsx` - full page CRUD
- `/lib/calculations/[feature].ts` - pure calculation functions
- `/lib/validations/[feature].ts` - Zod schemas
- `/__tests__/calculations/[feature].test.ts` - Jest tests
- `/types/index.ts` - TypeScript interfaces
- Supabase RLS policies per user
- Brazilian date/currency formatting throughout

**Database:**
- `usuarios` - user profiles (links to auth.users)
- `socios` - company partners
- `faturamentos` - monthly revenue with tax calculations
- `despesas_mensais` - monthly expenses (recurring/one-off)
- `pagamentos_despesas` - payment tracking

## PR Comments

- When tagging Claude in GitHub issues, use '@claude'

## Changesets

To add a changeset, write a new file to the `.changeset` directory.

The file should be named `0000-your-change.md`. Decide yourself whether to make it a patch, minor, or major change.

The format of the file should be:

```md
---
"evalite": patch
---

Description of the change.
```

The description of the change should be user-facing, describing which features were added or bugs were fixed.

## GitHub

- Your primary method for interacting with GitHub should be the GitHub CLI.

## Git

- When creating branches, prefix them with davigiroux/ to indicate they came from me.
- Do NOT add Claude Code attribution or co-author to commits.

## Plans

- At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise. Sacrifice grammar for the sake of concision.
