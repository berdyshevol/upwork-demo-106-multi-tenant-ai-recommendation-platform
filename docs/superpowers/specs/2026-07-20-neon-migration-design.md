# Adviso (106) — Supabase → Neon migration design

**Date:** 2026-07-20
**Prototype:** `upwork-demo-106-multi-tenant-ai-recommendation-platform` (`adviso`)
**Repo:** github.com/berdyshevol/upwork-demo-106-multi-tenant-ai-recommendation-platform

## Why

The paid Supabase project was deleted. This demo must keep running on a live
database at $0. Target: **Neon free tier**. Unlike the sibling 131b (which used
Supabase only as a Postgres connection string and moved with a two-env swap),
106 leans on three Supabase-specific things that do **not** exist on Neon:

1. **The SDK / PostgREST transport** — every DB call is `@supabase/supabase-js`
   (`.from().select()`, `.upsert()`, `.rpc()`) served by PostgREST. Neon has no
   PostgREST.
2. **Tenant isolation via the PostgREST request header** — RLS policies compare
   `tenant_id` against `request_tenant_id()`, which reads
   `current_setting('request.headers')::json ->> 'x-tenant-id'`. That GUC is set
   by PostgREST from the anon client's HTTP header. On Neon it is always NULL →
   every policy denies → zero rows.
3. **pgvector** — `provider_chunks.embedding vector(1536)`, an ivfflat index, and
   the `match_provider_chunks` SQL function. Neon **supports** pgvector, so the
   schema and function carry over; only the `.rpc()` transport and RLS scoping
   need rework.

## Decision (already agreed)

- **Isolation = Option B: real Postgres RLS**, preserving the demo's core claim
  that cross-tenant isolation is enforced by the database engine, not by app
  code. The only change to the RLS mechanism is the *source* of the tenant id:
  from the PostgREST header to a session GUC (`app.tenant_id`) we set ourselves.
- **Transport = Drizzle ORM, no RLS sugar.** Drizzle is used purely as a
  type-safe query builder + `drizzle-kit` migrations. We do **not** use its
  `pgPolicy`/`crudPolicy` helpers or Neon Authorize (JWT). RLS policies are
  authored as plain SQL.
- **DB layout = one shared Neon project, one database per prototype**
  (`neon-demo-db-convention`). Project `upwork-demos` (`broad-shadow-28697769`),
  new database **`adviso_106`**, per-prototype role **`adviso_app_rls`**.

## Non-goals

- No change to UI, scoring, questionnaire, BYOK, or the LangChain agent logic.
- No change to the seed *data* (`lib/tenants.ts`, `lib/seed-data.ts`) — only how
  it is written to the DB.
- No Neon Authorize / JWT / Row-level-security-as-a-service. Plain PG RLS only.
- The in-repo seed **fallback** (used when no DB env is present) stays exactly as
  is — it is what keeps the hermetic test suite runnable with zero infra.

---

## Architecture

### Access classes

Every DB call site falls into one of three classes. This split drives which
connection/role it uses.

| Class | Functions | Callers | Role | RLS |
|---|---|---|---|---|
| **Public read** | `loadTenantBySlug`, `loadQuestionSet` | `app/page.tsx`, `/api/recommend` | `adviso_app_rls` | policies allow all (branding is public) |
| **Tenant-scoped** | `loadProviders`, `saveLead`, `retrieveChunks` | `/api/recommend`, `/api/chat`, `lib/agent.ts` ×3 | `adviso_app_rls` via `withTenant` | enforced by engine |
| **Admin** | `runSeed` | `/api/seed`, `scripts/seed.ts` | `neondb_owner` | bypassed (owner) |

Note: no browser code touches the DB. The Supabase "anon" client already ran
**server-side** (inside route handlers), so after migration there are **no
`NEXT_PUBLIC_*` DB vars** and nothing DB-related ships in the client bundle.

### Roles & connections

Two Postgres roles in the `adviso_106` database:

- **`neondb_owner`** (Neon default, owns tables) — migrations, seed, ingest.
  Owners bypass RLS by design — this is the intended `service_role` analogue.
- **`adviso_app_rls`** — created **via SQL by `neondb_owner`** (a plain
  `create role … login password '…' nobypassrls;`), NOT via neonctl. Grants
  matched to actual runtime usage:
  - `GRANT SELECT` on `tenants`, `question_sets` (public branding reads),
    `providers`, `provider_chunks` (tenant reads).
  - `GRANT SELECT, INSERT` on `leads` — `saveLead` does `INSERT ... RETURNING
    id`, and RETURNING requires SELECT on the returned column.
  - `GRANT EXECUTE` on `match_provider_chunks`.
  - `recommendations` has an RLS policy defined for parity but is **not**
    accessed by current runtime code — no grant needed until it is.

  **Not** an owner, so RLS actually applies to it. This is the runtime role for
  all request-path queries.

