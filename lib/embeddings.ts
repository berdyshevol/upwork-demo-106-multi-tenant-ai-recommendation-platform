import crypto from "node:crypto";
import { OpenAIEmbeddings } from "@langchain/openai";
import { EMBED_DIM } from "./types";

/**
 * Pluggable embedding provider.
 *
 * The demo defaults to a *deterministic* hash embedder so the whole RAG pipeline
 * — seed, retrieval, tests — runs with **zero OpenAI usage and zero owner
 * billing**, and produces byte-identical vectors every time (great for CI). Set
 * EMBEDDINGS_PROVIDER=openai (plus OPENAI_API_KEY for the seed route) to use real
 * `text-embedding-3-small` vectors instead. Query and document vectors must come
 * from the *same* provider, so this single switch governs both.
 */

export interface Embedder {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Deterministic embedder: a bag-of-token hashing trick. Each lowercased token is
 * hashed into the vector space and accumulated, then L2-normalised. Two texts
 * that share vocabulary land near each other under cosine similarity — enough for
 * a believable, fully offline semantic retrieval demo.
 */
export class DeterministicEmbedder implements Embedder {
  constructor(private dim = EMBED_DIM) {}

  private vec(text: string): number[] {
    const v = new Array<number>(this.dim).fill(0);
    const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    for (const tok of tokens) {
      const h = crypto.createHash("md5").update(tok).digest();
      // Use 4 hash slices per token to spread signal across the space.
      for (let i = 0; i < 4; i++) {
        const idx = h.readUInt32BE(i * 4) % this.dim;
        const sign = h[i] % 2 === 0 ? 1 : -1;
        v[idx] += sign;
      }
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  }

  async embed(text: string): Promise<number[]> {
    return this.vec(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.vec(t));
  }
}

class OpenAIEmbedder implements Embedder {
  private client: OpenAIEmbeddings;
  constructor(apiKey: string) {
    this.client = new OpenAIEmbeddings({ apiKey, model: "text-embedding-3-small" });
  }
  async embed(text: string): Promise<number[]> {
    return this.client.embedQuery(text);
  }
  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.client.embedDocuments(texts);
  }
}

/**
 * Resolve the active embedder.
 * @param apiKey OpenAI key (visitor BYOK at runtime, or env key at seed time).
 *               Only consulted when EMBEDDINGS_PROVIDER=openai.
 */
export function getEmbedder(apiKey?: string | null): Embedder {
  const provider = process.env.EMBEDDINGS_PROVIDER ?? "deterministic";
  if (provider === "openai") {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("EMBEDDINGS_PROVIDER=openai but no OpenAI key available");
    }
    return new OpenAIEmbedder(key);
  }
  return new DeterministicEmbedder();
}
