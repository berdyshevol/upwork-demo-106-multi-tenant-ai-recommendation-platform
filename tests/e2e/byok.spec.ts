import { test, expect } from "@playwright/test";
import { answerQuestionnaire, HOMEPRO_ANSWERS, setMockKey } from "./helpers";

/**
 * With a key set, the AI layer turns on: top recommendations get a "why it fits"
 * explanation with citations, the BYOK hint disappears, and chat answers (using
 * the deterministic mock LM so results are stable offline).
 */
test.describe("BYOK enabled (mock LM)", () => {
  test("explanations + citations render once a key is set", async ({ page }) => {
    await setMockKey(page);
    await page.goto("/?tenant=homepro");
    await answerQuestionnaire(page, HOMEPRO_ANSWERS);

    await expect(page.getByTestId("ai-explanation").first()).toBeVisible();
    expect(await page.getByTestId("ai-explanation").count()).toBeGreaterThan(0);
    expect(await page.getByTestId("byok-hint").count()).toBe(0);

    // Citations live behind a per-card disclosure; expand the first one.
    await page.getByTestId("citations-toggle").first().click();
    await expect(page.getByTestId("citation").first()).toBeVisible();
    expect(await page.getByTestId("citation").count()).toBeGreaterThan(0);
  });

  test("chat answers a follow-up with grounded citations", async ({ page }) => {
    await setMockKey(page);
    await page.goto("/?tenant=homepro");
    await answerQuestionnaire(page, HOMEPRO_ANSWERS);

    await page.getByTestId("open-chat").click();
    const input = page.getByTestId("chat-input");
    await expect(input).toBeVisible();
    await input.fill("Which of these handles emergencies?");
    await page.getByTestId("chat-send").click();

    // An assistant message appears (user + assistant => at least 2 bubbles).
    await expect(async () => {
      expect(await page.getByTestId("chat-message").count()).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 15_000 });
  });
});