> **Why a separate, SQL-created role is mandatory (verified live):** table owners
> bypass RLS, so the runtime cannot be `neondb_owner`. But there is a Neon-specific
> trap: **roles created via neonctl / the Neon API / console are granted
> `BYPASSRLS` and membership in `neon_superuser` (also BYPASSRLS)** — they ignore
> every policy — and `neondb_owner` cannot strip that (`ALTER ROLE … NOBYPASSRLS`
> and `REVOKE neon_superuser` both fail: no ADMIN option over control-plane roles).
> `FORCE ROW LEVEL SECURITY` does NOT help either — it overrides ownership, not the
> `bypassrls` attribute. The only working path: create the runtime role with plain
> SQL as `neondb_owner` (which has CREATEROLE); such a role has `rolbypassrls=f`
> and no `neon_superuser` membership, so policies apply. Proven with live data: a
> query with no `app.tenant_id` set returns 0 rows; scoped to tenant A it sees only
> A and a lead INSERT for tenant B is rejected by the with-check policy. `rls.spec.ts`
> re-asserts this in CI.

Two connection strings (env):

- `APP_DATABASE_URL` — role `adviso_app_rls`, **pooled** endpoint (`-pooler`
  host), `?sslmode=require`. Runtime. `postgres.js` with `prepare: false`.
- `ADMIN_DATABASE_URL` — role `neondb_owner`, **direct** endpoint,
  `?sslmode=require`. Migrations + seed only.

### Tenant bridge

RLS helper, rewritten (only the source of the id changes):

```sql
create or replace function public.request_tenant_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid;
$$;
```

All existing `create policy ... using (tenant_id = public.request_tenant_id())`
lines stay verbatim. The app sets the GUC per request inside a transaction:

```ts
// lib/db/tenant.ts
export function withTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getAppDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
}
```

We use `set_config(..., is_local => true)`, NOT `SET LOCAL app.tenant_id =
${tenantId}`: plain `SET` does not accept bind parameters (the placeholder would
error), whereas `set_config` does — keeping the tenant id parameterised, no
injection. `is_local = true` scopes it to the transaction, so it is discarded at
commit/rollback and cannot leak onto the next request that reuses a pooled
connection. Safe on Neon's transaction pooler.

### Module changes

**New:**
- `lib/db/schema.ts` — Drizzle table definitions incl.
  `vector("embedding", { dimensions: 1536 })`. Hand-written; no policy helpers.
- `lib/db/client.ts` — two `postgres.js` singletons on `globalThis` (`appDb`,
  `adminDb`), `prepare: false`, small pool.
- `lib/db/tenant.ts` — `withTenant` wrapper (uses `appDb`).
- `lib/db/admin.ts` — owner Drizzle client (uses `adminDb`) for seed.
- `drizzle/0000_tables.sql` (generated by drizzle-kit) + `drizzle/0001_rls.sql`
  (hand-written: extension, role, GRANTs, policies, `request_tenant_id`,
  `match_provider_chunks`).

**Rewritten (same signatures, Drizzle bodies):**
- `lib/data.ts` — `isSupabaseConfigured()` → `isDbConfigured()` (checks
  `APP_DATABASE_URL`). `loadTenantBySlug`/`loadQuestionSet` → plain `appDb`
  reads. `loadProviders`/`saveLead` → wrapped in `withTenant`. Fallback branches
  unchanged.
- `lib/retrieval.ts` — live branch calls `match_provider_chunks` via
  `withTenant(tenantId, tx => tx.execute(sql`select * from match_provider_chunks(...)`))`.
  In-memory fallback unchanged.
- `lib/seed.ts` — `runSeed` uses `adminDb` (owner) instead of `supabaseAdmin()`;
  upsert/insert logic 1:1.
- `scripts/migrate.ts` — **new**, mirrors 131b: applies `drizzle/*.sql` in order
  under `ADMIN_DATABASE_URL`.

**Deleted:**
- `lib/supabase/anon.ts`, `lib/supabase/admin.ts`, `supabase/` dir.
- deps `@supabase/supabase-js`, `@supabase/ssr`.
- add deps `drizzle-orm`, `postgres`; dev dep `drizzle-kit`.

**Call-site edits:** `isSupabaseConfigured` → `isDbConfigured` rename in
`app/api/seed/route.ts` and `lib/retrieval.ts`. The seed route's 503 message
"Supabase is not configured" → "Database is not configured". No other call site
changes — signatures are preserved.

### pgvector

- `create extension if not exists vector;` in `drizzle/0001_rls.sql`.
- `match_provider_chunks` copied verbatim (it is `SECURITY INVOKER`, so RLS still
  applies when called by `adviso_app_rls` inside `withTenant`).
