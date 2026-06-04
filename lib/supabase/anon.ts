import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Anonymous, RLS-scoped client.
 *
 * Every request carries an `x-tenant-id` header. The RLS policies (see the
 * migration) only expose rows whose `tenant_id` matches that header, so this
 * client physically cannot read another tenant's providers, chunks, or leads —
 * even though it talks to one shared database. Passing the wrong id (or none)
 * yields zero rows, which is exactly what the cross-tenant isolation test asserts.
 */
export function supabaseAnon(tenantId: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase anon env (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) missing");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-tenant-id": tenantId } },
  });
}
