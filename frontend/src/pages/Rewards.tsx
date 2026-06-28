import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  ChevronRight,
  Copy,
  Database,
  Download,
  History,
  Link2Off,
  LockKeyhole,
  PauseCircle,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound
} from "lucide-react";
import { Link, NavLink, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../lib/authProvider";
import {
  buildCurrentUserProgress,
  defaultMotivationPrivacy,
  mockFriendCircle,
  mockFriendInvite,
  mockFriends
} from "../lib/friendsData";
import type { FriendProgress, MotivationPrivacyPreferences } from "../lib/friendsData";

const preferenceKey = "avareno-private-motivation-preferences";

export function Rewards() {
  const { profile } = useAuth();
  const location = useLocation();
  const { friendId } = useParams();
  const [preferences, setPreferences] = useState<MotivationPrivacyPreferences>(() => readMotivationPreferences());
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  const acceptedFriends = mockFriends.filter((friend) => friend.status === "accepted");
  const pendingFriends = mockFriends.filter((friend) => friend.status === "pending");
  const currentUserProgress = profile ? buildCurrentUserProgress(profile, preferences) : null;
  const progressRows = useMemo(() => {
    if (!currentUserProgress) return [];
    return [currentUserProgress, ...acceptedFriends];
  }, [acceptedFriends, currentUserProgress]);
  const section = getProfileSection(location.pathname);
  const selectedFriend = friendId ? progressRows.find((friend) => friend.id === friendId) ?? null : null;
  const profileBasePath = location.pathname.startsWith("/app/ich")
    ? "/app/ich"
    : location.pathname.startsWith("/app")
      ? "/app/profile"
      : "/rewards";

  if (!profile || !currentUserProgress) return <div className="profile-loading">Profil wird geladen...</div>;

  function updatePreferences(next: Partial<MotivationPrivacyPreferences>) {
    setPreferences((current) => {
      const merged = { ...current, ...next };
      window.localStorage.setItem(preferenceKey, JSON.stringify(merged));
      return merged;
    });
  }

  function copyInvite() {
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1800);
  }

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1>Ich</h1>
          <p>{profile.displayName}</p>
          <span>{profile.email}</span>
        </div>
      </section>

      <section className="profile-focus">
        <div>
          <span>Privater Freundeskreis</span>
          <h2>Gemeinsam dranbleiben, ohne Druck.</h2>
          <p>Freunde, Motivation und Sichtbarkeit sind getrennt. Jede Seite hat nur eine Aufgabe.</p>
        </div>
        <button className="profile-primary-action" onClick={copyInvite} type="button">
          <Copy size={16} />
          {inviteCopied ? "Link bereit" : "Einladung kopieren"}
        </button>
      </section>

      <section className="profile-stats" aria-label="Profil Überblick">
        <ProfileStat icon={<Sparkles size={18} />} label="Diese Woche" value={preferences.hideXpFromFriends ? "Privat" : `${profile.weeklyXp} XP`} />
        <ProfileStat icon={<CheckCircle2 size={18} />} label="Streak" value={preferences.hideStreakFromFriends ? "Privat" : `${profile.currentStreakDays} Tage`} />
        <ProfileStat icon={<PauseCircle size={18} />} label="Pausentage" value={String(profile.freezeDaysAvailable)} />
      </section>

      <ProfileSectionNav basePath={profileBasePath} />

      {section === "overview" ? (
        <ProfileOverview
          acceptedFriends={acceptedFriends}
          basePath={profileBasePath}
          preferences={preferences}
          progressRows={progressRows}
        />
      ) : null}

      {section === "friends" ? (
        <FriendsPage
          basePath={profileBasePath}
          inviteCode={inviteCode}
          onInviteCodeChange={setInviteCode}
          pendingFriends={pendingFriends}
          acceptedFriends={acceptedFriends}
          progressRows={progressRows}
          invitesEnabled={preferences.allowFriendInvites}
          motivationEnabled={preferences.motivationEnabled}
          progressEnabled={preferences.leaderboardEnabled}
        />
      ) : null}

      {section === "friendDetail" ? (
        <FriendDetailPage basePath={profileBasePath} friend={selectedFriend} />
      ) : null}

      {section === "privacy" ? (
        <PrivacyPanel
          preferences={preferences}
          profileEmail={profile.email}
          profileName={profile.displayName}
          onChange={updatePreferences}
        />
      ) : null}
    </main>
  );
}

