// Apply the SQL migrations in drizzle/ against the Neon `adviso_106` database.
//
// Runs under ADMIN_DATABASE_URL (role neondb_owner, the table owner) on the
// DIRECT endpoint — DDL + the role grants need a session connection, and the
// owner is the only role allowed to create the extension / functions / policies.
//
//   npm run migrate     (tsx --env-file=.env.local scripts/migrate.ts)

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));
const drizzleDir = join(__dirname, "..", "drizzle");

async function main() {
  const url = process.env.ADMIN_DATABASE_URL;
  if (!url) throw new Error("ADMIN_DATABASE_URL is not set (role neondb_owner, direct endpoint).");

  const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) throw new Error(`No .sql migrations in ${drizzleDir}`);

  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    for (const file of files) {
      console.log(`Applying ${file}…`);
      await sql.unsafe(readFileSync(join(drizzleDir, file), "utf-8"));
    }

    const tables = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `;
    console.log("Tables:", tables.map((t) => t.table_name).join(", ") || "(none)");

    const policies = await sql<{ count: string }[]>`
      select count(*)::text as count from pg_policies where schemaname = 'public'
    `;
    console.log(`RLS policies: ${policies[0]?.count ?? "0"}`);

    const grants = await sql<{ privilege_type: string; table_name: string }[]>`
      select privilege_type, table_name from information_schema.role_table_grants
      where grantee = 'adviso_app_rls' order by table_name, privilege_type
    `;
    console.log(
      "adviso_app_rls grants:",
      grants.map((g) => `${g.table_name}:${g.privilege_type}`).join(", ") || "(none)",
    );
    console.log("Migration complete.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
