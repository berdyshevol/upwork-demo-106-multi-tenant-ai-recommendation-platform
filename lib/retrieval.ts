import type { ChunkMatch } from "./types";
import { isSupabaseConfigured } from "./data";
import { getEmbedder, type Embedder } from "./embeddings";
import { SEED_PROVIDERS } from "./seed-data";
import { chunkDocs } from "./chunk";
import { supabaseAnon } from "./supabase/anon";

/**
 * Vector retrieval over provider docs.
 *
 * Live: calls the `match_provider_chunks` RPC (pgvector, RLS-scoped by the anon
 * client's tenant header). Hermetic fallback: chunks the in-repo seed docs,
 * embeds them with the same (deterministic) embedder, and ranks by cosine in
 * memory — so chat/explanations retrieve real, citable snippets even with no DB.
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

  if (!isSupabaseConfigured()) {
    return retrieveInMemory(tenantId, query, matchCount, providerIds);
  }

  try {
    const embedder = getEmbedder(apiKey);
    const queryEmbedding = await embedder.embed(query);
    const { data, error } = await supabaseAnon(tenantId).rpc("match_provider_chunks", {
      query_embedding: queryEmbedding,
      match_tenant: tenantId,
      match_count: matchCount,
      filter_provider_ids: providerIds && providerIds.length > 0 ? providerIds : null,
    });
    if (error || !data) return retrieveInMemory(tenantId, query, matchCount, providerIds);
    return data as ChunkMatch[];
  } catch {
    return retrieveInMemory(tenantId, query, matchCount, providerIds);
  }
}
