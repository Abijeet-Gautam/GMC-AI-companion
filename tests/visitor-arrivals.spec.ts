import { test, expect, request as requests } from "@playwright/test";
import { randomUUID } from "node:crypto";

for (const width of [390, 320])
  test(`join stays compact and privately replies with blueprint wayfinding at ${width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 740 });
    await page.goto("/join");
    const continueButton = page.getByRole("button", {
      name: "Continue",
      exact: true,
    });
    const first = (await continueButton.boundingBox())!;
    expect(first.y + first.height).toBeLessThanOrEqual(
      width === 390 ? 844 : 740,
    );
    await page.getByRole("radio", { name: "Education & opportunity" }).check();
    await continueButton.click();
    const note =
      "I hope every student can learn in a welcoming school and visit a library.";
    await page.getByLabel("What is your hope for the city?").fill(note);
    await page.getByRole("checkbox").check();
    const submit = page.getByRole("button", {
      name: "Grow my leaf",
      exact: true,
    });
    const button = (await submit.boundingBox())!;
    expect(button.y + button.height).toBeLessThanOrEqual(
      width === 390 ? 844 : 740,
    );
    const response = page.waitForResponse(
      (value) =>
        value.url().endsWith("/api/contributions") &&
        value.request().method() === "POST",
    );
    await submit.click();
    const receipt = await (await response).json();
    await expect(page.getByTestId("visitor-reply")).toContainText("learn");
    await expect(
      page.getByText("Offline reply", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "8 Business Sectors", exact: true }),
    ).toBeVisible();
    const reply = await page.getByTestId("visitor-reply").innerText();
    expect(reply).not.toBe(receipt.leaf.leaf_message);
    await page.reload();
    await expect(page.getByTestId("visitor-reply")).toHaveText(reply);
    await page.getByText("Your original note", { exact: true }).click();
    await expect(page.getByText(note, { exact: true })).toBeVisible();
    await page.getByText("Find it on the plan", { exact: true }).click();
    await expect(page.locator('[data-chamber="3"]')).toHaveAttribute(
      "data-recommended",
      "true",
    );
    await expect(
      page.getByText(/Continue past the model mapping area/),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/join-reply-and-plan-${width}.png`,
      fullPage: true,
    });
    const publicLeaf = await (
      await request.get(`/api/leaves/${receipt.leaf.id}`)
    ).json();
    expect(JSON.stringify(publicLeaf)).not.toContain(reply);
    expect(JSON.stringify(publicLeaf)).not.toContain(note);
    await page.getByRole("link", { name: "Open your keepsake page" }).click();
    await expect(page.getByTestId("visitor-reply")).toHaveCount(0);
  });

test("offline replies respond to the note and use the blueprint's chamber numbers", async ({
  request,
}) => {
  const examples = [
    {
      aspiration:
        "I hope there are schools and libraries where students can learn.",
      theme: "community",
      chamber: 3,
      word: "learn",
    },
    {
      aspiration: "I hope green parks protect nature and wildlife.",
      theme: "innovation",
      chamber: 2,
      word: "nature",
    },
    {
      aspiration: "I hope people have peaceful spaces for mindfulness.",
      theme: "wellbeing",
      chamber: 4,
      word: "well",
    },
    {
      aspiration:
        "I hope our culture and traditions remain part of daily life.",
      theme: "culture",
      chamber: 1,
      word: "tradition",
    },
  ];
  for (const example of examples) {
    const input = {
      aspiration: example.aspiration,
      theme: example.theme,
      consent: true,
      idempotencyKey: randomUUID(),
    };
    const response = await request.post("/api/contributions", { data: input });
    expect(response.status()).toBe(201);
    const receipt = await response.json();
    expect(receipt.reply.toLowerCase()).toContain(example.word);
    expect(receipt.reply.length).toBeLessThanOrEqual(360);
    expect(receipt.reply_mode).toBe("offline");
    expect(receipt.leaf.chamber_id).toBe(example.chamber);
    expect(receipt.leaf.visitor_reply).toBeUndefined();
    expect(
      (await (await request.post("/api/contributions", { data: input })).json())
        .reply,
    ).toBe(receipt.reply);
  }
});

test("simultaneous visitors have overlapping leaf flights without duplicates or lost arrivals", async ({
  page,
  request,
}) => {
  test.setTimeout(60000);
  const original = (await (await request.get("/api/tree/settings")).json())
    .settings;
  await request.post("/api/admin/session", {
    data: { password: "test-only-staff-password" },
  });
  await request.put("/api/admin/tree", {
    data: {
      ...original,
      growthMode: "contributions",
      wind: 0,
      quality: "low",
      renderer: "auto",
    },
  });
  const clients = await Promise.all(
    Array.from({ length: 3 }, () =>
      requests.newContext({ baseURL: "http://127.0.0.1:3100" }),
    ),
  );
  const errors: string[] = [];
  page.on("pageerror", (value) => errors.push(value.message));
  try {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/display");
    await expect(page.locator(".kiosk-tree")).toHaveAttribute(
      "data-renderer",
      "3d",
    );
    await expect(page.getByText("A living collection")).toBeVisible();
    await page.getByRole("button", { name: "Pause tree rotation" }).click();
    const before = Number(
      await page.locator(".kiosk-tree").getAttribute("data-foliage-count"),
    );
    await page.evaluate(() => {
      const state = { ids: [] as string[], max: 0 };
      (window as unknown as { arrivals: typeof state }).arrivals = state;
      const sample = () => {
        state.max = Math.max(
          state.max,
          Number(
            document.querySelector<HTMLElement>(".kiosk-tree")?.dataset
              .activeArrivals || 0,
          ),
        );
        document
          .querySelectorAll<HTMLElement>(".tree-marker.is-arriving")
          .forEach((element) => {
            if (
              element.dataset.leafId &&
              !state.ids.includes(element.dataset.leafId)
            )
              state.ids.push(element.dataset.leafId);
          });
      };
      new MutationObserver(sample).observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class", "data-active-arrivals"],
      });
    });
    const receipts = await Promise.all(
      Array.from({ length: 12 }, async (_, index) => {
        const response = await clients[index % 3].post("/api/contributions", {
          data: {
            aspiration: `I hope students can learn in shared spaces ${index + 1}.`,
            theme: "education",
            consent: true,
            idempotencyKey: randomUUID(),
          },
        });
        expect(response.status()).toBe(201);
        return response.json();
      }),
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { arrivals: { max: number } }).arrivals.max,
        ),
      )
      .toBeGreaterThan(1);
    await page.screenshot({ path: "test-results/concurrent-leaf-flights.png" });
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as unknown as { arrivals: { ids: string[] } }).arrivals
                .ids.length,
          ),
        { timeout: 9000 },
      )
      .toBe(12);
    await expect(page.locator(".kiosk-tree")).toHaveAttribute(
      "data-foliage-count",
      String(before + 12),
    );
    for (const { leaf } of receipts)
      await expect(page.locator(`[data-leaf-id="${leaf.id}"]`)).toHaveCount(1);
    await expect(page.locator(".kiosk-tree")).toHaveAttribute(
      "data-active-arrivals",
      "0",
    );
    expect(errors).toEqual([]);
  } finally {
    await request.put("/api/admin/tree", { data: original });
    await Promise.all(clients.map((client) => client.dispose()));
  }
});
