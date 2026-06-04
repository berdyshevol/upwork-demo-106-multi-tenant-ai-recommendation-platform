import type { Answers, Provider, ScoreBreakdown, ScoreComponents } from "./types";

/**
 * Deterministic recommendation scoring.
 *
 * Pure, side-effect-free, and identical across runs — this is what makes the
 * ranking explainable and lets us rank with zero OpenAI usage. The AI layer
 * only ever *explains* what this engine already decided; it never reorders.
 *
 * The engine is vertical-agnostic: it reads the four canonical answer keys
 * (`job_type`, `budget`, `urgency`, `location`) that every tenant's question
 * set shares, and scores them against the generic structured Provider fields.
 * A new vertical changes the option labels, not this code.
 */

/** Relative weights of each component; must sum to 1. */
export const WEIGHTS: ScoreComponents = {
  serviceMatch: 0.35,
  budgetFit: 0.25,
  availability: 0.2,
  location: 0.1,
  reputation: 0.1,
};

/** Canonical budget tokens shared by all tenants → provider price tier (1–4). */
const BUDGET_TIER: Record<string, number> = {
  under_500: 1,
  "500_2000": 2,
  "2000_10000": 3,
  "10000_plus": 4,
};

const BUDGET_LABEL: Record<string, string> = {
  under_500: "under $500",
  "500_2000": "$500–2,000",
  "2000_10000": "$2,000–10,000",
  "10000_plus": "$10,000+",
};

function asString(v: Answers[string] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function asArray(v: Answers[string] | undefined): string[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function scoreService(provider: Provider, answers: Answers): { value: number; reason?: string } {
  const wanted = asArray(answers.job_type);
  if (wanted.length === 0) return { value: 0.5 };
  const matched = wanted.filter((w) => provider.services.includes(w));
  if (matched.length === wanted.length) {
    return { value: 1, reason: `Covers exactly what you need (${matched.join(", ")})` };
  }
  if (matched.length > 0) {
    return {
      value: 0.6 + 0.3 * (matched.length / wanted.length),
      reason: `Handles ${matched.join(", ")} of your requested services`,
    };
  }
  return { value: 0.15, reason: "Offers general service but not your specific request" };
}

function scoreBudget(provider: Provider, answers: Answers): { value: number; reason?: string } {
  const token = asString(answers.budget);
  const desired = token ? BUDGET_TIER[token] : undefined;
  if (token == null || desired == null) return { value: 0.6 };
  const label = BUDGET_LABEL[token] ?? token;
  const distance = Math.abs(provider.price_tier - desired);
  const value = clamp01(1 - distance / 3);
  if (distance === 0) return { value, reason: `Priced right for your ${label} budget` };
  if (provider.price_tier < desired) return { value, reason: `Comes in under your ${label} budget` };
  return { value, reason: `Runs above your ${label} budget` };
}

function scoreAvailability(provider: Provider, answers: Answers): { value: number; reason?: string } {
  const urgency = asString(answers.urgency);
  switch (urgency) {
    case "emergency":
      return provider.available_emergency
        ? { value: 1, reason: "Available for 24/7 emergencies" }
        : { value: 0.2, reason: "Does not offer emergency callouts" };
    case "this_week":
      return provider.response_time_hours <= 72
        ? { value: 0.95, reason: `Typically responds within ${provider.response_time_hours}h` }
        : { value: 0.5 };
    case "this_month":
      return provider.response_time_hours <= 168
        ? { value: 0.9, reason: "Comfortably available within the month" }
        : { value: 0.7 };
    default:
      return { value: 0.85 };
  }
}

function scoreLocation(provider: Provider, answers: Answers): { value: number; reason?: string } {
  const loc = asString(answers.location);
  if (!loc) return { value: 0.6 };
  if (provider.service_areas.includes(loc)) {
    return { value: 1, reason: `Serves your area (${loc.replace(/_/g, " ")})` };
  }
  return { value: 0.25, reason: `Primarily serves other areas` };
}

function scoreReputation(provider: Provider): { value: number; reason?: string } {
  const ratingPart = provider.rating / 5;
  const expPart = clamp01(provider.years_experience / 20);
  const value = clamp01(0.7 * ratingPart + 0.3 * expPart);
  return {
    value,
    reason: `${provider.rating.toFixed(1)}★ rating, ${provider.years_experience} yrs experience`,
  };
}

/** Score a single provider against a visitor's answers. */
export function scoreProvider(provider: Provider, answers: Answers): ScoreBreakdown {
  const service = scoreService(provider, answers);
  const budget = scoreBudget(provider, answers);
  const availability = scoreAvailability(provider, answers);
  const location = scoreLocation(provider, answers);
  const reputation = scoreReputation(provider);

  const components: ScoreComponents = {
    serviceMatch: service.value,
    budgetFit: budget.value,
    availability: availability.value,
    location: location.value,
    reputation: reputation.value,
  };

  const total = Math.round(
    100 *
      (WEIGHTS.serviceMatch * components.serviceMatch +
        WEIGHTS.budgetFit * components.budgetFit +
        WEIGHTS.availability * components.availability +
        WEIGHTS.location * components.location +
        WEIGHTS.reputation * components.reputation),
  );

  const reasons = [service, budget, availability, location, reputation]
    .map((r) => r.reason)
    .filter((r): r is string => Boolean(r));

  return { providerId: provider.id, providerName: provider.name, total, components, reasons };
}

/** Rank every provider, highest score first. Deterministic tie-break by name. */
export function rankProviders(providers: Provider[], answers: Answers): ScoreBreakdown[] {
  return providers
    .map((p) => scoreProvider(p, answers))
    .sort((a, b) => b.total - a.total || a.providerName.localeCompare(b.providerName));
}
