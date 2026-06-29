import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { authRuntime, safeAppRedirect, supabase } from "./authClient";
import type { SocialAuthProvider } from "./authClient";
import type { UserProfile } from "./types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthCredentials = {
  email: string;
  password: string;
  captchaToken?: string;
};

type PhoneOtpRequest = {
  phone: string;
  captchaToken?: string;
  displayName?: string;
  shouldCreateUser?: boolean;
};

type PhoneOtpVerification = {
  phone: string;
  token: string;
};

type MagicLinkRequest = {
  email: string;
  captchaToken?: string;
  displayName?: string;
  shouldCreateUser?: boolean;
};

type OnboardingInput = {
  displayName: string;
  privateProfile: boolean;
  motivationEnabled: boolean;
  leaderboardEnabled: boolean;
  interests: string[];
};

type AuthActionResult = {
  ok: boolean;
  nextPath?: string;
};

type AuthContextValue = {
  status: AuthStatus;
  profile: UserProfile | null;
  error: string | null;
  config: typeof authRuntime;
  login: (input: AuthCredentials) => Promise<AuthActionResult>;
  signup: (input: AuthCredentials & { displayName?: string }) => Promise<AuthActionResult>;
  requestMagicLink: (input: MagicLinkRequest) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  requestEmailVerification: (email?: string) => Promise<AuthActionResult>;
  requestPhoneOtp: (input: PhoneOtpRequest) => Promise<AuthActionResult>;
  verifyPhoneOtp: (input: PhoneOtpVerification) => Promise<AuthActionResult>;
  resetPassword: (input: { password: string }) => Promise<AuthActionResult>;
  verifyEmail: (token: string) => Promise<AuthActionResult>;
  completeAuthCallback: (input: { code?: string | null; errorDescription?: string | null }) => Promise<AuthActionResult>;
  signInWithProvider: (provider: SocialAuthProvider) => Promise<AuthActionResult>;
  signInWithPasskey: () => Promise<AuthActionResult>;
  registerPasskey: () => Promise<AuthActionResult>;
  completeOnboarding: (input: OnboardingInput) => Promise<AuthActionResult>;
  updateProfile: (input: Partial<Pick<UserProfile, "displayName" | "email" | "avatarUrl" | "privateProfile" | "motivationEnabled" | "leaderboardEnabled">>) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const devSessionKey = "avareno-dev-auth-profile";

const defaultDevProfile: UserProfile = {
  id: "user_stefan",
  authUserId: "dev_user_stefan",
  displayName: "Stefan",
  email: "stefan@avareno.local",
  avatarUrl: null,
  authProvider: "email",
  createdAt: "2026-06-21T10:00:00.000Z",
  updatedAt: "2026-06-21T10:00:00.000Z",
  emailVerified: true,
  onboardingCompleted: true,
  motivationEnabled: true,
  leaderboardEnabled: false,
  privateProfile: true,
  onboardingInterests: ["Produkte & Rechnungen merken", "Garantien & Erinnerungen"],
  weeklyXp: 180,
  totalXp: 2840,
  currentStreakDays: 6,
  longestStreakDays: 14,
  freezeDaysAvailable: 2
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (authRuntime.mode === "setup_required") {
      setProfile(null);
      setStatus("anonymous");
      return;
    }

    if (authRuntime.mode === "mock") {
      const existing = readStoredDevProfile();
      window.setTimeout(() => {
        if (!active) return;
        setProfile(existing);
        setStatus(existing ? "authenticated" : "anonymous");
      }, 160);
      return () => {
        active = false;
      };
    }

    if (!supabase) {
      setProfile(null);
      setStatus("anonymous");
      return;
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;

      if (sessionError) {
        setError(mapAuthError(sessionError.message));
      }

      applySession(data.session, setProfile, setStatus);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      applySession(session, setProfile, setStatus);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    profile,
    error,
    config: authRuntime,
    async login(input) {
      setError(null);

      if (authRuntime.mode === "mock") {
        return loginWithDevProfile(input, setProfile, setStatus, setError);
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        options: {
          captchaToken: input.captchaToken
        }
      });

      if (loginError || !data.session) {
        setError(mapAuthError(loginError?.message ?? "Login failed"));
        return { ok: false };
      }

      applySession(data.session, setProfile, setStatus);
      return { ok: true, nextPath: data.user?.user_metadata?.onboarding_completed ? "/app" : "/onboarding" };
    },
    async signup(input) {
      setError(null);

      if (authRuntime.mode === "mock") {
        return signupWithDevProfile(input, setProfile, setStatus, setError);
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const email = input.email.trim().toLowerCase();
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          emailRedirectTo: authRuntime.emailRedirectUrl,
          captchaToken: input.captchaToken,
          data: {
            display_name: input.displayName?.trim() || displayNameFromEmail(email),
            onboarding_completed: false,
            motivation_enabled: true,
            leaderboard_enabled: false,
            private_profile: true
          }
        }
      });

      if (signupError) {
        setError(mapAuthError(signupError.message));
        return { ok: false };
      }

      if (data.session) {
        applySession(data.session, setProfile, setStatus);
        return { ok: true, nextPath: "/onboarding" };
      }

      setStatus("anonymous");
      return { ok: true, nextPath: `/auth/verify-email?pending=1&email=${encodeURIComponent(email)}` };
    },
    async requestMagicLink(input) {
      setError(null);

      const email = input.email.trim().toLowerCase();
      if (!email.includes("@")) {
        setError("Bitte nutze eine gültige E-Mail-Adresse.");
        return { ok: false };
      }

      if (authRuntime.mode === "mock") {
        return { ok: true };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const shouldCreateUser = input.shouldCreateUser ?? false;
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser,
          emailRedirectTo: authRuntime.emailRedirectUrl,
          captchaToken: input.captchaToken,
          data: shouldCreateUser ? {
            display_name: input.displayName?.trim() || displayNameFromEmail(email),
            onboarding_completed: false,
            motivation_enabled: true,
            leaderboard_enabled: false,
            private_profile: true
          } : undefined
        }
      });

      if (magicLinkError) {
        setError(mapMagicLinkError(authErrorDetail(magicLinkError)));
        return { ok: false };
      }

      return { ok: true };
    },
    async requestPasswordReset(email) {
      setError(null);

      if (authRuntime.mode === "mock") {
        if (!email.includes("@")) {
          setError("Bitte gib eine gültige E-Mail-Adresse ein.");
          return { ok: false };
        }
        return { ok: true };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: authRuntime.resetPasswordUrl
      });

      if (resetError) {
        setError(mapAuthError(resetError.message));
        return { ok: false };
      }

      return { ok: true };
    },
    async requestEmailVerification(email) {
      setError(null);

      const targetEmail = email?.trim().toLowerCase() || profile?.email.trim().toLowerCase() || "";
      if (!targetEmail.includes("@")) {
        setError("Bitte nutze eine gültige E-Mail-Adresse.");
        return { ok: false };
      }

      if (authRuntime.mode === "mock") {
        if (profile) {
          const nextProfile = withUpdatedAt({ ...profile, email: targetEmail, emailVerified: true });
          storeDevProfile(nextProfile);
          setProfile(nextProfile);
        }
        return { ok: true };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: authRuntime.emailRedirectUrl
        }
      });

      if (resendError) {
        setError(mapAuthError(resendError.message));
        return { ok: false };
      }

      return { ok: true };
    },
    async requestPhoneOtp(input) {
      setError(null);

      const phone = normalizePhoneNumber(input.phone);
      if (!isE164PhoneNumber(phone)) {
        setError("Bitte nutze eine gültige Telefonnummer mit Landesvorwahl.");
        return { ok: false };
      }

      if (!authRuntime.phoneProvider.configured && authRuntime.mode !== "mock") {
        setError("Telefon-Login ist noch nicht konfiguriert.");
        return { ok: false };
      }

      if (authRuntime.mode === "mock") {
        return { ok: true };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const displayName = input.displayName?.trim() || displayNameFromPhone(phone);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          channel: "sms",
          shouldCreateUser: input.shouldCreateUser ?? true,
          captchaToken: input.captchaToken,
          data: {
            display_name: displayName,
            onboarding_completed: false,
            motivation_enabled: true,
            leaderboard_enabled: false,
            private_profile: true
          }
        }
      });

      if (otpError) {
        setError(mapPhoneOtpRequestError(authErrorDetail(otpError)));
        return { ok: false };
      }

      return { ok: true };
    },
    async verifyPhoneOtp(input) {
      setError(null);

      const phone = normalizePhoneNumber(input.phone);
      const token = input.token.replace(/\s+/g, "");

      if (!isE164PhoneNumber(phone)) {
        setError("Bitte nutze eine Telefonnummer im internationalen Format.");
        return { ok: false };
      }

      if (token.length < 4) {
        setError("Bitte gib den SMS-Code vollständig ein.");
        return { ok: false };
      }

      if (authRuntime.mode === "mock") {
        const now = new Date().toISOString();
        const authUserId = `dev_phone_${Date.now()}`;
        const nextProfile = withUpdatedAt({
          ...defaultDevProfile,
          id: authUserId,
          authUserId,
          displayName: displayNameFromPhone(phone),
          email: "",
          authProvider: "phone",
          createdAt: now,
          updatedAt: now,
          emailVerified: false,
          onboardingCompleted: false,
          weeklyXp: 0,
          totalXp: 0,
          currentStreakDays: 0,
          longestStreakDays: 0,
          freezeDaysAvailable: 0
        });
        storeDevProfile(nextProfile);
        setProfile(nextProfile);
        setStatus("authenticated");
        return { ok: true, nextPath: "/onboarding" };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms"
      });

      if (verifyError || !data.session) {
        setError(mapPhoneOtpError(verifyError ? authErrorDetail(verifyError) : { message: "Phone OTP verification failed" }));
        return { ok: false };
      }

      applySession(data.session, setProfile, setStatus);
      return { ok: true, nextPath: data.user?.user_metadata?.onboarding_completed ? "/app" : "/onboarding" };
    },
    async resetPassword(input) {
      setError(null);

      if (authRuntime.mode === "mock") {
        if (input.password.length < 8) {
          setError("Bitte nutze mindestens 8 Zeichen für dein neues Passwort.");
          return { ok: false };
        }
        return { ok: true, nextPath: "/login" };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Der Link ist abgelaufen. Fordere einfach einen neuen an.");
        return { ok: false };
      }

      const { data, error: updateError } = await supabase.auth.updateUser({ password: input.password });

      if (updateError || !data.user) {
        setError(mapAuthError(updateError?.message ?? "Password update failed"));
        return { ok: false };
      }

      setProfile(profileFromSupabaseUser(data.user));
      setStatus("authenticated");
      return { ok: true, nextPath: "/app" };
    },
    async verifyEmail(token) {
      setError(null);

      if (authRuntime.mode === "mock") {
        if (profile) {
          const nextProfile = withUpdatedAt({ ...profile, emailVerified: true });
          storeDevProfile(nextProfile);
          setProfile(nextProfile);
        }
        return { ok: true };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      if (!token.trim()) {
        return { ok: true };
      }

      return { ok: true };
    },
    async completeAuthCallback(input) {
      setError(null);

      if (input.errorDescription) {
        setError(mapAuthError(input.errorDescription));
        return { ok: false };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      if (!input.code) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          applySession(data.session, setProfile, setStatus);
          return { ok: true, nextPath: safeAppRedirect("/app") };
        }
        setError("OAuth Callback fehlgeschlagen. Bitte versuche es erneut.");
        return { ok: false };
      }

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(input.code);

      if (exchangeError || !data.session) {
        setError(mapAuthError(exchangeError?.message ?? "OAuth callback failed"));
        return { ok: false };
      }

      applySession(data.session, setProfile, setStatus);
      return { ok: true, nextPath: data.user?.user_metadata?.onboarding_completed ? "/app" : "/onboarding" };
    },
    async signInWithProvider(provider) {
      setError(null);

      const providerConfig = authRuntime.providers[provider];
      if (!providerConfig.configured) {
        setError("Diese Login-Methode ist noch nicht konfiguriert.");
        return { ok: false };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: authRuntime.redirectUrl,
          scopes: provider === "google" ? "email profile" : "name email"
        }
      });

      if (oauthError) {
        setError(mapAuthError(oauthError.message));
        return { ok: false };
      }

      return { ok: true };
    },
    async signInWithPasskey() {
      setError(null);

      if (!authRuntime.passkeyProvider.configured) {
        setError("Passkeys sind noch nicht konfiguriert.");
        return { ok: false };
      }

      if (!window.PublicKeyCredential) {
        setError("Dieser Browser unterstützt Passkeys nicht.");
        return { ok: false };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const { data, error: passkeyError } = await supabase.auth.signInWithPasskey();

      if (passkeyError || !data.session) {
        setError(mapAuthError(passkeyError?.message ?? "Passkey login failed"));
        return { ok: false };
      }

      applySession(data.session, setProfile, setStatus);
      return { ok: true, nextPath: data.user?.user_metadata?.onboarding_completed ? "/app" : "/onboarding" };
    },
    async registerPasskey() {
      setError(null);

      if (!authRuntime.passkeyProvider.configured) {
        setError("Passkeys sind noch nicht konfiguriert.");
        return { ok: false };
      }

      if (!window.PublicKeyCredential) {
        setError("Dieser Browser unterstützt Passkeys nicht.");
        return { ok: false };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError("Bitte melde dich zuerst an, bevor du einen Passkey einrichtest.");
        return { ok: false };
      }

      const { error: passkeyError } = await supabase.auth.registerPasskey();

      if (passkeyError) {
        setError(mapAuthError(passkeyError.message));
        return { ok: false };
      }

      return { ok: true };
    },
    async completeOnboarding(input) {
      setError(null);

      if (!input.displayName.trim()) {
        setError("Bitte gib einen Namen für dein Profil ein.");
        return { ok: false };
      }

      if (authRuntime.mode === "mock") {
        if (!profile) {
          setError("Bitte melde dich erneut an.");
          return { ok: false };
        }

        const nextProfile = withUpdatedAt({
          ...profile,
          displayName: input.displayName.trim(),
          privateProfile: input.privateProfile,
          motivationEnabled: input.motivationEnabled,
          leaderboardEnabled: input.leaderboardEnabled,
          onboardingCompleted: true,
          onboardingInterests: input.interests
        });
        storeDevProfile(nextProfile);
        setProfile(nextProfile);
        return { ok: true, nextPath: "/app" };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const { data, error: updateError } = await supabase.auth.updateUser({
        data: {
          display_name: input.displayName.trim(),
          private_profile: input.privateProfile,
          motivation_enabled: input.motivationEnabled,
          leaderboard_enabled: input.leaderboardEnabled,
          onboarding_completed: true,
          avareno_interests: input.interests
        }
      });

      if (updateError || !data.user) {
        setError(mapAuthError(updateError?.message ?? "Onboarding update failed"));
        return { ok: false };
      }

      setProfile(profileFromSupabaseUser(data.user));
      setStatus("authenticated");
      return { ok: true, nextPath: "/app" };
    },
    async updateProfile(input) {
      setError(null);

      if (!profile) {
        setError("Bitte melde dich erneut an.");
        return { ok: false };
      }

      if (input.email !== undefined && !input.email.includes("@")) {
        setError("Bitte nutze eine gültige E-Mail-Adresse.");
        return { ok: false };
      }

      if (input.displayName !== undefined && !input.displayName.trim()) {
        setError("Der Name darf nicht leer sein.");
        return { ok: false };
      }

      if (authRuntime.mode === "mock") {
        const nextEmail = input.email?.trim().toLowerCase() ?? profile.email;
        const emailChanged = nextEmail !== profile.email;
        const nextProfile = withUpdatedAt({
          ...profile,
          ...input,
          displayName: input.displayName?.trim() ?? profile.displayName,
          email: nextEmail,
          emailVerified: emailChanged ? false : profile.emailVerified
        });
        storeDevProfile(nextProfile);
        setProfile(nextProfile);
        return { ok: true };
      }

      if (!supabase) {
        return failWithSetupError(setError);
      }

      const { data, error: updateError } = await supabase.auth.updateUser({
        email: input.email?.trim().toLowerCase(),
        data: {
          display_name: input.displayName?.trim() ?? profile.displayName,
          avatar_url: input.avatarUrl ?? profile.avatarUrl,
          private_profile: input.privateProfile ?? profile.privateProfile,
          motivation_enabled: input.motivationEnabled ?? profile.motivationEnabled,
          leaderboard_enabled: input.leaderboardEnabled ?? profile.leaderboardEnabled
        }
      }, {
        emailRedirectTo: authRuntime.emailRedirectUrl
      });

      if (updateError || !data.user) {
        setError(mapAuthError(updateError?.message ?? "Profile update failed"));
        return { ok: false };
      }

      setProfile(profileFromSupabaseUser(data.user));
      return { ok: true };
    },
    async logout() {
      if (authRuntime.mode === "mock") {
        window.localStorage.removeItem(devSessionKey);
      } else if (supabase) {
        await supabase.auth.signOut();
      }

      setProfile(null);
      setStatus("anonymous");
    },
    clearError() {
      setError(null);
    }
  }), [error, profile, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

export function preventDefaultForm(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

function applySession(session: Session | null, setProfile: (profile: UserProfile | null) => void, setStatus: (status: AuthStatus) => void) {
  if (!session?.user) {
    setProfile(null);
    setStatus("anonymous");
    return;
  }

  setProfile(profileFromSupabaseUser(session.user));
  setStatus("authenticated");
}

function profileFromSupabaseUser(user: SupabaseUser): UserProfile {
  const metadata = user.user_metadata ?? {};
  const provider = normalizeProvider(user.app_metadata?.provider);
  const createdAt = user.created_at ?? new Date().toISOString();
  const phone = stringMeta(user.phone);

  return {
    id: user.id,
    authUserId: user.id,
    displayName: stringMeta(metadata.display_name) || stringMeta(metadata.full_name) || stringMeta(metadata.name) || (user.email ? displayNameFromEmail(user.email) : displayNameFromPhone(phone)),
    email: user.email ?? "",
    avatarUrl: stringMeta(metadata.avatar_url) || stringMeta(metadata.picture) || null,
    authProvider: provider,
    createdAt,
    updatedAt: user.updated_at ?? createdAt,
    emailVerified: Boolean(user.email_confirmed_at),
    onboardingCompleted: Boolean(metadata.onboarding_completed),
    motivationEnabled: metadata.motivation_enabled !== false,
    leaderboardEnabled: metadata.leaderboard_enabled === true,
    privateProfile: metadata.private_profile !== false,
    onboardingInterests: Array.isArray(metadata.avareno_interests) ? metadata.avareno_interests.filter((entry): entry is string => typeof entry === "string") : [],
    weeklyXp: 0,
    totalXp: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    freezeDaysAvailable: 0
  };
}

function loginWithDevProfile(input: AuthCredentials, setProfile: (profile: UserProfile | null) => void, setStatus: (status: AuthStatus) => void, setError: (error: string | null) => void): AuthActionResult {
  if (!input.email.includes("@") || input.password.length < 6) {
    setError("Login fehlgeschlagen. Bitte prüfe deine Eingaben.");
    return { ok: false };
  }

  const nextProfile = withUpdatedAt({
    ...defaultDevProfile,
    email: input.email.trim().toLowerCase(),
    displayName: displayNameFromEmail(input.email)
  });

  storeDevProfile(nextProfile);
  setProfile(nextProfile);
  setStatus("authenticated");
  return { ok: true, nextPath: nextProfile.onboardingCompleted ? "/app" : "/onboarding" };
}

function signupWithDevProfile(input: AuthCredentials & { displayName?: string }, setProfile: (profile: UserProfile | null) => void, setStatus: (status: AuthStatus) => void, setError: (error: string | null) => void): AuthActionResult {
  if (!input.email.includes("@") || input.password.length < 6) {
    setError("Bitte nutze eine gültige E-Mail und mindestens 6 Zeichen Passwort.");
    return { ok: false };
  }

  const now = new Date().toISOString();
  const authUserId = `dev_user_${Date.now()}`;
  const nextProfile: UserProfile = {
    ...defaultDevProfile,
    id: authUserId,
    authUserId,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName?.trim() || displayNameFromEmail(input.email),
    createdAt: now,
    updatedAt: now,
    emailVerified: true,
    onboardingCompleted: false,
    weeklyXp: 0,
    totalXp: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    freezeDaysAvailable: 0
  };

  storeDevProfile(nextProfile);
  setProfile(nextProfile);
  setStatus("authenticated");
  return { ok: true, nextPath: "/onboarding" };
}

function failWithSetupError(setError: (error: string | null) => void): AuthActionResult {
  setError(`Auth ist noch nicht konfiguriert. Fehlend: ${authRuntime.setupMissing.join(", ") || "Provider Setup"}.`);
  return { ok: false };
}

function readStoredDevProfile() {
  try {
    const stored = window.localStorage.getItem(devSessionKey) ?? window.localStorage.getItem("avareno-mock-auth-profile");
    return stored ? normalizeDevProfile(JSON.parse(stored) as Partial<UserProfile>) : null;
  } catch {
    return null;
  }
}

function storeDevProfile(profile: UserProfile) {
  window.localStorage.setItem(devSessionKey, JSON.stringify(profile));
}

function normalizeDevProfile(profile: Partial<UserProfile>): UserProfile {
  return {
    ...defaultDevProfile,
    ...profile,
    id: profile.id ?? defaultDevProfile.id,
    authUserId: profile.authUserId ?? profile.id ?? defaultDevProfile.authUserId,
    displayName: profile.displayName ?? defaultDevProfile.displayName,
    email: profile.email ?? defaultDevProfile.email,
    authProvider: normalizeProvider(profile.authProvider),
    createdAt: profile.createdAt ?? defaultDevProfile.createdAt,
    updatedAt: profile.updatedAt ?? profile.createdAt ?? defaultDevProfile.updatedAt,
    emailVerified: profile.emailVerified ?? true,
    onboardingCompleted: profile.onboardingCompleted ?? true,
    onboardingInterests: profile.onboardingInterests ?? defaultDevProfile.onboardingInterests
  };
}

function withUpdatedAt(profile: UserProfile): UserProfile {
  return { ...profile, updatedAt: new Date().toISOString() };
}

function normalizeProvider(provider: unknown): UserProfile["authProvider"] {
  if (provider === "phone") return "phone";
  if (provider === "google" || provider === "apple") return provider;
  return "email";
}

function stringMeta(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function displayNameFromEmail(email: string) {
  const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Avareno";
  return name.slice(0, 1).toUpperCase() + name.slice(1);
}

function displayNameFromPhone(phone: string) {
  const lastDigits = phone.replace(/\D/g, "").slice(-4);
  return lastDigits ? `Telefon ${lastDigits}` : "Avareno";
}

function normalizePhoneNumber(phone: string) {
  return phone.trim().replace(/[\s().-]/g, "");
}

function isE164PhoneNumber(phone: string) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

type AuthErrorDetail = {
  code?: string;
  message: string;
};

function authErrorDetail(error: { code?: string; message?: string }): AuthErrorDetail {
  return {
    code: error.code,
    message: error.message ?? "Auth action failed"
  };
}

function normalizedAuthDetail(detail: string | AuthErrorDetail) {
  const message = typeof detail === "string" ? detail : detail.message;
  const code = typeof detail === "string" ? "" : detail.code ?? "";
  return {
    code,
    message,
    normalized: `${code} ${message}`.toLowerCase()
  };
}

function mapAuthError(detail: string | AuthErrorDetail) {
  const { message, normalized } = normalizedAuthDetail(detail);

  if (normalized.includes("captcha") || normalized.includes("captcha_token")) {
    return "Captcha-Schutz ist in Supabase aktiv. Bitte richte Turnstile lokal ein oder deaktiviere Captcha Protection nur für den lokalen Test.";
  }

  if (normalized.includes("too many") || normalized.includes("rate limit") || normalized.includes("over request rate limit")) {
    return "Zu viele Versuche. Warte kurz und versuche es dann erneut.";
  }

  if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) {
    return "Login fehlgeschlagen. Bitte prüfe deine Eingaben.";
  }

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "Diese E-Mail ist bereits registriert.";
  }

  if (normalized.includes("email not confirmed") || normalized.includes("not confirmed")) {
    return "Bitte bestätige zuerst deine E-Mail.";
  }

  if (normalized.includes("phone") || normalized.includes("sms") || normalized.includes("otp")) {
    return "Telefon-Login konnte nicht abgeschlossen werden. Prüfe die Nummer, fordere einen frischen SMS-Code an und gib ihn ohne Leerzeichen ein.";
  }

  if (normalized.includes("expired") || normalized.includes("invalid token")) {
    return "Der Link ist abgelaufen. Fordere einfach einen neuen an.";
  }

  if (normalized.includes("code verifier") || normalized.includes("pkce")) {
    return `Der Google-Login wurde in einem anderen Browser oder unter einer anderen lokalen Adresse gestartet. Öffne Avareno Über ${new URL(authRuntime.redirectUrl).origin}, starte den Google-Login dort erneut und bleib im selben Browserfenster.`;
  }

  if (normalized.includes("passkey") || normalized.includes("webauthn")) {
    return "Passkey konnte nicht abgeschlossen werden. Prüfe, ob Passkeys in Supabase aktiviert sind und ob du im selben Browser und auf derselben Adresse angemeldet bist.";
  }

  if (normalized.includes("cancel")) {
    return "Login wurde abgebrochen.";
  }

  if (normalized.includes("network")) {
    return "Netzwerkfehler. Bitte versuche es gleich erneut.";
  }

  return `${message || "Diese Aktion konnte nicht abgeschlossen werden."} Brauchst du Hilfe? Schreib uns an ${authRuntime.supportEmail}.`;
}

function mapPhoneOtpError(detail: string | AuthErrorDetail) {
  const { normalized } = normalizedAuthDetail(detail);

  if (normalized.includes("expired") || normalized.includes("invalid token") || normalized.includes("otp expired") || (normalized.includes("token") && normalized.includes("invalid"))) {
    return "Der SMS-Code ist ungültig oder abgelaufen. Fordere bitte einen neuen Code an.";
  }

  if (normalized.includes("too many") || normalized.includes("rate limit") || normalized.includes("over request rate limit")) {
    return "Zu viele Versuche. Warte kurz und fordere dann einen neuen SMS-Code an.";
  }

  if (normalized.includes("captcha") || normalized.includes("captcha_token")) {
    return "Captcha-Schutz ist in Supabase aktiv. Bitte löse Turnstile erneut und fordere dann einen neuen SMS-Code an.";
  }

  return mapAuthError(detail);
}

function mapPhoneOtpRequestError(detail: string | AuthErrorDetail) {
  const { normalized } = normalizedAuthDetail(detail);

  if (normalized.includes("captcha") || normalized.includes("captcha_token")) {
    return "Captcha-Schutz ist in Supabase aktiv. Bitte löse Turnstile erneut und fordere dann den SMS-Code an.";
  }

  if (normalized.includes("provider") || normalized.includes("twilio") || normalized.includes("sms") || normalized.includes("messagebird") || normalized.includes("vonage")) {
    return "Supabase konnte die SMS nicht versenden. Prüfe in Supabase/Twilio den SMS-Provider, Sender, Guthaben/Trial-Freigabe und die Auth-Logs.";
  }

  if (normalized.includes("phone")) {
    return "Diese Telefonnummer wurde von Supabase nicht akzeptiert. Prüfe die Landesvorwahl und nutze eine erreichbare Mobilnummer.";
  }

  return mapAuthError(detail);
}

function mapMagicLinkError(detail: string | AuthErrorDetail) {
  const { normalized } = normalizedAuthDetail(detail);

  if (normalized.includes("captcha") || normalized.includes("captcha_token")) {
    return "Captcha-Schutz ist in Supabase aktiv. Bitte löse Turnstile erneut und sende dann den Magic Link.";
  }

  if (normalized.includes("signup") || normalized.includes("user not found") || normalized.includes("not found")) {
    return "Für diese E-Mail existiert noch kein Account. Erstelle zuerst einen Account oder nutze den Signup-Magic-Link.";
  }

  if (normalized.includes("redirect") || normalized.includes("not allowed")) {
    return "Magic Link konnte nicht gesendet werden. Prüfe in Supabase die Redirect URL für /auth/callback.";
  }

  return mapAuthError(detail);
}
