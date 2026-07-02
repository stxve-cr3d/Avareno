import { getAuthAccessToken } from "./authClient";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "") ?? "";
  const headers = new Headers(options.headers);
  const token = await getAuthAccessToken();

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiOrigin}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = Array.isArray(body.detail) ? body.detail.map((entry: { msg?: string }) => entry.msg).filter(Boolean).join(", ") : body.detail;
    throw new Error(body.error ?? detail ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export function isoDate(value?: string | null, locale = "de-DE") {
  if (!value) return "Kein Datum";
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function dateInputValue(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
