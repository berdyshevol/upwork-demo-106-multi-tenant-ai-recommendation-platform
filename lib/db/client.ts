import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

/**
 * postgres.js + Drizzle clients for the Neon `adviso_106` database.
 *
 * Two roles, two connections:
 *  • getAppDb()   — role `adviso_app_rls` on the POOLED endpoint. NOT the table
 *                   owner, so RLS applies. Every request-path query goes through
 *                   here (via withTenant for tenant-scoped tables).
 *  • getAdminDb() — role `neondb_owner` on the DIRECT endpoint. Owns the tables,
 *                   so it bypasses RLS — seed/ingest only, never the request path.
 *
 * Both are lazy: importing this module never opens a connection, so the codebase
 * still loads (and the hermetic test suite still runs against the seed fallback)
 * when no DB env is set. `prepare: false` is required on the pooled endpoint
 * (PgBouncer transaction mode does not support prepared statements).
 */

type DB = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as {
  __appSql?: Sql;
  __adminSql?: Sql;
  __appDb?: DB;
  __adminDb?: DB;
};

function connect(url: string, key: "__appSql" | "__adminSql"): Sql {
  return g[key] ?? (g[key] = postgres(url, { prepare: false, max: 5, idle_timeout: 20 }));
}

export function getAppDb(): DB {
  const url = process.env.APP_DATABASE_URL;
  if (!url) throw new Error("APP_DATABASE_URL is not set");
  return g.__appDb ?? (g.__appDb = drizzle(connect(url, "__appSql"), { schema }));
}

export function getAdminDb(): DB {
  const url = process.env.ADMIN_DATABASE_URL;
  if (!url) throw new Error("ADMIN_DATABASE_URL is not set");
  return g.__adminDb ?? (g.__adminDb = drizzle(connect(url, "__adminSql"), { schema }));
}

export { schema };
