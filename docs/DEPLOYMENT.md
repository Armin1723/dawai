# MediFlow AI — Deployment

## Targets

- **Frontend/API**: Vercel (auto-deploy from `main`)
- **Backend**: Supabase project (Postgres, Auth, Storage, Realtime)

## Environment Variables

See `.env.example`. Required:

| Var                              | Where          |
| -------------------------------- | -------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Vercel + local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Vercel + local |
| `SUPABASE_SERVICE_ROLE_KEY`      | Vercel (server only) |
| `OPENROUTER_API_KEY`             | Vercel (server only) |
| `OPENROUTER_MODEL`               | Vercel (optional) |

Validation: `scripts/validate-env.mjs` fails the build if required vars are missing.

## Database Deploys

- Apply `supabase/migrations/*.sql` in order (SQL editor or `supabase db push`).
- Run `supabase/seed.sql` for demo data (non-production).
- Backups: Supabase automated daily backups (Pro); document restore procedure.

## CI (planned)

- GitHub Actions: `npm ci` → `eslint` → `tsc --noEmit` → `vitest run` → `playwright test` → build.
- Husky + lint-staged pre-commit (lint + typecheck on staged files).

## Monitoring & Error Tracking

- Vercel Analytics + Speed Insights; Sentry for error tracking (add when module volume justifies).
- Health check endpoint: `GET /api/health` returning `{ ok: true, db: "up" }`.

## Release Checklist

1. Migrations applied to staging, then production (backup first).
2. Env vars set; `scripts/validate-env.mjs` passes.
3. Lint + typecheck + tests green in CI.
4. Smoke test: auth signup/login → dashboard → POS smoke.
