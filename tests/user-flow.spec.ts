import { test, expect } from "@playwright/test";

// ============================================================================
// USER-FLOW TESTS: Act as real users clicking every button on every page
// ============================================================================

test.describe("Home page - every button and link", () => {
  test("navigates through all header/footer links", async ({ page }) => {
    await page.goto("/");

    // Header links
    await expect(page.getByRole("link", { name: "GM Tree home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "The experience" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Four chambers" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Live tree" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Add a hope" }),
    ).toBeVisible();

    // Footer links
    await expect(
      page.getByRole("link", { name: "Participation & privacy" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Staff console" })).toBeVisible();

    // Hero CTA
    await expect(
      page.getByRole("link", { name: "Grow your leaf" }),
    ).toBeVisible();

    // "Make it part of the story" link
    await expect(
      page.getByRole("link", { name: "Make it part of the story" }),
    ).toBeVisible();

    // Theme chips on home page
    await expect(page.getByText("Nature & sustainability")).toBeVisible();
    await expect(page.getByText("Innovation & technology")).toBeVisible();
    await expect(page.getByText("Education & opportunity")).toBeVisible();
    await expect(page.getByText("Community & belonging")).toBeVisible();
    await expect(page.getByText("Wellbeing & mindfulness")).toBeVisible();
    await expect(page.getByText("Culture & identity")).toBeVisible();
  });

  test("theme chip links navigate to /join with theme param", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Nature & sustainability/ }).click();
    await expect(page).toHaveURL(/join\?theme=nature/);
  });

  test("Grow your leaf CTA navigates to /join", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Grow your leaf" }).click();
    await expect(page).toHaveURL("/join");
  });
});

