import { test } from "node:test";
import assert from "node:assert/strict";
import { hasDbEnv, adminSql } from "./helpers";
import { runSeed } from "../../lib/seed";

/**
 * Goal: runSeed() must write the seed corpus to the Neon `adviso_106` database
 * (via the owner client, bypassing RLS). RED until lib/seed.ts is ported off the
 * Supabase admin client onto Drizzle/adminDb.
 */
test("runSeed populates Neon: tenants, providers, embedded chunks", { skip: !hasDbEnv }, async () => {
  const result = await runSeed();
  assert.ok(result.tenants >= 2, `seeded ${result.tenants} tenants`);
  assert.ok(result.providers >= 8, `seeded ${result.providers} providers`);
  assert.ok(result.chunks > 0, `seeded ${result.chunks} chunks`);

  const sql = adminSql();
  try {
    const [{ t }] = await sql<{ t: number }[]>`select count(*)::int as t from tenants`;
    const [{ p }] = await sql<{ p: number }[]>`select count(*)::int as p from providers`;
    const [{ c }] = await sql<{ c: number }[]>`select count(*)::int as c from provider_chunks`;
    assert.ok(t >= 2, `DB has ${t} tenants`);
    assert.ok(p >= 8, `DB has ${p} providers`);
    assert.ok(c > 0, `DB has ${c} chunks`);
  } finally {
    await sql.end();
  }
});
