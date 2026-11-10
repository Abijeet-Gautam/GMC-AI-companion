import { test, expect, request as requests } from "@playwright/test";
import { randomUUID } from "node:crypto";
const data = () => ({
  aspiration: "I hope every student can learn in a welcoming school.",
  theme: "education",
  consent: true,
  idempotencyKey: randomUUID(),
});
async function mode(mode: string) {
  await fetch("http://127.0.0.1:3102/control", {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
}
test("OpenAI structured response is moderated, persisted and shared by concurrent retries", async () => {
  await mode("safe");
  const client = await requests.newContext({
      baseURL: "http://127.0.0.1:3101",
    }),
    input = data();
  const responses = await Promise.all([
    client.post("/api/contributions", { data: input }),
    client.post("/api/contributions", { data: input }),
  ]);
  const [first, retry] = await Promise.all(
    responses.map((result) => result.json()),
  );
  expect(first.mode).toBe("openai");
  expect(first.leaf.id).toBe(retry.leaf.id);
  expect(first.leaf.leaf_message).toContain("safe learning spaces");
  expect(
    (await (await fetch("http://127.0.0.1:3102/counts")).json()).generations,
  ).toBe(1);
  await client.dispose();
});
for (const scenario of ["input_flagged", "output_flagged", "rejected", "pii"])
  test(`OpenAI ${scenario} rejects without fallback publication`, async () => {
    await mode(scenario);
    const client = await requests.newContext({
      baseURL: "http://127.0.0.1:3101",
    });
    const before = (await (await client.get("/api/tree/stats")).json()).total;
    const response = await client.post("/api/contributions", { data: data() });
    expect(response.status()).toBe(422);
    expect((await (await client.get("/api/tree/stats")).json()).total).toBe(
      before,
    );
    await client.dispose();
  });
for (const scenario of ["failure", "invalid", "timeout"])
  test(`OpenAI ${scenario} uses a labelled curated fallback`, async () => {
    await mode(scenario);
    const client = await requests.newContext({
      baseURL: "http://127.0.0.1:3101",
    });
    const response = await client.post("/api/contributions", { data: data() });
    expect(response.status()).toBe(201);
    const result = await response.json();
    expect(result.mode).toBe("offline");
    expect(result.leaf.leaf_message).not.toContain("safe learning spaces");
    expect(result.leaf.leaf_message.length).toBeLessThanOrEqual(100);
    await client.dispose();
  });
