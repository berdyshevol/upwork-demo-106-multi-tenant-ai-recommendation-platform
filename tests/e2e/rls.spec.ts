import { test, expect } from "@playwright/test";
import postgres from "postgres";
import { HOMEPRO_ID, EVENTLY_ID } from "../../lib/tenants";

/**
 * RLS cross-tenant isolation — proven at the SQL/engine level on Neon.
 *
 * The limited runtime role `adviso_app_rls` (NOBYPASSRLS) only ever sees rows for
 * the tenant carried in the `app.tenant_id` session GUC. A connection scoped to
 * tenant A cannot read tenant B's providers, nor insert a lead for B — even
 * hitting the same shared database. This is Option B's core guarantee: isolation
 * is enforced by Postgres, not by application WHERE clauses.
 *
 * Requires APP_DATABASE_URL (adviso_app_rls) + ADMIN_DATABASE_URL (neondb_owner).
 * Skips otherwise, so the hermetic suite still goes green; run with
 * `--env-file=.env.local` against live Neon to verify.
 */
const hasDbEnv = Boolean(process.env.APP_DATABASE_URL && process.env.ADMIN_DATABASE_URL);

const PROBE_A = "eeee0001-0000-4000-8000-000000000001";
const PROBE_B = "eeee0002-0000-4000-8000-000000000002";

test.describe("RLS cross-tenant isolation (engine-enforced)", () => {
  test.skip(!hasDbEnv, "APP_DATABASE_URL / ADMIN_DATABASE_URL not set — skipping live RLS check");

  test("adviso_app_rls scoped to tenant A cannot read or write tenant B", async () => {
    const admin = postgres(process.env.ADMIN_DATABASE_URL as string, { prepare: false, max: 1 });
    const app = postgres(process.env.APP_DATABASE_URL as string, { prepare: false, max: 1 });
    try {
      // Fixtures (owner bypasses RLS): a tenant + provider on each side.
      for (const [id, slug] of [[HOMEPRO_ID, "homepro"], [EVENTLY_ID, "evently"]] as const) {
        await admin`insert into tenants (id, slug, name, tagline, logo_emoji, theme)
                    values (${id}, ${slug}, ${slug}, 'fixture', '✨', '{}'::jsonb)
                    on conflict (id) do nothing`;
      }
      await admin`delete from providers where id in (${PROBE_A}, ${PROBE_B})`;
      await admin`insert into providers (id, tenant_id, name, blurb, price_tier) values
                  (${PROBE_A}, ${HOMEPRO_ID}, 'Probe-A', 'x', 2),
                  (${PROBE_B}, ${EVENTLY_ID}, 'Probe-B', 'x', 2)`;

      // Scoped to A: sees only A's rows, and zero of B's even when asked by id.
      const aSees = await app.begin(async (tx) => {
        await tx`select set_config('app.tenant_id', ${HOMEPRO_ID}, true)`;
        const own = await tx<{ tenant_id: string }[]>`select tenant_id from providers`;
        const bById = await tx`select id from providers where tenant_id = ${EVENTLY_ID}`;
        return { own, bById };
      });
      expect(aSees.own.length).toBeGreaterThan(0);
      expect(aSees.own.every((r) => r.tenant_id === HOMEPRO_ID)).toBeTruthy();
      expect(aSees.bById.length).toBe(0);

      // With NO tenant set, the role sees nothing (request_tenant_id() is NULL).
      const blind = await app<{ n: number }[]>`select count(*)::int as n from providers`;
      expect(blind[0].n).toBe(0);

      // The insert policy blocks writing a lead for another tenant.
      let blocked = false;
      try {
        await app.begin(async (tx) => {
          await tx`select set_config('app.tenant_id', ${HOMEPRO_ID}, true)`;
          await tx`insert into leads (tenant_id, answers) values (${EVENTLY_ID}, '{}'::jsonb)`;
        });
      } catch {
        blocked = true;
      }
      expect(blocked).toBeTruthy();
    } finally {
      await admin`delete from providers where id in (${PROBE_A}, ${PROBE_B})`;
      await admin.end();
      await app.end();
    }
  });
});
