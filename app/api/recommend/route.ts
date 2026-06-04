import { NextResponse } from "next/server";
import { RecommendRequestSchema, type RecommendResponse, type Recommendation } from "@/lib/types";
import { loadProviders, loadTenantBySlug, loadQuestionSet, saveLead } from "@/lib/data";
import { rankProviders } from "@/lib/scoring";
import { explainTop } from "@/lib/agent";
import { getSessionApiKey } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

/** How many top providers get an AI "why it fits" explanation. */
const EXPLAIN_TOP_N = 3;

/**
 * The recommendation endpoint — the hybrid engine.
 *
 *   1. Deterministic layer (always): rank every provider with the pure scorer.
 *   2. AI layer (only when a BYOK key is present): generate validated,
 *      citation-grounded explanations for the top N. The AI never re-ranks.
 *
 * Works fully without a key — you just get scores + deterministic reasons.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RecommendRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { tenant: tenantSlug, answers } = parsed.data;

  const tenant = await loadTenantBySlug(tenantSlug);
  const providers = await loadProviders(tenant);
  const breakdowns = rankProviders(providers, answers);
  const byId = new Map(providers.map((p) => [p.id, p]));

  // Build base recommendations from the deterministic layer.
  const recommendations: Recommendation[] = [];
  for (const score of breakdowns) {
    const provider = byId.get(score.providerId);
    if (provider) recommendations.push({ provider, score, explanation: null });
  }

  // AI layer — gated on a visitor key.
  const apiKey = await getSessionApiKey();
  let aiEnabled = false;
  if (apiKey && recommendations.length > 0) {
    aiEnabled = true;
    try {
      const qset = await loadQuestionSet(tenant);
      const answersSummary = summariseAnswers(answers, qset);
      const top = recommendations.slice(0, EXPLAIN_TOP_N).map((r) => r.score);
      const explanations = await explainTop({ tenantId: tenant.id, apiKey, answersSummary, breakdowns: top });
      const expById = new Map(explanations.map((e) => [e.providerId, e]));
      for (const rec of recommendations) {
        const e = expById.get(rec.provider.id);
        if (e) rec.explanation = e;
      }
    } catch {
      // If the AI layer fails (bad key, rate limit), degrade gracefully to scores.
      aiEnabled = false;
    }
  }

  const leadId = await saveLead(tenant.id, answers);

  const response: RecommendResponse = { recommendations, aiEnabled, leadId };
  return NextResponse.json(response);
}

function summariseAnswers(answers: Record<string, unknown>, qset: { questions: { key: string; label: string }[] }): string {
  const parts: string[] = [];
  for (const q of qset.questions) {
    const v = answers[q.key];
    if (v == null) continue;
    parts.push(`${q.label} ${Array.isArray(v) ? v.join(", ") : v}`);
  }
  return parts.join("; ");
}