- ivfflat index kept. **Known limitation, acceptable for a demo:** with only a
  handful of seeded providers the index has too few rows to be selective; the
  planner will do an exact scan. Retrieval results are correct either way. Noted
  so no one mistakes it for a bug.

---

## Env

`.env.local` (and `.env.example`) — remove all three Supabase vars, keep BYOK +
embeddings config, add the two Neon URLs:

```
APP_DATABASE_URL=postgresql://adviso_app_rls:***@ep-...-pooler.<region>.aws.neon.tech/adviso_106?sslmode=require
ADMIN_DATABASE_URL=postgresql://neondb_owner:***@ep-....<region>.aws.neon.tech/adviso_106?sslmode=require
BYOK_COOKIE_SECRET=<kept>
EMBEDDINGS_PROVIDER=deterministic
OPENAI_CHAT_MODEL=gpt-4o-mini
```

Vercel: delete `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`; add `APP_DATABASE_URL`, `ADMIN_DATABASE_URL`. Keep
`BYOK_COOKIE_SECRET`.

---

## Testing

### Pre-step: green baseline of the hermetic suite

The hermetic e2e suite currently fails 5/5 on `page.goto` **timeouts** (not
assertion failures) — the signature of `next dev` cold-compiling routes under
`fullyParallel: true`. Before touching the data layer, establish a trustworthy
green baseline: reproduce, then fix by either raising the per-test/nav timeout or
running the suite against `next build && next start` (a warm server). The 5
DB-less tests + the unit test must be green **before** and **after** the
migration, unchanged. If they can't be made reliably green first, stop and
reassess — we need a real before/after.

### rls.spec.ts — rewritten, still the isolation proof

Replace the Supabase-anon-client mechanism with a direct `postgres.js`
connection as `adviso_app_rls`:

- Open a transaction, `set local app.tenant_id = HOMEPRO_ID`, `select tenant_id
  from providers` → assert **all** rows are HOMEPRO and count > 0.
- In the same scoped connection, `select ... from providers where tenant_id =
  EVENTLY_ID` → assert **zero** rows (engine refuses even an explicit ask).
- Set `app.tenant_id = EVENTLY_ID` → assert it now sees only Evently.
- `test.skip` when `APP_DATABASE_URL` is unset, so the hermetic suite stays
  green. Run against live Neon to verify.

This asserts the same guarantee as today — cross-tenant reads are impossible —
but at the SQL/engine level, which is exactly what Option B preserves.

### Unchanged tests

`tenants.spec.ts`, `recommend.spec.ts`, `byok.spec.ts`, `scoring.test.ts` are
provider-agnostic (seed fallback + mock LM) and are not modified.

---

## Rollout & verification

1. Neon: create database `adviso_106` in `upwork-demos`; role `adviso_app_rls`
   (via migration).
2. Wire `.env.local` (app + admin URLs).
3. `npm run migrate` — extension, tables, role+grants, policies, function.
4. `npm run seed` — tenants, question sets, providers, embedded chunks.
5. `npm test` — hermetic suite green; then run `rls.spec.ts` with
   `APP_DATABASE_URL` set → isolation proven on live Neon.
6. Vercel: swap env vars; `vercel --prod`.
7. **Live verification (browser, not just curl):** on the deployed URL, run the
   questionnaire → confirm ranked providers come **from Neon** (not the
   fallback — verify by checking a row only present in the DB, e.g. a lead is
   persisted / `leadId` is non-null in the recommend response). Open chat → ask a
   follow-up → confirm grounded citations render. Confirm two tenants
   (`?tenant=homepro` vs `?tenant=evently`) show different providers.
8. README: replace the Supabase/RLS-via-header description with the Neon +
   `SET LOCAL` mechanism. Update `evidence.md` / my-wiki per schema.md (portfolio
   claim now: "multi-tenant RLS enforced by Postgres via SET LOCAL, Drizzle ORM,
   pgvector RAG on Neon").
9. Commit + push (ask before pushing, per 131b precedent).

## Risks / watch-list

- **Owner bypass** — if any runtime query accidentally uses `adminDb`, RLS is
  silently bypassed. Mitigation: only `runSeed` imports `admin.ts`; a grep check
  in review.
- **`SET LOCAL` outside a transaction** — would be a no-op and silently disable
  scoping. Mitigation: `withTenant` is the *only* path for tenant-scoped queries;
  never call the app client outside it for private tables.
- **Pooler + prepared statements** — `postgres.js` must keep `prepare: false` on
  the pooled endpoint (same as 131b).
- **Free-tier cold start** — first hit after ~5 min idle ~0.5s. Acceptable.
- **Honesty guardrail** — the portfolio claim must match the delivered
  mechanism. Do not claim engine-enforced RLS unless the non-owner role + live
  `rls.spec.ts` both hold.
