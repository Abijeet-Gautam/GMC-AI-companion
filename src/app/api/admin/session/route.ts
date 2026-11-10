import { z } from "zod";
import { consumeRate } from "@/server/db";
import {
  isAdmin,
  verifyPassword,
  createAdminCookie,
  cookie,
} from "@/server/auth";
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
  return Response.json(
    {
      authenticated: isAdmin(request),
      configured: Boolean(process.env.ADMIN_PASSWORD),
    },
    { headers: noStore },
  );
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (!process.env.ADMIN_PASSWORD)
      throw new AppError(
        "Run npm run setup and restart the server to enable staff sign-in.",
        503,
      );
    const rate = consumeRate("admin:login", 10, 600000);
    if (!rate.allowed)
      return Response.json(
        { error: "Too many sign-in attempts. Please wait a few minutes." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
      );
    const data = z
      .object({ password: z.string().min(1).max(256) })
      .safeParse(await readJson(request));
    if (!data.success || !verifyPassword(data.data.password))
      throw new AppError("That password did not match.", 401);
    return Response.json(
      { authenticated: true },
      { headers: { ...noStore, "Set-Cookie": createAdminCookie(request) } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    return Response.json(
      { authenticated: false },
      {
        headers: {
          ...noStore,
          "Set-Cookie": cookie("gmc_admin", "", request, 0),
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
