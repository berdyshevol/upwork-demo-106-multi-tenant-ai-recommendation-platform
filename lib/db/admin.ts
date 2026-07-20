import { getAdminDb } from "./client";

/**
 * Owner-role (`neondb_owner`) Drizzle client. Owns the tables, so it BYPASSES
 * RLS by design — the analogue of Supabase's service_role. Use ONLY for trusted
 * server-side writes (seed / ingest). NEVER on the request path: reaching for
 * this instead of withTenant would silently defeat tenant isolation.
 */
export { getAdminDb };
