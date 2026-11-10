import { createHash, randomUUID } from "node:crypto";
import { contributionSchema, type ContributionInput } from "@/lib/schemas";
import { getByKey, insertLeaf, consumeRate, recordMetric } from "@/server/db";
import { createLeaf, refreshReflection } from "@/server/services/ai";
import { visitor } from "@/server/auth";
import {
  AppError,
  readJson,
  requireSameOrigin,
  errorResponse,
  noStore,
} from "@/server/http";
import { after } from "next/server";
import type { Leaf } from "@/lib/catalog";
export const runtime = "nodejs";
const globalFlights = globalThis as unknown as {
  gmcFlights?: Map<string, { hash: string; promise: Promise<Leaf> }>;
};
const flights = (globalFlights.gmcFlights ??= new Map());
async function processLeaf(input: ContributionInput, hash: string) {
  const generated = await createLeaf(input.aspiration, input.theme);
  const record = insertLeaf(input.idempotencyKey, hash, {
    id: randomUUID(),
    ...generated,
    created_at: new Date().toISOString(),
    is_demo: false,
  });
  if (record.status !== "approved")
    throw new AppError("This leaf has been removed from the public tree.", 410);
  return record.leaf;
}
export async function POST(request: Request) {
  const session = visitor(request);
  const respond = (
    body: unknown,
    status = 200,
    headers: Record<string, string> = {},
  ) =>
    Response.json(body, {
      status,
      headers: {
        ...noStore,
        ...(session.cookie ? { "Set-Cookie": session.cookie } : {}),
        ...headers,
      },
    });
  try {
    requireSameOrigin(request);
    const result = contributionSchema.safeParse(await readJson(request));
    if (!result.success)
      throw new AppError(
        result.error.issues[0]?.message ||
          "Please check your message and consent.",
      );
    const input = result.data,
      hash = createHash("sha256")
        .update(
          JSON.stringify({ aspiration: input.aspiration, theme: input.theme }),
        )
        .digest("hex");
    const existing = getByKey(input.idempotencyKey);
    if (existing) {
      if (existing.hash && existing.hash !== hash)
        throw new AppError(
          "This submission key was already used. Start a new hope.",
          409,
          "KEY_CONFLICT",
        );
      if (existing.status !== "approved")
        throw new AppError(
          "This leaf has been removed from the public tree.",
          410,
        );
      return respond({ leaf: existing.leaf, mode: existing.leaf.mode });
    }
    const inflight = flights.get(input.idempotencyKey);
    if (inflight) {
      if (inflight.hash !== hash)
        throw new AppError(
          "This submission key is processing another hope.",
          409,
          "KEY_CONFLICT",
        );
      const leaf = await inflight.promise;
      return respond({ leaf, mode: leaf.mode });
    }
    const globalRate = consumeRate(
      "submissions:global",
      Number(process.env.GLOBAL_RATE_LIMIT) || 60,
      60000,
    );
    const deviceRate = consumeRate(
      `submissions:${session.id}`,
      Number(process.env.SUBMISSION_RATE_LIMIT) || 5,
      600000,
    );
    if (!globalRate.allowed || !deviceRate.allowed) {
      const retryAfter = !globalRate.allowed
        ? globalRate.retryAfter
        : deviceRate.retryAfter;
      return respond(
        {
          error:
            "The tree needs a short pause. Please try again in a little while.",
          code: "RATE_LIMITED",
          retryAfter,
        },
        429,
        { "Retry-After": String(retryAfter) },
      );
    }
    const promise = processLeaf(input, hash);
    flights.set(input.idempotencyKey, { hash, promise });
    try {
      const leaf = await promise;
      after(async () => {
        await refreshReflection();
      });
      return respond({ leaf, mode: leaf.mode }, 201);
    } finally {
      flights.delete(input.idempotencyKey);
    }
  } catch (error) {
    if (error instanceof AppError && error.code === "MODERATION_REJECTED")
      recordMetric("rejected");
    const response = errorResponse(error);
    if (session.cookie) response.headers.set("Set-Cookie", session.cookie);
    return response;
  }
}
