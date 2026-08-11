# MediFlow AI — Roadmap

> Milestones. Each phase is one coherent milestone; complete one at a time per the agent workflow.

| Phase | Milestone          | Status     | Description                                                         |
| ----- | ------------------ | ---------- | ------------------------------------------------------------------- |
| 1     | Foundation         | ✅ Done    | Scaffold, design system, shell, docs, context, DB schema, AI layer  |
| 2     | Authentication     | 🚧 WIP     | Supabase auth, RBAC, role middleware, protected routes              |
| 3     | Inventory          | ⏳ Pending | Medicines CRUD, batches, FEFO/FIFO, stock adjustments, expiry       |
| 4     | POS                | ⏳ Pending | Cart, barcode, payments, holds, returns, thermal print, PDF         |
| 5     | Purchases          | ⏳ Pending | POs, receiving, suppliers, payments, returns                        |
| 6     | Sales              | ✅ Done    | Invoice history, returns/refunds (migration 0016/0017), payment status, analytics |
| 7     | Analytics          | ⏳ Pending | Revenue/profit trends, inventory turnover, dead stock, forecasting  |
| 8     | AI                 | ⏳ Pending | Dashboard summaries, insights, chat assistant, report summarization |
| 9     | Testing            | ⏳ Pending | Vitest unit/integration, Playwright E2E, CI pipeline                |
| 10    | Deployment         | ⏳ Pending | Vercel + Supabase, env validation, backups, monitoring              |

## Future (post-v1)

- Multi-store, wholesale, online ordering, WhatsApp invoices, SMS, mobile app
- OCR prescriptions, voice assistant, IoT barcode scanners
- Accounting integration/exports, UPI QR, vendor & customer portals
- Medicine recommendations, public API access, webhooks
