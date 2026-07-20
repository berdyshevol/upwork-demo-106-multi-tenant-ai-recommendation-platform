import { test } from "node:test";
import assert from "node:assert/strict";
import { hasDbEnv, adminSql, ensureTenant, HOMEPRO_ID } from "./helpers";
import { loadProviders, saveLead } from "../../lib/data";
import { TENANTS } from "../../lib/tenants";
import type { Tenant } from "../../lib/types";

const SENTINEL_ID = "dddd0001-0000-4000-8000-000000000001";
const SENTINEL_NAME = "DB-Sentinel-Provider-106";
const homepro = TENANTS.find((t) => t.slug === "homepro") as Tenant;

/**
 * Goal: lib/data.ts must read tenant-scoped rows from Neon through withTenant
 * (RLS-enforced) and coerce numerics to numbers. RED until data.ts is ported off
 * the Supabase clients onto Drizzle.
 */
test("loadProviders reads Neon (sentinel), is tenant-scoped, coerces numerics", { skip: !hasDbEnv }, async () => {
  const sql = adminSql();
  try {
    await ensureTenant(sql, HOMEPRO_ID, "homepro");
    await sql`delete from providers where id = ${SENTINEL_ID}`;
    await sql`
      insert into providers (id, tenant_id, name, blurb, price_tier, rating, response_time_hours)
      values (${SENTINEL_ID}, ${HOMEPRO_ID}, ${SENTINEL_NAME}, 'x', 2, 4.7, 6)
    `;

    const providers = await loadProviders(homepro);

    // Came from Neon, not the in-repo seed fallback (the sentinel is not in seed-data):
    assert.ok(
      providers.some((p) => p.name === SENTINEL_NAME),
      "sentinel provider absent — loadProviders is reading the fallback, not Neon",
    );
    // Engine-enforced isolation: every returned row belongs to HOMEPRO:
    assert.ok(
      providers.every((p) => p.tenant_id === HOMEPRO_ID),
      "a non-HOMEPRO row leaked through loadProviders",
    );
    // Numerics must be numbers (postgres.js returns numeric as string — data layer must coerce):
    const s = providers.find((p) => p.name === SENTINEL_NAME)!;
    assert.equal(typeof s.rating, "number", "rating must be coerced to a number");
    assert.equal(typeof s.response_time_hours, "number", "response_time_hours must be a number");
  } finally {
    await sql`delete from providers where id = ${SENTINEL_ID}`;
    await sql.end();
  }
});

/**
 * Goal: saveLead must persist to Neon and return the new id (INSERT … RETURNING),
 * under the tenant-scoped role. RED until data.ts is ported.
 */
test("saveLead persists to Neon and returns an id", { skip: !hasDbEnv }, async () => {
  const id = await saveLead(HOMEPRO_ID, { job_type: "plumbing", _fixture: true });
  assert.ok(typeof id === "string" && id.length > 0, "saveLead must return a non-null id");

  const sql = adminSql();
  try {
    const rows = await sql`select tenant_id from leads where id = ${id}`;
    assert.equal(rows.length, 1, "lead not found in Neon");
    assert.equal(rows[0].tenant_id, HOMEPRO_ID);
  } finally {
    await sql`delete from leads where id = ${id}`;
    await sql.end();
  }
});
