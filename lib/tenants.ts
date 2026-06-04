import type { QuestionSet, Tenant } from "./types";

/**
 * Canonical tenant + question-set configuration.
 *
 * This is the proof of the single-codebase claim: two completely different
 * "advisors" — a home-services finder and an event-vendor finder — are described
 * here purely as data (branding, question options) over the *same* engine, the
 * same Provider schema, and the same scoring code. Adding a third vertical means
 * adding an entry here (and seeding its providers), never touching app logic.
 *
 * At runtime the app loads these rows from Postgres; this file is both the seed
 * source and a typed fallback so the UI still renders if the DB is unreachable.
 *
 * Note: every tenant's question set shares the four canonical answer keys
 * (job_type, budget, urgency, location) and the same budget/urgency tokens, so
 * the deterministic scorer stays vertical-agnostic. Only labels + options differ.
 */

export const HOMEPRO_ID = "11111111-1111-4111-8111-111111111111";
export const HOMEPRO_QSET = "1a111111-1111-4111-8111-111111111111";
export const EVENTLY_ID = "22222222-2222-4222-8222-222222222222";
export const EVENTLY_QSET = "2a222222-2222-4222-8222-222222222222";

const BUDGET_OPTIONS = [
  { value: "under_500", label: "Under $500" },
  { value: "500_2000", label: "$500 – $2,000" },
  { value: "2000_10000", label: "$2,000 – $10,000" },
  { value: "10000_plus", label: "$10,000+" },
];

const URGENCY_OPTIONS = [
  { value: "emergency", label: "Emergency (within 24h)" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "flexible", label: "I'm flexible" },
];

export const TENANTS: Tenant[] = [
  {
    id: HOMEPRO_ID,
    slug: "homepro",
    name: "HomePro Match",
    tagline: "Find the right home-service contractor — fast, vetted, explained.",
    logo_emoji: "🔧",
    theme: {
      brand: "172 66% 45%",
      brandForeground: "170 80% 8%",
      brandMuted: "172 40% 22%",
      accent: "158 64% 52%",
    },
    question_set_id: HOMEPRO_QSET,
  },
  {
    id: EVENTLY_ID,
    slug: "evently",
    name: "Evently Concierge",
    tagline: "Match with the perfect vendor for your big day.",
    logo_emoji: "🎉",
    theme: {
      brand: "291 64% 62%",
      brandForeground: "300 80% 10%",
      brandMuted: "291 40% 28%",
      accent: "330 81% 60%",
    },
    question_set_id: EVENTLY_QSET,
  },
];

export const QUESTION_SETS: QuestionSet[] = [
  {
    id: HOMEPRO_QSET,
    tenant_id: HOMEPRO_ID,
    version: 1,
    questions: [
      {
        key: "job_type",
        label: "What do you need done?",
        help: "Pick the service that best matches your project.",
        type: "multiselect",
        required: true,
        options: [
          { value: "plumbing", label: "Plumbing" },
          { value: "electrical", label: "Electrical" },
          { value: "hvac", label: "Heating & Cooling" },
          { value: "roofing", label: "Roofing" },
          { value: "handyman", label: "General Handyman" },
        ],
      },
      {
        key: "budget",
        label: "What's your budget?",
        type: "select",
        required: true,
        options: BUDGET_OPTIONS,
      },
      {
        key: "urgency",
        label: "How soon do you need it?",
        type: "select",
        required: true,
        options: URGENCY_OPTIONS,
      },
      {
        key: "location",
        label: "Where are you located?",
        type: "select",
        required: true,
        options: [
          { value: "austin_central", label: "Austin — Central" },
          { value: "austin_north", label: "Austin — North" },
          { value: "austin_south", label: "Austin — South" },
          { value: "round_rock", label: "Round Rock" },
        ],
      },
    ],
  },
  {
    id: EVENTLY_QSET,
    tenant_id: EVENTLY_ID,
    version: 1,
    questions: [
      {
        key: "job_type",
        label: "Which vendor are you looking for?",
        help: "We'll match specialists for your event.",
        type: "multiselect",
        required: true,
        options: [
          { value: "catering", label: "Catering" },
          { value: "photography", label: "Photography" },
          { value: "venue", label: "Venue" },
          { value: "floral", label: "Floral & Décor" },
          { value: "dj_music", label: "DJ / Live Music" },
        ],
      },
      {
        key: "budget",
        label: "What's your vendor budget?",
        type: "select",
        required: true,
        options: BUDGET_OPTIONS,
      },
      {
        key: "urgency",
        label: "When is your event?",
        type: "select",
        required: true,
        options: [
          { value: "emergency", label: "Last minute (within days)" },
          { value: "this_week", label: "This week" },
          { value: "this_month", label: "This month" },
          { value: "flexible", label: "Months out — flexible" },
        ],
      },
      {
        key: "location",
        label: "Where's the event?",
        type: "select",
        required: true,
        options: [
          { value: "austin_central", label: "Austin — Downtown" },
          { value: "austin_north", label: "Austin — North" },
          { value: "hill_country", label: "Hill Country" },
          { value: "round_rock", label: "Round Rock" },
        ],
      },
    ],
  },
];

export const DEFAULT_TENANT_SLUG = "homepro";

export function fallbackTenant(slug?: string | null): Tenant {
  return TENANTS.find((t) => t.slug === slug) ?? TENANTS[0];
}

export function fallbackQuestionSet(tenantId: string): QuestionSet {
  return QUESTION_SETS.find((q) => q.tenant_id === tenantId) ?? QUESTION_SETS[0];
}
