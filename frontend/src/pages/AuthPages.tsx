import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, CheckCircle2, KeyRound, LogOut, Mail, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { safeAppRedirect } from "../lib/authClient";
import { useAuth } from "../lib/authProvider";

type AuthMode = "login" | "signup";

const onboardingOptions = [
  "Produkte & Rechnungen merken",
  "Garantien & Erinnerungen",
  "Hilfe ueber Resolve",
  "3D-Druck / Ersatzteile spaeter"
];

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
    <AuthSurface label="Passwort zuruecksetzen">
      <AuthIntro
        eyebrow="Zugang"
        title="Passwort vergessen?"
        body={`Wir senden dir einen sicheren Link zum Zuruecksetzen. Fragen? Schreib uns an ${auth.config.supportEmail}.`}
      />

      {!auth.config.ready ? <AuthSetupNotice missing={auth.config.setupMissing} /> : null}

      <form className="auth-form" onSubmit={submit}>
        <AuthField icon={<Mail size={17} />} label="E-Mail">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="du@example.com" type="email" />
        </AuthField>

        <AuthMessage error={auth.error} success={sent ? `Wenn diese Adresse existiert, erhaeltst du einen sicheren Link von ${auth.config.emailFromName} <${auth.config.emailFrom}>.` : null} />

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
        body="Setze ein neues Passwort fuer deinen privaten Avareno-Zugang."
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
        Zurueck zum <Link to="/login">Login</Link>
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
    <AuthSurface label="E-Mail bestaetigen">
      <AuthIntro
        eyebrow="Bestaetigung"
        title={pending ? "E-Mail pruefen" : verified ? "E-Mail bestaetigt" : "Link pruefen"}
        body={pending ? `Wir haben einen Bestaetigungslink an ${email ?? "deine Adresse"} gesendet. Automatische Auth-Mails kommen von ${auth.config.emailFrom}.` : verified ? "Dein Account ist jetzt als bestaetigt markiert." : "Wir pruefen den Bestaetigungslink fuer deinen Account."}
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
        title="Login pruefen"
        body="Der externe Login kommt hier sicher zurueck und wird ueber Supabase eingeloest."
      />

      <AuthMessage error={auth.error} success={handled && !auth.error ? "Callback abgeschlossen." : null} />

      <p className="auth-switch">
        Zurueck zum <Link to="/login">Login</Link>
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
          body="Wir pruefen kurz deine Supabase-Session und bereiten den ersten Start vor."
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
        body="Kurz einstellen, wofuer Avareno dir zuerst helfen soll. Alles Optionale kannst du spaeter aendern."
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
            <small>Freunde sehen nur das, was du spaeter bewusst freigibst.</small>
          </span>
        </label>

        <label className="auth-toggle">
          <input checked={motivationEnabled} onChange={(event) => setMotivationEnabled(event.target.checked)} type="checkbox" />
          <span>
            <strong>Sanfte Erinnerungen erlauben</strong>
            <small>Keine Spielmechanik, nur kleine Hinweise fuer offene Punkte.</small>
          </span>
        </label>

        <label className="auth-toggle">
          <input checked={leaderboardEnabled} onChange={(event) => setLeaderboardEnabled(event.target.checked)} type="checkbox" />
          <span>
            <strong>Privaten Freunde-Ueberblick aktivieren</strong>
            <small>Optional und nur fuer eingeladene Freunde sichtbar.</small>
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
  const [displayName, setDisplayName] = useState(auth.profile?.displayName ?? "");
  const [email, setEmail] = useState(auth.profile?.email ?? "");
  const [privateProfile, setPrivateProfile] = useState(auth.profile?.privateProfile ?? true);
  const [motivationEnabled, setMotivationEnabled] = useState(auth.profile?.motivationEnabled ?? true);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(auth.profile?.leaderboardEnabled ?? false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!auth.profile) {
      return;
    }

    setDisplayName(auth.profile.displayName);
    setEmail(auth.profile.email);
    setPrivateProfile(auth.profile.privateProfile);
    setMotivationEnabled(auth.profile.motivationEnabled);
    setLeaderboardEnabled(auth.profile.leaderboardEnabled);
  }, [auth.profile]);

  if (auth.status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await auth.updateProfile({ displayName, email, privateProfile, motivationEnabled, leaderboardEnabled });
    setSaved(result.ok);
  }

  return (
    <section className="account-page">
      <header className="account-hero">
        <div>
          <span>Konto</span>
          <h1>Account & Sicherheit</h1>
          <p>Basisdaten, Privatsphaere und verbundene Login-Methoden an einem ruhigen Ort.</p>
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

        <div className="account-form-grid">
          <div className="account-avatar-placeholder" aria-hidden="true">
            {displayName.slice(0, 1).toUpperCase() || "A"}
          </div>
          <label>
            <span>Name</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label>
            <span>E-Mail</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
        </div>

        <label className="auth-toggle">
          <input checked={privateProfile} onChange={(event) => setPrivateProfile(event.target.checked)} type="checkbox" />
          <span>
            <strong>Privates Profil</strong>
            <small>Dein Profil bleibt standardmaessig nicht oeffentlich.</small>
          </span>
        </label>

        <label className="auth-toggle">
          <input checked={motivationEnabled} onChange={(event) => setMotivationEnabled(event.target.checked)} type="checkbox" />
          <span>
            <strong>Motivation aktiv</strong>
            <small>Sanfte Hinweise fuer offene Erinnerungen und Care-Punkte.</small>
          </span>
        </label>

        <label className="auth-toggle">
          <input checked={leaderboardEnabled} onChange={(event) => setLeaderboardEnabled(event.target.checked)} type="checkbox" />
          <span>
            <strong>Freunde-Sichtbarkeit</strong>
            <small>Nur fuer private Freundeskreise, nie oeffentlich.</small>
          </span>
        </label>

        <AuthMessage error={auth.error} success={saved ? "Account-Einstellungen gespeichert." : null} />

        <button className="auth-primary account-save" type="submit">
          Speichern
          <CheckCircle2 size={17} />
        </button>
      </form>

      <section className="account-panel">
        <div className="account-panel-head">
          <div>
            <span>Provider</span>
            <h2>Login-Anbieter</h2>
          </div>
        </div>
        <div className="account-provider-list">
          <ProviderStatus label="E-Mail & Passwort" status={auth.config.mode === "supabase" ? "Supabase Auth aktiv" : auth.config.mode === "mock" ? "Expliziter Dev-Modus" : "Setup fehlt"} />
          <ProviderStatus label="E-Mail bestaetigt" status={auth.profile?.emailVerified ? "Ja" : "Noch offen"} />
          <ProviderStatus label="Google" status={auth.config.providers.google.configured ? "Aktiviert" : "Nicht konfiguriert"} />
          <ProviderStatus label="Apple" status={auth.config.providers.apple.configured ? "Aktiviert" : "Nicht konfiguriert"} />
        </div>
      </section>

      <section className="account-panel">
        <div className="account-panel-head">
          <div>
            <span>Sitzung</span>
            <h2>Abmelden & Konto</h2>
            <p>Abmelden beendet die aktuelle Supabase-Session. Eine irreversible Kontoloeschung braucht Backend-Support.</p>
          </div>
        </div>
        <div className="account-action-row">
          <button className="profile-secondary-action" onClick={() => void auth.logout()} type="button">
            <LogOut size={16} />
            Abmelden
          </button>
          <button className="profile-secondary-action is-muted" disabled type="button">
            <Trash2 size={16} />
            Account loeschen wird spaeter ergaenzt.
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
  const from = safeAppRedirect((location.state as { from?: string } | null)?.from);

  if (auth.status === "authenticated") {
    return <Navigate to={pendingProtectedPath ?? (auth.profile?.onboardingCompleted ? from : "/onboarding")} replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const result = mode === "login"
      ? await auth.login({ email, password })
      : await auth.signup({ email, password, displayName });

    if (result.ok) {
      const target = result.nextPath ?? (mode === "signup" ? "/onboarding" : from);

      if (isAuthRedirectTarget(target)) {
        navigate(target, { replace: true });
      } else {
        setPendingProtectedPath(target);
      }
    }

    setIsSubmitting(false);
  }

  return (
    <AuthSurface label={mode === "login" ? "Einloggen" : "Account erstellen"}>
      <AuthIntro
        eyebrow="Privater Zugang"
        title={mode === "login" ? "Willkommen zurueck" : "Account erstellen"}
        body={mode === "login" ? `Dein privater Speicher fuer Dinge, Nachweise und offene Punkte. Fragen? ${auth.config.supportEmail}` : "Mit E-Mail registrieren. Avareno bleibt privat, ruhig und ohne oeffentliche Profile."}
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

        <AuthMessage error={auth.error} success={null} />

        <button className="auth-primary" disabled={!auth.config.ready || isSubmitting || Boolean(pendingProtectedPath)} type="submit">
          {pendingProtectedPath ? "Oeffne Avareno..." : isSubmitting ? "Pruefe Zugang..." : mode === "login" ? "Einloggen" : "Account erstellen"}
          <ArrowRight size={17} />
        </button>
      </form>

      <div className="auth-provider-grid" aria-label="Weitere Login-Anbieter">
        <button disabled={!auth.config.providers.google.configured} type="button" onClick={() => void auth.signInWithProvider("google")}>Mit Google fortfahren</button>
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

function AuthSurface({ label, children }: { label: string; children: ReactNode }) {
  return <section className="auth-card" aria-label={label}>{children}</section>;
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
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <span>{body}</span>
    </header>
  );
}

function AuthField({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <label>
      <span>{label}</span>
      <div>
        {icon}
        {children}
      </div>
    </label>
  );
}

function AuthMessage({ error, success }: { error: string | null; success: string | null }) {
  if (error) {
    return <p className="auth-error">{error}</p>;
  }

  if (success) {
    return <p className="auth-success">{success}</p>;
  }

  return null;
}

function AuthSetupNotice({ missing }: { missing: string[] }) {
  return (
    <div className="auth-setup-note">
      <strong>Auth Setup erforderlich</strong>
      <span>{missing.length ? `Fehlend: ${missing.join(", ")}` : "Provider ist noch nicht vollstaendig verbunden."}</span>
    </div>
  );
}

function ProviderStatus({ label, status }: { label: string; status: string }) {
  return (
    <div>
      <strong>{label}</strong>
      <span>{status}</span>
    </div>
  );
}
