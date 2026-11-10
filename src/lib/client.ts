export function uuid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
// Avoid AbortSignal.any/timeout: many otherwise capable TV browsers lack them.
export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeout = 30000,
) {
  const controller = new AbortController(),
    parent = init?.signal;
  const abort = () => controller.abort(parent?.reason);
  if (parent?.aborted) abort();
  else parent?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () =>
      controller.abort(
        new DOMException("The request timed out.", "TimeoutError"),
      ),
    timeout,
  );
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", abort);
  }
}
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(
    /\/$/,
    "",
  );
}
