"use client";

// Tiny fetch wrapper for the browser. Same-origin calls to our own /api routes,
// so cookies (the session) are sent automatically.
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || "Request failed");
  return body as T;
}
