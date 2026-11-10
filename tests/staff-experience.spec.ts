import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("staff previews and saves a tree, then reviews original visitor words", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1100 });
  const original = (await (await request.get("/api/tree/settings")).json())
    .settings;
  await request.post("/api/admin/session", {
    data: { password: "test-only-staff-password" },
  });
  const text = `I hope our library ${randomUUID().slice(0, 6)} helps students learn.`;
  expect(
    (
      await request.post("/api/contributions", {
        data: {
          aspiration: text,
          theme: "education",
          consent: true,
          idempotencyKey: randomUUID(),
        },
      })
    ).status(),
  ).toBe(201);
  try {
    await page.goto("/admin");
    await page.getByLabel("Staff password").fill("test-only-staff-password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("button", { name: "Tree & display", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Shape the living tree" }),
    ).toBeVisible();
    await page
      .getByLabel("Tree species", { exact: true })
      .selectOption("willow");
    await page
      .getByLabel("Canopy palette", { exact: true })
      .selectOption("blossom");
    await expect(page.locator(".admin-tree-preview")).toHaveAttribute(
      "data-species",
      "willow",
    );
    await page.getByRole("button", { name: "Save tree settings" }).click();
    await expect(page.getByRole("status")).toContainText("Tree settings saved");
    expect(
      (await (await request.get("/api/tree/settings")).json()).settings.species,
    ).toBe("willow");
    await page.screenshot({
      path: "test-results/staff-tree-settings.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Visitor messages", exact: true })
      .click();
    await page.getByLabel("Search visitor messages").fill(text);
    await expect(page.getByText(text, { exact: true })).toBeVisible();
    await expect(
      page.getByText("Visitor's original words", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Hide public leaf", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Restore public leaf", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Remove private words" }).click();
    await page
      .getByRole("button", { name: "Delete message", exact: true })
      .click();
    await expect(
      page.getByText("No visitor messages match.", { exact: false }),
    ).toBeVisible();
  } finally {
    await request.put("/api/admin/tree", { data: original });
  }
});
