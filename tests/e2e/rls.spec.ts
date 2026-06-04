import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { HOMEPRO_ID, EVENTLY_ID } from "../../lib/tenants";

/**
 * RLS isolation: the anon role only ever sees rows for the tenant in its
 * `x-tenant-id` header. A client scoped to tenant A cannot read tenant B's
 * providers, even hitting the same shared database.
 *
 * Requires a live Supabase (env present) AND a seeded DB. Skips otherwise so the
 * hermetic suite still goes green; run against the cloud project to verify.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test.describe("RLS cross-tenant isolation", () => {
  test.skip(!url || !anonKey, "Supabase env not set — skipping live RLS check");

  test("anon client scoped to tenant A cannot read tenant B providers", async () => {
    const clientA = createClient(url!, anonKey!, {
      global: { headers: { "x-tenant-id": HOMEPRO_ID } },
      auth: { persistSession: false },
    });
    const clientB = createClient(url!, anonKey!, {
      global: { headers: { "x-tenant-id": EVENTLY_ID } },
      auth: { persistSession: false },
    });

    const aSeesA = await clientA.from("providers").select("id, tenant_id");
    const aSeesB = await clientA.from("providers").select("id").eq("tenant_id", EVENTLY_ID);
    const bSeesB = await clientB.from("providers").select("id, tenant_id");

    // Tenant A sees only its own rows…
    expect((aSeesA.data ?? []).every((r) => r.tenant_id === HOMEPRO_ID)).toBeTruthy();
    // …and literally zero of tenant B's, even when asking for them by id.
    expect((aSeesB.data ?? []).length).toBe(0);
    // Tenant B sees its own.
    expect((bSeesB.data ?? []).length).toBeGreaterThan(0);
    expect((bSeesB.data ?? []).every((r) => r.tenant_id === EVENTLY_ID)).toBeTruthy();
  });
});
