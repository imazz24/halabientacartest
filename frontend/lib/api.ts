import { ApiError } from "@/lib/api-error";
import { demoRouter } from "@/lib/demo/router";

export { ApiError } from "@/lib/api-error";

// Demo mode answers every request from in-memory seed data so the site is
// fully browsable on Vercel without a backend. It is ON by default; set
// NEXT_PUBLIC_DEMO=0 to talk to a real API (the Docker full-stack build).
const DEMO = process.env.NEXT_PUBLIC_DEMO !== "0";

// On the server we talk to the API directly (inside Docker that is the
// `backend` service); in the browser everything goes through the Next rewrites.
const API_BASE =
  typeof window === "undefined" ? process.env.BACKEND_URL || "http://localhost:8000" : "";

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((d: { msg?: string }) => d.msg || "Validation error")
        .join("; ");
    }
    return body.detail || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (DEMO) {
    return (await demoRouter(path, { ...options, headers }, token)) as T;
  }

  const response = await fetch(`${API_BASE}/api${path}`, { ...options, headers, cache: "no-store" });

  if (!response.ok) {
    const message = await parseError(response);
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const jsonBody = (data: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(data),
});