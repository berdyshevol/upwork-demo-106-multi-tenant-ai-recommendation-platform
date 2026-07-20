import { inArray, sql } from "drizzle-orm";
import { getAdminDb } from "./db/admin";
import { tenants, question_sets, providers, provider_chunks } from "./db/schema";
import { QUESTION_SETS, TENANTS } from "./tenants";
import { SEED_PROVIDERS } from "./seed-data";
import { chunkDocs } from "./chunk";
import { getEmbedder } from "./embeddings";

/**
 * Idempotent ingestion: upserts tenants + question sets + providers, then
 * (re)builds the pgvector corpus — chunk → embed → store. Embeddings use the
 * active provider (deterministic by default, OpenAI when EMBEDDINGS_PROVIDER and
 * a key are set). Shared by the /api/seed route and `pnpm seed`.
 *
 * Writes go through the `neondb_owner` Drizzle client (getAdminDb), which owns
 * the tables and therefore bypasses RLS — the correct role for trusted seeding.
 */
export interface SeedResult {
  tenants: number;
  questionSets: number;
  providers: number;
  chunks: number;
}

export async function runSeed(apiKey?: string | null): Promise<SeedResult> {
  const db = getAdminDb();

  // 1. Tenants — upsert on (id).
  const tenantRows = TENANTS.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    logo_emoji: t.logo_emoji,
    theme: t.theme,
  }));
  await db
    .insert(tenants)
    .values(tenantRows)
    .onConflictDoUpdate({
      target: tenants.id,
      set: {
        slug: sql`excluded.slug`,
        name: sql`excluded.name`,
        tagline: sql`excluded.tagline`,
        logo_emoji: sql`excluded.logo_emoji`,
        theme: sql`excluded.theme`,
      },
    });

  // 2. Question sets — upsert on (id).
  const qRows = QUESTION_SETS.map((q) => ({
    id: q.id,
    tenant_id: q.tenant_id,
    version: q.version,
    questions: q.questions,
  }));
  await db
    .insert(question_sets)
    .values(qRows)
    .onConflictDoUpdate({
      target: question_sets.id,
      set: {
        tenant_id: sql`excluded.tenant_id`,
        version: sql`excluded.version`,
        questions: sql`excluded.questions`,
      },
    });

  // 3. Providers — upsert on (id), with the `docs` field stripped. The two
  //    numeric columns (response_time_hours, rating) take string values through
  //    Drizzle/postgres.js; postgres stores them identically to the numbers.
  const providerRows = SEED_PROVIDERS.map(({ docs: _docs, ...p }) => ({
    ...p,
    response_time_hours: String(p.response_time_hours),
    rating: String(p.rating),
  }));
  await db
    .insert(providers)
    .values(providerRows)
    .onConflictDoUpdate({
      target: providers.id,
      set: {
        tenant_id: sql`excluded.tenant_id`,
        name: sql`excluded.name`,
        blurb: sql`excluded.blurb`,
        services: sql`excluded.services`,
        price_tier: sql`excluded.price_tier`,
        service_areas: sql`excluded.service_areas`,
        available_emergency: sql`excluded.available_emergency`,
        response_time_hours: sql`excluded.response_time_hours`,
        rating: sql`excluded.rating`,
        years_experience: sql`excluded.years_experience`,
      },
    });

  // 4. Chunks — wipe and rebuild for the seeded providers.
  const providerIds = SEED_PROVIDERS.map((p) => p.id);
  await db.delete(provider_chunks).where(inArray(provider_chunks.provider_id, providerIds));

  const embedder = getEmbedder(apiKey);
  let chunkCount = 0;
  for (const provider of SEED_PROVIDERS) {
    const chunks = chunkDocs(provider.docs);
    if (chunks.length === 0) continue;
    const embeddings = await embedder.embedBatch(chunks.map((c) => c.content));
    const rows = chunks.map((c, i) => ({
      tenant_id: provider.tenant_id,
      provider_id: provider.id,
      source: c.source,
      content: c.content,
      embedding: embeddings[i],
    }));
    await db.insert(provider_chunks).values(rows);
    chunkCount += rows.length;
  }

  return {
    tenants: tenantRows.length,
    questionSets: qRows.length,
    providers: providerRows.length,
    chunks: chunkCount,
  };
}
