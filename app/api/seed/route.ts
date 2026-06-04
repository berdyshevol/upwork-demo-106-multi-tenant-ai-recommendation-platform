import { NextResponse } from "next/server";
import { runSeed } from "@/lib/seed";
import { isSupabaseConfigured } from "@/lib/data";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Admin ingestion route: chunk → embed → store provider docs in pgvector and
 * upsert tenants/question-sets/providers. Protected by a shared secret
 * (SEED_SECRET) passed as `?secret=` or `x-seed-secret` header so it can't be
 * triggered anonymously in production.
 *
 * Embeddings use the env key when EMBEDDINGS_PROVIDER=openai; otherwise the
 * deterministic embedder (no key needed).
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const required = process.env.SEED_SECRET;
  if (required) {
    const url = new URL(req.url);
    const provided = url.searchParams.get("secret") ?? req.headers.get("x-seed-secret");
    if (provided !== required) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runSeed(process.env.OPENAI_API_KEY ?? null);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
