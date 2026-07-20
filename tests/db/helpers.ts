import postgres, { type Sql } from "postgres";

/**
 * Shared fixtures for the live-Neon integration tests (tests/db/*.test.ts).
 *
 * These tests exercise the REAL data layer against the REAL `adviso_106` Neon
 * database, so they require APP_DATABASE_URL + ADMIN_DATABASE_URL (run with
 * `--env-file=.env.local`). They skip when those are absent, keeping the
 * hermetic Playwright suite green with zero infra.
 *
 * Sentinel strategy: each test inserts a row that is NOT in the in-repo seed
 * (lib/seed-data.ts) and asserts the data layer returns it. A code path that
 * silently falls back to the seed data would NOT surface the sentinel — so the
 * tests fail unless the code genuinely reads from Neon.
 */

export const HOMEPRO_ID = "11111111-1111-4111-8111-111111111111";
export const EVENTLY_ID = "22222222-2222-4222-8222-222222222222";

export const hasDbEnv = Boolean(
  process.env.APP_DATABASE_URL && process.env.ADMIN_DATABASE_URL,
);

/** Owner connection (bypasses RLS) — for seeding + inspecting fixtures. */
export function adminSql(): Sql {
  return postgres(process.env.ADMIN_DATABASE_URL as string, { prepare: false, max: 1 });
}

/** Limited runtime role (RLS applies) — for asserting isolation directly. */
export function appSql(): Sql {
  return postgres(process.env.APP_DATABASE_URL as string, { prepare: false, max: 1 });
}

/** Idempotently ensure a tenant row exists (FK target for provider fixtures). */
export async function ensureTenant(sql: Sql, id: string, slug: string): Promise<void> {
  await sql`
    insert into tenants (id, slug, name, tagline, logo_emoji, theme)
    values (${id}, ${slug}, ${slug}, 'fixture', '✨', '{}'::jsonb)
    on conflict (id) do nothing
  `;
}

/** pgvector literal form for a JS number[]: '[0.1,0.2,…]'. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
