import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
  vector,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { EMBED_DIM } from "@/lib/types";

/**
 * Drizzle schema — the runtime query contract for the Neon `adviso_106` database.
 *
 * Column *keys* are snake_case on purpose: they mirror the domain types in
 * `lib/types.ts` (Provider, QuestionSet, …), so a plain `select()` returns rows
 * that already match those shapes — no key remapping in the data layer.
 *
 * NOTE: `numeric` columns (rating, response_time_hours) come back from postgres.js
 * as *strings*. The data layer must coerce them to `number` before returning a
 * Provider (the domain type / zod schema expects numbers). This differs from the
 * old Supabase/PostgREST path, which returned them as numbers.
 *
 * This file is the source of truth for QUERIES. The actual DDL (extension, RLS
 * policies, role grants, the match_provider_chunks function, index ordering) is
 * hand-authored in `drizzle/0001_init.sql`, because those are things drizzle-kit
 * does not generate. The DB-aware tests guard against the two drifting apart.
 */

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  logo_emoji: text("logo_emoji").notNull().default("✨"),
  theme: jsonb("theme").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const question_sets = pgTable(
  "question_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    questions: jsonb("questions").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ tenant_version: unique().on(t.tenant_id, t.version) }),
);

export const providers = pgTable(
  "providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    blurb: text("blurb").notNull(),
    services: text("services").array().notNull().default([]),
    price_tier: integer("price_tier").notNull(),
    service_areas: text("service_areas").array().notNull().default([]),
    available_emergency: boolean("available_emergency").notNull().default(false),
    response_time_hours: numeric("response_time_hours").notNull().default("48"),
    rating: numeric("rating").notNull().default("0"),
    years_experience: integer("years_experience").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ tenant_idx: index("providers_tenant_idx").on(t.tenant_id) }),
);

export const provider_chunks = pgTable(
  "provider_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider_id: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: EMBED_DIM }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenant_idx: index("provider_chunks_tenant_idx").on(t.tenant_id),
    provider_idx: index("provider_chunks_provider_idx").on(t.provider_id),
  }),
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    answers: jsonb("answers").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ tenant_idx: index("leads_tenant_idx").on(t.tenant_id) }),
);

export const recommendations = pgTable(
  "recommendations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    lead_id: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    provider_id: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    score: numeric("score").notNull(),
    breakdown: jsonb("breakdown").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ tenant_idx: index("recommendations_tenant_idx").on(t.tenant_id) }),
);
