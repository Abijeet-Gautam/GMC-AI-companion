import { db } from "@/server/db";
import { aiMode } from "@/server/services/ai";
import { noStore } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  try {
    db.prepare("SELECT 1").get();
    return Response.json(
      {
        status: "ok",
        database: "sqlite",
        ai: aiMode(),
        serverTime: new Date().toISOString(),
      },
      { headers: noStore },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: noStore },
    );
  }
}
