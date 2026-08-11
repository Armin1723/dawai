# MediFlow AI — Architecture

## Overview

Next.js 16 App Router monolith with a Supabase backend. Server Components for reads; client
components for interactivity. Domain logic lives in a repository + service layer, never in
components. AI is a server-side, read-only assistant behind a provider abstraction.

## Layers

```
┌─────────────────────────────────────────────────────────┐
│  App Router (app/)                                       │
│  Server Components  ·  Client Components  ·  Route Handlers │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  Features (features/<module>)                            │
│  Feature UI · feature hooks (TanStack Query) · schemas   │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  Services (services/)  — business logic, AI provider     │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  Repositories (repositories/) — typed Supabase access    │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  Supabase — Postgres · Auth · Storage · Realtime         │
└─────────────────────────────────────────────────────────┘
```

## Key Flows

- **Auth**: Supabase SSR cookies (`@supabase/ssr`). `middleware.ts` refreshes the session and
  redirects unauthenticated users to `/login`. Role-based route guards read the user's role from the
  `profiles` table (or a JWT claim) and redirect unauthorized users.
- **Data reads**: pages fetch via repository functions; client-heavy views use TanStack Query hooks.
- **Writes**: validated with Zod (`schemas/`), executed by services → repositories. Audit logs are
  written on mutating operations.
- **AI**: `/api/ai/*` handlers call `services/ai.service.ts`. The service builds context from
  repositories, calls the configured provider, and returns assistant text — it never writes.

## Performance

- Server Components by default; lazy-load heavy client charts; pagination on all tables;
  `next/image` for product images; code-splitting per route. Target <2s page loads.
- Analytics queries should move to SQL views / RPC once data volume grows.

## Concurrency & Realtime

- Supabase Realtime for notifications (low stock, near expiry, dues) on subscribed tables.
- Mutations use optimistic updates via TanStack Query where appropriate.

## Folder Structure

See `context/PROJECT_CONTEXT.md` — the folder tree lives there as the single source of truth.
