# MediFlow AI — Project Context

> **Single source of truth for this repository. Read this file first, always.**
> Updated: 2026-08-04

## Project Overview

MediFlow AI is a modern, enterprise-grade **Medical Store Management System** that replaces
traditional pharmacy software. It targets small pharmacies, large medical stores, chain stores,
hospital pharmacies, and (future) wholesale distributors. The product feels like a premium SaaS
(Stripe / Linear / Vercel grade) rather than legacy desktop software.

Primary goals: lightning-fast POS, complete inventory management, GST ready, purchase & supplier
management, customer management, prescription support, analytics dashboard, AI insights, multi-user
roles, audit logs, responsive UI, offline-friendly architecture (future).

## Tech Stack

| Layer      | Technology                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, React 19, Turbopack), TypeScript (strict)          |
| Styling    | Tailwind CSS v4, shadcn/ui (radix-nova preset), CSS variables, dark/light  |
| Data       | Supabase (PostgreSQL, Auth, Storage, Realtime)                             |
| AI         | OpenRouter via an abstracted `AIService` provider layer (server-only keys) |
| Forms      | React Hook Form + Zod                                                      |
| Server state | TanStack Query                                                             |
| Client state | Zustand                                                                    |
| Tables     | @tanstack/react-table                                                      |
| Charts     | Recharts (shadcn chart components)                                         |
| Animation  | Framer Motion                                                              |
| Toast      | Sonner                                                                     |
| Uploads    | react-dropzone → Supabase Storage                                          |
| Dates      | date-fns                                                                   |
| Icons      | lucide-react                                                               |

## Architecture

- Feature-based folder structure (see below).
- Repository pattern over Supabase data access; a thin service layer for business logic.
- Server Components for read-heavy pages; client components only where interactivity is required.
- Auth via Supabase SSR with middleware-driven session refresh and role-based route protection.
- AI never writes data directly — it only assists (summaries, suggestions, chat).

## Folder Structure

```
app/            Next.js App Router (routes, layouts, pages)
  (auth)/       login, signup, forgot-password
  (dashboard)/  authenticated shell: dashboard, pos, inventory, purchases, ...
  api/          route handlers (AI, exports, etc.)
components/
  ui/           shadcn/ui primitives
  layout/       sidebar, header, command menu, providers
  shared/       DataTable, MetricCard, EmptyState, PageHeader, ...
features/       feature modules (dashboard/, inventory/, pos/, sales/, ...)
lib/            utils, supabase clients, formatters
services/       auth.service, ai.service (provider layer), ...
repositories/   typed data access per domain
hooks/          shared hooks (media query, debounce, command menu, ...)
types/          global + DB types
schemas/        Zod validation schemas
utils/          domain helpers (gst, pricing, expiry)
constants/      navigation, roles/permissions, statuses
styles/         additional css
supabase/       migrations + seed SQL
tests/          vitest unit/integration
docs/           project documentation (PRD, ARCHITECTURE, ...)
context/        session context (this folder)
scripts/        seed, backup, env validation
public/         static assets
```

## Module Status

| Module        | Status   | Notes                                             |
| ------------- | -------- | ------------------------------------------------- |
| Foundation    | ✅ Done  | Scaffold, design system, shell, context, docs     |
| Auth          | 🚧 WIP   | Supabase auth, RBAC middleware, protected routes  |
| Dashboard     | 🚧 WIP   | KPIs, charts, alerts, AI summary                  |
| POS           | ⏳ Pending|                                                   |
| Inventory     | ⏳ Pending|                                                   |
| Purchases     | ⏳ Pending|                                                   |
| Suppliers     | ⏳ Pending|                                                   |
| Customers     | ⏳ Pending|                                                   |
| Prescriptions | ⏳ Pending|                                                   |
| Sales         | ⏳ Pending|                                                   |
| Expenses      | ⏳ Pending|                                                   |
| Employees     | ⏳ Pending|                                                   |
| Reports       | ⏳ Pending|                                                   |
| Notifications | ⏳ Pending|                                                   |
| Settings      | ⏳ Pending|                                                   |
| AI            | ⏳ Pending| Provider layer scaffolded, features pending        |

## Coding Conventions

- Strict TypeScript, no `any` (eslint ban + typecheck gate).
- Feature-based architecture; domain logic in `features/` or `services/` — never in components.
- All user input validated with Zod schemas in `schemas/`.
- Reusable UI lives in `components/shared` + `components/ui`; shared hooks in `hooks/`.
- Server-side only for secrets; never import service-role keys into client code.
- API responses: `{ data, error }` envelope; errors are typed and friendly.
- Components default to server components; add `"use client"` only when needed.
- Currency formatting via `lib/utils` `formatCurrency` (INR by default); dates via date-fns.
- Never duplicate business logic — reuse services/repositories/hooks.

## Important Assumptions & Decisions

- Default currency is **INR (₹)**; GST model (5/12/18/28%) per Indian pharma norms.
- Batch/FEFO tracking is a core inventory concept (expiry-aware).
- AI is an assistant only — it can never mutate data; all AI calls are server-side.
- Supabase is the single backend; no external image service until images grow (per PRD).
- Roles: owner, administrator, manager, cashier, pharmacist, inventory_staff.
- Placeholder routes are shipped so the app shell is navigable while modules are built out.

## Reusable Patterns

1. **Route handler pattern** — `app/api/<name>/route.ts`, validate with Zod, use repositories, return `{ data | error }`.
2. **Client data fetching** — TanStack Query hooks per domain (`features/<module>/hooks.ts`).
3. **Form pattern** — RHF + Zod resolver + shadcn `Form` components; submit via service layer.
4. **DataTable** — `components/shared/data-table.tsx` wraps @tanstack/react-table with sorting, pagination, empty state.
5. **Command palette** — global `components/layout/command-menu.tsx`, toggled with `Cmd+K`.

## Completed Systems

- Next.js 16 scaffold, Tailwind v4, shadcn/ui kit (radix-nova), ESLint, Prettier.
- All `/context` + `/docs` documentation files.
- Supabase clients (browser/server/middleware), migration + seed SQL for the full PRD schema.
- `AIService` provider abstraction with OpenRouter implementation.
- Auth pages, role middleware, dashboard shell, dashboard KPIs + charts.

## Pending Systems

- POS (cart, barcode, payments, holds, thermal print)
- Inventory CRUD + batch management + stock adjustments
- Purchases/POs + supplier management
- Customers, loyalty, credit
- Prescriptions + OCR (future)
- Sales history, returns, refunds
- Expenses, employees/attendance
- Reports + CSV/Excel/PDF export
- Notifications (realtime)
- Settings (business, printer, taxes, users/permissions, backups)
- AI features (dashboard summary, insights, chat assistant, reports)
- Tests (Vitest + Playwright), CI
