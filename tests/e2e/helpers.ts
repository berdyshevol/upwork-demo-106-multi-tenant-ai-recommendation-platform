import { type Page, expect } from "@playwright/test";

/** A deterministic, valid set of HomePro answers. */
export const HOMEPRO_ANSWERS = {
  job_type: "plumbing",
  budget: "500_2000",
  urgency: "emergency",
  location: "austin_central",
};

/** Click through a tenant's questionnaire by option testid and submit. */
export async function answerQuestionnaire(
  page: Page,
  answers: Record<string, string>,
): Promise<void> {
  await expect(page.getByTestId("questionnaire")).toBeVisible();
  for (const [key, value] of Object.entries(answers)) {
    await page.getByTestId(`option-${key}-${value}`).click();
  }
  const submit = page.getByTestId("get-recommendations");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByTestId("results")).toBeVisible();
}

/** Store an encrypted BYOK key cookie in the browser context via the API. */
export async function setMockKey(page: Page): Promise<void> {
  const res = await page.request.post("/api/settings/key", {
    data: { key: "sk-mock-000000000000000000000000" },
  });
  expect(res.ok()).toBeTruthy();
}
