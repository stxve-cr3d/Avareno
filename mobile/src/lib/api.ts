import { getAuthAccessToken } from './supabase';

const apiOrigin = process.env.EXPO_PUBLIC_API_ORIGIN?.replace(/\/$/, '') ?? '';

export function apiResourceUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}

export type PlanLimitPayload = {
  error: 'plan_limit_exceeded';
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
    super(payload.detail || 'Plan-Limit erreicht.');
    this.name = 'PlanLimitError';
    this.payload = payload;
  }
}

/* Missing/expired session (middleware text is exactly "Authentication required").
   Unlike the web client there is no location to redirect; callers sign out so
   the auth gate flips back to the login screen. */
export class AuthRequiredError extends Error {
  constructor() {
    super('Anmeldung erforderlich.');
    this.name = 'AuthRequiredError';
  }
}

function throwApiError(status: number, body: { error?: string; detail?: unknown }): never {
  if (status === 402 && body.detail && typeof body.detail === 'object' && (body.detail as PlanLimitPayload).error === 'plan_limit_exceeded') {
    throw new PlanLimitError(body.detail as PlanLimitPayload);
  }
  if (status === 401 && body.detail === 'Authentication required') {
    throw new AuthRequiredError();
  }
  const detail = Array.isArray(body.detail)
    ? body.detail.map((entry: { msg?: string }) => entry.msg).filter(Boolean).join(', ')
    : typeof body.detail === 'string'
      ? body.detail
      : undefined;
  throw new Error(body.error ?? detail ?? 'Request failed');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = await getAuthAccessToken();

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(apiResourceUrl(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throwApiError(response.status, body);
  }

  return response.json() as Promise<T>;
}

export function isoDate(value?: string | null, locale = 'de-DE') {
  if (!value) return 'Kein Datum';
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
