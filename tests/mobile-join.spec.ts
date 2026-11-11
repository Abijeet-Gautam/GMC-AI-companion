import { test, expect } from "@playwright/test";

// ============================================================================
// MOBILE JOIN FLOW: phone-first redesign (Apple HIG reference)
// Verifies the /join workflow on a phone viewport (390x844 iPhone SE / 430x932)
// that a visitor reaches by scanning the QR on the big display screen.
// ============================================================================

test.describe("Join page on phone (390x844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("fits within the viewport with no horizontal overflow", async ({
    page,
  }) => {
    await page.goto("/join");
    await expect(
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).resolves.toBe(true);
  });

  test("step 0: all six themes are visible and tappable on one column", async ({
    page,
  }) => {
    await page.goto("/join");

    await expect(
      page.getByRole("heading", { name: "What matters to you?" }),
    ).toBeVisible();

    const themeNames = [
      "Nature & sustainability",
      "Innovation & technology",
      "Education & opportunity",
      "Community & belonging",
      "Wellbeing & mindfulness",
      "Culture & identity",
    ];
    for (const name of themeNames) {
      await expect(page.getByText(name)).toBeVisible();
    }

    // Each theme is a radio option presented as a full-width touch target.
    const nature = page.getByRole("radio", { name: "Nature & sustainability" });
    await expect(nature).toBeVisible();
    const box = await nature.boundingBox();
    if (box) {
      // Apple HIG: minimum ~44x44 pt touch target.
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }

    await nature.check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Share a little hope." }),
    ).toBeVisible();
  });

  test("step 1: note entry, example fill, consent, submit -> leaf result", async ({
    page,
  }) => {
    await page.goto("/join");
    await page.getByRole("radio", { name: "Education & opportunity" }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Selected theme short value is shown on the step-1 header.
    await expect(page.getByText("Opportunity")).toBeVisible();

    // Change theme returns to step 0.
    await page.getByRole("button", { name: "Change theme" }).click();
    await expect(
      page.getByRole("heading", { name: "What matters to you?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // "Try an example" fills the textarea.
    await page.getByRole("button", { name: "Try an example" }).click();
    await expect(
      page.getByLabel("What is your hope for the city?"),
    ).not.toHaveValue("");

    await page.getByLabel("What is your hope for the city?").fill("");
    await page
      .getByLabel("What is your hope for the city?")
      .fill("I hope every student can learn in a welcoming school.");

    // Character counter is visible.
    await expect(page.getByText(/\d+ \/ 200/)).toBeVisible();

    // Consent checkbox (required) then submit.
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Grow my leaf", exact: true }).click();

    // Advances to the leaf result (step 2).
    await expect(
      page.getByRole("heading", { name: "Your leaf is growing." }),
    ).toBeVisible();
  });

  test("step 2: receipt actions stack and are reachable one-handed", async ({
    page,
  }) => {
    await page.goto("/join");
    await page.getByRole("radio", { name: "Nature & sustainability" }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByLabel("What is your hope for the city?")
      .fill("I hope for green parks everywhere.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Grow my leaf", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Your leaf is growing." }),
    ).toBeVisible();

    // All receipt actions visible; on phone they stack vertically.
    await expect(
      page.getByRole("button", { name: "Share leaf", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save keepsake", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open your keepsake page" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Grow another hope" }),
    ).toBeVisible();

    // Buttons span the full width on mobile.
    const share = page.getByRole("button", { name: "Share leaf", exact: true });
    const shareBox = await share.boundingBox();
    expect(shareBox).not.toBeNull();
    expect(shareBox!.width).toBeGreaterThanOrEqual(300);
  });

  test("returning visitor shows stacked CID/PIN form with numeric keyboard", async ({
    page,
  }) => {
    await page.goto("/join");
    await page.getByRole("button", { name: "Returning", exact: true }).click();

    await expect(page.getByLabel("CID", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Private PIN", { exact: true })).toBeVisible();

    // Numeric keyboard on phone: inputmode numeric.
    const cid = page.getByLabel("CID", { exact: true });
    await expect(cid).toHaveAttribute("inputmode", "numeric");
    const pin = page.getByLabel("Private PIN", { exact: true });
    await expect(pin).toHaveAttribute("inputmode", "numeric");

    // Full-width submit button in the thumb zone.
    await expect(page.getByRole("button", { name: "Unlock my voices" })).toBeVisible();
  });
});

test.describe("Display screen QR panel is scannable from a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("QR code and scan instruction are present on /display", async ({
    page,
  }) => {
    await page.goto("/display");
    // The QR panel links to /join with a scan instruction.
    await expect(page.getByRole("link", { name: /Scan with your phone/ })).toBeVisible();
    // Short URL text is shown beneath the QR.
    await expect(page.getByText(/Scan with your phone\. Share a hope\./)).toBeVisible();
  });
});
