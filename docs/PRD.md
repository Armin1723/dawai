# Product Requirements Document — MediFlow AI

**MediFlow AI – Complete Medical Store Management System**

The canonical PRD is maintained here. See `context/PROJECT_CONTEXT.md` for the current
implementation state against this document.

## 1. Vision

Build a modern, enterprise-grade Medical Store Management System that can completely replace
traditional pharmacy software. Extremely fast, beautiful, easy to use, touch-friendly, AI-assisted,
and suitable for small pharmacies, large medical stores, chain stores, hospital pharmacies, and
(future) wholesale distributors. Should feel like a premium SaaS product rather than old desktop
software.

Primary goals:

- Lightning-fast POS
- Complete inventory management
- GST ready
- Purchase & supplier management
- Customer management
- Prescription support
- Analytics dashboard
- AI insights
- Multi-user roles
- Audit logs
- Responsive UI
- Offline-friendly architecture (future)

## 2. Tech Stack

**Frontend:** Next.js (App Router) · TypeScript · TailwindCSS · shadcn/ui · Framer Motion ·
React Hook Form · Zod · TanStack Query · Zustand · Recharts · React Table · Sonner · React Dropzone

**Backend:** Next.js API Routes / Route Handlers · Node.js · Supabase (PostgreSQL, Auth, Storage,
Realtime, Edge Functions if needed)

**Image Storage:** Supabase Storage by default; Cloudinary only if images grow / optimization or OCR
requires it.

**AI:** OpenRouter (free models) behind an abstracted provider layer (`AIService`). Never hardcode a
provider. OpenAI/Gemini/Claude as future providers.

## 3. Design Philosophy

Compare favorably to Stripe Dashboard, Linear, Vercel, Notion, Raycast, Shopify Admin. Lots of
whitespace, subtle animations, premium typography, glass effects only where useful, consistent
spacing, keyboard shortcuts, dark mode, light mode, accessibility, mobile friendly, tablet POS mode.

## 4. User Roles

- **Administrator** — everything
- **Manager** — inventory, sales, reports, purchases, employees
- **Cashier** — POS, returns, customers
- **Pharmacist** — prescription verification, medicine info, drug interaction warnings
- **Inventory Staff** — inventory, stock counts, expiry updates, receiving stock
- **Owner** — everything + analytics, financial reports, AI insights

## 5. Authentication

Supabase Auth: email login, password reset, magic links, session persistence, role-based middleware,
permission middleware, protected routes, activity logs.

## 6. Modules

Dashboard · POS · Inventory · Batch Tracking · Purchases · Suppliers · Customers · Prescriptions ·
Sales · Expenses · Employees · Reports · Notifications · Settings — see PRD source for full detail
lists per module (kept verbatim in the project source of truth, `context/PROJECT_CONTEXT.md`).

## 7. AI Features

AI never directly modifies data — only assists: dashboard summaries, revenue/profit explanation,
recommendations, reorder suggestions, stockout prediction, dead-stock detection, upsell suggestions,
frequently-bought-together, peak sales hours, chat assistant ("Show medicines expiring next month",
"Which medicines haven't sold in 6 months?"), report summarization and anomaly highlighting.

## 8. Database Tables

users · profiles · roles · permissions · stores · employees · customers · suppliers · categories ·
manufacturers · medicines · medicine_batches · inventory · purchase_orders · purchase_items · sales ·
sale_items · returns · expenses · payments · invoices · prescriptions · notifications ·
activity_logs · settings · audit_logs · ai_conversations · attachments · reports
(implemented in `supabase/migrations/0001_init.sql`).

## 9–13. UI, Components, Analytics, Performance, Security

See `docs/UI_GUIDELINES.md` (UI/components), `docs/ARCHITECTURE.md` (analytics/performance),
`docs/SECURITY.md` (security). All definitions of done and workflow rules are in
`docs/DEPLOYMENT.md` + `context/*`.

## 14–16. Testing · Deployment · Future

- Testing: Vitest (unit/integration), Playwright (E2E), CI with lint + typecheck.
- Deployment: Vercel + Supabase, env validation, migrations, seeds, backups, monitoring.
- Future: multi-store, wholesale, online ordering, WhatsApp invoices, SMS, mobile app, OCR, voice
  assistant, IoT scanners, accounting integration, UPI QR, portals, API, webhooks.

## 17–22. Standards, Structure, Docs, Context, Workflow, Definition of Done

- Strict TS, feature architecture, repository + service layers, validation everywhere, no `any`,
  ESLint + Prettier, Husky + lint-staged.
- Folder structure per `context/PROJECT_CONTEXT.md`.
- `/docs` + `/context` files are mandatory and continuously maintained.
- Agent workflow: read context → resume → update TASKS → one coherent feature → atomic commits →
  update docs → lint/typecheck/test → update context before ending session.
- Definition of Done: implemented, polished, responsive, accessible, type-safe, tested, documented,
  no lint/TS errors, performance reviewed, context updated, production-ready.
