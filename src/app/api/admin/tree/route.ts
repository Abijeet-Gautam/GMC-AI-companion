import { requireAdmin } from "@/server/auth";
import { treeSettingsSchema } from "@/lib/tree-settings";
import { getTreeSettings, saveTreeSettings } from "@/server/db";
import {
  AppError,
  errorResponse,
  noStore,
  readJson,
  requireSameOrigin,
} from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  try {
    requireAdmin(request);
    return Response.json({ settings: getTreeSettings() }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    requireAdmin(request);
    const result = treeSettingsSchema.safeParse(await readJson(request));
    if (!result.success)
      throw new AppError(
        "Check the tree settings: " + result.error.issues[0].message,
      );
    saveTreeSettings(result.data);
    return Response.json({ settings: result.data }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
