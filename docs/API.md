# MediFlow AI — API

## Conventions

- Route handlers in `app/api/<name>/route.ts`.
- Request bodies validated with Zod schemas from `schemas/`.
- Responses use a consistent envelope:

```ts
// success
{ "data": T }
// error
{ "error": { "code": "VALIDATION", "message": "Human friendly message" } }
```

- Auth: handlers read the session via `createServerSupabaseClient()`; role checks use the helper
  `requireRole(role)`.
- Secrets (service-role key, AI keys) are server-only — never imported into client bundles.

## Endpoints

### Auth (via Supabase SDK directly, not custom routes)

- `POST /api/auth/*` — internal wrappers if needed; primary flows use Supabase Auth client:
  sign-up, sign-in with password, magic link, password reset, sign-out, session refresh.

### AI (read-only assistant)

| Method | Route                 | Description                              |
| ------ | --------------------- | ---------------------------------------- |
| POST   | `/api/ai/summarize`   | Daily/weekly business summary from KPIs  |
| POST   | `/api/ai/chat`        | Assistant chat with domain context       |
| POST   | `/api/ai/insights`    | Anomalies / recommendations from metrics |

Payloads carry structured context (aggregates), not raw PII dumps. AI never writes data.

### Data (planned, per module)

- `/api/inventory/*` — medicines, batches, adjustments
- `/api/pos/*` — cart ops, payments, holds
- `/api/purchases/*`, `/api/suppliers/*`, `/api/customers/*`, `/api/sales/*`, `/api/expenses/*`,
  `/api/reports/*` — CRUD + exports (CSV/Excel/PDF)

Each will follow the repository pattern and RLS-aware queries.

## Error Codes

| Code            | Meaning                                   |
| --------------- | ----------------------------------------- |
| `VALIDATION`    | Zod validation failed                    |
| `UNAUTHORIZED`  | No valid session                         |
| `FORBIDDEN`     | Role lacks permission                    |
| `NOT_FOUND`     | Resource missing                         |
| `CONFLICT`      | Duplicate / state conflict               |
| `INTERNAL`      | Unexpected server error                  |
