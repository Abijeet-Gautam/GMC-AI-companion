import { treeStats } from "@/server/db";
import { noStore } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(treeStats(), { headers: noStore });
}
