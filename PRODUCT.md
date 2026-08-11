# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: pharmacy owner/manager running a small-to-mid medical store from a desk, and counter cashiers running fast checkout at the POS terminal. One system, one premium design language — analytical and beautiful at the desk, fast and legible at the counter (large touch targets, tablet-friendly POS).

## Product Purpose

MediFlow AI is a modern medical store management system that replaces legacy desktop pharmacy software. It covers POS checkout, inventory with batch/FEFO expiry tracking, GST-compliant purchases & suppliers, customers, prescriptions, analytics, and AI insights. Success means the pharmacy runs its entire daily operation — sell, stock, buy, report — in one fast, trustworthy system.

## Positioning

Feels like premium SaaS (Stripe / Linear / Vercel grade) rather than legacy pharmacy software. AI-assisted operations (read-only insights, summaries, suggestions), GST-ready for the Indian market, batch-level FEFO inventory with expiry awareness.

## Operating Context

- Primary market: India; currency INR (₹), GST slabs 5/12/18/28%.
- Used at a desk (owner/manager: dashboard, inventory, purchases, reports) and at a counter (cashier: POS, barcode scanner, thermal receipt printing).
- Keyboard-first: Cmd+K command palette, Escape dismisses, Tab-navigable forms.
- Dark + light themes both supported via next-themes (existing feature).
- Roles: owner, administrator, manager, cashier, pharmacist, inventory_staff; RBAC middleware guards routes.

## Capabilities and Constraints

- Completed: auth (Supabase), inventory CRUD + batches + FEFO, POS (cart, barcode, discount, GST math, cash/UPI/card/credit, holds, receipt print), live schema + seed, AI provider layer.
- Next: purchases & suppliers (POs, receiving, invoice upload, payment tracking), dashboard wired to live data, then customers, prescriptions, sales, expenses, employees, reports, notifications, settings, AI features.
- Tech: Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui (radix-nova preset), Supabase, TanStack Query/Table, Recharts, Framer Motion, Sonner, Zod + RHF.
- Feature-based architecture; repository pattern over Supabase; API `{ data, error }` envelope; server components by default.
- AI is a read-only assistant; never mutates data; keys server-side only.
- Batch/FEFO expiry-aware inventory is a core concept; GST tax-inclusive math at POS; credit-limit enforcement.
- Constraint (user-confirmed): feature behavior must not change during the redesign — POS math, GST, FEFO, auth flows, INR formatting all stay intact.

## Brand Commitments

- Name: MediFlow AI; tagline "Pharmacy OS". Medical cross mark currently used as the logo; visual treatment may be redesigned.
- Voice: modern, trustworthy, premium SaaS.
- User-confirmed preservation: existing feature behavior and INR/GST conventions. Dark + light theming kept as an existing feature.

## Evidence on Hand

- Live Supabase project with full schema (29 tables) + seed (demo store, medicines, batches, roles).
- `context/SESSION_LOG.md` records live E2E verification of POS checkout, inventory, auth.
- Dashboard currently uses mock data (`features/dashboard/mock-data.ts`) — wiring to live data is a known next task.
- No real customer testimonials, marketing claims, or imagery exist; must not fabricate them.

## Product Principles

1. One premium design language across desk and counter scenes — consistency is the product.
2. Trust through correctness: GST math, FEFO allocation, and financial totals are never compromised for looks.
3. Speed is a feature: keyboard shortcuts, instant search, minimal friction at checkout.
4. AI assists, never decides: insights and suggestions only, read-only.
5. Everything a busy pharmacy does daily — sell, stock, buy, report — lives in one system.

## Accessibility & Inclusion

- Both dark and light modes with contrast-safe tokens.
- Focus rings, aria-labels on icon-only controls, touch targets ≥ 40px (POS tablet mode).
- Keyboard navigable throughout.
