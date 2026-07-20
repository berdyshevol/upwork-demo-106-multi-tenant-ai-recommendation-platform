import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config. `lib/db/schema.ts` is the source of truth for QUERIES and
 * for `drizzle-kit studio` / introspection.
 *
 * The applied migration (`drizzle/0001_init.sql`) is hand-authored on purpose:
 * it also creates the `vector` extension (which must exist before the
 * embedding column), the `adviso_106_app` role grants, the RLS policies and the
 * `match_provider_chunks` function — none of which drizzle-kit generates. Run it
 * with `npm run migrate`, not `drizzle-kit migrate`.
 */
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.ADMIN_DATABASE_URL ?? "" },
});
