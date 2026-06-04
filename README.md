# Adviso — multi-tenant AI recommendation platform

A config-driven, multi-tenant recommendation platform. **One codebase** serves
many "advisors" (verticals); adding a vertical means inserting config rows, not
writing code. The live demo seeds two: **HomePro Match** (find the right
home-service contractor) and **Evently Concierge** (find the right event vendor)
— same engine, same Provider schema, different branding and questions.

> **Live demo:** _added after deploy_ · `?tenant=homepro` and `?tenant=evently`
> **Repo:** _added after push_

---

## What it does

1. **Tenant-branded landing.** Brand name, logo, colors, and the question set all
   load from config (`?tenant=` resolves the tenant).
2. **Short questionnaire.** Budget, job type, urgency, location — defined as
   versioned JSON per tenant.
3. **Ranked recommendations.** Each provider gets a **0–100 match score**, a
   plain-English **why it fits**, and **cited snippets** from the provider's docs
   (RAG sources shown inline).
4. **Follow-up chat.** Ask "which of these handles emergencies?" — answered by an
   agent that retrieves from the provider knowledge base and cites its sources.

The deterministic parts (browse, questionnaire, scoring, ranking) work with **no
API key**. The AI parts (explanations, chat) are gated behind **BYOK** — you paste
your own OpenAI key, stored encrypted in an HttpOnly cookie, used only for your
session. The shared demo never bills the owner.

## The hybrid recommendation engine (the centerpiece)

```
answers ─▶ deterministic scorer ─▶ ranked list (always)
                                      │
                          top N ──────┘
                                      ▼
                         LangChain agent (only if a key is present)
                            ├─ tool: retrieve_provider_docs  (pgvector search)
                            └─ tool: score_breakdown         (reads the scores)
                                      ▼
                         validated JSON: whyItFits + standoutFactors + citations
```

- **Deterministic layer** (`lib/scoring.ts`): pure, explainable rule-based scoring
  over structured fields (service match, budget fit, availability, location,
  reputation) with fixed weights. Identical every run — this is what produces the
  ranking. The AI layer **never re-ranks**.
- **AI layer** (`lib/agent.ts`): a LangChain agent with two tools —
  `retrieve_provider_docs` (vector search) and `score_breakdown` (reads the
  deterministic scores). It generates the "why it fits" explanation and answers
  chat follow-ups, with **citations grounded in actually-retrieved chunks** (the
  model writes prose; it cannot invent a source). Output is validated with zod.

## Tech stack

| Layer        | Choice |
|--------------|--------|
| Web          | Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn/ui |
| AI           | LangChain (JS) · OpenAI (`gpt-4o-mini`, BYOK) |
| Data         | Supabase Postgres · **pgvector** · Row-Level Security |
| Embeddings   | Pluggable: deterministic (default, offline) or OpenAI `text-embedding-3-small` |
| Deploy       | Vercel |
| Tests        | Playwright (behavioral) + node:test (unit) |

## Multi-tenant, config-driven

Tenants and their question sets are **data** (`lib/tenants.ts`, seeded into
Postgres). Every tenant shares the four canonical answer keys (`job_type`,
`budget`, `urgency`, `location`) so the scorer stays vertical-agnostic — only the
option labels and branding differ. Adding a third advisor = one tenant row + one
question-set row + its providers. No app code changes.

## BYOK key handling

- Key is validated, **AES-256-GCM encrypted** (`lib/byok.ts`), and stored in an
  **HttpOnly** cookie (`POST /api/settings/key`). It is never returned to the
  browser and never persisted server-side.
- Read and decrypted per-request only when an AI feature runs.
- No key → `/api/chat` returns `428` with `{ code: "NO_KEY" }` and the UI shows an
  inline "add your OpenAI key" hint.

## Embeddings without billing surprises

The demo defaults to a **deterministic** embedder (`EMBEDDINGS_PROVIDER=deterministic`):
a hashing bag-of-tokens vector. RAG retrieval, seeding, and the entire test suite
run **offline, deterministically, and free**. Set `EMBEDDINGS_PROVIDER=openai`
(with `OPENAI_API_KEY` for the seed route) to use real OpenAI embeddings — query
and document vectors then come from the same provider. Either way the
`provider_chunks.embedding` column is a fixed `vector(1536)`.

