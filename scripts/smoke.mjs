import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const payload = () => ({
  aspiration: "May students learn and grow.",
  theme: "education",
  consent: true,
  idempotencyKey: randomUUID(),
});
async function post(body) {
  const response = await fetch(`${base}/api/contributions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
const input = payload();
const [first, retry] = await Promise.all([post(input), post(input)]);
assert.equal(
  first.body.leaf.id,
  retry.body.leaf.id,
  "concurrent retry must create only one leaf",
);
assert.ok([200, 201].includes(first.status));
assert.equal((await post({ ...payload(), consent: false })).status, 400);
assert.equal((await post({ ...payload(), theme: "unknown" })).status, 400);
const burst = await Promise.all(
  Array.from({ length: 5 }, () => post(payload())),
);
assert.ok(burst.every((result) => result.status === 201));
assert.equal(new Set(burst.map((result) => result.body.leaf.id)).size, 5);
const response = await fetch(`${base}/api/leaves`);
assert.equal(response.status, 200);
const { leaves, total } = await response.json();
for (const result of [first, ...burst]) {
  const leaf = leaves.find((item) => item.id === result.body.leaf.id);
  assert.ok(leaf, "saved leaf must appear in public reads");
  assert.equal("idempotency_key" in leaf, false);
  assert.equal("aspiration" in leaf, false);
}
assert.ok(total >= 6);
console.log(
  "PASS: persistence reads, concurrent idempotency, validation, five-request burst, public fields. Created 6 demo leaves.",
);
