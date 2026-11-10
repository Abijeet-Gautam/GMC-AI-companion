import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

test("a fresh reception tree is bare, then each approved contribution grows leaves and branches", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1080, height: 1920 });
  expect((await (await request.get("/api/tree/stats")).json()).total).toBe(0);
  await page.goto("/display");
  const tree = page.locator(".kiosk-tree");
  await expect(tree).toHaveAttribute("data-renderer", "3d");
  await expect(tree).toHaveAttribute("data-foliage-count", "0");
  await expect(tree).toHaveAttribute("data-growth-phase", "bare sapling");
  const initialBranches = Number(await tree.getAttribute("data-branch-count")),
    initialProgress = Number(await tree.getAttribute("data-growth-progress"));
  await page.screenshot({ path: "test-results/tree-bare-sapling.png" });
  for (let n = 1; n <= 3; n++) {
    const response = await request.post("/api/contributions", {
      data: {
        aspiration: "I hope green spaces bring our community together.",
        theme: "nature",
        consent: true,
        idempotencyKey: randomUUID(),
      },
    });
    expect(response.status()).toBe(201);
    await expect(tree).toHaveAttribute("data-foliage-count", String(n));
    await expect(page.locator(".tree-leaf")).toHaveCount(n);
  }
  expect(
    Number(await tree.getAttribute("data-growth-progress")),
  ).toBeGreaterThan(initialProgress);
  await page.screenshot({ path: "test-results/tree-first-leaves.png" });
  await request.post("/api/admin/session", {
    data: { password: "test-only-staff-password" },
  });
  await request.post("/api/admin", { data: { action: "seed" } });
  await page.reload();
  await expect(tree).toHaveAttribute("data-foliage-count", "27");
  expect(Number(await tree.getAttribute("data-branch-count"))).toBeGreaterThan(
    initialBranches,
  );
  await page.screenshot({ path: "test-results/tree-grown-by-visitors.png" });
  await request.post("/api/admin", { data: { action: "clear_demo" } });
});

test("Tree Studio orbits, zooms, previews growth without records, customizes and exports", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const before = (await (await request.get("/api/tree/stats")).json()).total;
  await page.goto("/tree");
  const tree = page.locator(".studio-canvas"),
    host = tree.locator(".procedural-host");
  await expect(tree).toHaveAttribute("data-renderer", "3d");
  await page.getByRole("button", { name: "Bare", exact: true }).click();
  await expect(tree).toHaveAttribute("data-foliage-count", "0");
  await page.getByRole("button", { name: "48", exact: true }).click();
  await expect(tree).toHaveAttribute("data-foliage-count", "48");
  expect((await (await request.get("/api/tree/stats")).json()).total).toBe(
    before,
  );
  const azimuth = await host.getAttribute("data-azimuth"),
    box = (await host.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width * 0.4 + 130,
    box.y + box.height * 0.4 + 30,
    { steps: 10 },
  );
  await page.mouse.up();
  await expect(host).not.toHaveAttribute("data-azimuth", azimuth!);
  const distance = await host.getAttribute("data-distance");
  await page.getByRole("button", { name: "Zoom in on tree" }).click();
  await expect(host).not.toHaveAttribute("data-distance", distance!);
  await page.getByRole("button", { name: "Reset studio view" }).click();
  await page.getByRole("button", { name: "Blossom", exact: true }).click();
  await page.getByRole("button", { name: "Willow", exact: true }).click();
  await expect(tree).toHaveAttribute("data-species", "willow");
  await expect(tree).toHaveAttribute("data-renderer", "3d");
  await page.getByText("Branch shape", { exact: true }).click();
  await expect(page.getByLabel("Willow hang", { exact: true })).toBeVisible();
  const config = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download tree configuration", exact: true })
    .click();
  const configFile = await config;
  const saved = JSON.parse(await readFile((await configFile.path())!, "utf8"));
  expect(saved.settings.species).toBe("willow");
  expect(saved.settings.palette).toBe("blossom");
  const png = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download tree image", exact: true })
    .click();
  expect((await png).suggestedFilename()).toMatch(/\.png$/);
  const glb = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download tree model", exact: true })
    .click();
  const glbFile = await glb;
  const bytes = await readFile((await glbFile.path())!);
  expect(bytes.subarray(0, 4).toString()).toBe("glTF");
  await page.screenshot({ path: "test-results/tree-studio.png" });
  await page
    .getByLabel("Growth driver", { exact: true })
    .selectOption("manual");
  await page.getByLabel("Tree age", { exact: true }).press("End");
  await expect
    .poll(async () => Number(await tree.getAttribute("data-foliage-count")))
    .toBeGreaterThan(120);
  await page.screenshot({ path: "test-results/tree-studio-manual-canopy.png" });
});

test("Tree Studio is usable on a phone with a collapsible customization panel", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tree");
  await expect(
    page.getByRole("button", { name: "Show customization panel", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Show customization panel", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make it your own." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bare", exact: true }).click();
  await expect(page.locator(".studio-canvas")).toHaveAttribute(
    "data-foliage-count",
    "0",
  );
  await page
    .getByRole("button", { name: "Close customization panel", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Show customization panel", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/tree-studio-mobile.png" });
});

test("only authenticated staff can publish Studio changes; count previews never get saved", async ({
  page,
  request,
}) => {
  const original = (await (await request.get("/api/tree/settings")).json())
    .settings;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tree");
  await expect(
    page.getByRole("link", { name: "Sign in as staff to save" }),
  ).toBeVisible();
  await page.goto("/admin");
  await page.getByLabel("Staff password").fill("test-only-staff-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.goto("/tree");
  try {
    await page.getByRole("button", { name: "Frost", exact: true }).click();
    await page.getByRole("button", { name: "120", exact: true }).click();
    await page
      .getByRole("button", { name: "Save to reception", exact: true })
      .click();
    await expect(page.locator(".studio-publish [role=status]")).toContainText(
      "Preview counts were not published",
    );
    const actual = (await (await request.get("/api/tree/settings")).json())
      .settings;
    expect(actual.palette).toBe("frost");
    expect(actual.growthMode).toBe("contributions");
    expect(actual).not.toHaveProperty("countOverride");
  } finally {
    await request.post("/api/admin/session", {
      data: { password: "test-only-staff-password" },
    });
    await request.put("/api/admin/tree", { data: original });
  }
});
