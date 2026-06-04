import { test, expect } from "@playwright/test";

/**
 * Multi-tenant proof: the SAME build serves two advisors that differ only in
 * config — different brand name and a different question set (different job-type
 * options). No code path is tenant-specific.
 */
test("tenant A and tenant B differ in branding and questions", async ({ page }) => {
  await page.goto("/?tenant=homepro");
  const brandA = await page.getByTestId("brand-name").textContent();
  await expect(page.getByTestId("option-job_type-plumbing")).toBeVisible();
  // HomePro has no "catering" option.
  expect(await page.getByTestId("option-job_type-catering").count()).toBe(0);

  await page.goto("/?tenant=evently");
  const brandB = await page.getByTestId("brand-name").textContent();
  await expect(page.getByTestId("option-job_type-catering")).toBeVisible();
  expect(await page.getByTestId("option-job_type-plumbing").count()).toBe(0);

  expect(brandA).toBeTruthy();
  expect(brandB).toBeTruthy();
  expect(brandA).not.toEqual(brandB);
});
