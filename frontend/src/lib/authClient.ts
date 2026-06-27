import { createClient } from "@supabase/supabase-js";
import type { Provider } from "@supabase/supabase-js";

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
  redirectUrl: string;
  emailRedirectUrl: string;
  resetPasswordUrl: string;
  supportEmail: string;
  emailFrom: string;
  emailFromName: string;
  emailReplyTo: string;
  providers: Record<SocialAuthProvider, ProviderState>;
  setupMissing: string[];
};

const requestedProvider = import.meta.env.VITE_AUTH_PROVIDER ?? "supabase";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  || "";
const origin = window.location.origin;

const mode: AuthRuntimeMode = requestedProvider === "mock"
  ? "mock"
  : supabaseUrl && supabasePublishableKey
    ? "supabase"
    : "setup_required";

export const authRuntime: AuthRuntimeConfig = {
  mode,
  ready: mode === "supabase" || mode === "mock",
  redirectUrl: import.meta.env.VITE_AUTH_REDIRECT_URL ?? `${origin}/auth/callback`,
  emailRedirectUrl: import.meta.env.VITE_AUTH_EMAIL_REDIRECT_URL ?? `${origin}/auth/callback`,
  resetPasswordUrl: import.meta.env.VITE_AUTH_PASSWORD_RESET_URL ?? `${origin}/reset-password`,
  supportEmail: import.meta.env.VITE_AUTH_SUPPORT_EMAIL ?? "info@avareno.de",
  emailFrom: import.meta.env.VITE_AUTH_EMAIL_FROM ?? "noreply@avareno.de",
  emailFromName: import.meta.env.VITE_AUTH_EMAIL_FROM_NAME ?? "Avareno",
  emailReplyTo: import.meta.env.VITE_AUTH_EMAIL_REPLY_TO ?? "info@avareno.de",
  providers: {
    google: {
      label: "Google",
      configured: mode === "supabase" && import.meta.env.VITE_AUTH_GOOGLE_ENABLED === "true",
      envName: "VITE_AUTH_GOOGLE_ENABLED",
      setupNote: "Google OAuth im Supabase Dashboard aktivieren und danach VITE_AUTH_GOOGLE_ENABLED=true setzen."
    },
    apple: {
      label: "Apple",
      configured: mode === "supabase" && import.meta.env.VITE_AUTH_APPLE_ENABLED === "true",
      envName: "VITE_AUTH_APPLE_ENABLED",
      setupNote: "Apple OAuth im Supabase Dashboard aktivieren und danach VITE_AUTH_APPLE_ENABLED=true setzen."
    }
  },
  setupMissing: requestedProvider === "mock"
    ? []
    : [
      ...(!supabaseUrl ? ["VITE_SUPABASE_URL"] : []),
      ...(!supabasePublishableKey ? ["VITE_SUPABASE_PUBLISHABLE_KEY"] : [])
    ]
};

export const supabase = mode === "supabase"
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      persistSession: true,
      storageKey: "avareno-supabase-auth"
    }
  })
  : null;

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
