import { sql } from "drizzle-orm";
import type { ChunkMatch } from "./types";
import { isDbConfigured } from "./data";
import { getEmbedder, type Embedder } from "./embeddings";
import { SEED_PROVIDERS } from "./seed-data";
import { chunkDocs } from "./chunk";
import { withTenant } from "./db/tenant";

/**
 * Vector retrieval over provider docs.
 *
 * Live: calls the `match_provider_chunks` pgvector function on Neon, run INSIDE
 * withTenant() so the `app.tenant_id` GUC drives RLS — the query physically
 * cannot read another tenant's chunks. Hermetic fallback: chunks the in-repo
 * seed docs, embeds them with the same (deterministic) embedder, and ranks by
 * cosine in memory — so chat/explanations retrieve real, citable snippets even
 * with no DB.
 */

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

interface MemChunk {
  id: string;
  provider_id: string;
  tenant_id: string;
  source: string;
  content: string;
  embedding: number[];
}

let memCache: { embedder: Embedder; chunks: MemChunk[] } | null = null;

async function buildMemoryIndex(embedder: Embedder): Promise<MemChunk[]> {
  const chunks: MemChunk[] = [];
  for (const provider of SEED_PROVIDERS) {
    const docChunks = chunkDocs(provider.docs);
    const embeddings = await embedder.embedBatch(docChunks.map((c) => c.content));
    docChunks.forEach((c, i) => {
      chunks.push({
        id: `${provider.id}:${c.source}:${i}`,
        provider_id: provider.id,
        tenant_id: provider.tenant_id,
        source: c.source,
        content: c.content,
        embedding: embeddings[i],
      });
    });
  }
  return chunks;
}

async function retrieveInMemory(
  tenantId: string,
  query: string,
  matchCount: number,
  providerIds?: string[],
): Promise<ChunkMatch[]> {
  const embedder = getEmbedder();
  if (!memCache) {
    memCache = { embedder, chunks: await buildMemoryIndex(embedder) };
  }
  const queryVec = await embedder.embed(query);
  const allowed = providerIds && providerIds.length > 0 ? new Set(providerIds) : null;
  return memCache.chunks
    .filter((c) => c.tenant_id === tenantId && (!allowed || allowed.has(c.provider_id)))
    .map((c) => ({
      id: c.id,
      provider_id: c.provider_id,
      source: c.source,
      content: c.content,
      similarity: cosine(queryVec, c.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, matchCount);
}

/**
 * Retrieve the most relevant provider-doc chunks for a query.
 * @param apiKey BYOK key — only used when EMBEDDINGS_PROVIDER=openai.
 */
export async function retrieveChunks(opts: {
  tenantId: string;
  query: string;
  matchCount?: number;
  providerIds?: string[];
  apiKey?: string | null;
}): Promise<ChunkMatch[]> {
  const { tenantId, query, matchCount = 6, providerIds, apiKey } = opts;

  if (!isDbConfigured()) {
    return retrieveInMemory(tenantId, query, matchCount, providerIds);
  }

  try {
    const embedding = await getEmbedder(apiKey).embed(query);
    // pgvector literal form: '[0.1,0.2,…]', cast to ::vector for the function arg.
    const embeddingLiteral = "[" + embedding.join(",") + "]";
    const filterArg =
      providerIds && providerIds.length > 0
        ? sql`array[${sql.join(
            providerIds.map((id) => sql`${id}`),
            sql`, `,
          )}]::uuid[]`
        : sql`null::uuid[]`;

    const rows = await withTenant(tenantId, async (tx) =>
      tx.execute(sql`
        select id, provider_id, source, content, similarity
        from match_provider_chunks(
          ${embeddingLiteral}::vector,
          ${tenantId}::uuid,
          ${matchCount},
          ${filterArg}
        )
      `),
    );

    const matches = rows as unknown as ChunkMatch[];
    if (!matches || matches.length === 0) {
      return retrieveInMemory(tenantId, query, matchCount, providerIds);
    }
    return matches.map((r) => ({
      id: r.id,
      provider_id: r.provider_id,
      source: r.source,
      content: r.content,
      similarity: r.similarity,
    }));
  } catch {
    return retrieveInMemory(tenantId, query, matchCount, providerIds);
  }
}
