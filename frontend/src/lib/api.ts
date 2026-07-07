import { getAuthAccessToken } from "./authClient";

export function apiResourceUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const apiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "") ?? "";
  return `${apiOrigin}${path.startsWith("/") ? path : `/${path}`}`;
}

export type PlanLimitPayload = {
  error: "plan_limit_exceeded";
  limitKey: string;
  limit: number;
  current: number;
  planKey: string;
  detail: string;
};

/* HTTP 402 from the backend: a plan limit or feature gate blocked the action.
   error.message carries the German user-facing text; payload has the numbers
   so surfaces can render a proper upgrade prompt. */
export class PlanLimitError extends Error {
  payload: PlanLimitPayload;

  constructor(payload: PlanLimitPayload) {
    super(payload.detail || "Plan-Limit erreicht.");
    this.name = "PlanLimitError";
    this.payload = payload;
  }
}

function throwApiError(status: number, body: { error?: string; detail?: unknown }): never {
  if (status === 402 && body.detail && typeof body.detail === "object" && (body.detail as PlanLimitPayload).error === "plan_limit_exceeded") {
    throw new PlanLimitError(body.detail as PlanLimitPayload);
  }
  // Missing session (middleware text is exactly "Authentication required"):
  // send the user to login instead of surfacing a misleading network error.
  // Other 401s (vault tickets, invalid tokens mid-session) keep normal flow.
  if (status === 401 && body.detail === "Authentication required" && !window.location.pathname.startsWith("/login")) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/login?next=${next}`);
    throw new Error("Anmeldung erforderlich - du wirst zum Login weitergeleitet.");
  }
  const detail = Array.isArray(body.detail)
    ? body.detail.map((entry: { msg?: string }) => entry.msg).filter(Boolean).join(", ")
    : typeof body.detail === "string"
      ? body.detail
      : undefined;
  throw new Error(body.error ?? detail ?? "Request failed");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = await getAuthAccessToken();

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiResourceUrl(path), {
    ...options,
    headers
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(response.status, body);
  }

  return response.json() as Promise<T>;
}

export async function apiBlob(path: string, options: RequestInit = {}): Promise<{ blob: Blob; fileName?: string }> {
  const headers = new Headers(options.headers);
  const token = await getAuthAccessToken();

  if (!(options.body instanceof FormData) && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiResourceUrl(path), {
    ...options,
    headers
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(response.status, body);
  }

  return {
    blob: await response.blob(),
    fileName: fileNameFromContentDisposition(response.headers.get("Content-Disposition"))
  };
}

function fileNameFromContentDisposition(value: string | null) {
  if (!value) return undefined;
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
  }
  const asciiMatch = value.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1];
}

export function isoDate(value?: string | null, locale = "de-DE") {
  if (!value) return "Kein Datum";
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function dateInputValue(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
