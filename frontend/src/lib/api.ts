export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiOrigin = import.meta.env.VITE_API_ORIGIN?.replace(/\/$/, "") ?? "";
  const response = await fetch(`${apiOrigin}${path}`, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = Array.isArray(body.detail) ? body.detail.map((entry: { msg?: string }) => entry.msg).filter(Boolean).join(", ") : body.detail;
    throw new Error(body.error ?? detail ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export function isoDate(value?: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function dateInputValue(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}
