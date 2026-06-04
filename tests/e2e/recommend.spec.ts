import { test, expect } from "@playwright/test";
import { answerQuestionnaire, HOMEPRO_ANSWERS } from "./helpers";

/**
 * Core flow WITHOUT a key: the deterministic engine must fully work — ranked
 * recommendations with numeric scores — and AI explanations must be gated off
 * behind the BYOK hint.
 */
test.describe("recommendations (no key)", () => {
  test("questionnaire → ranked recommendations with scores", async ({ page }) => {
    await page.goto("/?tenant=homepro");
    await expect(page.getByTestId("brand-name")).toBeVisible();

    await answerQuestionnaire(page, HOMEPRO_ANSWERS);

    const cards = page.getByTestId("provider-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);

    // Each card shows a numeric 0–100 match score.
    const firstScore = await page.getByTestId("match-score").first().textContent();
    expect(firstScore).toMatch(/\d{1,3}/);
  });

  test("AI explanations are gated behind the BYOK hint", async ({ page }) => {
    await page.goto("/?tenant=homepro");
    await answerQuestionnaire(page, HOMEPRO_ANSWERS);

    await expect(page.getByTestId("byok-hint")).toBeVisible();
    expect(await page.getByTestId("ai-explanation").count()).toBe(0);
  });
});
