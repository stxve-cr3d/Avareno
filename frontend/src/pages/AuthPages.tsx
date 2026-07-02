import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, CheckCircle2, CircleX, CreditCard, Fingerprint, KeyRound, Link2, LogOut, Mail, ShieldCheck, Smartphone, Trash2, Upload, UserRound } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { safeAppRedirect, supabase } from "../lib/authClient";
import type { SocialAuthProvider } from "../lib/authClient";
import { useAuth } from "../lib/authProvider";
import { useLanguage } from "../lib/language";
import { api } from "../lib/api";
import { formatPrice as formatPlanPrice, getPlanById } from "../lib/pricing";
import type { BillingStatus, CheckoutRequest, PlanKey } from "../lib/types";
import { formatUiText } from "../lib/uiText";
import { AppLoadingBar } from "../components/app/AppKit";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { useNotifications } from "../components/app/Notifications";
import { useTheme, type ResolvedTheme } from "../lib/theme";

type AuthMode = "login" | "signup";
type AuthLoginMethod = "email" | "phone";
type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  theme?: "dark" | "light" | "auto";
  size?: "normal" | "compact";
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

const onboardingOptions = [
  "Produkte & Rechnungen merken",
  "Garantien & Erinnerungen",
  "Hilfe Über Resolve",
  "3D-Druck / Ersatzteile später"
];
const phoneCountries = [
  { code: "DE", dialCode: "+49", flag: "🇩🇪", label: "Deutschland" },
  { code: "AT", dialCode: "+43", flag: "🇦🇹", label: "Österreich" },
  { code: "CH", dialCode: "+41", flag: "🇨🇭", label: "Schweiz" },
  { code: "NL", dialCode: "+31", flag: "🇳🇱", label: "Niederlande" },
  { code: "BE", dialCode: "+32", flag: "🇧🇪", label: "Belgien" },
  { code: "FR", dialCode: "+33", flag: "🇫🇷", label: "Frankreich" }
];
const avatarBucket = "avatars";
const maxAvatarSize = 2 * 1024 * 1024;

export function LoginPage() {
  return <AuthForm mode="login" />;
}

export function SignupPage() {
  return <AuthForm mode="signup" />;
}

export function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  if (auth.status === "authenticated") {
    return <Navigate to="/app" replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await auth.requestPasswordReset(email);
    setSent(result.ok);
  }

  return (
    <AuthSurface label="Passwort zurücksetzen">
      <AuthIntro
        eyebrow="Zugang"
        title="Passwort vergessen?"
        body={`Wir senden dir einen sicheren Link zum Zurücksetzen. Fragen? Schreib uns an ${auth.config.supportEmail}.`}
      />

      {!auth.config.ready ? <AuthSetupNotice missing={auth.config.setupMissing} /> : null}

      <form className="auth-form" onSubmit={submit}>
        <AuthField icon={<Mail size={17} />} label="E-Mail">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="du@example.com" type="email" />
        </AuthField>

        <AuthMessage error={auth.error} success={sent ? `Wenn diese Adresse existiert, erhältst du einen sicheren Link von ${auth.config.emailFromName} <${auth.config.emailFrom}>.` : null} />

        <button className="auth-primary" disabled={!auth.config.ready} type="submit">
          Link anfordern
          <ArrowRight size={17} />
        </button>
      </form>

      <p className="auth-switch">
        Wieder eingefallen? <Link to="/login">Einloggen</Link>
      </p>
    </AuthSurface>
  );
}

export function ResetPasswordPage() {
  const auth = useAuth();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await auth.resetPassword({ password });
    setDone(result.ok);
  }

  return (
    <AuthSurface label="Neues Passwort setzen">
      <AuthIntro
        eyebrow="Sicherer Link"
        title="Neues Passwort"
        body="Setze ein neues Passwort für deinen privaten Avareno-Zugang."
      />

      {!auth.config.ready ? <AuthSetupNotice missing={auth.config.setupMissing} /> : null}

      <form className="auth-form" onSubmit={submit}>
        <AuthField icon={<KeyRound size={17} />} label="Neues Passwort">
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mindestens 8 Zeichen" type="password" />
        </AuthField>

        <AuthMessage error={auth.error} success={done ? "Dein Passwort wurde gespeichert. Du kannst Avareno weiter nutzen." : null} />

        <button className="auth-primary" disabled={!auth.config.ready} type="submit">
          Passwort speichern
          <ArrowRight size={17} />
        </button>
      </form>

      <p className="auth-switch">
        Zurück zum <Link to="/login">Login</Link>
      </p>
    </AuthSurface>
  );
}

export function EmailVerifyPage() {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const [verified, setVerified] = useState(false);
  const token = searchParams.get("token") ?? "";
  const pending = searchParams.get("pending") === "1";
  const email = searchParams.get("email");

  useEffect(() => {
    if (pending) {
      return;
    }

    let active = true;

    auth.verifyEmail(token).then((result) => {
      if (active) {
        setVerified(result.ok);
      }
    });

    return () => {
      active = false;
    };
  }, [pending, token]);

  return (
    <AuthSurface label="E-Mail bestätigen">
      <AuthIntro
        eyebrow="Bestätigung"
        title={pending ? "E-Mail prüfen" : verified ? "E-Mail bestätigt" : "Link prüfen"}
        body={pending ? `Wir haben einen Bestätigungslink an ${email ?? "deine Adresse"} gesendet. Automatische Auth-Mails kommen von ${auth.config.emailFrom}.` : verified ? "Dein Account ist jetzt als bestätigt markiert." : "Wir prüfen den Bestätigungslink für deinen Account."}
      />

      <AuthMessage error={auth.error} success={pending ? `Antworten gehen an ${auth.config.emailReplyTo}.` : verified ? "Du kannst Avareno weiter nutzen." : null} />

      <Link className="auth-primary" to="/app">
        Weiter zu Avareno
        <ArrowRight size={17} />
      </Link>
    </AuthSurface>
  );
}

