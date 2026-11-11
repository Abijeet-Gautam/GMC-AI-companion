import { noStore } from "@/server/http";
import { aiMode } from "@/server/services/ai";
import { asyncRevision } from "@/server/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await asyncRevision();
    return Response.json(
      {
        status: "ok",
        database: "postgres",
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
