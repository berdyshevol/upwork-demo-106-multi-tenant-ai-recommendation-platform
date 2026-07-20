import { test } from "node:test";
import assert from "node:assert/strict";
import { hasDbEnv, adminSql, ensureTenant, toVectorLiteral, HOMEPRO_ID } from "./helpers";
import { retrieveChunks } from "../../lib/retrieval";
import { getEmbedder } from "../../lib/embeddings";

const P_ID = "dddd0002-0000-4000-8000-000000000002";
const SENTINEL_PHRASE = "zzz-sentinel-emergency-boiler-repair-106";

/**
 * Goal: retrieveChunks must run the pgvector `match_provider_chunks` search on
 * Neon, tenant-scoped via withTenant. RED until lib/retrieval.ts is ported off
 * the Supabase .rpc() path onto Drizzle.
 */
test("retrieveChunks reads pgvector from Neon and is tenant-scoped", { skip: !hasDbEnv }, async () => {
  const sql = adminSql();
  try {
    await ensureTenant(sql, HOMEPRO_ID, "homepro");
    await sql`delete from providers where id = ${P_ID}`; // cascade-deletes its chunks
    await sql`
      insert into providers (id, tenant_id, name, blurb, price_tier)
      values (${P_ID}, ${HOMEPRO_ID}, 'Sentinel Retrieval Co', 'x', 2)
    `;
    const embedding = await getEmbedder().embed(SENTINEL_PHRASE);
    await sql`
      insert into provider_chunks (tenant_id, provider_id, source, content, embedding)
      values (${HOMEPRO_ID}, ${P_ID}, 'sentinel', ${SENTINEL_PHRASE}, ${toVectorLiteral(embedding)}::vector)
    `;

    const chunks = await retrieveChunks({ tenantId: HOMEPRO_ID, query: SENTINEL_PHRASE, matchCount: 6 });

    assert.ok(chunks.length > 0, "retrieveChunks returned nothing");
    assert.ok(
      chunks.some((c) => c.content === SENTINEL_PHRASE),
      "sentinel chunk absent — retrieveChunks is using the in-memory fallback, not Neon pgvector",
    );
    assert.ok(
      chunks.every((c) => c.provider_id === P_ID || typeof c.provider_id === "string"),
      "unexpected chunk shape",
    );
  } finally {
    await sql`delete from providers where id = ${P_ID}`;
    await sql.end();
  }
});
