import { test, expect } from "@playwright/test";

const MOBILE = { width: 390, height: 844 };

test.describe("Join page on phone (390x844)", () => {
  test.use({ viewport: MOBILE });

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

    const nature = page.getByRole("radio", { name: "Nature & sustainability" });
    await expect(nature).toBeVisible();
    const box = await nature.boundingBox();
    if (box) {
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

    await expect(page.getByText("Opportunity")).toBeVisible();

    await page.getByRole("button", { name: "Change theme" }).click();
    await expect(
      page.getByRole("heading", { name: "What matters to you?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await page.getByRole("button", { name: "Try an example" }).click();
    await expect(
      page.getByLabel("What is your hope for the city?"),
    ).not.toHaveValue("");

    await page.getByLabel("What is your hope for the city?").fill("");
    await page
      .getByLabel("What is your hope for the city?")
      .fill("I hope every student can learn in a welcoming school.");

    await expect(page.getByText(/\d+ \/ 200/)).toBeVisible();

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Grow my leaf", exact: true }).click();

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

    const cid = page.getByLabel("CID", { exact: true });
    await expect(cid).toHaveAttribute("inputmode", "numeric");
    const pin = page.getByLabel("Private PIN", { exact: true });
    await expect(pin).toHaveAttribute("inputmode", "numeric");

    await expect(
      page.getByRole("button", { name: "Unlock my voices" }),
    ).toBeVisible();
  });
});

test.describe("Display screen QR panel is scannable from a phone", () => {
  test.use({ viewport: MOBILE });

  test("QR code and scan instruction are present on /display", async ({
    page,
  }) => {
    await page.goto("/display");
    await expect(
      page.getByRole("link", { name: /Scan with your phone/ }),
    ).toBeVisible();
    await expect(
      page.getByText(/Scan with your phone\. Share a hope\./),
    ).toBeVisible();
  });
});
