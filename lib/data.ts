import { desc, eq } from "drizzle-orm";
import type { Provider, QuestionSet, Tenant } from "./types";
import { fallbackQuestionSet, fallbackTenant, TENANTS } from "./tenants";
import { SEED_PROVIDERS } from "./seed-data";
import { getAppDb } from "./db/client";
import { withTenant } from "./db/tenant";
import { leads, providers as providersTable, question_sets, tenants } from "./db/schema";

/**
 * Data-access layer.
 *
 * Prefers Neon (Drizzle + postgres.js) when it's configured (the production path,
 * which exercises RLS and pgvector). When the DB env is absent — local dev,
 * hermetic Playwright runs, a fresh clone — it transparently falls back to the
 * in-repo seed data so every non-AI feature still works with zero infrastructure.
 * The UI never knows the difference.
 *
 * Public tables (tenants, question_sets) carry an RLS policy `using(true)`, so
 * they're read with a plain Drizzle select via getAppDb(). Tenant-scoped tables
 * (providers, leads) run inside withTenant() so the `app.tenant_id` GUC drives
 * RLS and a query physically cannot touch another tenant's rows.
 *
 * postgres.js returns Postgres `numeric` columns (rating, response_time_hours) as
 * STRINGS, so the provider mapper coerces them to numbers to satisfy the zod
 * Provider schema.
 */

export function isDbConfigured(): boolean {
  return Boolean(process.env.APP_DATABASE_URL);
}

export async function loadTenantBySlug(slug: string): Promise<Tenant> {
  if (!isDbConfigured()) return fallbackTenant(slug);
  try {
    const rows = await getAppDb()
      .select({
        id: tenants.id,
        slug: tenants.slug,
        name: tenants.name,
        tagline: tenants.tagline,
        logo_emoji: tenants.logo_emoji,
        theme: tenants.theme,
      })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) return fallbackTenant(slug);
    // tenants has no question_set_id column; resolve it from the fallback mapping.
    const fb = fallbackTenant(slug);
    return { ...(row as unknown as Tenant), question_set_id: fb.question_set_id };
  } catch {
    return fallbackTenant(slug);
  }
}

export function allTenantSlugs(): string[] {
  return TENANTS.map((t) => t.slug);
}

export async function loadQuestionSet(tenant: Tenant): Promise<QuestionSet> {
  if (!isDbConfigured()) return fallbackQuestionSet(tenant.id);
  try {
    const rows = await getAppDb()
      .select({
        id: question_sets.id,
        tenant_id: question_sets.tenant_id,
        version: question_sets.version,
        questions: question_sets.questions,
      })
      .from(question_sets)
      .where(eq(question_sets.tenant_id, tenant.id))
      .orderBy(desc(question_sets.version))
      .limit(1);
    const row = rows[0];
    if (!row) return fallbackQuestionSet(tenant.id);
    return row as unknown as QuestionSet;
  } catch {
    return fallbackQuestionSet(tenant.id);
  }
}

function seedProvidersFor(tenantId: string): Provider[] {
  return SEED_PROVIDERS.filter((p) => p.tenant_id === tenantId).map(({ docs: _docs, ...p }) => p);
}

/** Coerce a raw providers row (numeric columns arrive as strings) into a Provider. */
function toProvider(row: {
  id: string;
  tenant_id: string;
  name: string;
  blurb: string;
  services: string[];
  price_tier: number;
  service_areas: string[];
  available_emergency: boolean;
  response_time_hours: string;
  rating: string;
  years_experience: number;
}): Provider {
  return {
    ...row,
    response_time_hours: Number(row.response_time_hours),
    rating: Number(row.rating),
  };
}

/** Load providers for a tenant — RLS-scoped via withTenant when live. */
export async function loadProviders(tenant: Tenant): Promise<Provider[]> {
  if (!isDbConfigured()) return seedProvidersFor(tenant.id);
  try {
    const rows = await withTenant(tenant.id, (tx) =>
      tx
        .select({
          id: providersTable.id,
          tenant_id: providersTable.tenant_id,
          name: providersTable.name,
          blurb: providersTable.blurb,
          services: providersTable.services,
          price_tier: providersTable.price_tier,
          service_areas: providersTable.service_areas,
          available_emergency: providersTable.available_emergency,
          response_time_hours: providersTable.response_time_hours,
          rating: providersTable.rating,
          years_experience: providersTable.years_experience,
        })
        .from(providersTable),
    );
    if (rows.length === 0) return seedProvidersFor(tenant.id);
    return rows.map(toProvider);
  } catch {
    return seedProvidersFor(tenant.id);
  }
}

/** Persist a lead; returns its id (or null when running without a DB). */
export async function saveLead(tenantId: string, answers: unknown): Promise<string | null> {
  if (!isDbConfigured()) return null;
  try {
    const rows = await withTenant(tenantId, (tx) =>
      tx
        .insert(leads)
        .values({ tenant_id: tenantId, answers: answers as never })
        .returning({ id: leads.id }),
    );
    const id = rows[0]?.id;
    return typeof id === "string" ? id : null;
  } catch {
    return null;
  }
}
