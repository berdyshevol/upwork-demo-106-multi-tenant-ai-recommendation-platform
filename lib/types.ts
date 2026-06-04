import { z } from "zod";

/**
 * Adviso domain contract.
 *
 * This file is the single source of truth shared by the deterministic scoring
 * engine, the LangChain agent, the API routes and the UI. Everything that
 * crosses a module boundary is validated here with zod so a malformed tenant
 * config or a hallucinated agent response fails loudly instead of silently
 * rendering garbage.
 */

/** Fixed embedding dimensionality. Both the deterministic and the OpenAI
 * (text-embedding-3-small) providers emit vectors of this size so the
 * `provider_chunks.embedding` column and the `match_provider_chunks` RPC stay
 * provider-agnostic. */
export const EMBED_DIM = 1536;

// ── Tenant + branding ─────────────────────────────────────────────────────────

export const ThemeSchema = z.object({
  /** HSL triplet strings (e.g. "172 66% 45%") so they drop straight into CSS vars. */
  brand: z.string(),
  brandForeground: z.string(),
  brandMuted: z.string(),
  accent: z.string(),
});
export type Theme = z.infer<typeof ThemeSchema>;

export const TenantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  tagline: z.string(),
  logo_emoji: z.string(),
  theme: ThemeSchema,
  question_set_id: z.string().uuid(),
});
export type Tenant = z.infer<typeof TenantSchema>;

// ── Question sets (versioned JSON config) ──────────────────────────────────────

export const QuestionSchema = z.object({
  /** Stable key the scoring engine reads from the answers map. */
  key: z.enum(["job_type", "budget", "urgency", "location"]),
  label: z.string(),
  help: z.string().optional(),
  type: z.enum(["select", "multiselect"]),
  required: z.boolean().default(true),
  options: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .min(1),
});
export type Question = z.infer<typeof QuestionSchema>;

export const QuestionSetSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  version: z.number().int().positive(),
  questions: z.array(QuestionSchema).min(1),
});
export type QuestionSet = z.infer<typeof QuestionSetSchema>;

/** A visitor's answers: { questionKey: selectedValue | selectedValues }. */
export const AnswersSchema = z.record(
  z.string(),
  z.union([z.string(), z.array(z.string())]),
);
export type Answers = z.infer<typeof AnswersSchema>;

// ── Providers ──────────────────────────────────────────────────────────────────

export const ProviderSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  name: z.string(),
  blurb: z.string(),
  services: z.array(z.string()),
  /** 1 (budget) → 4 (premium): the band the provider typically serves. */
  price_tier: z.number().int().min(1).max(4),
  service_areas: z.array(z.string()),
  available_emergency: z.boolean(),
  response_time_hours: z.number(),
  rating: z.number().min(0).max(5),
  years_experience: z.number().int().nonnegative(),
});
export type Provider = z.infer<typeof ProviderSchema>;

// ── Deterministic scoring ───────────────────────────────────────────────────────

export const ScoreComponentsSchema = z.object({
  serviceMatch: z.number(),
  budgetFit: z.number(),
  availability: z.number(),
  location: z.number(),
  reputation: z.number(),
});
export type ScoreComponents = z.infer<typeof ScoreComponentsSchema>;

export const ScoreBreakdownSchema = z.object({
  providerId: z.string(),
  providerName: z.string(),
  /** 0–100, weighted sum of the (normalised) components. */
  total: z.number(),
  components: ScoreComponentsSchema,
  /** Human-readable, deterministic justifications — render with or without a key. */
  reasons: z.array(z.string()),
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

// ── RAG + AI explanation ─────────────────────────────────────────────────────────

export const CitationSchema = z.object({
  chunkId: z.string(),
  providerId: z.string(),
  source: z.string(),
  snippet: z.string(),
});
export type Citation = z.infer<typeof CitationSchema>;

/** Structured, validated output of the AI layer for a single provider. */
export const AIExplanationSchema = z.object({
  providerId: z.string(),
  whyItFits: z.string(),
  standoutFactors: z.array(z.string()),
  citations: z.array(CitationSchema),
});
export type AIExplanation = z.infer<typeof AIExplanationSchema>;

export const RecommendationSchema = z.object({
  provider: ProviderSchema,
  score: ScoreBreakdownSchema,
  explanation: AIExplanationSchema.nullable(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

// ── API payloads ─────────────────────────────────────────────────────────────────

export const RecommendRequestSchema = z.object({
  tenant: z.string(),
  answers: AnswersSchema,
});
export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;

export const RecommendResponseSchema = z.object({
  recommendations: z.array(RecommendationSchema),
  /** True when the AI layer ran (a BYOK key was present and valid). */
  aiEnabled: z.boolean(),
  leadId: z.string().nullable(),
});
export type RecommendResponse = z.infer<typeof RecommendResponseSchema>;

export const ChatRequestSchema = z.object({
  tenant: z.string(),
  message: z.string().min(1),
  /** Provider ids currently on screen, so the agent scopes retrieval to them. */
  providerIds: z.array(z.string()),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

/** A retrieved chunk as returned by the match_provider_chunks RPC. */
export const ChunkMatchSchema = z.object({
  id: z.string(),
  provider_id: z.string(),
  source: z.string(),
  content: z.string(),
  similarity: z.number(),
});
export type ChunkMatch = z.infer<typeof ChunkMatchSchema>;
