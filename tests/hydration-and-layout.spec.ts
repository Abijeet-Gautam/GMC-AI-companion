import { test, expect } from "@playwright/test";

for (const width of [1440, 320]) {
  test(`server-rendered pages hydrate cleanly with the SVG fallback at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("console", (message) => {
      if (
        /hydrat|server rendered|didn.t match|Minified React error #4(18|23|25)/i.test(
          message.text(),
        )
      )
        errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    // Keep the SVG mounted on browsers without WebGL, including during the
    // initial hydration where the old floating-point hash used to mismatch.
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        kind: string,
        ...args: unknown[]
      ) {
        if (/webgl/.test(kind)) return null;
        return Reflect.apply(original, this, [kind, ...args]);
      } as typeof original;
    });
    // Attribute warnings can be disabled in production React, and React keeps
    // mismatched server attributes. Compare a hard-loaded SVG with a fresh
    // client navigation too, so tiny Node/browser coordinate drift is caught.
    await page.goto("/");
    await expect(page.locator(".procedural-tree")).toHaveAttribute(
      "data-renderer",
      "illustration",
    );
    const serverPositions = await page
      .locator(".firefly")
      .evaluateAll((nodes) =>
        nodes.map((node) => [
          node.getAttribute("cx"),
          node.getAttribute("cy"),
          node.getAttribute("r"),
        ]),
      );
    expect(serverPositions).toHaveLength(22);
    await page.goto("/chambers");
    await page
      .getByRole("link", { name: "The experience", exact: true })
      .click();
    await expect(page.locator(".procedural-tree")).toHaveAttribute(
      "data-renderer",
      "illustration",
    );
    const clientPositions = await page
      .locator(".firefly")
      .evaluateAll((nodes) =>
        nodes.map((node) => [
          node.getAttribute("cx"),
          node.getAttribute("cy"),
          node.getAttribute("r"),
        ]),
      );
    expect(clientPositions).toEqual(serverPositions);
    for (const path of [
      "/",
      "/join",
      "/chambers",
      "/privacy",
      "/display",
      "/tree",
      "/admin",
    ]) {
      await page.goto(path);
      if (["/", "/display", "/tree"].includes(path))
        await expect(page.locator(".procedural-tree")).toHaveAttribute(
          "data-renderer",
          "illustration",
        );
      else if (path === "/admin")
        await expect(
          page.getByRole("button", { name: "Sign in", exact: true }),
        ).toBeVisible();
      else await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("staff sidebar works on desktop and as a keyboard-accessible mobile drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin");
  await page.getByLabel("Staff password").fill("test-only-staff-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const sections = page.getByRole("navigation", { name: "Staff sections" });
  await expect(sections).toBeVisible();
  await expect(
    sections.getByRole("button", { name: "Public leaves", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({
    path: "test-results/redesign-admin-overview.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sections).not.toBeVisible();
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: "Close sidebar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(sections).not.toBeVisible();
  await menu.click();
  await sections
    .getByRole("button", { name: "Visitor messages", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Visitor voices", exact: true }),
  ).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(sections).not.toBeVisible();
  await menu.click();
  await sections
    .getByRole("button", { name: "Tree & display", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Shape the living tree" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/redesign-admin-mobile-settings.png",
    fullPage: true,
  });
  await menu.click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
});
