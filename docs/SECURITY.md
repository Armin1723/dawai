# MediFlow AI — Security

## Principles

- **RBAC**: roles (`owner`, `administrator`, `manager`, `cashier`, `pharmacist`, `inventory_staff`)
  with permission maps in `constants/roles.ts`. Middleware + per-handler `requireRole` guards.
- **Defense in depth**: RLS at the database, repository-level scoping, and route guards at the edge.
- **Least privilege**: service-role key is server-only; the anon key is the only browser credential.

## Controls

- **Auth**: Supabase Auth — email/password, magic links, password reset, session refresh via
  `@supabase/ssr` middleware.
- **Input validation**: Zod everywhere (forms + API bodies). No raw SQL interpolation.
- **XSS**: React escapes by default; never `dangerouslySetInnerHTML` on user content.
- **SQL injection**: all queries via Supabase client (parameterized).
- **Rate limiting**: enable on auth endpoints; add per-route limits for exports/AI as they land.
- **CSRF**: Supabase token-based auth (no cookies storing session secrets in plaintext readable by
  JS); SameSite cookies from `@supabase/ssr`.
- **Secrets**: `.env.local` only; `.env*` git-ignored; keys referenced server-side via
  `process.env.SUPABASE_SERVICE_ROLE_KEY` / `OPENROUTER_API_KEY` — never in client components.
- **Audit**: every mutating operation writes to `audit_logs` (actor, action, entity, before/after).
- **File uploads**: validate MIME + size, store in Supabase Storage with per-user/store policies.

## Threat Notes

- **AI endpoints**: accept only structured context; never trust AI output as executable input; AI
  cannot mutate data by design.
- **Storage**: RLS policies scoped to store membership; public buckets only for store logos/images.

## Review Checklist Before Release

- [ ] No secrets in client bundles (`grep` service-role/OpenRouter keys in `app/` + `components/`)
- [ ] RLS enabled on every new table
- [ ] Every route handler validates input and checks session/role
- [ ] Audit logging on all writes
- [ ] Rate limits on auth + export + AI routes
- [ ] Dependency audit clean (`npm audit`)
