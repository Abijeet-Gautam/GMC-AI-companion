import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("mobile visitor grows a leaf, kiosk receives it, keepsake downloads and chambers open", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const phone = await context.newPage(),
    errors: string[] = [];
  phone.on("pageerror", (error) => errors.push(error.message));
  const display = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    reducedMotion: "reduce",
  });
  await display.goto("/display");
  await expect(display.getByText("A living collection")).toBeVisible();
  const before = await display.locator(".tree-leaf").count();
  await phone.goto("/join");
  await phone.getByRole("radio", { name: "Education & opportunity" }).check();
  await phone.getByRole("button", { name: "Continue" }).click();
  await phone
    .getByLabel("What is your hope for the city?")
    .fill("I hope students have wonderful schools to learn new skills.");
  await phone.getByRole("checkbox").check();
  await phone.getByRole("button", { name: "Grow my leaf" }).click();
  await expect(
    phone.getByRole("heading", { name: "Your leaf is growing." }),
  ).toBeVisible();
  await expect(display.locator(".tree-leaf")).toHaveCount(before + 1);
  const download = phone.waitForEvent("download");
  await phone.getByRole("button", { name: "Save keepsake" }).click();
  expect((await download).suggestedFilename()).toMatch(/gmc-leaf-.*\.svg/);
  await phone.getByRole("link", { name: "Open your keepsake page" }).click();
  await expect(
    phone.getByRole("heading", { name: "One leaf. A shared future." }),
  ).toBeVisible();
  await phone.getByRole("link", { name: "Explore the chambers" }).click();
  await expect(
    phone.getByRole("heading", { name: "Economy of Tomorrow" }),
  ).toBeVisible();
  expect(
    await phone.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await phone.screenshot({
    path: "test-results/mobile-chambers.png",
    fullPage: true,
  });
  await display.screenshot({
    path: "test-results/portrait-display.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await context.close();
  await display.close();
});
test("display retains a cached tree offline and resynchronizes hidden leaves after reconnect", async ({
  page,
  context,
  request,
}) => {
  await request.post("/api/contributions", {
    data: {
      aspiration: "I hope our community grows together.",
      theme: "community",
      consent: true,
      idempotencyKey: randomUUID(),
    },
  });
  await page.goto("/display");
  await expect(page.getByText("A living collection")).toBeVisible();
  const initial = await page.locator(".tree-leaf").count();
  expect(initial).toBeGreaterThan(0);
  await context.setOffline(true);
  await expect(page.getByText("Reconnecting", { exact: true })).toBeVisible();
  expect(await page.locator(".tree-leaf").count()).toBe(initial);
  await context.setOffline(false);
  await expect(page.getByText("A living collection")).toBeVisible();
  const input = {
    aspiration: "May nature and parks help our city thrive.",
    theme: "nature",
    consent: true,
    idempotencyKey: randomUUID(),
  };
  const result = await request.post("/api/contributions", { data: input });
  const leaf = (await result.json()).leaf;
  await expect(page.locator(".tree-leaf")).toHaveCount(initial + 1);
  await request.post("/api/admin/session", {
    data: { password: "test-only-staff-password" },
  });
  await request.post("/api/admin", {
    data: { action: "status", id: leaf.id, status: "hidden" },
  });
  await expect(page.locator(".tree-leaf")).toHaveCount(initial);
  await page.reload();
  await expect(page.locator(".tree-leaf")).toHaveCount(initial);
  await request.post("/api/admin", {
    data: { action: "status", id: leaf.id, status: "approved" },
  });
  await expect(page.locator(".tree-leaf")).toHaveCount(initial + 1);
  const restored = page.locator(`[data-leaf-id="${leaf.id}"]`);
  await restored.focus();
  await restored.press("Enter");
  await expect(
    page.getByRole("button", { name: "Close selected leaf" }),
  ).toBeVisible();
});
test("staff can sign in and manage clearly labelled demo data in the browser", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("Staff password").fill("test-only-staff-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little care helps it grow." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Load 24 demo leaves" }).click();
  await expect(page.getByRole("status")).toContainText(
    "24 illustrative demo leaves",
  );
  await page.getByRole("button", { name: "demo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hide leaf" })).toHaveCount(24);
  await page.getByRole("button", { name: "Hide leaf" }).first().click();
  await expect(page.getByRole("button", { name: "Restore leaf" })).toHaveCount(
    1,
  );
  await page.getByRole("button", { name: "Clear demo leaves" }).click();
  await page.getByRole("button", { name: "Remove demos" }).click();
  await expect(page.getByRole("status")).toContainText("Demo leaves removed");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
test("home and form fit small phones without horizontal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A city grows/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Grow your leaf", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "What matters to you?" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByLabel("What is your hope for the city?"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
