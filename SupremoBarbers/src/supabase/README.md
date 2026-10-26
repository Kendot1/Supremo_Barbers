# Supabase integration

Supremo Barber currently runs against the Supabase Edge Function API. The active frontend configuration is in `src/utils/supabase/info.tsx`, and the client wrapper is `src/services/api.service.ts` with `USE_LOCAL_BACKEND = false`.

## Runtime path

```text
React/Vite client
  → https://<project>.supabase.co/functions/v1/make-server-70e1fc66/api
  → supabase/functions/server/index.tsx (Hono Edge Function)
  → Supabase Auth + PostgreSQL
```

The local backend remains in the source tree as a development fallback, but it is not the production data path. The public project ID and anon key are safe to expose in the browser; service-role, SMTP, R2, JWT, and AI secrets must remain Edge Function secrets.

## Deployment notes

- `supabase/config.toml` and `supabase/config.json` describe the Edge Function deployment surface.
- The repository currently contains no database migration files. Audit the linked project's schema and RLS policies before applying production changes.
- Deploy the function only after validating its environment secrets and the linked Supabase project.
- Do not use the old demo credentials or the previous localStorage-only instructions from historical documentation.

See [`docs/system-architecture.md`](../docs/system-architecture.md) for the verified application map and workflow boundaries.
