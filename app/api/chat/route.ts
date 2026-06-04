import { NextResponse } from "next/server";
import { ChatRequestSchema, type ChatResponse } from "@/lib/types";
import { loadProviders, loadTenantBySlug } from "@/lib/data";
import { rankProviders } from "@/lib/scoring";
import { chat } from "@/lib/agent";
import { getSessionApiKey } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Chat follow-ups, answered by the tool-calling RAG agent.
 *
 * Gated on BYOK: with no key we return 428 + { code: "NO_KEY" } so the UI shows
 * the "add your OpenAI key" hint rather than erroring. Scores for the on-screen
 * providers are recomputed so the agent's score_breakdown tool has real data.
 */
export async function POST(req: Request) {
  const apiKey = await getSessionApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI key required", code: "NO_KEY" }, { status: 428 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { tenant: tenantSlug, message, providerIds, history } = parsed.data;

  const tenant = await loadTenantBySlug(tenantSlug);
  const providers = await loadProviders(tenant);
  // Recompute breakdowns so score_breakdown reflects real scores; answers are
  // unknown here, so use a neutral scoring (empty answers) purely for context.
  const breakdowns = rankProviders(providers, {});

  try {
    const result: ChatResponse = await chat({
      tenantId: tenant.id,
      apiKey,
      message,
      providerIds,
      history,
      breakdowns,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Chat failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