test.describe("Join page - complete user flow", () => {
  test("step 0: theme selection and continue", async ({ page }) => {
    await page.goto("/join");

    // Verify step 0 elements
    await expect(
      page.getByRole("heading", { name: "What matters to you?" }),
    ).toBeVisible();
    await expect(
      page.getByText("Choose a branch. Your words come next."),
    ).toBeVisible();

    // All 6 theme cards visible
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

    // Select a theme (click radio via card)
    await page.getByRole("radio", { name: "Education & opportunity" }).check();

    // Click Continue
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Should advance to step 1
    await expect(
      page.getByRole("heading", { name: "Share a little hope." }),
    ).toBeVisible();
  });

  test("step 1: note entry, example fill, consent, submit", async ({ page }) => {
    await page.goto("/join");
    // Select a theme first so the chip shows it
    await page.getByRole("radio", { name: "Education & opportunity" }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Theme chip shows selected theme short value "Opportunity"
    await expect(page.getByText("Opportunity")).toBeVisible();

    // "Change theme" button works
    await page.getByRole("button", { name: "Change theme" }).click();
    await expect(
      page.getByRole("heading", { name: "What matters to you?" }),
    ).toBeVisible();

    // Go back to step 1
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Try an example fills the textarea
    await page.getByRole("button", { name: "Try an example" }).click();
    await expect(
      page.getByLabel("What is your hope for the city?"),
    ).not.toHaveValue("");

    // Clear it
    await page.getByLabel("What is your hope for the city?").fill("");

    // Fill a note manually
    await page
      .getByLabel("What is your hope for the city?")
      .fill("I hope every student can learn in a welcoming school.");

    // Character counter updates
    await expect(page.getByText(/\d+ \/ 200/)).toBeVisible();

    // Check consent
    await page.getByRole("checkbox").check();

    // Submit
    await page.getByRole("button", { name: "Grow my leaf", exact: true }).click();

    // Should advance to step 2 (result)
    await expect(
      page.getByRole("heading", { name: "Your leaf is growing." }),
    ).toBeVisible();
  });

  test("step 2: result page - every button", async ({ page }) => {
    await page.goto("/join");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByLabel("What is your hope for the city?")
      .fill("I hope every student can learn in a welcoming school.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Grow my leaf", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Your leaf is growing." }),
    ).toBeVisible();

    // All result buttons visible
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

    // Chamber recommendation
    await expect(
      page.locator("p.mb-1.text-xs.font-medium.text-foreground\\/65"),
    ).toContainText("Your next stop");
    await expect(page.getByText("Explore the chambers")).toBeVisible();
  });

  test("step 1: privacy details visible", async ({ page }) => {
    await page.goto("/join");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    // Privacy details is on step 1
    await expect(
      page.getByText("Privacy & how this works"),
    ).toBeVisible();
  });

  test("grow another hope resets to step 0", async ({ page }) => {
    await page.goto("/join");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByLabel("What is your hope for the city?")
      .fill("I hope for more nature in our city.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Grow my leaf", exact: true }).click();

    await page.getByRole("button", { name: "Grow another hope" }).click();
    await expect(
      page.getByRole("heading", { name: "What matters to you?" }),
    ).toBeVisible();
  });

  test("offline notice not shown initially", async ({ page }) => {
    await page.goto("/join");
    await expect(
      page.getByText("You're offline."),
    ).not.toBeVisible();
  });

  test("Returning visitor shows CID/PIN form", async ({ page }) => {
    await page.goto("/join");
    await page.getByRole("button", { name: "Returning", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Unlock my voices" }),
    ).toBeVisible();
    // open starts true, so CID form is already visible
    await expect(page.getByLabel("CID", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Private PIN", { exact: true })).toBeVisible();
  });
});

test.describe("Leaf result / keepsake page - every button", () => {
  test("keepsake page renders with all buttons", async ({ page }) => {
    // First create a leaf via API with valid UUID idempotency key
    const response = await page.request.post("/api/contributions", {
      data: {
        aspiration: "I hope for green parks everywhere.",
        theme: "nature",
        consent: true,
        idempotencyKey: crypto.randomUUID(),
        visitor_type: "first",
      },
    });
    const body = await response.json();
    if (response.status() !== 201) {
      console.log("API error:", response.status(), JSON.stringify(body));
    }
    expect(response.status()).toBe(201);
    const receipt = await response.json();
    const leafId = receipt.leaf.id;

    await page.goto(`/leaf/${leafId}`);

    await expect(
      page.getByRole("heading", { name: "One leaf. A shared future." }),
    ).toBeVisible();

    // All keepsake buttons (on keepsake page, "Open your keepsake page" is
    // not shown since you're already on it; instead "Grow your own leaf" is shown)
    await expect(
      page.getByRole("button", { name: "Share leaf", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save keepsake", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Grow your own leaf" }),
    ).toBeVisible();

    // Grow your own leaf navigates to /join
    await page.getByRole("link", { name: "Grow your own leaf" }).click();
    await expect(page).toHaveURL("/join");
  });
});

test.describe("Voices page - visitor history flow", () => {
  test("voices page loads", async ({ page }) => {
    await page.goto("/voices");
    await expect(page.getByRole("heading", { name: "Your previous voices" })).toBeVisible();
  });

  test("CID/PIN form is accessible from join page", async ({ page }) => {
    await page.goto("/join");
    await page.getByRole("button", { name: "Returning", exact: true }).click();
    await expect(page.getByLabel("CID", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Private PIN", { exact: true })).toBeVisible();
  });
});

test.describe("Chambers page - every link and button", () => {
  test("all chamber sections and theme chips work", async ({ page }) => {
    await page.goto("/chambers");

    // All 4 chamber headings visible (actual names, not "Chamber X")
    await expect(
      page.getByRole("heading", { name: "Immersive Experience Room", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "3D Model Mapping", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "8 Business Sectors", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Life in Gelephu Mindfulness City", exact: true }),
    ).toBeVisible();

    // "What future will you grow?" button
    await expect(
      page.getByRole("link", { name: "What future will you grow?" }),
    ).toBeVisible();

    // Theme chips link to /join
    await page.getByRole("link", { name: /Nature/ }).click();
    await expect(page).toHaveURL(/join\?theme=/);
  });

  test("chamber map and route details work", async ({ page }) => {
    await page.goto("/chambers");
    await expect(page.getByText("From reception, look for the entrance")).toBeVisible();
  });
});

test.describe("Admin console - staff flow", () => {
  test("admin login page loads with all elements", async ({ page }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Care for the canopy." }),
    ).toBeVisible();
    await expect(page.getByLabel("Staff password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the tree" })).toBeVisible();
  });
});

test.describe("Tree studio - every button", () => {
  test("tree studio page loads with all controls", async ({ page }) => {
    await page.goto("/tree");

    // Species buttons
    await expect(page.getByRole("button", { name: "Oak" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pine" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cypress" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Willow" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bush" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Spooky" })).toBeVisible();

    // Palette buttons
    await expect(page.getByRole("button", { name: "Blossom" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Spring" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Autumn" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Frost" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Night" })).toBeVisible();

    // Bottom buttons (correct accessible names from aria-labels)
    await expect(page.getByRole("button", { name: "New tree seed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset studio view" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download tree image" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download tree model" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download tree configuration" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Import tree configuration file" })).toBeVisible();

    // Save button (sign in as staff to save)
    await expect(
      page.getByText("Sign in as staff to save"),
    ).toBeVisible();
  });

  test("species and palette buttons change settings", async ({ page }) => {
    await page.goto("/tree");

    // Click a different species
    await page.getByRole("button", { name: "Pine" }).click();
    await expect(page.getByRole("button", { name: "Pine" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Click a different palette
    await page.getByRole("button", { name: "Night" }).click();
    await expect(page.getByRole("button", { name: "Night" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // New tree seed button
    await page.getByRole("button", { name: "New tree seed" }).click();

    // Reset studio view button
    await page.getByRole("button", { name: "Reset studio view" }).click();

    // Preview count stage buttons
    await page.getByRole("button", { name: "Bare" }).click();
    await page.getByRole("button", { name: "24" }).click();
    await page.getByRole("button", { name: "Use live count" }).click();
  });
});

test.describe("Display page - tree renders", () => {
  test("display page loads with tree", async ({ page }) => {
    await page.goto("/display");
    await expect(page.locator(".procedural-tree")).toBeVisible();
  });
});

test.describe("Full end-to-end user journey", () => {
  test("complete journey: home -> join -> grow leaf -> result -> share -> voices", async ({
    page,
  }) => {
    // Start at home
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /A city grows/ })).toBeVisible();

    // Click Grow your leaf
    await page.getByRole("link", { name: "Grow your leaf" }).click();
    await expect(page).toHaveURL("/join");

    // Select theme
    await page.getByRole("radio", { name: "Wellbeing & mindfulness" }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Fill note
    await page
      .getByLabel("What is your hope for the city?")
      .fill("I hope our city makes space for peaceful, healthy, mindful lives.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Grow my leaf", exact: true }).click();

    // Result page
    await expect(
      page.getByRole("heading", { name: "Your leaf is growing." }),
    ).toBeVisible();

    // Save keepsake (download)
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save keepsake", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^gmc-leaf-.+\.svg$/);

    // Share leaf
    await page.getByRole("button", { name: "Share leaf", exact: true }).click();

    // Grow another hope
    await page.getByRole("button", { name: "Grow another hope" }).click();
    await expect(page).toHaveURL("/join");
    await expect(
      page.getByRole("heading", { name: "What matters to you?" }),
    ).toBeVisible();
  });
});
