import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import {
  AIExplanationSchema,
  type AIExplanation,
  type ChatResponse,
  type Citation,
  type ScoreBreakdown,
} from "./types";
import { retrieveChunks } from "./retrieval";
import { chatModel, isMockKey } from "./llm";

/**
 * The AI layer.
 *
 * Two entry points, both backed by LangChain and the same two tools:
 *   • retrieve_provider_docs — pgvector / in-memory vector search
 *   • score_breakdown        — reads the deterministic scores (never re-ranks)
 *
 * `explainTop` produces a validated, citation-grounded "why it fits" per top
 * provider (a retrieval chain). `chat` is a tool-calling agent for follow-ups.
 * Citations are always attached from *actually retrieved* chunks, so the model
 * writes prose but cannot invent a source.
 */

function toCitation(c: { id: string; provider_id: string; source: string; content: string }): Citation {
  return {
    chunkId: c.id,
    providerId: c.provider_id,
    source: c.source,
    snippet: c.content.length > 240 ? `${c.content.slice(0, 237)}…` : c.content,
  };
}

// ── Tool factory (shared by chat + available to the agent) ──────────────────────
function buildTools(tenantId: string, apiKey: string, breakdowns: ScoreBreakdown[]) {
  const collected: Citation[] = [];

  const retrieveProviderDocs = tool(
    async ({ query, providerIds }) => {
      const chunks = await retrieveChunks({
        tenantId,
        query,
        providerIds: providerIds ?? undefined,
        apiKey,
        matchCount: 6,
      });
      for (const c of chunks) collected.push(toCitation(c));
      return JSON.stringify(
        chunks.map((c) => ({ providerId: c.provider_id, source: c.source, text: c.content })),
      );
    },
    {
      name: "retrieve_provider_docs",
      description:
        "Semantic search over the ingested provider documents (profile, reviews, service notes). Use this to ground every factual claim. Optionally scope to specific providerIds.",
      schema: z.object({
        query: z.string().describe("What to look for in the provider docs"),
        providerIds: z.array(z.string()).optional().describe("Restrict to these provider ids"),
      }),
    },
  );

  const scoreBreakdownTool = tool(
    async ({ providerId }) => {
      const b = breakdowns.find((x) => x.providerId === providerId);
      if (!b) return JSON.stringify({ error: "no breakdown for that provider" });
      return JSON.stringify({ total: b.total, components: b.components, reasons: b.reasons });
    },
    {
      name: "score_breakdown",
      description:
        "Returns the deterministic match score (0–100), its components, and reasons for a provider id. Use it to explain ranking; never invent a different ranking.",
      schema: z.object({ providerId: z.string() }),
    },
  );

  return { tools: [retrieveProviderDocs, scoreBreakdownTool], collected };
}

// ── Explanations for the top candidates ─────────────────────────────────────────

export async function explainTop(opts: {
  tenantId: string;
  apiKey: string;
  answersSummary: string;
  breakdowns: ScoreBreakdown[]; // already top-N, in rank order
}): Promise<AIExplanation[]> {
  const { tenantId, apiKey, answersSummary, breakdowns } = opts;

  const results: AIExplanation[] = [];
  for (const b of breakdowns) {
    const chunks = await retrieveChunks({
      tenantId,
      query: `${answersSummary}. Why is ${b.providerName} a good fit?`,
      providerIds: [b.providerId],
      apiKey,
      matchCount: 4,
    });
    const citations = chunks.map(toCitation);

    if (isMockKey(apiKey) || chunks.length === 0) {
      results.push(mockExplanation(b, citations));
      continue;
    }

    const context = chunks.map((c, i) => `[${i + 1}] (${c.source}) ${c.content}`).join("\n");
    const model = chatModel(apiKey).withStructuredOutput(
      AIExplanationSchema.omit({ citations: true, providerId: true }),
      { name: "explanation" },
    );
    try {
      const out = await model.invoke([
        new SystemMessage(
          "You explain why a service provider fits a customer's needs. Use ONLY the provided document excerpts and score reasons. Be specific and concrete. 2–3 sentences for whyItFits; 2–4 short standoutFactors.",
        ),
        new HumanMessage(
          `Customer need: ${answersSummary}\n\nProvider: ${b.providerName}\nDeterministic score: ${b.total}/100\nScore reasons: ${b.reasons.join("; ")}\n\nProvider document excerpts:\n${context}`,
        ),
      ]);
      results.push({
        providerId: b.providerId,
        whyItFits: out.whyItFits,
        standoutFactors: out.standoutFactors,
        citations,
      });
    } catch {
      results.push(mockExplanation(b, citations));
    }
  }
  return results;
}

function mockExplanation(b: ScoreBreakdown, citations: Citation[]): AIExplanation {
  const lead = citations[0]?.snippet;
  return {
    providerId: b.providerId,
    whyItFits:
      `${b.providerName} scores ${b.total}/100 for your needs. ` +
      (b.reasons[0] ? `${b.reasons[0]}. ` : "") +
      (lead ? `From their profile: "${lead}"` : ""),
    standoutFactors: b.reasons.slice(0, 4),
    citations,
  };
}

// ── Chat agent ───────────────────────────────────────────────────────────────────

export async function chat(opts: {
  tenantId: string;
  apiKey: string;
  message: string;
  providerIds: string[];
  history: { role: "user" | "assistant"; content: string }[];
  breakdowns: ScoreBreakdown[];
}): Promise<ChatResponse> {
  const { tenantId, apiKey, message, providerIds, history, breakdowns } = opts;
  const { tools, collected } = buildTools(tenantId, apiKey, breakdowns);

  if (isMockKey(apiKey)) {
    const chunks = await retrieveChunks({ tenantId, query: message, providerIds, apiKey, matchCount: 4 });
    const citations = chunks.map(toCitation);
    const best = chunks[0];
    const name = best ? breakdowns.find((b) => b.providerId === best.provider_id)?.providerName : undefined;
    const answer = best
      ? `Based on their documents, ${name ?? "this provider"} is the best match for that: "${citations[0].snippet}"`
      : "I couldn't find anything in the provider documents about that.";
    return { answer, citations };
  }

  const system = new SystemMessage(
    "You are a helpful advisor answering follow-up questions about a shortlist of recommended providers. Always call retrieve_provider_docs before making factual claims, and cite what you find. Use score_breakdown to discuss ranking. Keep answers concise and grounded; if the docs don't cover it, say so.",
  );
  const messages: BaseMessage[] = [system];
  for (const h of history) {
    messages.push(h.role === "user" ? new HumanMessage(h.content) : new AIMessage(h.content));
  }
  messages.push(
    new HumanMessage(
      `${message}\n\n(Providers currently on screen: ${providerIds.join(", ") || "none"})`,
    ),
  );

  const model = chatModel(apiKey).bindTools(tools);
  const toolMap = Object.fromEntries(tools.map((t) => [t.name, t]));

  for (let step = 0; step < 4; step++) {
    const ai: AIMessage = await model.invoke(messages);
    messages.push(ai);
    const calls = ai.tool_calls ?? [];
    if (calls.length === 0) {
      return { answer: typeof ai.content === "string" ? ai.content : String(ai.content), citations: collected };
    }
    for (const call of calls) {
      const t = toolMap[call.name] as { invoke: (args: unknown) => Promise<unknown> } | undefined;
      const result = t ? await t.invoke(call.args) : "tool not found";
      messages.push(new ToolMessage({ content: String(result), tool_call_id: call.id ?? call.name }));
    }
  }
  return {
    answer: "I gathered the relevant details but couldn't finalize an answer. Please try rephrasing.",
    citations: collected,
  };
}
