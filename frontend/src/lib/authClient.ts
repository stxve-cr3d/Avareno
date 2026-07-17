import { createClient } from "@supabase/supabase-js";
import type { Provider } from "@supabase/supabase-js";
import { betaFeatures } from "./betaFeatures";

export type SocialAuthProvider = Extract<Provider, "google" | "apple">;
export type AuthRuntimeMode = "supabase" | "mock" | "setup_required";

type ProviderState = {
  label: string;
  configured: boolean;
  envName: string;
  setupNote: string;
};

export type AuthRuntimeConfig = {
  mode: AuthRuntimeMode;
  ready: boolean;
  turnstileEnabled: boolean;
  turnstileSiteKey: string;
  redirectUrl: string;
  emailRedirectUrl: string;
  resetPasswordUrl: string;
  supportEmail: string;
  emailFrom: string;
  emailFromName: string;
  emailReplyTo: string;
  providers: Record<SocialAuthProvider, ProviderState>;
  phoneProvider: ProviderState;
  passkeyProvider: ProviderState;
  setupMissing: string[];
};

const requestedProvider = import.meta.env.VITE_AUTH_PROVIDER ?? "supabase";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  || "";
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";
const turnstileRequested = import.meta.env.VITE_AUTH_TURNSTILE_ENABLED === "true";
const origin = window.location.origin;

const mode: AuthRuntimeMode = requestedProvider === "mock"
  ? "mock"
  : supabaseUrl && supabasePublishableKey
    ? "supabase"
    : "setup_required";

export const authRuntime: AuthRuntimeConfig = {
  mode,
  ready: (mode === "supabase" || mode === "mock") && !(mode === "supabase" && turnstileRequested && !turnstileSiteKey),
  turnstileEnabled: mode === "supabase" && turnstileRequested && Boolean(turnstileSiteKey),
  turnstileSiteKey,
  redirectUrl: resolveAuthUrl(import.meta.env.VITE_AUTH_REDIRECT_URL, "/auth/callback"),
  emailRedirectUrl: resolveAuthUrl(import.meta.env.VITE_AUTH_EMAIL_REDIRECT_URL, "/auth/callback"),
  resetPasswordUrl: resolveAuthUrl(import.meta.env.VITE_AUTH_PASSWORD_RESET_URL, "/reset-password"),
  supportEmail: import.meta.env.VITE_AUTH_SUPPORT_EMAIL ?? "info@avareno.de",
  emailFrom: import.meta.env.VITE_AUTH_EMAIL_FROM ?? "noreply@avareno.de",
  emailFromName: import.meta.env.VITE_AUTH_EMAIL_FROM_NAME ?? "Avareno",
  emailReplyTo: import.meta.env.VITE_AUTH_EMAIL_REPLY_TO ?? "info@avareno.de",
  providers: {
    google: {
      label: "Google",
      configured: mode === "supabase" && betaFeatures.oauth && import.meta.env.VITE_AUTH_GOOGLE_ENABLED === "true",
      envName: "VITE_AUTH_GOOGLE_ENABLED",
      setupNote: "Google OAuth im Supabase Dashboard aktivieren und danach VITE_AUTH_GOOGLE_ENABLED=true setzen."
    },
    apple: {
      label: "Apple",
      configured: mode === "supabase" && betaFeatures.oauth && import.meta.env.VITE_AUTH_APPLE_ENABLED === "true",
      envName: "VITE_AUTH_APPLE_ENABLED",
      setupNote: "Apple OAuth im Supabase Dashboard aktivieren und danach VITE_AUTH_APPLE_ENABLED=true setzen."
    }
  },
  phoneProvider: {
    label: "SMS / Twilio",
    configured: mode === "supabase" && !betaFeatures.emailPasswordOnly && import.meta.env.VITE_AUTH_PHONE_ENABLED === "true",
    envName: "VITE_AUTH_PHONE_ENABLED",
    setupNote: "Phone Auth im Supabase Dashboard mit Twilio aktivieren und danach VITE_AUTH_PHONE_ENABLED=true setzen."
  },
  passkeyProvider: {
    label: "Passkey",
    configured: mode === "supabase" && !betaFeatures.emailPasswordOnly && import.meta.env.VITE_AUTH_PASSKEY_ENABLED === "true",
    envName: "VITE_AUTH_PASSKEY_ENABLED",
    setupNote: "Passkeys im Supabase Dashboard aktivieren und danach VITE_AUTH_PASSKEY_ENABLED=true setzen."
  },
  setupMissing: requestedProvider === "mock"
    ? []
    : [
      ...(!supabaseUrl ? ["VITE_SUPABASE_URL"] : []),
      ...(!supabasePublishableKey ? ["VITE_SUPABASE_PUBLISHABLE_KEY"] : []),
      ...(turnstileRequested && !turnstileSiteKey ? ["VITE_TURNSTILE_SITE_KEY"] : [])
    ]
};

export const supabase = mode === "supabase"
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      experimental: {
        passkey: !betaFeatures.emailPasswordOnly && import.meta.env.VITE_AUTH_PASSKEY_ENABLED === "true"
      },
      flowType: "pkce",
      persistSession: true,
      storageKey: "avareno-supabase-auth"
    }
  })
  : null;

function resolveAuthUrl(configured: string | undefined, path: string) {
  const value = configured?.trim();
  if (!value) return `${origin}${path}`;

  try {
    const url = new URL(value);
    const isLocalApp = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (isLocalApp && url.origin !== origin) {
      return `${origin}${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return `${origin}${path}`;
  }

  return value;
}

export async function getAuthAccessToken() {
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function isInternalAppRedirect(value: string | null | undefined) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login") && !value.startsWith("/signup") && !value.startsWith("/auth"));
}

export function safeAppRedirect(value: string | null | undefined) {
  return isInternalAppRedirect(value) ? value! : "/app";
}