function getProfileSection(pathname: string) {
  if (pathname.includes("/friends/")) return "friendDetail";
  if (pathname.endsWith("/friends")) return "friends";
  if (pathname.endsWith("/privacy")) return "privacy";
  return "overview";
}

function ProfileSectionNav({ basePath }: { basePath: string }) {
  const items = [
    { to: basePath, label: "Übersicht", end: true },
    { to: `${basePath}/friends`, label: "Freunde" },
    { to: `${basePath}/privacy`, label: "Datenschutz" },
    { to: `${basePath}/settings`, label: "Settings" }
  ];

  return (
    <nav className="profile-section-nav" aria-label="Profil Bereiche">
      {items.map((item) => (
        <NavLink className={({ isActive }) => (isActive ? "is-active" : "")} end={item.end} key={item.to} to={item.to}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function ProfileOverview({
  acceptedFriends,
  basePath,
  preferences,
  progressRows
}: {
  acceptedFriends: FriendProgress[];
  basePath: string;
  preferences: MotivationPrivacyPreferences;
  progressRows: FriendProgress[];
}) {
  const sharedActions = progressRows.reduce((sum, friend) => sum + friend.helpfulActions, 0);

  return (
    <section className="profile-overview-grid">
      <article className="profile-panel">
        <div className="profile-panel-head">
          <div>
            <span>Nächster Bereich</span>
            <h2>Freundeskreis</h2>
            <p>{acceptedFriends.length} Freunde sind verbunden. Fortschritt bleibt privat und ohne Platzierungen.</p>
          </div>
          <UserPlus size={18} />
        </div>
        <div className="profile-preview-row">
          <span>{sharedActions} kleine Aktionen</span>
          <span>{preferences.leaderboardEnabled ? "Sichtbar im Kreis" : "Ausgeblendet"}</span>
        </div>
        <Link className="profile-secondary-action" to={`${basePath}/friends`}>Freunde ansehen</Link>
      </article>

      <article className="profile-panel">
        <div className="profile-panel-head">
          <div>
            <span>Datenschutz</span>
            <h2>Kontrolle</h2>
            <p>Freundes-Sichtbarkeit, Export, Löschung und AI-Verarbeitung werden hier getrennt vorbereitet.</p>
          </div>
          <LockKeyhole size={18} />
        </div>
        <div className="profile-preview-row">
          <span>{preferences.hideXpFromFriends ? "XP privat" : "XP teilbar"}</span>
          <span>Export in Vorbereitung</span>
        </div>
        <Link className="profile-secondary-action" to={`${basePath}/privacy`}>Datenschutz prüfen</Link>
      </article>
    </section>
  );
}

function FriendsPage({
  basePath,
  inviteCode,
  onInviteCodeChange,
  pendingFriends,
  acceptedFriends,
  progressRows,
  invitesEnabled,
  motivationEnabled,
  progressEnabled
}: {
  basePath: string;
  inviteCode: string;
  onInviteCodeChange: (value: string) => void;
  pendingFriends: FriendProgress[];
  acceptedFriends: FriendProgress[];
  progressRows: FriendProgress[];
  invitesEnabled: boolean;
  motivationEnabled: boolean;
  progressEnabled: boolean;
}) {
  const sharedActions = progressRows.reduce((sum, friend) => sum + friend.helpfulActions, 0);
  const progressText = motivationEnabled && progressEnabled
    ? `${sharedActions} kleine Aktionen diese Woche`
    : "Freundliche Motivation ist pausiert";

  return (
    <section className="friends-workspace">
      <article className="profile-panel friends-list-panel">
        <div className="profile-panel-head">
          <div>
            <span>Freundeskreis</span>
            <h2>Wer dazugehört</h2>
            <p>{mockFriendCircle.name} ist ein privater Kreis für sanfte Motivation. Fortschritt bleibt ein kurzer Status, nicht ein Vergleich.</p>
          </div>
          <UserPlus size={18} />
        </div>

        <div className="friends-week-note">
          <strong>{progressText}</strong>
          <span>{acceptedFriends.length} verbundene Freunde, privat geteilt</span>
        </div>

        {acceptedFriends.length ? (
          <div className="friend-list" aria-label="Freundesliste">
            {acceptedFriends.map((friend) => (
              <FriendRow basePath={basePath} friend={friend} key={friend.id} />
            ))}
          </div>
        ) : (
          <div className="private-empty-state">
            <UserRound size={18} />
            <p>Füge enge Freunde hinzu, wenn ihr euch gegenseitig motivieren wollt.</p>
          </div>
        )}
      </article>

      <article className="profile-panel friends-invite-panel">
        <div className="profile-panel-head">
          <div>
            <span>Einladen</span>
            <h2>Freund hinzufügen</h2>
            <p>Teile einen privaten Code nur mit Menschen, die du wirklich in deinem Kreis haben willst.</p>
          </div>
        </div>

        <div className="friend-invite-box">
          <label>
            <span>Einladungscode</span>
            <input
              disabled={!invitesEnabled}
              onChange={(event) => onInviteCodeChange(event.target.value)}
              placeholder={mockFriendInvite.inviteCode}
              type="text"
              value={inviteCode}
            />
          </label>
          <small>{invitesEnabled ? "Invite-Link Platzhalter: avareno.app/invite/privat" : "Einladungen sind pausiert."}</small>
        </div>

        <div className="pending-invite-row">
          <span>Offen</span>
          <strong>{pendingFriends.map((friend) => friend.displayName).join(", ") || "Keine offenen Einladungen"}</strong>
        </div>
      </article>
    </section>
  );
}

function ProfileStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="profile-stat">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function FriendRow({ basePath, friend }: { basePath: string; friend: FriendProgress }) {
  const progress = friend.hidesXp ? "XP privat" : friend.helpfulActions ? `${friend.helpfulActions} kleine Aktionen` : "Ruhig gestartet";
  const context = friend.sourceBreakdown.length
    ? friend.sourceBreakdown.slice(0, 2).map((source) => source.label).join(", ")
    : "Noch nichts geteilt";

  return (
    <Link className="friend-row" to={`${basePath}/friends/${friend.id}`}>
      <Avatar name={friend.displayName} />
      <div>
        <strong>{friend.displayName}</strong>
        <small>{progress} - {context}</small>
      </div>
      <span>{friend.hidesStreak ? "Privat" : friend.label}</span>
      <ChevronRight size={16} />
    </Link>
  );
}

function FriendDetailPage({ basePath, friend }: { basePath: string; friend: FriendProgress | null }) {
  if (!friend) {
    return (
      <section className="profile-panel friend-detail-panel">
        <Link className="friend-detail-back" to={`${basePath}/friends`}>
          <ArrowLeft size={16} />
          Zurück zu Freunde
        </Link>
        <div className="private-empty-state">
          <UserRound size={18} />
          <p>Dieser Freund ist nicht in deinem privaten Kreis sichtbar.</p>
        </div>
      </section>
    );
  }

  const weeklyLabel = friend.hidesXp ? "XP privat" : `${friend.weeklyXp} XP`;
  const streakLabel = friend.hidesStreak ? "Privat" : `${friend.currentStreakDays} Tage`;

  return (
    <section className="profile-panel friend-detail-panel">
      <Link className="friend-detail-back" to={`${basePath}/friends`}>
        <ArrowLeft size={16} />
        Zurück zu Freunde
      </Link>

      <div className="friend-detail-hero">
        <Avatar name={friend.displayName} />
        <div>
          <span>Freund</span>
          <h2>{friend.displayName}</h2>
          <p>{friend.note}</p>
        </div>
      </div>

      <div className="friend-detail-stats" aria-label="Freund Status">
        <ProfileStat icon={<Sparkles size={18} />} label="Woche" value={weeklyLabel} />
        <ProfileStat icon={<CheckCircle2 size={18} />} label="Aktionen" value={String(friend.helpfulActions)} />
        <ProfileStat icon={<PauseCircle size={18} />} label="Streak" value={streakLabel} />
      </div>

      <div className="friend-detail-context">
        <strong>Warum sichtbar?</strong>
        <p>Ihr seid in einem privaten Freundeskreis verbunden. Geteilte Werte bleiben optional und können jederzeit ausgeblendet werden.</p>
      </div>

      {friend.sourceBreakdown.length ? (
        <div className="friend-detail-source-list" aria-label="Fortschrittsquellen">
          {friend.sourceBreakdown.map((source) => (
            <span key={source.label}>{source.count} {source.label}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PrivacyPanel({
  preferences,
  profileEmail,
  profileName,
  onChange
}: {
  preferences: MotivationPrivacyPreferences;
  profileEmail: string;
  profileName: string;
  onChange: (next: Partial<MotivationPrivacyPreferences>) => void;
}) {
  const [leaveState, setLeaveState] = useState<"idle" | "confirm" | "left">("idle");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  function leaveCircle() {
    if (leaveState === "idle") {
      setLeaveState("confirm");
      return;
    }
    onChange({
      allowFriendInvites: false,
      leaderboardEnabled: false,
      motivationEnabled: false
    });
    setLeaveState("left");
  }

  const overviewRows = [
    { label: "Account", value: profileEmail },
    { label: "Profil", value: profileName },
    { label: "Dinge & Dokumente", value: "Über Objekt- und Dokumentenspeicher verwaltet" },
    { label: "AI Memory Build", value: "Foundation markiert, keine Garantie- oder Rechtsprüfung" }
  ];
  const connectedSources = [
    { label: "Supabase Auth", status: "Aktive Anmeldung" },
    { label: "Cloudflare Turnstile", status: "Bot-Schutz bei Login/Signup" },
    { label: "Avareno Connect", status: "Noch keine produktive Verbindung" }
  ];
  const consentRows = [
    { label: "Login-Session", status: "Technisch notwendig" },
    { label: "AI-Verarbeitung", status: "Explizite Kontrolle noch offen" },
    { label: "Marketing/Analytics", status: "Nicht aktiv im aktuellen Frontend" }
  ];

  return (
    <section className="profile-panel privacy-panel privacy-center-panel">
      <div className="profile-panel-head">
        <div>
          <span>Datenschutz & Kontrolle</span>
          <h2>Was Avareno über dich vorbereitet.</h2>
          <p>Diese Seite ist die ehrliche Foundation: Sichtbarkeit ist steuerbar, Export und Löschung sind markiert, aber noch nicht als vollständig erledigt dargestellt.</p>
        </div>
        <LockKeyhole size={18} />
      </div>

      <div className="privacy-center-grid" aria-label="Datenschutz Kontrollzentrum">
        <article className="privacy-center-card">
          <span><Database size={16} /></span>
          <div>
            <h3>Data Overview</h3>
            <p>Aktuelle Kategorien, ohne Rohdokumente oder sensible Inhalte in der UI auszulesen.</p>
          </div>
          <div className="privacy-control-list">
            {overviewRows.map((row) => (
              <div key={row.label}>
                <strong>{row.label}</strong>
                <small>{row.value}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="privacy-center-card">
          <span><Download size={16} /></span>
          <div>
            <h3>Daten exportieren</h3>
            <p>Der Export-Plan existiert als Backend-Foundation. Der vollständige Download ist noch nicht produktiv freigeschaltet.</p>
          </div>
          <button className="profile-secondary-action is-muted" disabled type="button">Export vorbereiten</button>
        </article>

        <article className="privacy-center-card is-danger-zone">
          <span><Trash2 size={16} /></span>
          <div>
            <h3>Account & Daten löschen</h3>
            <p>Löschung braucht eine saubere Orchestrierung für Auth, Datenbank, Storage, lokale Uploads, Connectors und Backups.</p>
          </div>
          <label className="privacy-confirm-field">
            <span>Zum späteren Bestätigen: DELETE eingeben</span>
            <input
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder="DELETE"
              type="text"
              value={deleteConfirmation}
            />
          </label>
          <button className="profile-secondary-action is-muted" disabled type="button">
            {deleteConfirmation === "DELETE" ? "Löschung noch nicht aktiv" : "Löschung gesperrt"}
          </button>
        </article>

        <article className="privacy-center-card">
          <span><Link2Off size={16} /></span>
          <div>
            <h3>Connected Sources</h3>
            <p>Connect bleibt read-only und minimal, bis Token-Löschung, Scopes und SSRF-Schutz vollständig geprüft sind.</p>
          </div>
          <div className="privacy-control-list">
            {connectedSources.map((source) => (
              <div key={source.label}>
                <strong>{source.label}</strong>
                <small>{source.status}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="privacy-center-card">
          <span><Brain size={16} /></span>
          <div>
            <h3>AI Analysis Controls</h3>
            <p>AI-Fakten müssen als AI-assisted erkennbar bleiben, korrigierbar sein und dürfen keine Garantie- oder Rechtsentscheidung versprechen.</p>
          </div>
          <div className="profile-preview-row">
            <span>Prompt-Minimierung</span>
            <span>Vault opt-in offen</span>
            <span>Korrekturpflicht</span>
          </div>
        </article>

        <article className="privacy-center-card">
          <span><ShieldCheck size={16} /></span>
          <div>
            <h3>Private Vault Controls</h3>
            <p>Sensible Dokumente bekommen eine eigene Schutzschicht. Re-Auth, PIN/Passkey und stärkere Verschlüsselung sind bewusst noch TODO.</p>
          </div>
          <div className="profile-preview-row">
            <span>Keine Auto-Analyse</span>
            <span>Explizite Bestätigung nötig</span>
          </div>
        </article>

        <article className="privacy-center-card">
          <span><History size={16} /></span>
          <div>
            <h3>Consent & Permissions History</h3>
            <p>Eine echte Historie ist vorbereitet, aber erst sinnvoll, sobald produktive Consent-Events geschrieben werden.</p>
          </div>
          <div className="privacy-control-list">
            {consentRows.map((row) => (
              <div key={row.label}>
                <strong>{row.label}</strong>
                <small>{row.status}</small>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="privacy-foundation-note">
        <strong>Foundation-Status</strong>
        <span>Export, Löschung, Connector-Disconnect, Vault-Analyse und Consent-History sind nicht als abgeschlossen freigeschaltet.</span>
      </div>

      <div className="privacy-toggle-list">
        <PrivacyToggle
          checked={preferences.motivationEnabled}
          label="Motivation aktivieren"
          note="Zeigt sanfte Fortschritte nur in deinem privaten Bereich."
          onChange={(checked) => onChange({ motivationEnabled: checked })}
        />
        <PrivacyToggle
          checked={preferences.leaderboardEnabled}
          label="Freundeskreis-Fortschritt anzeigen"
          note="Nur akzeptierte Freunde aus deinem Kreis werden angezeigt."
          onChange={(checked) => onChange({ leaderboardEnabled: checked })}
        />
        <PrivacyToggle
          checked={preferences.hideXpFromFriends}
          label="Meine XP vor Freunden verbergen"
          note="Freunde sehen dann nur, dass du privat bleibst."
          onChange={(checked) => onChange({ hideXpFromFriends: checked })}
        />
        <PrivacyToggle
          checked={preferences.hideStreakFromFriends}
          label="Meinen Streak vor Freunden verbergen"
          note="Aktiviert als Beispiel für eine private Standardeinstellung."
          onChange={(checked) => onChange({ hideStreakFromFriends: checked })}
        />
        <PrivacyToggle
          checked={preferences.allowFriendInvites}
          label="Freundeseinladungen erlauben"
          note="Du kannst neue Codes pausieren, ohne bestehende Freunde zu entfernen."
          onChange={(checked) => onChange({ allowFriendInvites: checked })}
        />
      </div>

      {leaveState === "left" ? (
        <p className="leave-circle-note">Freundeskreis-Funktionen sind pausiert. Bestehende Mock-Freunde bleiben für die Demo sichtbar.</p>
      ) : null}
      <button className={leaveState === "confirm" ? "leave-circle-button is-danger" : "leave-circle-button"} onClick={leaveCircle} type="button">
        {leaveState === "confirm" ? "Verlassen bestätigen" : "Freundeskreis verlassen"}
      </button>
    </section>
  );
}

function PrivacyToggle({
  checked,
  label,
  note,
  onChange
}: {
  checked: boolean;
  label: string;
  note: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="privacy-toggle">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <small>{note}</small>
      </div>
    </label>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="friend-avatar" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function readMotivationPreferences(): MotivationPrivacyPreferences {
  try {
    return {
      ...defaultMotivationPrivacy,
      ...JSON.parse(window.localStorage.getItem(preferenceKey) ?? "{}")
    } as MotivationPrivacyPreferences;
  } catch {
    return defaultMotivationPrivacy;
  }
}