export function AuthCallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [handled, setHandled] = useState(false);
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description") ?? searchParams.get("error");

  useEffect(() => {
    let active = true;

    auth.completeAuthCallback({ code, errorDescription }).then((result) => {
      if (!active) {
        return;
      }

      setHandled(true);

      if (result.ok) {
        navigate(result.nextPath ?? "/app", { replace: true });
      }
    });

    return () => {
      active = false;
    };
  }, [code, errorDescription, navigate]);

  return (
    <AuthSurface label="Auth Callback">
      <AuthIntro
        eyebrow="Provider"
        title="Login prüfen"
        body="Der externe Login kommt hier sicher zurück und wird über Supabase eingelöst."
      />

      <AuthMessage error={auth.error} success={handled && !auth.error ? "Callback abgeschlossen." : null} />

      <p className="auth-switch">
        Zurück zum <Link to="/login">Login</Link>
      </p>
    </AuthSurface>
  );
}

export function OnboardingPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(auth.profile?.displayName ?? "");
  const [privateProfile, setPrivateProfile] = useState(true);
  const [motivationEnabled, setMotivationEnabled] = useState(true);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false);
  const [interests, setInterests] = useState<string[]>(["Produkte & Rechnungen merken", "Garantien & Erinnerungen"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (auth.status === "loading") {
    return (
      <AuthSurface label="Onboarding wird vorbereitet">
        <AuthIntro
          eyebrow="Zugang"
          title="Privaten Speicher laden"
          body="Wir prüfen kurz deine Supabase-Session und bereiten den ersten Start vor."
        />
      </AuthSurface>
    );
  }

  if (auth.status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  if (auth.status === "authenticated" && auth.profile?.onboardingCompleted) {
    return <Navigate to="/app" replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await auth.completeOnboarding({ displayName, privateProfile, motivationEnabled, leaderboardEnabled, interests });
    setIsSubmitting(false);

    if (result.ok) {
      navigate(result.nextPath ?? "/app", { replace: true });
    }
  }

  function toggleInterest(interest: string) {
    setInterests((current) => current.includes(interest) ? current.filter((entry) => entry !== interest) : [...current, interest]);
  }

  return (
    <AuthSurface label="Onboarding">
      <AuthIntro
        eyebrow="Erster Start"
        title="Dein privater Speicher"
        body="Kurz einstellen, wofür Avareno dir zuerst helfen soll. Alles Optionale kannst du später ändern."
      />

      <form className="auth-form" onSubmit={submit}>
        <p className="auth-step-label">1. Name</p>
        <AuthField icon={<UserRound size={17} />} label="Anzeigename">
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Dein Name" type="text" />
        </AuthField>

        <p className="auth-step-label">2. Wobei soll Avareno helfen?</p>
        <div className="auth-choice-list">
          {onboardingOptions.map((interest) => (
            <label className="auth-toggle" key={interest}>
              <input checked={interests.includes(interest)} onChange={() => toggleInterest(interest)} type="checkbox" />
              <span>
                <strong>{interest}</strong>
              </span>
            </label>
          ))}
        </div>

        <p className="auth-step-label">3. Optional</p>
        <label className="auth-toggle">
          <input checked={privateProfile} onChange={(event) => setPrivateProfile(event.target.checked)} type="checkbox" />
          <span>
            <strong>Profil privat halten</strong>
            <small>Freunde sehen nur das, was du später bewusst freigibst.</small>
          </span>
        </label>

        <label className="auth-toggle">
          <input checked={motivationEnabled} onChange={(event) => setMotivationEnabled(event.target.checked)} type="checkbox" />
          <span>
            <strong>Sanfte Erinnerungen erlauben</strong>
            <small>Keine Spielmechanik, nur kleine Hinweise für offene Punkte.</small>
          </span>
        </label>

        <label className="auth-toggle">
          <input checked={leaderboardEnabled} onChange={(event) => setLeaderboardEnabled(event.target.checked)} type="checkbox" />
          <span>
            <strong>Privaten Freunde-Überblick aktivieren</strong>
            <small>Optional und nur für eingeladene Freunde sichtbar.</small>
          </span>
        </label>

        <AuthMessage error={auth.error} success={null} />

        <button className="auth-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Speichere Start..." : "Avareno starten"}
          <ArrowRight size={17} />
        </button>
      </form>
    </AuthSurface>
  );
}

export function AccountSettingsPage() {
  const auth = useAuth();
  const { notify } = useNotifications();
  const { language, languageLabel } = useLanguage();
  const { actualTheme, themeLabel } = useTheme();
  const [displayName, setDisplayName] = useState(auth.profile?.displayName ?? "");
  const [email, setEmail] = useState(auth.profile?.email ?? "");
  const [avatarUrl, setAvatarUrl] = useState(auth.profile?.avatarUrl ?? "");
  const [privateProfile, setPrivateProfile] = useState(auth.profile?.privateProfile ?? true);
  const [motivationEnabled, setMotivationEnabled] = useState(auth.profile?.motivationEnabled ?? true);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(auth.profile?.leaderboardEnabled ?? false);
  const [saved, setSaved] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [passkeySaved, setPasskeySaved] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyMessageActive, setPasskeyMessageActive] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [connectingProvider, setConnectingProvider] = useState<SocialAuthProvider | null>(null);
  const [providerMessage, setProviderMessage] = useState("");
  const [providerError, setProviderError] = useState("");
  const [isSendingEmailVerification, setIsSendingEmailVerification] = useState(false);
  const [emailVerificationMessage, setEmailVerificationMessage] = useState("");
  const [emailVerificationError, setEmailVerificationError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingError, setBillingError] = useState("");
  const [billingMessage, setBillingMessage] = useState("");
  const [billingBusy, setBillingBusy] = useState<"status" | "checkout" | "portal" | null>(null);

  useEffect(() => {
    if (!auth.profile) {
      return;
    }

    setDisplayName(auth.profile.displayName);
    setEmail(auth.profile.email);
    setAvatarUrl(auth.profile.avatarUrl ?? "");
    setPrivateProfile(auth.profile.privateProfile);
    setMotivationEnabled(auth.profile.motivationEnabled);
    setLeaderboardEnabled(auth.profile.leaderboardEnabled);
  }, [auth.profile]);

  useEffect(() => {
    if (auth.status !== "authenticated") {
      return;
    }
    void loadBillingStatus();
  }, [auth.status]);

  if (auth.status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasskeyMessageActive(false);
    setEmailVerificationMessage("");
    setEmailVerificationError("");
    setIsSavingProfile(true);
    try {
      const result = await auth.updateProfile({ displayName, email, avatarUrl: avatarUrl || null, privateProfile, motivationEnabled, leaderboardEnabled });
      setSaved(result.ok);
      if (result.ok) {
        notify({
          variant: "success",
          title: "Account-Einstellungen gespeichert",
          description: "Dein Profil wurde aktualisiert."
        });
      }
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function requestEmailConfirmation() {
    const normalizedEmail = email.trim().toLowerCase();
    const profileEmail = auth.profile?.email.trim().toLowerCase() ?? "";
    const emailChanged = normalizedEmail !== profileEmail;

    setEmailVerificationMessage("");
    setEmailVerificationError("");
    setPasskeyMessageActive(false);

    if (!normalizedEmail.includes("@")) {
      setEmailVerificationError("Bitte nutze eine gültige E-Mail-Adresse.");
      return;
    }

    setIsSendingEmailVerification(true);

    if (emailChanged) {
      const result = await auth.updateProfile({ displayName, email: normalizedEmail, avatarUrl: avatarUrl || null, privateProfile, motivationEnabled, leaderboardEnabled });
      setSaved(result.ok);
      setIsSendingEmailVerification(false);

      if (result.ok) {
        setEmailVerificationMessage("Wir haben eine Bestätigung an die neue Adresse gesendet.");
        return;
      }

      setEmailVerificationError(auth.error ?? "Die Bestätigung konnte nicht gestartet werden.");
      return;
    }

    const result = await auth.requestEmailVerification(normalizedEmail);
    setIsSendingEmailVerification(false);

    if (result.ok) {
      setEmailVerificationMessage(auth.config.mode === "mock" ? "E-Mail wurde im Demo-Modus bestätigt." : "Bestätigungs-Mail wurde erneut gesendet.");
      return;
    }

    setEmailVerificationError(auth.error ?? "Bestätigungs-Mail konnte nicht gesendet werden.");
  }

  async function uploadAvatar(file?: File | null) {
    if (!file) return;
    setAvatarError("");
    setAvatarMessage("");

    if (!file.type.startsWith("image/")) {
      setAvatarError("Bitte lade ein Bild hoch.");
      return;
    }

    if (file.size > maxAvatarSize) {
      setAvatarError("Profilbilder d\u00fcrfen maximal 2 MB gro\u00df sein.");
      return;
    }

    setUploadingAvatar(true);

    try {
      if (auth.config.mode === "supabase" && supabase && auth.profile) {
        const extension = avatarExtension(file);
        const owner = safeStorageSegment(auth.profile.authUserId || auth.profile.id);
        const path = `${owner}/avatar-${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from(avatarBucket).upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false
        });

        if (uploadError) {
          throw uploadError;
        }

        const { data } = supabase.storage.from(avatarBucket).getPublicUrl(path);
        setAvatarUrl(data.publicUrl);
        setAvatarMessage("Profilbild hochgeladen. Speichern \u00fcbernimmt es ins Profil.");
        setSaved(false);
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      setAvatarUrl(dataUrl);
      setAvatarMessage("Profilbild lokal vorgemerkt. Speichern \u00fcbernimmt es ins Profil.");
      setSaved(false);
    } catch (caught) {
      setAvatarError(caught instanceof Error ? caught.message : "Profilbild konnte nicht hochgeladen werden.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function setupPasskey() {
    setPasskeyMessageActive(true);
    setPasskeySaved(false);
    setIsRegisteringPasskey(true);
    const result = await auth.registerPasskey();
    setIsRegisteringPasskey(false);
    setPasskeySaved(result.ok);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setPasswordError("Bitte nutze mindestens 8 Zeichen.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setPasswordError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsChangingPassword(true);
    const result = await auth.resetPassword({ password: newPassword });
    setIsChangingPassword(false);

    if (result.ok) {
      setNewPassword("");
      setNewPasswordConfirm("");
      setPasswordMessage("Passwort wurde geändert.");
      return;
    }

    setPasswordError(auth.error ?? "Passwort konnte nicht geändert werden.");
  }

  async function connectProvider(provider: SocialAuthProvider) {
    setProviderError("");
    setProviderMessage("");
    setConnectingProvider(provider);

    try {
      if (auth.config.mode === "supabase" && supabase?.auth.linkIdentity) {
        const { error } = await supabase.auth.linkIdentity({ provider });
        if (error) {
          throw error;
        }
        setProviderMessage(`${auth.config.providers[provider].label} wird verbunden.`);
        return;
      }

      const result = await auth.signInWithProvider(provider);
      if (!result.ok) {
        setProviderError(auth.error ?? `${auth.config.providers[provider].label} konnte nicht verbunden werden.`);
      }
    } catch (caught) {
      setProviderError(providerLinkErrorMessage(caught, auth.config.providers[provider].label));
    } finally {
      setConnectingProvider(null);
    }
  }

  async function loadBillingStatus() {
    setBillingBusy("status");
    setBillingError("");
    try {
      const result = await api<BillingStatus>("/api/billing/status");
      setBilling(result);
    } catch (caught) {
      setBillingError(caught instanceof Error ? caught.message : "Planstatus konnte nicht geladen werden.");
    } finally {
      setBillingBusy(null);
    }
  }

  async function startCheckout(planKey: PlanKey) {
    setBillingBusy("checkout");
    setBillingError("");
    setBillingMessage("");
    try {
      const result = await api<{ checkoutUrl: string; mode: "checkout" | "free"; provider?: string | null }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planKey } satisfies CheckoutRequest)
      });
      if (result.checkoutUrl.startsWith("https://")) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setBillingMessage("Für diesen Plan ist kein Checkout nötig.");
      await loadBillingStatus();
    } catch (caught) {
      setBillingError(caught instanceof Error ? caught.message : "Checkout ist noch nicht verfügbar.");
    } finally {
      setBillingBusy(null);
    }
  }

  async function openBillingPortal() {
    setBillingBusy("portal");
    setBillingError("");
    setBillingMessage("");
    try {
      const result = await api<{ portalUrl: string }>("/api/billing/portal", {
        method: "POST",
        body: JSON.stringify({ returnUrl: window.location.href })
      });
      window.location.assign(result.portalUrl);
    } catch (caught) {
      setBillingError(caught instanceof Error ? caught.message : "Abo-Verwaltung ist noch nicht konfiguriert.");
    } finally {
      setBillingBusy(null);
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  const profileEmail = auth.profile?.email.trim().toLowerCase() ?? "";
  const emailChanged = normalizedEmail !== profileEmail;
  const emailIsValid = normalizedEmail.includes("@");
  const emailIsVerified = Boolean(auth.profile?.emailVerified) && !emailChanged;
  const emailStatusLabel = emailIsVerified ? "Bestätigt" : emailChanged ? "Noch nicht gespeichert" : "Nicht bestätigt";
  const profileBusy = isSavingProfile || uploadingAvatar || isSendingEmailVerification;
  const providerBusy = isChangingPassword || isRegisteringPasskey || Boolean(connectingProvider);
  const freePlan = getPlanById("free");
  const personalPlan = getPlanById("personal");
  const familyPlan = getPlanById("family");

  return (
    <section className="account-page">
      <header className="account-hero">
        <div>
          <span>Konto</span>
          <h1>Account & Sicherheit</h1>
          <p>Basisdaten, Privatsphäre und verbundene Login-Methoden an einem ruhigen Ort.</p>
        </div>
      </header>

      <section className="account-panel account-language-panel">
        <div className="account-panel-head">
          <div>
            <span>Sprache</span>
            <h2>Sprache & Darstellung</h2>
            <p>Wähle, wie Avareno hier angezeigt wird. Die Auswahl bleibt lokal in diesem Browser.</p>
          </div>
        </div>
        <div className="account-language-row">
          <div>
            <small>Aktuell</small>
            <strong>{languageLabel}</strong>
            <span>{language === "de" ? "Deutsch ist der Standard für Avareno." : "English is active in this browser."}</span>
          </div>
          <LanguageSwitch className="account-language-switch" />
        </div>
        <div className="account-language-row">
          <div>
            <small>Darstellung</small>
            <strong>{themeLabel}</strong>
            <span>{actualTheme === "dark" ? "Dunkel bleibt der ruhige Standard." : "Hell ist als klare Alternative aktiv."}</span>
          </div>
          <ThemeSwitch className="account-theme-switch" />
        </div>
      </section>

      <section className="account-panel account-billing-panel">
        <div className="account-panel-head">
          <div>
            <span>Plan & Abrechnung</span>
            <h2>Dein Avareno-Plan</h2>
            <p>Billing ist als Paddle-Foundation vorbereitet. Zahlungsdaten bleiben beim Anbieter und werden hier nicht gespeichert.</p>
          </div>
          <CreditCard size={18} />
        </div>
        <AppLoadingBar active={billingBusy === "status"} label="Planstatus wird geladen..." />
        <div className="account-billing-summary">
          <div>
            <small>Aktueller Plan</small>
            <strong>{billing?.currentPlan.name ?? freePlan.name}</strong>
            <span>{billingStatusLabel(billing?.subscription.status)}</span>
          </div>
          <div>
            <small>Preis</small>
            <strong>{billing?.currentPlan.priceLabel ?? formatPlanPrice(freePlan, "monthly", "de-DE")}<em>/Monat</em></strong>
            <span>{billing?.subscription.currentPeriodEnd ? `Läuft bis ${formatBillingDate(billing.subscription.currentPeriodEnd)}` : "Keine Verlängerung hinterlegt"}</span>
          </div>
        </div>
        <div className="account-billing-note">
          {billing?.providerConfigured
            ? "Personal-Checkout kann über Paddle gestartet werden. Rechtliche, steuerliche und Provider-Prüfung bleiben vor Launch offen."
            : "Paddle ist noch nicht vollständig konfiguriert. Hinterlege API-Key, Webhook-Secret und Price-ID serverseitig, bevor Checkout live geht."}
        </div>
        <div className="account-action-row">
          <button
            className="profile-secondary-action"
            disabled={!billing?.providerConfigured || billingBusy === "checkout" || billing?.subscription.planKey === "personal"}
            onClick={() => void startCheckout("personal")}
            type="button"
          >
            <ArrowRight size={16} />
            {billingBusy === "checkout" ? "Checkout startet..." : personalPlan.ctaLabel.de}
          </button>
          <button
            className="profile-secondary-action is-muted"
            disabled={!billing?.portalConfigured || billingBusy === "portal"}
            onClick={() => void openBillingPortal()}
            type="button"
          >
            <CreditCard size={16} />
            Abo verwalten
          </button>
          <button className="profile-secondary-action is-muted" disabled type="button">
            {familyPlan.ctaLabel.de}
          </button>
        </div>
        <AuthMessage error={billingError} success={billingMessage || null} />
      </section>

      <form className="account-panel" onSubmit={submit}>
        <div className="account-panel-head">
          <div>
            <span>Profil</span>
            <h2>Deine Zugangsdaten</h2>
          </div>
          <ShieldCheck size={18} />
        </div>
        <AppLoadingBar
          active={profileBusy}
          label={uploadingAvatar ? "Profilbild wird hochgeladen..." : isSendingEmailVerification ? "E-Mail-Bestätigung wird vorbereitet..." : "Profil wird gespeichert..."}
        />

        <div className="account-form-grid">
          <div className="account-avatar-control">
            <div className="account-avatar-placeholder" aria-hidden="true">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : displayName.slice(0, 1).toUpperCase() || "A"}
            </div>
            <label className="account-avatar-upload">
              <Upload size={14} />
              {uploadingAvatar ? "Wird hochgeladen..." : "Profilbild hochladen"}
              <input accept="image/*" disabled={uploadingAvatar} onChange={(event) => void uploadAvatar(event.target.files?.[0])} type="file" />
            </label>
            {avatarUrl ? (
              <button className="account-avatar-remove" onClick={() => {
                setAvatarUrl("");
                setAvatarMessage("Profilbild entfernt. Speichern übernimmt die Änderung.");
                setSaved(false);
              }} type="button">
                Bild entfernen
              </button>
            ) : null}
          </div>
          <label>
            <span>Name</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label className={`account-email-field ${emailIsVerified ? "is-verified" : "is-unverified"}`}>
            <span className="account-field-label-row">
              <span>E-Mail</span>
              <span className="account-email-state">
                {emailIsVerified ? <CheckCircle2 size={13} /> : <CircleX size={13} />}
                {emailStatusLabel}
              </span>
            </span>
            <span className="account-input-status-wrap">
              <input value={email} onChange={(event) => {
                setEmail(event.target.value);
                setSaved(false);
                setEmailVerificationMessage("");
                setEmailVerificationError("");
              }} type="email" />
              <span className="account-email-status-icon" aria-label={emailIsVerified ? "E-Mail bestätigt" : "E-Mail nicht bestätigt"}>
                {emailIsVerified ? <CheckCircle2 size={16} /> : <CircleX size={16} />}
              </span>
            </span>
            {!emailIsVerified ? (
              <button className="account-inline-action" disabled={!emailIsValid || isSendingEmailVerification} onClick={() => void requestEmailConfirmation()} type="button">
                <Mail size={14} />
                {isSendingEmailVerification ? "Sendet..." : emailChanged ? "Speichern & bestätigen" : "Bestätigung senden"}
              </button>
            ) : null}
          </label>
        </div>

        <label className="auth-toggle">
          <input checked={privateProfile} onChange={(event) => setPrivateProfile(event.target.checked)} type="checkbox" />
          <span>
            <strong>Privates Profil</strong>
            <small>Dein Profil bleibt standardmäßig nicht öffentlich.</small>
          </span>
        </label>

        <label className="auth-toggle">
          <input checked={motivationEnabled} onChange={(event) => setMotivationEnabled(event.target.checked)} type="checkbox" />
          <span>
            <strong>Motivation aktiv</strong>
            <small>Sanfte Hinweise für offene Erinnerungen und Care-Punkte.</small>
          </span>
        </label>

        <label className="auth-toggle">
          <input checked={leaderboardEnabled} onChange={(event) => setLeaderboardEnabled(event.target.checked)} type="checkbox" />
          <span>
            <strong>Freunde-Sichtbarkeit</strong>
            <small>Nur für private Freundeskreise, nie öffentlich.</small>
          </span>
        </label>

        <AuthMessage error={emailVerificationError || avatarError || (passkeyMessageActive ? null : auth.error)} success={emailVerificationMessage || (saved ? "Account-Einstellungen gespeichert." : avatarMessage || null)} />

        <button className="auth-primary account-save" disabled={isSavingProfile} type="submit">
          {isSavingProfile ? "Speichert..." : "Speichern"}
          <CheckCircle2 size={17} />
        </button>
      </form>

      <section className="account-panel">
        <div className="account-panel-head">
          <div>
            <span>Provider</span>
            <h2>Login-Anbieter</h2>
            <p>Passwort und externe Logins lassen sich hier verbinden oder vorbereiten.</p>
          </div>
        </div>
        <AppLoadingBar
          active={providerBusy}
          label={isChangingPassword ? "Passwort wird geändert..." : isRegisteringPasskey ? "Passkey wird eingerichtet..." : "Login-Anbieter wird verbunden..."}
        />
        <form className="account-password-editor" onSubmit={changePassword}>
          <label>
            <span>Neues Passwort</span>
            <input autoComplete="new-password" minLength={8} onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
          </label>
          <label>
            <span>Wiederholen</span>
            <input autoComplete="new-password" minLength={8} onChange={(event) => setNewPasswordConfirm(event.target.value)} type="password" value={newPasswordConfirm} />
          </label>
          <button className="profile-secondary-action" disabled={isChangingPassword || !newPassword || !newPasswordConfirm} type="submit">
            <KeyRound size={16} />
            {isChangingPassword ? "Ändert..." : "Passwort ändern"}
          </button>
        </form>
        <AuthMessage error={passwordError} success={passwordMessage || null} />
        <div className="account-provider-list">
          <ProviderStatus icon={<Mail size={16} />} label="E-Mail & Passwort" status={auth.config.mode === "supabase" ? "Supabase Auth aktiv" : auth.config.mode === "mock" ? "Expliziter Dev-Modus" : "Setup fehlt"}>
            <span className="account-provider-note">Über Passwortfeld bearbeitbar</span>
          </ProviderStatus>
          <ProviderStatus label="E-Mail bestätigt" status={auth.profile?.emailVerified ? "Ja" : "Noch offen"} />
          <ProviderStatus icon={<GoogleIcon />} label="Google" status={auth.config.providers.google.configured ? "Aktiviert" : "Nicht konfiguriert"}>
            <button className="account-provider-action" disabled={!auth.config.providers.google.configured || connectingProvider === "google"} onClick={() => void connectProvider("google")} type="button">
              <Link2 size={14} />
              {connectingProvider === "google" ? "Verbinde..." : "Verbinden"}
            </button>
          </ProviderStatus>
          <ProviderStatus icon={<UserRound size={16} />} label="Apple" status={auth.config.providers.apple.configured ? "Aktiviert" : "Nicht konfiguriert"}>
            <button className="account-provider-action" disabled={!auth.config.providers.apple.configured || connectingProvider === "apple"} onClick={() => void connectProvider("apple")} type="button">
              <Link2 size={14} />
              {connectingProvider === "apple" ? "Verbinde..." : "Verbinden"}
            </button>
          </ProviderStatus>
          <ProviderStatus icon={<Smartphone size={16} />} label="SMS / Twilio" status={auth.config.phoneProvider.configured ? "Aktiviert" : "Vorbereitet"}>
            <button className="account-provider-action" disabled type="button">
              <ShieldCheck size={14} />
              {auth.config.phoneProvider.configured ? "Login aktiv" : "Setup"}
            </button>
          </ProviderStatus>
          <ProviderStatus icon={<Fingerprint size={16} />} label="Passkey" status={auth.config.passkeyProvider.configured ? "Aktiviert" : "Vorbereitet"}>
            <button className="account-provider-action" disabled={!auth.config.passkeyProvider.configured || isRegisteringPasskey} onClick={() => void setupPasskey()} type="button">
              <Fingerprint size={14} />
              {isRegisteringPasskey ? "Prüft..." : "Einrichten"}
            </button>
          </ProviderStatus>
        </div>
        <AuthMessage error={providerError || (passkeyMessageActive ? auth.error : null)} success={providerMessage || (passkeySaved ? "Passkey wurde gespeichert." : null)} />
      </section>

      <section className="account-panel">
        <div className="account-panel-head">
          <div>
            <span>Sitzung</span>
            <h2>Abmelden & Konto</h2>
            <p>Abmelden beendet die aktuelle Supabase-Session. Eine irreversible Kontolöschung braucht Backend-Support.</p>
          </div>
        </div>
        <div className="account-action-row">
          <button className="profile-secondary-action" onClick={() => void auth.logout()} type="button">
            <LogOut size={16} />
            Abmelden
          </button>
          <button className="profile-secondary-action is-muted" disabled type="button">
            <Trash2 size={16} />
            Account löschen wird später ergänzt.
          </button>
        </div>
      </section>
    </section>
  );
}

function AuthForm({ mode }: { mode: AuthMode }) {
  const auth = useAuth();
  const { actualTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [authMethod, setAuthMethod] = useState<AuthLoginMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("DE");
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneOtpSuccess, setPhoneOtpSuccess] = useState<string | null>(null);
  const [emailMagicLinkSuccess, setEmailMagicLinkSuccess] = useState<string | null>(null);
  const [magicLinkDialogOpen, setMagicLinkDialogOpen] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingProtectedPath, setPendingProtectedPath] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaResetNonce, setCaptchaResetNonce] = useState(0);
  const from = safeAppRedirect((location.state as { from?: string } | null)?.from);
  const phoneAuthAvailable = auth.config.phoneProvider.configured || auth.config.mode === "mock";
  const phoneCountry = phoneCountries.find((country) => country.code === phoneCountryCode) ?? phoneCountries[0];
  const phoneForAuth = formatPhoneForAuth(phone, phoneCountry.dialCode);
  const captchaRequired = auth.config.turnstileEnabled && (authMethod === "email" || !phoneCodeSent);
  const primaryDisabled = !auth.config.ready
    || isSubmitting
    || Boolean(pendingProtectedPath)
    || (captchaRequired && !captchaToken);

  useEffect(() => {
    if (!phoneAuthAvailable && authMethod === "phone") {
      setAuthMethod("email");
    }
  }, [authMethod, phoneAuthAvailable]);

  const handleCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaError(null);
  }, []);
  const handleCaptchaError = useCallback(() => {
    setCaptchaToken("");
    setCaptchaError("Turnstile konnte nicht abgeschlossen werden. Bitte versuche es erneut.");
  }, []);

  if (auth.status === "authenticated") {
    return <Navigate to={pendingProtectedPath ?? (auth.profile?.onboardingCompleted ? from : "/onboarding")} replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (captchaRequired && !captchaToken) {
      setCaptchaError("Bitte bestätige kurz, dass du kein automatisierter Zugriff bist.");
      return;
    }

    setIsSubmitting(true);
    setCaptchaError(null);
    setPhoneOtpSuccess(null);
    setEmailMagicLinkSuccess(null);

    if (authMethod === "phone") {
      const result = phoneCodeSent
        ? await auth.verifyPhoneOtp({ phone: phoneForAuth, token: phoneCode })
        : await auth.requestPhoneOtp({ phone: phoneForAuth, displayName, captchaToken, shouldCreateUser: mode === "signup" });

      if (result.ok && !phoneCodeSent) {
        setPhoneCodeSent(true);
        setPhoneOtpSuccess("SMS-Code wurde gesendet. Gib ihn hier ein, um den Zugang abzuschließen.");
      } else if (result.ok) {
        const target = result.nextPath ?? (mode === "signup" ? "/onboarding" : from);

        if (isAuthRedirectTarget(target)) {
          navigate(target, { replace: true });
        } else {
          setPendingProtectedPath(target);
        }
      } else if (auth.config.turnstileEnabled && !phoneCodeSent) {
        setCaptchaToken("");
        setCaptchaResetNonce((value) => value + 1);
      }

      setIsSubmitting(false);
      return;
    }

    const result = mode === "login"
      ? await auth.login({ email, password, captchaToken })
      : await auth.signup({ email, password, displayName, captchaToken });

    if (result.ok) {
      const target = result.nextPath ?? (mode === "signup" ? "/onboarding" : from);

      if (isAuthRedirectTarget(target)) {
        navigate(target, { replace: true });
      } else {
        setPendingProtectedPath(target);
      }
    } else if (auth.config.turnstileEnabled) {
      setCaptchaToken("");
      setCaptchaResetNonce((value) => value + 1);
    }

    setIsSubmitting(false);
  }

  function openMagicLinkDialog() {
    setMagicLinkEmail(email);
    setEmailMagicLinkSuccess(null);
    setPhoneOtpSuccess(null);
    auth.clearError();
    setMagicLinkDialogOpen(true);
  }

  async function sendMagicLink(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (captchaRequired && !captchaToken) {
      setCaptchaError("Bitte bestätige kurz, dass du kein automatisierter Zugriff bist.");
      return;
    }

    setIsSubmitting(true);
    setCaptchaError(null);
    setPhoneOtpSuccess(null);
    setEmailMagicLinkSuccess(null);

    const targetEmail = magicLinkEmail.trim().toLowerCase();
    const result = await auth.requestMagicLink({
      email: targetEmail,
      displayName,
      captchaToken,
      shouldCreateUser: mode === "signup"
    });

    if (result.ok) {
      setEmail(targetEmail);
      setMagicLinkDialogOpen(false);
      setEmailMagicLinkSuccess(`Magic Link wurde gesendet. Öffne den Link im selben Browser auf ${new URL(auth.config.redirectUrl).origin}.`);
      setCaptchaToken("");
      setCaptchaResetNonce((value) => value + 1);
    } else if (auth.config.turnstileEnabled) {
      setCaptchaToken("");
      setCaptchaResetNonce((value) => value + 1);
    }

    setIsSubmitting(false);
  }

  return (
    <AuthSurface label={mode === "login" ? "Einloggen" : "Account erstellen"}>
      <AuthIntro
        eyebrow="Privater Zugang"
        title={mode === "login" ? "Willkommen zurück" : "Account erstellen"}
        body={mode === "login" ? `Dein privater Speicher für Dinge, Nachweise und offene Punkte. Fragen? ${auth.config.supportEmail}` : phoneAuthAvailable ? "Mit E-Mail oder Telefon registrieren. Avareno bleibt privat, ruhig und ohne öffentliche Profile." : "Mit E-Mail registrieren. Avareno bleibt privat, ruhig und ohne öffentliche Profile."}
      />

      {!auth.config.ready ? <AuthSetupNotice missing={auth.config.setupMissing} /> : null}

      <form className="auth-form" onSubmit={submit}>
        {phoneAuthAvailable ? (
          <div className="auth-method-tabs" role="tablist" aria-label="Login-Methode">
            <button className={authMethod === "email" ? "is-active" : ""} onClick={() => {
              setAuthMethod("email");
              setPhoneOtpSuccess(null);
              setEmailMagicLinkSuccess(null);
              setMagicLinkDialogOpen(false);
              auth.clearError();
            }} type="button">
              <Mail size={15} />
              E-Mail
            </button>
            <button className={authMethod === "phone" ? "is-active" : ""} onClick={() => {
              setAuthMethod("phone");
              setPhoneOtpSuccess(null);
              setEmailMagicLinkSuccess(null);
              setMagicLinkDialogOpen(false);
              auth.clearError();
            }} type="button">
              <Smartphone size={15} />
              Telefon
            </button>
          </div>
        ) : null}

        {mode === "signup" ? (
          <AuthField icon={<UserRound size={17} />} label="Name">
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Dein Name" type="text" />
          </AuthField>
        ) : null}

        {authMethod === "email" ? (
          <>
            <AuthField icon={<Mail size={17} />} label="E-Mail">
              <input value={email} onChange={(event) => {
                setEmail(event.target.value);
                setEmailMagicLinkSuccess(null);
                auth.clearError();
              }} placeholder="du@example.com" type="email" />
            </AuthField>

            <AuthField icon={<KeyRound size={17} />} label="Passwort">
              <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mindestens 6 Zeichen" type="password" />
            </AuthField>
          </>
        ) : (
          <>
            <AuthField icon={<Smartphone size={17} />} label="Telefonnummer">
              <div className="auth-phone-input">
                <label className="auth-phone-country" aria-label="Landesvorwahl">
                  <select value={phoneCountryCode} onChange={(event) => {
                    setPhoneCountryCode(event.target.value);
                    setPhoneCodeSent(false);
                    setPhoneCode("");
                    setPhoneOtpSuccess(null);
                    auth.clearError();
                  }}>
                    {phoneCountries.map((country) => (
                      <option key={country.code} value={country.code}>{country.flag} {country.dialCode} {country.label}</option>
                    ))}
                  </select>
                  <span aria-hidden="true">{phoneCountry.flag} {phoneCountry.dialCode}</span>
                </label>
                <input value={phone} onChange={(event) => {
                  setPhone(event.target.value);
                  setPhoneCodeSent(false);
                  setPhoneCode("");
                  setPhoneOtpSuccess(null);
                  auth.clearError();
                }} placeholder="Nummer ohne Vorwahl" type="tel" />
              </div>
            </AuthField>

            {phoneCodeSent ? (
              <AuthField icon={<KeyRound size={17} />} label="SMS-Code">
                <input autoComplete="one-time-code" inputMode="numeric" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value)} placeholder="123456" type="text" />
              </AuthField>
            ) : null}

            {phoneCodeSent ? (
              <button
                className="auth-text-action"
                disabled={isSubmitting}
                onClick={() => {
                  setPhoneCodeSent(false);
                  setPhoneCode("");
                  setPhoneOtpSuccess(null);
                  setCaptchaToken("");
                  setCaptchaResetNonce((value) => value + 1);
                  auth.clearError();
                }}
                type="button"
              >
                Neuen SMS-Code anfordern
              </button>
            ) : null}
          </>
        )}

        {auth.config.turnstileEnabled && (authMethod === "email" || !phoneCodeSent) ? (
          <TurnstileBox
            resetNonce={captchaResetNonce}
            siteKey={auth.config.turnstileSiteKey}
            theme={actualTheme}
            onError={handleCaptchaError}
            onToken={handleCaptchaToken}
          />
        ) : null}

        <AuthMessage error={captchaError} success={null} />
        <AuthMessage error={auth.error} success={phoneOtpSuccess || emailMagicLinkSuccess} />

        <AppLoadingBar
          active={isSubmitting || Boolean(pendingProtectedPath)}
          label={pendingProtectedPath ? "Privaten Bereich öffnen..." : "Zugang wird geprüft..."}
        />

        <button className="auth-primary" disabled={primaryDisabled} type="submit">
          {pendingProtectedPath ? "Öffne Avareno..." : isSubmitting ? "Prüfe Zugang..." : authMethod === "phone" && !phoneCodeSent ? "SMS-Code senden" : authMethod === "phone" ? "Code prüfen" : mode === "login" ? "Einloggen" : "Account erstellen"}
          <ArrowRight size={17} />
        </button>

        {authMethod === "email" ? (
          <button className="auth-secondary-submit" disabled={!auth.config.ready || isSubmitting || Boolean(pendingProtectedPath)} onClick={openMagicLinkDialog} type="button">
            <Mail size={16} />
            Magic Link senden
          </button>
        ) : null}
      </form>

      {magicLinkDialogOpen ? (
        <div className="auth-dialog-backdrop">
          <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="magic-link-title">
            <div className="auth-dialog-head">
              <div>
                <span>Magic Link</span>
                <h2 id="magic-link-title">Link per E-Mail</h2>
                <p>Wir senden dir einen einmaligen Login-Link. Öffne ihn im selben Browser.</p>
              </div>
              <button className="auth-dialog-close" onClick={() => setMagicLinkDialogOpen(false)} type="button" aria-label="Schließen">
                <CircleX size={18} />
              </button>
            </div>

            <form className="auth-dialog-form" onSubmit={(event) => void sendMagicLink(event)}>
              <AuthField icon={<Mail size={17} />} label="E-Mail">
                <input autoFocus value={magicLinkEmail} onChange={(event) => {
                  setMagicLinkEmail(event.target.value);
                  setEmailMagicLinkSuccess(null);
                  auth.clearError();
                }} placeholder="du@example.com" type="email" />
              </AuthField>

              {captchaRequired && !captchaToken ? <p className="auth-dialog-note">Sicherheitsprüfung wird vorbereitet...</p> : null}
              <AuthMessage error={auth.error} success={null} />

              <div className="auth-dialog-actions">
                <button className="auth-dialog-secondary" onClick={() => setMagicLinkDialogOpen(false)} type="button">
                  Abbrechen
                </button>
                <button className="auth-dialog-primary" disabled={!auth.config.ready || isSubmitting || Boolean(pendingProtectedPath) || (captchaRequired && !captchaToken) || !magicLinkEmail.trim()} type="submit">
                  Link senden
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <div className="auth-provider-grid" aria-label="Weitere Login-Anbieter">
        <button disabled={!auth.config.providers.google.configured} type="button" onClick={() => void auth.signInWithProvider("google")}>
          <GoogleIcon />
          <span>Mit Google fortfahren</span>
        </button>
        <button disabled={!auth.config.passkeyProvider.configured} type="button" onClick={() => void auth.signInWithPasskey()}>
          <Fingerprint size={16} />
          <span>Mit Passkey fortfahren</span>
        </button>
        <button disabled={!auth.config.providers.apple.configured} type="button" onClick={() => void auth.signInWithProvider("apple")}>Mit Apple fortfahren</button>
      </div>

      <div className="auth-secondary-links">
        {mode === "login" ? (
          <>
            <Link to="/forgot-password">Passwort vergessen?</Link>
            <span>Kein Account? <Link to="/signup">Erstellen</Link></span>
          </>
        ) : (
          <span>Schon dabei? <Link to="/login">Einloggen</Link></span>
        )}
      </div>
    </AuthSurface>
  );
}

function TurnstileBox({ onError, onToken, resetNonce, siteKey, theme }: { onError: () => void; onToken: (token: string) => void; resetNonce: number; siteKey: string; theme: ResolvedTheme }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(Boolean(window.turnstile));

  useEffect(() => {
    if (window.turnstile) {
      setScriptReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"]');
    const script = existingScript ?? document.createElement("script");
    const handleLoad = () => setScriptReady(true);

    script.addEventListener("load", handleLoad);
    if (!existingScript) {
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      script.removeEventListener("load", handleLoad);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !scriptReady || !window.turnstile) return;

    const container = containerRef.current;
    container.innerHTML = "";
    const widgetId = window.turnstile.render(container, {
      sitekey: siteKey,
      callback: onToken,
      "error-callback": onError,
      "expired-callback": () => onToken(""),
      theme,
      size: "normal"
    });

    return () => {
      window.turnstile?.remove(widgetId);
    };
  }, [onError, onToken, resetNonce, scriptReady, siteKey]);

  return (
    <div className="auth-turnstile-shell">
      <div ref={containerRef} className="auth-turnstile" />
      {!scriptReady ? <span>Turnstile wird geladen...</span> : null}
    </div>
  );
}

function avatarExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function safeStorageSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Profilbild konnte nicht gelesen werden."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Profilbild konnte nicht gelesen werden."));
    };
    reader.readAsDataURL(file);
  });
}

function formatPhoneForAuth(phone: string, dialCode: string) {
  const compact = phone.trim().replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) {
    return compact;
  }

  return `${dialCode}${compact.replace(/^0+/, "")}`;
}

function providerLinkErrorMessage(caught: unknown, providerLabel: string) {
  const message = caught instanceof Error ? caught.message : "";
  if (message.toLowerCase().includes("manual linking is disabled")) {
    return `${providerLabel} kann noch nicht manuell verknüpft werden. Aktiviere Identity Linking in Supabase Auth oder nutze den normalen Login mit diesem Anbieter.`;
  }

  return message || `${providerLabel} konnte nicht verbunden werden.`;
}

function billingStatusLabel(status?: string) {
  const normalized = (status ?? "ACTIVE").toUpperCase();
  const labels: Record<string, string> = {
    ACTIVE: "Aktiv",
    TRIALING: "Testphase",
    PAST_DUE: "Zahlung offen",
    PAUSED: "Pausiert",
    CANCELED: "Gekündigt",
    CANCELLED: "Gekündigt",
    INCOMPLETE: "Nicht abgeschlossen"
  };
  return labels[normalized] ?? normalized;
}

function formatBillingDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function AuthSurface({ label, children }: { label: string; children: ReactNode }) {
  return <section className="auth-card" aria-label={label}>{children}</section>;
}

function GoogleIcon() {
  return (
    <svg className="auth-provider-icon" aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.44Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.07v2.59A9.99 9.99 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9a6.02 6.02 0 0 1 0-3.8V7.51H3.07a9.99 9.99 0 0 0 0 8.98L6.4 13.9Z" />
      <path fill="#EA4335" d="M12 5.98c1.47 0 2.79.51 3.83 1.5l2.86-2.86C16.96 3.01 14.7 2 12 2a9.99 9.99 0 0 0-8.93 5.51L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z" />
    </svg>
  );
}

function isAuthRedirectTarget(path: string) {
  return path === "/login"
    || path === "/signup"
    || path === "/forgot-password"
    || path === "/reset-password"
    || path.startsWith("/auth/");
}

function AuthIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <header className="auth-intro">
      <div className="auth-mark" aria-hidden="true">
        <ShieldCheck size={22} />
      </div>
      <p>{formatUiText(eyebrow)}</p>
      <h1>{formatUiText(title)}</h1>
      <span>{formatUiText(body)}</span>
    </header>
  );
}

function AuthField({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label className="auth-field">
      <span>{formatUiText(label)}</span>
      <div>
        {icon}
        {children}
      </div>
    </label>
  );
}

function AuthMessage({ error, success }: { error: string | null; success: string | null }) {
  if (error) {
    return <p className="auth-error">{formatUiText(error)}</p>;
  }

  if (success) {
    return <p className="auth-success">{formatUiText(success)}</p>;
  }

  return null;
}

function AuthSetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="auth-setup-note">
      <strong>Auth Setup erforderlich</strong>
      <span>{formatUiText(missing.length ? `Fehlend: ${missing.join(", ")}` : "Provider ist noch nicht vollst\u00e4ndig verbunden.")}</span>
    </div>
  );
}

function ProviderStatus({ children, icon, label, status }: { children?: ReactNode; icon?: ReactNode; label: string; status: string }) {
  const statusIcon = icon ?? (label.includes("best") ? status === "Ja" ? <CheckCircle2 size={16} /> : <Mail size={16} /> : null);
  const statusIconClassName = `account-provider-icon${label.includes("best") && status === "Ja" ? " is-success" : ""}`;

  return (
    <div>
      <span className="account-provider-main">
        {statusIcon ? <span className={statusIconClassName}>{statusIcon}</span> : null}
        <span className="account-provider-copy">
          <strong>{formatUiText(label)}</strong>
          <span>{formatUiText(status)}</span>
        </span>
      </span>
      {children ? <span className="account-provider-control">{children}</span> : null}
    </div>
  );
}
