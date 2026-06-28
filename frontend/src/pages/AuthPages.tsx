import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, CheckCircle2, CircleX, Fingerprint, KeyRound, Link2, LogOut, Mail, ShieldCheck, Smartphone, Trash2, Upload, UserRound } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { safeAppRedirect, supabase } from "../lib/authClient";
import type { SocialAuthProvider } from "../lib/authClient";
import { useAuth } from "../lib/authProvider";
import { formatUiText } from "../lib/uiText";
import { AppLoadingBar } from "../components/app/AppKit";
import { useNotifications } from "../components/app/Notifications";

type AuthMode = "login" | "signup";
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
        body="Der externe Login kommt hier sicher zurück und wird Über Supabase eingeloest."
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
      setEmailVerificationError("Bitte nutze eine gÃ¼ltige E-Mail-Adresse.");
      return;
    }

    setIsSendingEmailVerification(true);

    if (emailChanged) {
      const result = await auth.updateProfile({ displayName, email: normalizedEmail, avatarUrl: avatarUrl || null, privateProfile, motivationEnabled, leaderboardEnabled });
      setSaved(result.ok);
      setIsSendingEmailVerification(false);

      if (result.ok) {
        setEmailVerificationMessage("Wir haben eine BestÃ¤tigung an die neue Adresse gesendet.");
        return;
      }

      setEmailVerificationError(auth.error ?? "Die BestÃ¤tigung konnte nicht gestartet werden.");
      return;
    }

    const result = await auth.requestEmailVerification(normalizedEmail);
    setIsSendingEmailVerification(false);

    if (result.ok) {
      setEmailVerificationMessage(auth.config.mode === "mock" ? "E-Mail wurde im Demo-Modus bestÃ¤tigt." : "BestÃ¤tigungs-Mail wurde erneut gesendet.");
      return;
    }

    setEmailVerificationError(auth.error ?? "BestÃ¤tigungs-Mail konnte nicht gesendet werden.");
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

  const normalizedEmail = email.trim().toLowerCase();
  const profileEmail = auth.profile?.email.trim().toLowerCase() ?? "";
  const emailChanged = normalizedEmail !== profileEmail;
  const emailIsValid = normalizedEmail.includes("@");
  const emailIsVerified = Boolean(auth.profile?.emailVerified) && !emailChanged;
  const emailStatusLabel = emailIsVerified ? "BestÃ¤tigt" : emailChanged ? "Noch nicht gespeichert" : "Nicht bestÃ¤tigt";
  const profileBusy = isSavingProfile || uploadingAvatar || isSendingEmailVerification;
  const providerBusy = isChangingPassword || isRegisteringPasskey || Boolean(connectingProvider);

  return (
    <section className="account-page">
      <header className="account-hero">
        <div>
          <span>Konto</span>
          <h1>Account & Sicherheit</h1>
          <p>Basisdaten, Privatsphäre und verbundene Login-Methoden an einem ruhigen Ort.</p>
        </div>
      </header>

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
              <span className="account-email-status-icon" aria-label={emailIsVerified ? "E-Mail bestÃ¤tigt" : "E-Mail nicht bestÃ¤tigt"}>
                {emailIsVerified ? <CheckCircle2 size={16} /> : <CircleX size={16} />}
              </span>
            </span>
            {!emailIsVerified ? (
              <button className="account-inline-action" disabled={!emailIsValid || isSendingEmailVerification} onClick={() => void requestEmailConfirmation()} type="button">
                <Mail size={14} />
                {isSendingEmailVerification ? "Sendet..." : emailChanged ? "Speichern & bestÃ¤tigen" : "BestÃ¤tigung senden"}
              </button>
            ) : null}
          </label>
        </div>

        <label className="auth-toggle">
          <input checked={privateProfile} onChange={(event) => setPrivateProfile(event.target.checked)} type="checkbox" />
          <span>
            <strong>Privates Profil</strong>
            <small>Dein Profil bleibt standardmäßig nicht Öffentlich.</small>
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
            <small>Nur für private Freundeskreise, nie Öffentlich.</small>
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
              Setup
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
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingProtectedPath, setPendingProtectedPath] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaResetNonce, setCaptchaResetNonce] = useState(0);
  const from = safeAppRedirect((location.state as { from?: string } | null)?.from);
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

    if (auth.config.turnstileEnabled && !captchaToken) {
      setCaptchaError("Bitte bestaetige kurz, dass du kein automatisierter Zugriff bist.");
      return;
    }

    setIsSubmitting(true);
    setCaptchaError(null);

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

  return (
    <AuthSurface label={mode === "login" ? "Einloggen" : "Account erstellen"}>
      <AuthIntro
        eyebrow="Privater Zugang"
        title={mode === "login" ? "Willkommen zurück" : "Account erstellen"}
        body={mode === "login" ? `Dein privater Speicher für Dinge, Nachweise und offene Punkte. Fragen? ${auth.config.supportEmail}` : "Mit E-Mail registrieren. Avareno bleibt privat, ruhig und ohne Öffentliche Profile."}
      />

      {!auth.config.ready ? <AuthSetupNotice missing={auth.config.setupMissing} /> : null}

      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" ? (
          <AuthField icon={<UserRound size={17} />} label="Name">
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Stefan" type="text" />
          </AuthField>
        ) : null}

        <AuthField icon={<Mail size={17} />} label="E-Mail">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="du@example.com" type="email" />
        </AuthField>

        <AuthField icon={<KeyRound size={17} />} label="Passwort">
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mindestens 6 Zeichen" type="password" />
        </AuthField>

        {auth.config.turnstileEnabled ? (
          <TurnstileBox
            resetNonce={captchaResetNonce}
            siteKey={auth.config.turnstileSiteKey}
            onError={handleCaptchaError}
            onToken={handleCaptchaToken}
          />
        ) : null}

        <AuthMessage error={captchaError} success={null} />
        <AuthMessage error={auth.error} success={null} />

        <AppLoadingBar
          active={isSubmitting || Boolean(pendingProtectedPath)}
          label={pendingProtectedPath ? "Privaten Bereich öffnen..." : "Zugang wird geprüft..."}
        />

        <button className="auth-primary" disabled={!auth.config.ready || isSubmitting || Boolean(pendingProtectedPath) || (auth.config.turnstileEnabled && !captchaToken)} type="submit">
          {pendingProtectedPath ? "Öffne Avareno..." : isSubmitting ? "Prüfe Zugang..." : mode === "login" ? "Einloggen" : "Account erstellen"}
          <ArrowRight size={17} />
        </button>
      </form>

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

function TurnstileBox({ onError, onToken, resetNonce, siteKey }: { onError: () => void; onToken: (token: string) => void; resetNonce: number; siteKey: string }) {
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
      theme: "dark",
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

function providerLinkErrorMessage(caught: unknown, providerLabel: string) {
  const message = caught instanceof Error ? caught.message : "";
  if (message.toLowerCase().includes("manual linking is disabled")) {
    return `${providerLabel} kann noch nicht manuell verknüpft werden. Aktiviere Identity Linking in Supabase Auth oder nutze den normalen Login mit diesem Anbieter.`;
  }

  return message || `${providerLabel} konnte nicht verbunden werden.`;
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
    <label>
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
