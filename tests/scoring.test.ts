import { test } from "node:test";
import assert from "node:assert/strict";
import { rankProviders, scoreProvider, WEIGHTS } from "../lib/scoring";
import type { Answers, Provider } from "../lib/types";

/**
 * Unit tests for the deterministic scoring engine. Run with `pnpm test:unit`.
 * These pin the engine's contract: weights sum to 1, an exact-match provider
 * beats a poor one, and ranking is stable/deterministic.
 */

function provider(over: Partial<Provider>): Provider {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    tenant_id: "11111111-1111-4111-8111-111111111111",
    name: "Test",
    blurb: "",
    services: ["plumbing"],
    price_tier: 2,
    service_areas: ["austin_central"],
    available_emergency: true,
    response_time_hours: 2,
    rating: 4.5,
    years_experience: 10,
    ...over,
  };
}

test("weights sum to 1", () => {
  const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum to ${sum}`);
});

test("perfect match scores higher than poor match", () => {
  const answers: Answers = {
    job_type: ["plumbing"],
    budget: "500_2000",
    urgency: "emergency",
    location: "austin_central",
  };
  const perfect = provider({
    id: "00000000-0000-4000-8000-000000000001",
    name: "Perfect",
    services: ["plumbing"],
    price_tier: 2,
    service_areas: ["austin_central"],
    available_emergency: true,
  });
  const poor = provider({
    id: "00000000-0000-4000-8000-000000000002",
    name: "Poor",
    services: ["roofing"],
    price_tier: 4,
    service_areas: ["round_rock"],
    available_emergency: false,
  });
  const ps = scoreProvider(perfect, answers).total;
  const qs = scoreProvider(poor, answers).total;
  assert.ok(ps > qs, `${ps} should beat ${qs}`);
  assert.ok(ps >= 90, `perfect match should be high, got ${ps}`);
});

test("ranking is deterministic and sorted desc", () => {
  const answers: Answers = { job_type: ["hvac"], budget: "2000_10000", urgency: "this_week", location: "austin_north" };
  const providers = [
    provider({ id: "00000000-0000-4000-8000-00000000000a", name: "A", services: ["hvac"], service_areas: ["austin_north"], price_tier: 3 }),
    provider({ id: "00000000-0000-4000-8000-00000000000b", name: "B", services: ["plumbing"], service_areas: ["round_rock"], price_tier: 1 }),
    provider({ id: "00000000-0000-4000-8000-00000000000c", name: "C", services: ["hvac", "electrical"], service_areas: ["austin_north"], price_tier: 3 }),
  ];
  const r1 = rankProviders(providers, answers).map((s) => s.providerId);
  const r2 = rankProviders(providers, answers).map((s) => s.providerId);
  assert.deepEqual(r1, r2, "two runs must match");
  const scores = rankProviders(providers, answers).map((s) => s.total);
  for (let i = 1; i < scores.length; i++) assert.ok(scores[i - 1] >= scores[i]);
});

test("produces human-readable reasons", () => {
  const answers: Answers = { job_type: ["plumbing"], budget: "500_2000", urgency: "emergency", location: "austin_central" };
  const { reasons } = scoreProvider(provider({}), answers);
  assert.ok(reasons.length >= 3, "should explain at least 3 dimensions");
  assert.ok(reasons.some((r) => /emergenc/i.test(r)), "should mention emergency availability");
});
