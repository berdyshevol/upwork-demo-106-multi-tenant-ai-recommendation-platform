import { supabaseAdmin } from "./supabase/admin";
import { QUESTION_SETS, TENANTS } from "./tenants";
import { SEED_PROVIDERS } from "./seed-data";
import { chunkDocs } from "./chunk";
import { getEmbedder } from "./embeddings";

/**
 * Idempotent ingestion: upserts tenants + question sets + providers, then
 * (re)builds the pgvector corpus — chunk → embed → store. Embeddings use the
 * active provider (deterministic by default, OpenAI when EMBEDDINGS_PROVIDER and
 * a key are set). Shared by the /api/seed route and `pnpm seed`.
 */
export interface SeedResult {
  tenants: number;
  questionSets: number;
  providers: number;
  chunks: number;
}

export async function runSeed(apiKey?: string | null): Promise<SeedResult> {
  const db = supabaseAdmin();

  // 1. Tenants
  const tenantRows = TENANTS.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    logo_emoji: t.logo_emoji,
    theme: t.theme,
  }));
  const { error: tErr } = await db.from("tenants").upsert(tenantRows, { onConflict: "id" });
  if (tErr) throw new Error(`seed tenants: ${tErr.message}`);

  // 2. Question sets
  const qRows = QUESTION_SETS.map((q) => ({
    id: q.id,
    tenant_id: q.tenant_id,
    version: q.version,
    questions: q.questions,
  }));
  const { error: qErr } = await db.from("question_sets").upsert(qRows, { onConflict: "id" });
  if (qErr) throw new Error(`seed question_sets: ${qErr.message}`);

  // 3. Providers
  const providerRows = SEED_PROVIDERS.map(({ docs: _docs, ...p }) => p);
  const { error: pErr } = await db.from("providers").upsert(providerRows, { onConflict: "id" });
  if (pErr) throw new Error(`seed providers: ${pErr.message}`);

  // 4. Chunks — wipe and rebuild for the seeded providers.
  const providerIds = SEED_PROVIDERS.map((p) => p.id);
  await db.from("provider_chunks").delete().in("provider_id", providerIds);

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
    const { error: cErr } = await db.from("provider_chunks").insert(rows);
    if (cErr) throw new Error(`seed chunks for ${provider.name}: ${cErr.message}`);
    chunkCount += rows.length;
  }

  return {
    tenants: tenantRows.length,
    questionSets: qRows.length,
    providers: providerRows.length,
    chunks: chunkCount,
  };
}
