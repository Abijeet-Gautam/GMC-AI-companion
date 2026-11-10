import { test, expect, request as requests } from "@playwright/test";
import { randomUUID } from "node:crypto";
const password = "test-only-staff-password";
test("older TV APIs fall back to polling and an illustration without interrupting visitor leaves", async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(AbortSignal, "any", { value: undefined });
    Object.defineProperty(AbortSignal, "timeout", { value: undefined });
    Object.defineProperty(window, "EventSource", { value: undefined });
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
  await page.goto("/display");
  await expect(page.getByText("A living collection")).toBeVisible();
  await expect(page.locator(".kiosk-tree")).toHaveAttribute(
    "data-renderer",
    "illustration",
  );
  const count = await page.locator(".tree-leaf").count();
  const response = await request.post("/api/contributions", {
    data: {
      aspiration: "I hope our parks help everyone thrive.",
      theme: "nature",
      consent: true,
      idempotencyKey: randomUUID(),
    },
  });
  expect(response.status()).toBe(201);
  await expect(page.locator(".tree-leaf")).toHaveCount(count + 1);
});
async function staff(request: import("@playwright/test").APIRequestContext) {
  expect(
    (await request.post("/api/admin/session", { data: { password } })).status(),
  ).toBe(200);
}
test("staff tree settings persist, broadcast to the display, and pause only new contributions", async ({
  request,
  page,
}) => {
  expect((await request.put("/api/admin/tree", { data: {} })).status()).toBe(
    401,
  );
  const original = (await (await request.get("/api/tree/settings")).json())
    .settings;
  await staff(request);
  try {
    await page.goto("/display");
    await expect(page.getByText("A living collection")).toBeVisible();
    const changed = {
      ...original,
      species: "pine",
      palette: "autumn",
      seed: 54321,
      acceptingContributions: false,
      headline: "Every hope finds its branch.",
    };
    expect(
      (await request.put("/api/admin/tree", { data: changed })).status(),
    ).toBe(200);
    await expect(
      page.getByRole("heading", { name: changed.headline }),
    ).toBeVisible();
    await expect(page.locator(".kiosk-tree")).toHaveAttribute(
      "data-species",
      "pine",
    );
    const snapshot = await (await request.get("/api/leaves")).json();
    expect(snapshot.settings).toEqual(changed);
    const blocked = await request.post("/api/contributions", {
      data: {
        aspiration: "I hope people can learn new skills.",
        theme: "education",
        consent: true,
        idempotencyKey: randomUUID(),
      },
    });
    expect(blocked.status()).toBe(503);
    expect((await blocked.json()).code).toBe("TREE_PAUSED");
    expect(
      (
        await request.put("/api/admin/tree", { data: { ...changed, seed: -1 } })
      ).status(),
    ).toBe(400);
  } finally {
    await request.put("/api/admin/tree", { data: original });
  }
});
test("private visitor history is searchable, redacted, idempotent, protected and removable", async ({
  request,
}) => {
  expect((await request.get("/api/admin/submissions")).status()).toBe(401);
  await staff(request);
  const marker = "orchard " + randomUUID().slice(0, 6),
    input = {
      aspiration: `I hope our ${marker} offers green spaces for everyone.`,
      theme: "nature",
      consent: true,
      idempotencyKey: randomUUID(),
    };
  const response = await request.post("/api/contributions", { data: input });
  expect(response.status()).toBe(201);
  const leaf = (await response.json()).leaf;
  await request.post("/api/contributions", { data: input });
  const history = await (
    await request.get(
      `/api/admin/submissions?query=${encodeURIComponent(marker)}`,
    )
  ).json();
  expect(history.total).toBe(1);
  expect(history.submissions[0].message).toBe(input.aspiration);
  expect(history.submissions[0].leaf_message).toBe(leaf.leaf_message);
  const other = await requests.newContext({ baseURL: "http://127.0.0.1:3100" });
  const rejected = await other.post("/api/contributions", {
    data: {
      ...input,
      aspiration: "Contact me at visitor@example.com about nature.",
      idempotencyKey: randomUUID(),
    },
  });
  expect(rejected.status()).toBe(422);
  await other.dispose();
  const rejectedHistory = await (
    await request.get(
      "/api/admin/submissions?outcome=rejected&query=email%20removed",
    )
  ).json();
  expect(rejectedHistory.total).toBeGreaterThan(0);
  expect(rejectedHistory.submissions[0].message).not.toContain(
    "visitor@example.com",
  );
  const publicData = await (await request.get("/api/leaves")).json();
  expect(JSON.stringify(publicData)).not.toContain(marker);
  expect(JSON.stringify(publicData)).not.toContain("private_message");
  expect(
    (
      await request.delete("/api/admin/submissions", {
        data: { id: history.submissions[0].id },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await (
        await request.get(
          `/api/admin/submissions?query=${encodeURIComponent(marker)}`,
        )
      ).json()
    ).total,
  ).toBe(0);
  expect((await request.get(`/api/leaves/${leaf.id}`)).status()).toBe(404);
  expect(
    (await request.post("/api/contributions", { data: input })).status(),
  ).toBe(410);
});
test("visitor draft and retry key survive refresh and successful publication clears the draft", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/join");
  await page.getByRole("button", { name: "Continue" }).click();
  const text = "I hope our gardens bring everyone together.";
  await page.getByLabel("What is your hope for the city?").fill(text);
  await page.reload();
  await expect(page.getByLabel("What is your hope for the city?")).toHaveValue(
    text,
  );
  await expect(
    page.getByText("Your unfinished hope is back.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Grow my leaf" }).click();
  await expect(
    page.getByRole("heading", { name: "Your leaf is growing." }),
  ).toBeVisible();
  await expect(page.getByText(/Look for leaf #[a-f0-9]{6}/)).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("gmc-hope-draft")),
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your leaf is growing." }),
  ).toBeVisible();
});
for (const size of [
  { name: "portrait-hd", width: 1080, height: 1920 },
  { name: "portrait-4k", width: 2160, height: 3840 },
  { name: "landscape-hd", width: 1920, height: 1080 },
  { name: "landscape-4k", width: 3840, height: 2160 },
  { name: "tv-720", width: 1280, height: 720 },
  { name: "portrait-small", width: 720, height: 1280 },
  { name: "phone", width: 390, height: 844 },
])
  test(`reception tree fits ${size.name} without page scrolling`, async ({
    page,
    request,
  }) => {
    await staff(request);
    await request.post("/api/admin", { data: { action: "seed" } });
    await page.setViewportSize(size);
    await page.goto("/display");
    await expect(page.getByText("A living collection")).toBeVisible();
    await expect(page.locator(".kiosk-tree")).toHaveAttribute(
      "data-renderer",
      /3d|illustration/,
    );
    expect(
      await page.evaluate(() => ({
        horizontal: document.documentElement.scrollWidth <= innerWidth,
        vertical: document.documentElement.scrollHeight <= innerHeight,
      })),
    ).toEqual({ horizontal: true, vertical: true });
    const qr = await page
      .getByRole("img", { name: "Scan to add your hope" })
      .boundingBox();
    expect(qr).not.toBeNull();
    expect(qr!.x).toBeGreaterThanOrEqual(0);
    expect(qr!.y + qr!.height).toBeLessThanOrEqual(size.height);
    const feature = await page.locator(".kiosk-feature").boundingBox();
    expect(feature!.y + feature!.height).toBeLessThanOrEqual(size.height);
    if (size.name === "portrait-hd" || size.name === "landscape-hd")
      await page.screenshot({ path: `test-results/tree-${size.name}.png` });
  });
test("3D tree renders without shader errors; staff can choose the illustration fallback", async ({
  request,
  page,
}) => {
  const original = (await (await request.get("/api/tree/settings")).json())
    .settings;
  await staff(request);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  try {
    await request.put("/api/admin/tree", {
      data: { ...original, renderer: "auto", quality: "low" },
    });
    await page.goto("/display");
    await expect(page.locator(".kiosk-tree")).toHaveAttribute(
      "data-renderer",
      "3d",
    );
    expect(errors).toEqual([]);
    for (const species of [
      "pine",
      "willow",
      "cypress",
      "bush",
      "spooky",
      "oak",
    ]) {
      await request.put("/api/admin/tree", {
        data: { ...original, species, quality: "low" },
      });
      await expect(page.locator(".kiosk-tree")).toHaveAttribute(
        "data-species",
        species,
      );
      await expect(page.locator(".kiosk-tree")).toHaveAttribute(
        "data-renderer",
        "3d",
      );
    }
    await page.locator(".kiosk-tree canvas").evaluate((canvas) => {
      const gl = (canvas as HTMLCanvasElement).getContext("webgl2");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    });
    await expect(page.locator(".kiosk-tree")).toHaveAttribute(
      "data-renderer",
      "illustration",
    );
    await request.put("/api/admin/tree", {
      data: { ...original, renderer: "illustration" },
    });
    await expect(page.locator(".kiosk-tree")).toHaveAttribute(
      "data-renderer",
      "illustration",
    );
    await expect(page.getByText("Illustrated display")).toBeVisible();
  } finally {
    await request.put("/api/admin/tree", { data: original });
    await request.post("/api/admin", { data: { action: "clear_demo" } });
  }
});
