import { test, expect } from "@playwright/test";

test("garden has visible wind, automatic rotation, cast shadows and working scene controls", async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const original = (await (await request.get("/api/tree/settings")).json())
    .settings;
  await request.post("/api/admin/session", {
    data: { password: "test-only-staff-password" },
  });
  const settings = {
    ...original,
    species: "oak",
    palette: "spring",
    growthMode: "manual",
    age: 1,
    wind: 0.65,
    flutter: 0.45,
    quality: "low",
  };
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    await request.put("/api/admin/tree", { data: settings });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/display");
    const tree = page.locator(".kiosk-tree"),
      host = tree.locator(".procedural-host"),
      canvas = tree.locator("canvas");
    await expect(tree).toHaveAttribute("data-renderer", "3d");
    await expect(host).toHaveAttribute("data-auto-rotating", "true");
    expect(
      Number(await host.getAttribute("data-grass-blades")),
    ).toBeGreaterThanOrEqual(3000);
    await expect(host).toHaveAttribute("data-shadows", "true");
    const angle = await host.getAttribute("data-azimuth");
    await expect(host).not.toHaveAttribute("data-azimuth", angle!);
    await canvas.evaluate((element) => {
      element.dataset.sceneTest = "same-context";
    });
    await page.getByRole("button", { name: "Pause tree rotation" }).click();
    await expect(host).toHaveAttribute("data-auto-rotating", "false");
    await expect(canvas).toHaveAttribute("data-scene-test", "same-context");
    const offset = await host.getAttribute("data-wind-offset"),
      frame = await canvas.screenshot();
    await expect(host).not.toHaveAttribute("data-wind-offset", offset!);
    expect((await canvas.screenshot()).equals(frame)).toBe(false);
    await page
      .getByRole("button", { name: "Send a breeze through the tree" })
      .click();
    await expect
      .poll(async () => Number(await host.getAttribute("data-gust")))
      .toBeGreaterThan(1);
    const distance = Number(await host.getAttribute("data-distance"));
    await page.getByRole("button", { name: "Zoom in on tree" }).click();
    await expect
      .poll(async () => Number(await host.getAttribute("data-distance")))
      .toBeLessThan(distance);
    const dimensions = await tree.boundingBox();
    expect(dimensions?.width).toBe(1440);
    expect(dimensions?.height).toBe(900);
    expect(
      await page
        .locator(".kiosk-feature")
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    ).toBe("rgba(0, 0, 0, 0)");
    expect(
      await page
        .locator(".kiosk-qr-panel")
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    ).toBe("rgba(0, 0, 0, 0)");
    await page.getByRole("button", { name: "Reset tree view" }).click();
    await page.screenshot({ path: "test-results/living-scene-landscape.png" });
    await page.getByRole("button", { name: "Resume tree rotation" }).click();
    await expect(host).toHaveAttribute("data-auto-rotating", "true");
    // Reduced-motion changes are honored live, including the GPU wind field.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(host).toHaveAttribute("data-auto-rotating", "false");
    await expect(host).toHaveAttribute("data-wind-strength", "0");
    await request.put("/api/admin/tree", { data: { ...settings, wind: 0 } });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(host).toHaveAttribute("data-wind-strength", "0");
    await expect(canvas).toHaveAttribute("data-scene-test", "same-context");
    await page.setViewportSize({ width: 1080, height: 1920 });
    await expect
      .poll(async () => (await tree.boundingBox())?.height)
      .toBe(1920);
    await page.screenshot({ path: "test-results/living-scene-portrait.png" });
    expect(errors).toEqual([]);
  } finally {
    await request.put("/api/admin/tree", { data: original });
  }
});

for (const size of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
]) {
  test(`home hero fits one viewport at ${size.width}px with an unobstructed rounded tree scene`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /A city grows/ }),
    ).toBeVisible();
    const hero = (await page.locator(".home-hero").boundingBox())!;
    expect(hero.y + hero.height).toBeLessThanOrEqual(size.height + 1);
    const image = page.locator(".home-tree");
    expect(await image.locator("p").count()).toBe(0);
    expect(
      await image.evaluate((element) =>
        parseFloat(getComputedStyle(element).borderRadius),
      ),
    ).toBeGreaterThanOrEqual(20);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator("header, .eyebrow, nav, button")
        .evaluateAll((elements) =>
          elements.every(
            (element) =>
              getComputedStyle(element).textTransform !== "uppercase",
          ),
        ),
    ).toBe(true);
    if (size.width === 1440)
      await page.screenshot({ path: "test-results/living-hero-desktop.png" });
  });
}
