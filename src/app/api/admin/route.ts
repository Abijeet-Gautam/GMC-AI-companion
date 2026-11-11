import { z } from "zod";
import {
  db,
  adminLeaves,
  treeStats,
  setLeafStatus,
  seedDemo,
  clearDemo,
} from "@/server/db";
import { refreshReflection, aiMode, aiModel } from "@/server/services/ai";
import { requireAdmin } from "@/server/auth";
import {
  readJson,
  requireSameOrigin,
  errorResponse,
  AppError,
  noStore,
} from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  try {
    requireAdmin(request);
    return Response.json(
      {
        leaves: adminLeaves(),
        stats: treeStats(),
        ai: aiMode(),
        model: aiModel(),
        metrics: Object.fromEntries(
          db
            .prepare("SELECT key,count FROM metrics")
            .all()
            .map((row) => [row.key, Number(row.count)]),
        ),
        audit: db
          .prepare(
            "SELECT action,leaf_id,created_at FROM audit_events ORDER BY id DESC LIMIT 30",
          )
          .all(),
      },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    id: z.string().uuid(),
    status: z.enum(["approved", "hidden"]),
  }),
  z.object({ action: z.literal("seed") }),
  z.object({ action: z.literal("clear_demo") }),
  z.object({ action: z.literal("reflect") }),
]);
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requireAdmin(request);
    const result = actionSchema.safeParse(await readJson(request));
    if (!result.success) throw new AppError("Invalid staff action.");
    const input = result.data;
    if (input.action === "status") {
      if (!setLeafStatus(input.id, input.status))
        throw new AppError("Leaf not found or already updated.", 404);
    }
    if (input.action === "seed") seedDemo();
    if (input.action === "clear_demo") clearDemo();
    await refreshReflection();
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