## Project layout

```
app/
  page.tsx                 tenant-branded server page (resolves ?tenant=)
  api/recommend/route.ts   hybrid engine: deterministic rank (+ AI explain if key)
  api/chat/route.ts        tool-calling RAG agent (BYOK-gated, 428 if no key)
  api/settings/key/route.ts  BYOK: GET status / POST save / DELETE clear
  api/seed/route.ts        admin ingestion (chunk → embed → pgvector)
components/                shadcn UI + questionnaire / results / chat / settings
lib/
  types.ts                 zod contract shared everywhere
  scoring.ts               deterministic engine (unit-tested)
  agent.ts                 LangChain agent + tools + validated output
  retrieval.ts             pgvector RPC, with in-memory fallback
  embeddings.ts            pluggable embedder (deterministic | openai)
  byok.ts                  AES-256-GCM cookie crypto
  tenants.ts / seed-data.ts  config + 16 seeded providers with docs
supabase/migrations/0001_init.sql   schema, pgvector, RLS, match_provider_chunks RPC
tests/                     Playwright behavioral + scoring unit tests
```

> **No-database fallback:** when Supabase env vars are absent, the data layer
> transparently serves the in-repo seed data and retrieves with an in-memory
> vector index — so a fresh clone, local dev, and the hermetic test suite all work
> with zero infrastructure. With Supabase configured, the same code path uses
> Postgres + pgvector + RLS.

## Run it locally

```bash
pnpm install
cp .env.example .env.local      # set BYOK_COOKIE_SECRET (32-byte base64)
pnpm dev                        # works immediately — no DB needed (seed fallback)
```

Add your OpenAI key in the in-app **Settings** panel to enable explanations + chat.

### With a real Supabase

```bash
supabase start                              # local, or use a cloud project
supabase db push                            # applies supabase/migrations/0001_init.sql
# set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
pnpm seed                                   # chunk → embed → store providers
```

## Tests

```bash
pnpm test:unit     # deterministic scoring engine (node:test)
pnpm test          # Playwright behavioral suite (hermetic: no DB, mock LM)
```

The Playwright suite covers: questionnaire → recommendations with scores and
sources; the BYOK gate (no key → AI disabled + hint; key → explanations + chat
via a deterministic mock LM); tenant A vs B branding/questions from one build;
and (against a live, seeded Supabase) RLS preventing cross-tenant reads.

## The Supabase migration

The full schema lives in
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql): it
enables `pgvector`, creates `tenants`, `question_sets`, `providers`,
`provider_chunks (vector(1536))`, `leads`, and `recommendations`, defines the
`match_provider_chunks` RPC (cosine search, tenant- and provider-scoped), and
applies RLS so the anon role only sees rows matching its `x-tenant-id` request
header while the service role (server-only) can seed and write leads.

---

## 60-second "how it works"

1. You open `/?tenant=homepro`. The server resolves the tenant and its question
   set from config and renders the branded page (colors come from the tenant's
   theme as CSS variables).
2. You answer four questions. The browser POSTs them to `/api/recommend`.
3. The **deterministic scorer** ranks all providers by a weighted blend of service
   match, budget fit, availability, location, and reputation — instantly, with
   human-readable reasons. This always works, no key required.
4. If you've added your OpenAI key (Settings → stored encrypted in an HttpOnly
   cookie), the **LangChain agent** runs RAG over the top providers' documents,
   pulling real snippets from pgvector, and writes a validated "why it fits" with
   inline **citations**. It reads the deterministic scores via a tool but never
   changes the ranking.
5. You open **chat** and ask "which of these handles emergencies?". The agent
   calls `retrieve_provider_docs`, finds the providers whose docs state 24/7
   availability, and answers with citations.
6. Switch to `/?tenant=evently` — same build, different advisor: new brand, new
   colors, new question set, different providers. Proof of the single-codebase,
   config-driven claim.
