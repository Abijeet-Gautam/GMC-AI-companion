import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

for (const size of [
  { width: 1080, height: 1920 },
  { width: 2160, height: 3840 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
]) {
  test(`portrait has a stable centered vertical sequence at ${size.width}px`, async ({
    page,
    request,
  }) => {
    const settings = (await (await request.get("/api/tree/settings")).json())
      .settings;
    const leaves = [
      {
        id: randomUUID(),
        leaf_message: "A hopeful city.",
        category: "nature",
        chamber_id: 2,
      },
      {
        id: randomUUID(),
        leaf_message:
          "May the city make room for every generation to learn, belong and care for our shared future together.",
        category: "education",
        chamber_id: 3,
      },
    ].map((leaf) => ({
      ...leaf,
      chamber_reason: "Discover the city",
      created_at: new Date().toISOString(),
      mode: "offline",
      is_demo: false,
    }));
    await page.route("**/api/tree/stream", (route) => route.abort());
    await page.route("**/api/leaves", (route) =>
      route.fulfill({
        json: {
          leaves,
          total: 2,
          stats: { total: 2, demo: 0, today: 2, categories: {} },
          reflection: {
            body: "A reflection of our visitors' hopes. ".repeat(20),
            created_at: new Date().toISOString(),
            mode: "offline",
          },
          revision: 1,
          serverTime: new Date().toISOString(),
          settings: { ...settings, renderer: "illustration" },
        },
      }),
    );
    await page.setViewportSize(size);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/display");
    await expect(page.locator(".kiosk-feature blockquote")).toContainText(
      "A hopeful city.",
    );
    const selectors = [
      ".kiosk-controls",
      ".kiosk-legend",
      ".kiosk-feature",
      ".kiosk-qr-panel",
    ];
    const before = await Promise.all(
      selectors.map((selector) => page.locator(selector).boundingBox()),
    );
    for (let i = 1; i < before.length; i++)
      expect(before[i]!.y).toBeGreaterThanOrEqual(
        before[i - 1]!.y + before[i - 1]!.height - 1,
      );
    expect(before[3]!.y + before[3]!.height).toBeLessThan(size.height);
    const legend = await page
      .locator(".kiosk-legend button")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().x),
      );
    expect(new Set(legend).size).toBeGreaterThan(2);
    await page.getByRole("button", { name: "Read a opportunity hope" }).click();
    await expect(page.locator(".kiosk-feature blockquote")).toContainText(
      "every generation",
    );
    const after = await Promise.all(
      selectors.map((selector) => page.locator(selector).boundingBox()),
    );
    expect(after).toEqual(before);
    await page.getByRole("button", { name: "Close selected leaf" }).click();
    await page.waitForTimeout(18500);
    const quote = await page.locator(".kiosk-feature blockquote").innerText();
    expect(quote.length).toBeLessThanOrEqual(160);
    expect(
      await Promise.all(
        selectors.map((selector) => page.locator(selector).boundingBox()),
      ),
    ).toEqual(before);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/portrait-sequence-${size.width}.png`,
    });
  });
}

test("admin can save only the display title and update a connected display", async ({
  page,
  request,
}) => {
  const original = (await (await request.get("/api/tree/settings")).json())
    .settings;
  expect(
    (
      await request.patch("/api/admin/tree", {
        data: { headline: "Our shared hopes" },
      })
    ).status(),
  ).toBe(401);
  await request.post("/api/admin/session", {
    data: { password: "test-only-staff-password" },
  });
  try {
    await page.goto("/display");
    await expect(page.locator(".kiosk-heading h1")).toHaveText(
      original.headline,
    );
    expect(
      (
        await request.patch("/api/admin/tree", {
          data: { headline: "x".repeat(91) },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.patch("/api/admin/tree", {
          data: { headline: "Our shared hopes" },
        })
      ).status(),
    ).toBe(200);
    await expect(page.locator(".kiosk-heading h1")).toHaveText(
      "Our shared hopes",
    );
    const changed = (await (await request.get("/api/tree/settings")).json())
      .settings;
    expect(changed).toEqual({ ...original, headline: "Our shared hopes" });
    await page.goto("/admin");
    await page.getByLabel("Staff password").fill("test-only-staff-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("button", { name: "Tree & display", exact: true })
      .click();
    await page
      .getByLabel("Display headline")
      .fill("Growing together in Gelephu");
    await page
      .getByRole("button", { name: "Save display title", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Tree settings saved");
    expect(
      (await (await request.get("/api/tree/settings")).json()).settings
        .headline,
    ).toBe("Growing together in Gelephu");
  } finally {
    await request.put("/api/admin/tree", { data: original });
  }
});
