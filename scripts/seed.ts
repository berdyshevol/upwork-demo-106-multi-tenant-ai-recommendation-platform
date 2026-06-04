/**
 * CLI seeder — `pnpm seed`.
 *
 * Loads .env.local / .env, then runs the same idempotent ingestion the admin
 * route uses. Run this once after `supabase db push` to populate the database.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { runSeed } = await import("../lib/seed");
  const result = await runSeed(process.env.OPENAI_API_KEY ?? null);
  console.log("Seed complete:", result);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
