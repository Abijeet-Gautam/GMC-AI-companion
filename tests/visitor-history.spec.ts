import { test, expect, request as requests } from "@playwright/test";
import { randomUUID } from "node:crypto";

const fakeCid = () =>
  `9${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
test("CID and PIN history is private, owned, persistent across devices and removable", async ({
  request,
}) => {
  const cid = fakeCid(),
    pin = "384729",
    stranger = await requests.newContext({ baseURL: "http://127.0.0.1:3100" });
  const otherDevice = await requests.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const note = "I hope that every student feels welcome in our libraries.";
  try {
    const submit = await request.post("/api/contributions", {
      data: {
        aspiration: note,
        theme: "education",
        consent: true,
        idempotencyKey: randomUUID(),
      },
    });
    expect(submit.status()).toBe(201);
    const receipt = await submit.json();
    expect(
      (await request.get("/api/visitor")).headers()["cache-control"],
    ).toContain("no-store");
    expect(
      (await (await request.get("/api/visitor")).json()).authenticated,
    ).toBe(false);
    const stolen = await stranger.post("/api/visitor", {
      data: {
        action: "remember",
        cid,
        pin,
        consent: true,
        leafId: receipt.leaf.id,
      },
    });
    expect(stolen.status()).toBe(403);
    expect(
      (
        await request.post("/api/visitor", {
          data: { action: "remember", cid, pin, leafId: receipt.leaf.id },
        })
      ).status(),
    ).toBe(400);
    const saved = await request.post("/api/visitor", {
      data: {
        action: "remember",
        cid,
        pin,
        consent: true,
        leafId: receipt.leaf.id,
      },
    });
    expect(saved.status()).toBe(200);
    const history = await saved.json();
    expect(history.total).toBe(1);
    expect(history.voices[0].note).toBe(note);
    expect(history.voices[0].reply).toBe(receipt.reply);
    expect(JSON.stringify(history)).not.toContain(cid);
    expect(JSON.stringify(history)).not.toContain(pin);
    expect(
      saved
        .headersArray()
        .some(
          (header) =>
            header.name.toLowerCase() === "set-cookie" &&
            /gmc_visit_history=.*HttpOnly; SameSite=Strict/.test(header.value),
        ),
    ).toBe(true);
    expect(
      (
        await otherDevice.post("/api/visitor", {
          data: { action: "signin", cid, pin: "000000" },
        })
      ).status(),
    ).toBe(401);
    expect(
      (await (await otherDevice.get("/api/visitor")).json()).authenticated,
    ).toBe(false);
    expect(
      (
        await otherDevice.post("/api/visitor", {
          data: { action: "signin", cid, pin },
        })
      ).status(),
    ).toBe(200);
    const next = await otherDevice.post("/api/contributions", {
      data: {
        aspiration: "I hope our parks offer peaceful walks.",
        theme: "nature",
        consent: true,
        visitor_type: "returning",
        idempotencyKey: randomUUID(),
      },
    });
    expect(next.status()).toBe(201);
    expect((await (await request.get("/api/visitor")).json()).total).toBe(2);
    const publicResponse = await request.get(`/api/leaves/${receipt.leaf.id}`);
    const publicText = await publicResponse.text();
    for (const privateValue of [
      cid,
      pin,
      note,
      receipt.reply,
      "owner_key",
      "visitor_type",
    ])
      expect(publicText).not.toContain(privateValue);
    expect(
      (
        await stranger.patch("/api/visitor", {
          data: { leafId: receipt.leaf.id, consent: true },
        })
      ).status(),
    ).toBe(401);
    await request.delete("/api/visitor");
    expect(
      (await (await request.get("/api/visitor")).json()).authenticated,
    ).toBe(false);
    expect(
      (await (await otherDevice.get("/api/visitor")).json()).authenticated,
    ).toBe(true);
    await otherDevice.delete("/api/visitor?forget=true");
    expect(
      (
        await otherDevice.post("/api/visitor", {
          data: { action: "signin", cid, pin },
        })
      ).status(),
    ).toBe(401);
    expect((await request.get(`/api/leaves/${receipt.leaf.id}`)).status()).toBe(
      200,
    );
  } finally {
    await stranger.dispose();
    await otherDevice.dispose();
  }
});

test("submitted visitor can save both images, remember a voice and return without extending the note form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/join");
  await page.getByRole("button", { name: "Returning", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unlock my voices" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue with a new hope" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("What is your hope for the city?")
    .fill("I hope we keep green spaces for nature and peaceful walks.");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Grow my leaf", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your leaf is growing." }),
  ).toBeVisible();
  await expect(
    page.getByText("A little about Gelephu", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add my CID (optional)", exact: true })
    .click();
  await page.getByLabel("CID", { exact: true }).fill(fakeCid());
  await page.getByLabel("Private PIN", { exact: true }).fill("495726");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Remember this voice" }).click();
  await expect(
    page.getByText("Connected to your visit history", { exact: true }),
  ).toBeVisible();
  const tree = page.locator(".receipt-tree-canvas");
  await expect(tree).toHaveAttribute("data-renderer", "3d");
  await expect(tree.locator(".tree-marker.is-featured")).toHaveCount(1);
  const previewResolution = await tree.locator("canvas").getAttribute("width");
  const image = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save tree image", exact: true })
    .click();
  const treeDownload = await image;
  await treeDownload.saveAs("test-results/downloaded-tree-keepsake.png");
  await expect(tree.locator("canvas")).toHaveAttribute(
    "width",
    previewResolution!,
  );
  expect(treeDownload.suggestedFilename()).toMatch(
    /^gmc-tree-with-leaf-.+\.png$/,
  );
  const leaf = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Save keepsake", exact: true })
    .click();
  expect((await leaf).suggestedFilename()).toMatch(/^gmc-leaf-.+\.svg$/);
  await page.screenshot({
    path: "test-results/receipt-history-and-tree.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "My previous voices", exact: true })
    .click();
  await expect(
    page.getByText(
      "I hope we keep green spaces for nature and peaceful walks.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Unlock my voices", exact: true }),
  ).toBeVisible();
});

test("illustration receipt also downloads a valid standalone tree SVG", async ({
  page,
  request,
}) => {
  const original = (await (await request.get("/api/tree/settings")).json())
    .settings;
  await request.post("/api/admin/session", {
    data: { password: "test-only-staff-password" },
  });
  try {
    await request.put("/api/admin/tree", {
      data: { ...original, renderer: "illustration" },
    });
    await page.goto("/join");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByLabel("What is your hope for the city?")
      .fill("I hope for more nature in our city.");
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Grow my leaf", exact: true })
      .click();
    await expect(page.locator(".receipt-tree-canvas")).toHaveAttribute(
      "data-renderer",
      "illustration",
    );
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Save tree image", exact: true })
      .click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.svg$/);
    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const svg = Buffer.concat(chunks).toString();
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("active-leaf");
  } finally {
    await request.put("/api/admin/tree", { data: original });
  }
});
