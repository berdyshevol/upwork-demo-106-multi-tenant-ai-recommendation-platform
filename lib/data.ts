import type { Provider, QuestionSet, Tenant } from "./types";
import { fallbackQuestionSet, fallbackTenant, TENANTS } from "./tenants";
import { SEED_PROVIDERS } from "./seed-data";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseAnon } from "./supabase/anon";

/**
 * Data-access layer.
 *
 * Prefers Supabase when it's configured (the production path, which exercises RLS
 * and pgvector). When Supabase env vars are absent — local dev, hermetic
 * Playwright runs, a fresh clone — it transparently falls back to the in-repo
 * seed data so every non-AI feature still works with zero infrastructure. The UI
 * never knows the difference.
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function loadTenantBySlug(slug: string): Promise<Tenant> {
  if (!isSupabaseConfigured()) return fallbackTenant(slug);
  try {
    const { data, error } = await supabaseAdmin()
      .from("tenants")
      .select("id, slug, name, tagline, logo_emoji, theme, question_set_id:id")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return fallbackTenant(slug);
    // question_set_id is resolved separately below; reuse fallback mapping for it.
    const fb = fallbackTenant(slug);
    return { ...(data as unknown as Tenant), question_set_id: fb.question_set_id };
  } catch {
    return fallbackTenant(slug);
  }
}

export function allTenantSlugs(): string[] {
  return TENANTS.map((t) => t.slug);
}

export async function loadQuestionSet(tenant: Tenant): Promise<QuestionSet> {
  if (!isSupabaseConfigured()) return fallbackQuestionSet(tenant.id);
  try {
    const { data, error } = await supabaseAdmin()
      .from("question_sets")
      .select("id, tenant_id, version, questions")
      .eq("tenant_id", tenant.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return fallbackQuestionSet(tenant.id);
    return data as unknown as QuestionSet;
  } catch {
    return fallbackQuestionSet(tenant.id);
  }
}

function seedProvidersFor(tenantId: string): Provider[] {
  return SEED_PROVIDERS.filter((p) => p.tenant_id === tenantId).map(({ docs: _docs, ...p }) => p);
}

/** Load providers for a tenant — RLS-scoped via the anon client when live. */
export async function loadProviders(tenant: Tenant): Promise<Provider[]> {
  if (!isSupabaseConfigured()) return seedProvidersFor(tenant.id);
  try {
    const { data, error } = await supabaseAnon(tenant.id)
      .from("providers")
      .select(
        "id, tenant_id, name, blurb, services, price_tier, service_areas, available_emergency, response_time_hours, rating, years_experience",
      );
    if (error || !data || data.length === 0) return seedProvidersFor(tenant.id);
    return data as unknown as Provider[];
  } catch {
    return seedProvidersFor(tenant.id);
  }
}

/** Persist a lead; returns its id (or null when running without a DB). */
export async function saveLead(tenantId: string, answers: unknown): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabaseAdmin()
      .from("leads")
      .insert({ tenant_id: tenantId, answers })
      .select("id")
      .single();
    if (error || !data) return null;
    return data.id as string;
  } catch {
    return null;
  }
}
