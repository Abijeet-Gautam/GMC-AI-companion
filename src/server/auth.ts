import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { sessionSecret } from "@/server/db";
import { AppError } from "@/server/http";
function signature(value: string) {
  return createHmac("sha256", sessionSecret).update(value).digest("hex");
}
function equal(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function cookieValue(request: Request, name: string) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(name + "="))
    ?.slice(name.length + 1);
}
export function cookie(
  name: string,
  value: string,
  request: Request,
  maxAge: number,
) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function visitor(request: Request) {
  const current = cookieValue(request, "gmc_visitor");
  if (current) {
    const [id, sig] = current.split(".");
    if (id && sig && equal(signature(id), sig)) return { id, cookie: null };
  }
  const id = randomUUID();
  return {
    id,
    cookie: cookie(
      "gmc_visitor",
      `${id}.${signature(id)}`,
      request,
      60 * 60 * 12,
    ),
  };
}
export function verifyPassword(password: string) {
  return Boolean(
    process.env.ADMIN_PASSWORD &&
    equal(signature(password), signature(process.env.ADMIN_PASSWORD)),
  );
}
export function createAdminCookie(request: Request) {
  const payload = `admin:${Date.now() + 8 * 60 * 60 * 1000}`;
  return cookie(
    "gmc_admin",
    `${payload}.${signature(payload + ":" + process.env.ADMIN_PASSWORD)}`,
    request,
    8 * 60 * 60,
  );
}
export function isAdmin(request: Request) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const value = cookieValue(request, "gmc_admin");
  if (!value) return false;
  const [payload, sig] = value.split(".");
  if (
    !payload ||
    !sig ||
    !equal(signature(payload + ":" + process.env.ADMIN_PASSWORD), sig)
  )
    return false;
  return payload.startsWith("admin:") && Number(payload.slice(6)) > Date.now();
}
export function requireAdmin(request: Request) {
  if (!isAdmin(request))
    throw new AppError("Sign in to the staff console.", 401, "UNAUTHORIZED");
}
