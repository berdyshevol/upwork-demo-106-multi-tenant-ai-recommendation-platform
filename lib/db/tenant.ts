import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getAppDb } from "./client";
import type * as schema from "./schema";

type DB = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/**
 * Run `fn` inside one transaction with the tenant GUC set, under the limited
 * `adviso_app_rls` role. RLS policies read `app.tenant_id` via
 * request_tenant_id(), so queries in `fn` physically cannot read or write
 * another tenant's rows — even a query that forgets its WHERE clause.
 *
 * We use `set_config('app.tenant_id', $1, true)` rather than
 * `SET LOCAL app.tenant_id = $1`: plain SET does not accept bind parameters,
 * set_config does — keeping the tenant id parameterised (no injection). The
 * `is_local = true` flag scopes it to this transaction, so it can never leak
 * onto the next request that reuses the same pooled connection.
 */
export function withTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getAppDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
    return fn(tx);
  });
}
