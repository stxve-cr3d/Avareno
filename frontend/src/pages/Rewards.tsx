import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  ChevronRight,
  Copy,
  Database,
  Download,
  FileLock2,
  History,
  LockKeyhole,
  PauseCircle,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  X
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, apiBlob } from "../lib/api";
import { useAuth } from "../lib/authProvider";
import { defaultMotivationPrivacy } from "../lib/friendsData";
import type { MotivationPrivacyPreferences } from "../lib/friendsData";
import {
  acceptInvite,
  addCircleMember,
  createCircle,
  deleteCircle,
  getCircles,
  getFriendsOverview,
  getPrivacy,
  patchPrivacy,
  removeCircleMember,
  removeFriend
} from "../lib/friendsApi";
import type { ApiCircle, ApiFriend, ApiInvite, SelfProgress } from "../lib/friendsApi";
import type { PrivacyDataOverviewItem, PrivacySummary } from "../lib/types";

const preferenceKey = "avareno-private-motivation-preferences";

export function Rewards() {
  const { profile } = useAuth();
  const location = useLocation();
  const { friendId } = useParams();
  const [preferences, setPreferences] = useState<MotivationPrivacyPreferences>(() => readMotivationPreferences());
  const [inviteInput, setInviteInput] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [friends, setFriends] = useState<ApiFriend[]>([]);
  const [invite, setInvite] = useState<ApiInvite | null>(null);
  const [self, setSelf] = useState<SelfProgress | null>(null);
  const [friendsStatus, setFriendsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [friendsMessage, setFriendsMessage] = useState<string | null>(null);

  const section = getProfileSection(location.pathname);
  const selectedFriend = friendId ? friends.find((friend) => friend.id === friendId) ?? null : null;
  const profileBasePath = location.pathname.startsWith("/app/ich")
    ? "/app/ich"
    : location.pathname.startsWith("/app/profile")
      ? "/app/profile"
      : location.pathname.startsWith("/app")
        ? "/app/ich"
        : "/rewards";
  const [privacySummary, setPrivacySummary] = useState<PrivacySummary | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  async function reloadPrivacySummary() {
    const summary = await api<PrivacySummary>("/api/privacy/summary");
    setPrivacySummary(summary);
    setPrivacyError(null);
    return summary;
  }

  useEffect(() => {
    if (section !== "privacy") {
      return;
    }

    let active = true;
    setPrivacyError(null);
    reloadPrivacySummary()
      .then((summary) => {
        if (active) {
          setPrivacySummary(summary);
        }
      })
      .catch(() => {
        if (active) {
          setPrivacyError("Backend-Zusammenfassung noch nicht erreichbar. Die sicheren Platzhalter bleiben sichtbar.");
        }
      });

    return () => {
      active = false;
    };
  }, [section]);

  async function loadFriends() {
    setFriendsStatus("loading");
    try {
      const overview = await getFriendsOverview();
      setFriends(overview.friends);
      setInvite(overview.invite);
      setSelf(overview.self);
      setFriendsStatus("ready");
    } catch {
      setFriendsStatus("error");
    }
  }

  useEffect(() => {
    void loadFriends();
    // Load the server-side source of truth for motivation-privacy prefs.
    getPrivacy()
      .then((serverPrefs) => setPreferences(serverPrefs))
      .catch(() => undefined);
  }, []);

  if (!profile) return <div className="profile-loading">Profil wird geladen...</div>;

  function updatePreferences(next: Partial<MotivationPrivacyPreferences>) {
    setPreferences((current) => {
      const merged = { ...current, ...next };
      window.localStorage.setItem(preferenceKey, JSON.stringify(merged));
      return merged;
    });
    // Persist to the backend — this is what actually controls friend visibility.
    void patchPrivacy(next).catch(() => undefined);
  }

  async function copyInvite() {
    if (!invite) return;
    try {
      await navigator.clipboard?.writeText(invite.inviteCode);
    } catch {
      // Clipboard may be blocked; the code stays visible on screen either way.
    }
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1800);
  }

  async function handleAcceptCode() {
    const code = inviteInput.trim();
    if (!code) return;
    setFriendsMessage(null);
    try {
      const result = await acceptInvite(code);
      setInviteInput("");
      setFriendsMessage(
        result.alreadyConnected
          ? "Ihr seid bereits verbunden."
          : `${result.friend.displayName} ist jetzt mit dir verbunden.`
      );
      await loadFriends();
    } catch (error) {
      setFriendsMessage(error instanceof Error ? error.message : "Code konnte nicht eingelöst werden.");
    }
  }

  async function handleRemoveFriend(friendUserId: string) {
    setFriendsMessage(null);
    try {
      await removeFriend(friendUserId);
      await loadFriends();
    } catch {
      setFriendsMessage("Freund konnte nicht entfernt werden.");
    }
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
        <button className="profile-primary-action" disabled={!invite} onClick={() => void copyInvite()} type="button">
          <Copy size={16} />
          {inviteCopied ? "Code kopiert" : "Einladungscode kopieren"}
        </button>
      </section>

      <section className="profile-stats" aria-label="Profil Überblick">
        <ProfileStat icon={<Sparkles size={18} />} label="Diese Woche" value={self ? `${self.weeklyXp} XP` : "…"} />
        <ProfileStat icon={<CheckCircle2 size={18} />} label="Streak" value={self ? `${self.currentStreakDays} Tage` : "…"} />
        <ProfileStat icon={<UserPlus size={18} />} label="Freunde" value={String(friends.length)} />
      </section>

      <ProfileSectionNav app={location.pathname.startsWith("/app")} basePath={profileBasePath} />

      {section === "overview" ? (
        <ProfileOverview basePath={profileBasePath} friendCount={friends.length} preferences={preferences} />
      ) : null}

      {section === "friends" ? (
        <FriendsPanel
          basePath={profileBasePath}
          friends={sortFriendsByProgress(friends)}
          self={self}
          invite={invite}
          status={friendsStatus}
          message={friendsMessage}
          inviteInput={inviteInput}
          onInviteInputChange={setInviteInput}
          onAccept={handleAcceptCode}
          onCopy={copyInvite}
          copied={inviteCopied}
          onRetry={loadFriends}
        />
      ) : null}

      {section === "friendDetail" ? (
        <FriendDetailPage basePath={profileBasePath} friend={selectedFriend} onRemove={handleRemoveFriend} />
      ) : null}

      {section === "privacy" ? (
        <PrivacyCenterPanel
          summary={privacySummary ?? buildPrivacyFallback(profile.displayName)}
          loadError={privacyError}
          preferences={preferences}
          onChange={updatePreferences}
          onRefresh={reloadPrivacySummary}
        />
      ) : null}
    </main>
  );
}

function getProfileSection(pathname: string) {
  if (pathname.includes("/friends/")) return "friendDetail";
  if (pathname.endsWith("/friends")) return "friends";
  if (pathname.endsWith("/privacy") || pathname.endsWith("/datenschutz")) return "privacy";
  return "overview";
}

function ProfileSectionNav({ app, basePath }: { app: boolean; basePath: string }) {
  const items = [
    { to: basePath, label: "Übersicht", end: true },
    { to: `${basePath}/friends`, label: "Freunde" },
    { to: `${basePath}/privacy`, label: "Datenschutz" },
    { to: app ? `${basePath}/settings` : "/settings/account", label: "Konto" }
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
  basePath,
  friendCount,
  preferences
}: {
  basePath: string;
  friendCount: number;
  preferences: MotivationPrivacyPreferences;
}) {
  return (
    <section className="profile-overview-grid">
      <article className="profile-panel">
        <div className="profile-panel-head">
          <div>
            <span>Nächster Bereich</span>
            <h2>Freundeskreis</h2>
            <p>
              {friendCount === 0
                ? "Noch keine Freunde verbunden. Teile deinen Code, um zu starten."
                : `${friendCount} ${friendCount === 1 ? "Freund ist" : "Freunde sind"} verbunden.`}
            </p>
          </div>
          <UserPlus size={18} />
        </div>
        <div className="profile-preview-row">
          <span>{friendCount} verbunden</span>
          <span>Privater Kreis</span>
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

function FriendsPanel({
  basePath,
  friends,
  self,
  invite,
  status,
  message,
  inviteInput,
  onInviteInputChange,
  onAccept,
  onCopy,
  copied,
  onRetry
}: {
  basePath: string;
  friends: ApiFriend[];
  self: SelfProgress | null;
  invite: ApiInvite | null;
  status: "loading" | "ready" | "error";
  message: string | null;
  inviteInput: string;
  onInviteInputChange: (value: string) => void;
  onAccept: () => void;
  onCopy: () => void;
  copied: boolean;
  onRetry: () => void;
}) {
  const weeklyTogether =
    (self?.weeklyXp ?? 0) + friends.reduce((sum, friend) => sum + (friend.hidesXp ? 0 : friend.weeklyXp ?? 0), 0);

  return (
    <section className="friends-workspace">
      <article className="profile-panel friends-list-panel">
        <div className="profile-panel-head">
          <div>
            <span>Freundeskreis</span>
            <h2>Wer dazugehört</h2>
            <p>Ein privater Kreis. Ihr seht voneinander nur, was jede Person zu teilen wählt — ohne Druck.</p>
          </div>
          <UserPlus size={18} />
        </div>

        {status === "ready" && friends.length ? (
          <div className="friends-week-note">
            <strong>Diese Woche gemeinsam</strong>
            <span>{weeklyTogether} XP · du und {friends.length} {friends.length === 1 ? "Freund" : "Freunde"}</span>
          </div>
        ) : null}

        {status === "loading" ? (
          <div className="friends-week-note">
            <strong>Freunde werden geladen…</strong>
          </div>
        ) : status === "error" ? (
          <div className="private-empty-state">
            <UserRound size={18} />
            <p>Freunde konnten nicht geladen werden.</p>
            <button className="profile-secondary-action" onClick={onRetry} type="button">Erneut versuchen</button>
          </div>
        ) : friends.length ? (
          <div className="friend-list" aria-label="Freundesliste">
            {friends.map((friend) => (
              <FriendRow basePath={basePath} friend={friend} key={friend.id} />
            ))}
          </div>
        ) : (
          <div className="private-empty-state">
            <UserRound size={18} />
            <p>Noch keine Freunde. Teile deinen Code oder gib den Code eines Freundes ein.</p>
          </div>
        )}
      </article>

      <article className="profile-panel friends-invite-panel">
        <div className="profile-panel-head">
          <div>
            <span>Einladen</span>
            <h2>Freund hinzufügen</h2>
            <p>Teile deinen Code mit jemandem, den du wirklich in deinem Kreis haben willst — oder gib ihren Code ein.</p>
          </div>
        </div>

        <div className="friend-invite-box">
          <label>
            <span>Dein Einladungscode</span>
            <div className="friend-invite-code-row">
              <strong>{invite?.inviteCode ?? "…"}</strong>
              <button className="profile-secondary-action" disabled={!invite} onClick={onCopy} type="button">
                <Copy size={15} /> {copied ? "Kopiert" : "Kopieren"}
              </button>
            </div>
          </label>

          <label>
            <span>Code eines Freundes</span>
            <input
              onChange={(event) => onInviteInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onAccept();
              }}
              placeholder="AVARENO-XXXXXX"
              type="text"
              value={inviteInput}
            />
          </label>
          <button className="profile-primary-action" disabled={!inviteInput.trim()} onClick={onAccept} type="button">
            <UserPlus size={16} /> Verbinden
          </button>
          {message ? <small>{message}</small> : null}
        </div>
      </article>

      <FriendCircles friends={friends} />
    </section>
  );
}

function FriendCircles({ friends }: { friends: ApiFriend[] }) {
  const [circles, setCircles] = useState<ApiCircle[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCircles()
      .then((result) => setCircles(result.circles))
      .catch(() => undefined);
  }, []);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const circle = await createCircle(trimmed);
      setName("");
      setCircles((current) => [...current, circle]);
    } catch {
      // keep the input; the user can retry
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCircle(id);
      setCircles((current) => current.filter((circle) => circle.id !== id));
    } catch {
      // no-op
    }
  }

  function replaceCircle(updated: ApiCircle) {
    setCircles((current) => current.map((circle) => (circle.id === updated.id ? updated : circle)));
  }

  async function handleAdd(id: string, friendUserId: string) {
    try {
      replaceCircle(await addCircleMember(id, friendUserId));
    } catch {
      // no-op
    }
  }

  async function handleRemoveMember(id: string, friendUserId: string) {
    try {
      replaceCircle(await removeCircleMember(id, friendUserId));
    } catch {
      // no-op
    }
  }

  return (
    <article className="profile-panel friends-circles-panel">
      <div className="profile-panel-head">
        <div>
          <span>Kreise</span>
          <h2>Private Gruppen</h2>
          <p>Gruppiere enge Freunde für dich — nur du siehst deine Kreise.</p>
        </div>
        <Users size={18} />
      </div>

      <div className="friend-circle-create">
        <input
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleCreate();
          }}
          placeholder="Neuer Kreis, z. B. Familie"
          type="text"
          value={name}
        />
        <button className="profile-secondary-action" disabled={!name.trim() || busy} onClick={() => void handleCreate()} type="button">
          Anlegen
        </button>
      </div>

      {circles.length ? (
        circles.map((circle) => (
          <FriendCircleRow
            circle={circle}
            friends={friends}
            key={circle.id}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onRemoveMember={handleRemoveMember}
          />
        ))
      ) : (
        <div className="private-empty-state">
          <Users size={18} />
          <p>Noch keine Kreise. Lege einen an, um Freunde privat zu gruppieren.</p>
        </div>
      )}
    </article>
  );
}

function FriendCircleRow({
  circle,
  friends,
  onAdd,
  onDelete,
  onRemoveMember
}: {
  circle: ApiCircle;
  friends: ApiFriend[];
  onAdd: (id: string, friendUserId: string) => void;
  onDelete: (id: string) => void;
  onRemoveMember: (id: string, friendUserId: string) => void;
}) {
  const memberIds = new Set(circle.members.map((member) => member.id));
  const addable = friends.filter((friend) => !memberIds.has(friend.id));

  return (
    <div className="friend-circle">
      <div className="friend-circle-head">
        <strong>{circle.name}</strong>
        <button className="friend-circle-del" onClick={() => onDelete(circle.id)} type="button" aria-label={`${circle.name} löschen`}>
          <Trash2 size={14} />
        </button>
      </div>

      <div className="friend-circle-members">
        {circle.members.length ? (
          circle.members.map((member) => (
            <span className="friend-circle-chip" key={member.id}>
              {member.displayName}
              <button onClick={() => onRemoveMember(circle.id, member.id)} type="button" aria-label={`${member.displayName} entfernen`}>
                <X size={12} />
              </button>
            </span>
          ))
        ) : (
          <small>Noch niemand im Kreis.</small>
        )}
      </div>

      {addable.length ? (
        <select
          className="friend-circle-add"
          onChange={(event) => {
            if (event.target.value) onAdd(circle.id, event.target.value);
          }}
          value=""
        >
          <option value="">Freund hinzufügen…</option>
          {addable.map((friend) => (
            <option key={friend.id} value={friend.id}>
              {friend.displayName}
            </option>
          ))}
        </select>
      ) : null}
    </div>
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

function FriendRow({ basePath, friend }: { basePath: string; friend: ApiFriend }) {
  return (
    <Link className="friend-row" to={`${basePath}/friends/${friend.id}`}>
      <Avatar name={friend.displayName} />
      <div>
        <strong>{friend.displayName}</strong>
        <small>{friendStreakLabel(friend)} · seit {formatFriendDate(friend.addedAt)}</small>
      </div>
      <span>{friend.hidesXp ? "XP privat" : `${friend.weeklyXp ?? 0} XP`}</span>
      <ChevronRight size={16} />
    </Link>
  );
}

function friendStreakLabel(friend: ApiFriend) {
  if (friend.hidesStreak) return "Streak privat";
  const days = friend.currentStreakDays ?? 0;
  return days > 0 ? `${days} Tage Streak` : "Kein Streak";
}

// Gently orders friends by shared weekly XP; those keeping XP private sort last
// (a calm signal, not a competitive ranking).
function sortFriendsByProgress(friends: ApiFriend[]) {
  return [...friends].sort((a, b) => {
    const av = a.hidesXp ? -1 : a.weeklyXp ?? 0;
    const bv = b.hidesXp ? -1 : b.weeklyXp ?? 0;
    return bv - av;
  });
}

function FriendDetailPage({
  basePath,
  friend,
  onRemove
}: {
  basePath: string;
  friend: ApiFriend | null;
  onRemove: (friendUserId: string) => Promise<void>;
}) {
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);

  if (!friend) {
    return (
      <section className="profile-panel friend-detail-panel">
        <Link className="friend-detail-back" to={`${basePath}/friends`}>
          <ArrowLeft size={16} />
          Zurück zu Freunde
        </Link>
        <div className="private-empty-state">
          <UserRound size={18} />
          <p>Dieser Freund ist nicht in deinem privaten Kreis.</p>
        </div>
      </section>
    );
  }

  async function handleRemove() {
    if (!friend) return;
    setRemoving(true);
    try {
      await onRemove(friend.id);
      navigate(`${basePath}/friends`);
    } finally {
      setRemoving(false);
    }
  }

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
          <p>Verbunden seit {formatFriendDate(friend.addedAt)}</p>
        </div>
      </div>

      <div className="friend-detail-stats" aria-label="Freund Status">
        <ProfileStat icon={<Sparkles size={18} />} label="Diese Woche" value={friend.hidesXp ? "Privat" : `${friend.weeklyXp ?? 0} XP`} />
        <ProfileStat icon={<CheckCircle2 size={18} />} label="Streak" value={friend.hidesStreak ? "Privat" : `${friend.currentStreakDays ?? 0} Tage`} />
      </div>

      <div className="friend-detail-context">
        <strong>Privat verbunden</strong>
        <p>Was du siehst, hängt von den Einstellungen deines Freundes ab. Werte können jederzeit privat gestellt werden.</p>
      </div>

      <button className="leave-circle-button is-danger" disabled={removing} onClick={() => void handleRemove()} type="button">
        <Trash2 size={16} />
        {removing ? "Wird entfernt…" : "Freund entfernen"}
      </button>
    </section>
  );
}

function formatFriendDate(value: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

function PrivacyCenterPanel({
  summary,
  loadError,
  preferences,
  onChange,
  onRefresh
}: {
  summary: PrivacySummary;
  loadError: string | null;
  preferences: MotivationPrivacyPreferences;
  onChange: (next: Partial<MotivationPrivacyPreferences>) => void;
  onRefresh: () => Promise<PrivacySummary>;
}) {
  const [deleteState, setDeleteState] = useState<"idle" | "confirm">("idle");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(actionId: string, action: () => Promise<string>) {
    setBusyAction(actionId);
    setActionError(null);
    setActionMessage(null);
    try {
      const message = await action();
      setActionMessage(message);
      await onRefresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Aktion konnte nicht ausgeführt werden.");
    } finally {
      setBusyAction(null);
    }
  }

  function handleExport() {
    void runAction("export", async () => {
      const result = await apiBlob("/api/privacy/export/bundle", { method: "POST" });
      downloadBlob(result.fileName ?? `avareno-export-${new Date().toISOString().slice(0, 10)}.zip`, result.blob);
      return "ZIP-Export mit Datenbankdaten, Manifest und lokalen Dokumentdateien wurde erstellt.";
    });
  }

  function handleDisconnect(sourceId: string) {
    void runAction(`disconnect-${sourceId}`, async () => {
      await api(`/api/privacy/connected-sources/${encodeURIComponent(sourceId)}/disconnect`, { method: "POST", body: JSON.stringify({}) });
      return "Quelle wurde lokal getrennt. Provider-Token-Widerruf bleibt für echte OAuth-Provider ein Launch-Blocker.";
    });
  }

  function handleDeleteAiData() {
    void runAction("delete-ai-data", async () => {
      const result = await api<{ userVisibleMessage: string }>("/api/privacy/ai-data/delete", { method: "POST", body: JSON.stringify({}) });
      return result.userVisibleMessage;
    });
  }

  function handleDeletionRequest() {
    void runAction("account-deletion-request", async () => {
      await api("/api/privacy/deletion/request", { method: "POST", body: JSON.stringify({}) });
      setDeleteState("idle");
      return "Löschanfrage wurde protokolliert. Vollständige Ausführung bleibt bis Auth-, Storage-, Provider- und Backup-Orchestrierung gesperrt.";
    });
  }

  return (
    <section className="profile-panel privacy-panel privacy-center-panel">
      <div className="profile-panel-head">
        <div>
          <span>Privacy Center</span>
          <h2>Datenschutz & Kontrolle</h2>
          <p>Ein ruhiger Ort für Datenüberblick, Export, Löschung, verbundene Quellen, KI-Analyse und Private Vault.</p>
        </div>
        <ShieldCheck size={18} />
      </div>

      {loadError ? (
        <div className="privacy-status-note">
          <AlertTriangle size={16} />
          <span>{loadError}</span>
        </div>
      ) : null}

      {actionMessage ? (
        <div className="privacy-status-note is-success">
          <CheckCircle2 size={16} />
          <span>{actionMessage}</span>
        </div>
      ) : null}

      {actionError ? (
        <div className="privacy-status-note is-error">
          <AlertTriangle size={16} />
          <span>{actionError}</span>
        </div>
      ) : null}

      <div className="privacy-center-list">
        <PrivacySection icon={<Database size={18} />} label="Datenüberblick" title="Was Avareno gerade kennt">
          <div className="privacy-data-grid">
            {summary.dataOverview.map((item) => (
              <PrivacyDataRow item={item} key={item.id} />
            ))}
          </div>
        </PrivacySection>

        <PrivacySection icon={<Download size={18} />} label="Export" title="Kopie deiner Daten">
          <p>Erhalte eine Kopie deiner gespeicherten Objekte, Dokument-Metadaten und Einstellungen.</p>
          <button
            className="profile-primary-action privacy-action-button"
            disabled={!summary.export.ready || busyAction === "export"}
            onClick={handleExport}
            type="button"
          >
            <Download size={16} />
            {busyAction === "export" ? "Export wird erstellt..." : "Daten exportieren"}
          </button>
          <small>{summary.export.userVisibleMessage}</small>
        </PrivacySection>

        <PrivacySection icon={<PlugZap size={18} />} label="Connect" title="Verbundene Quellen">
          {summary.connectedSources.length ? (
            <div className="privacy-source-list">
              {summary.connectedSources.map((source) => (
                <div className="privacy-source-row" key={source.id}>
                  <div>
                    <strong>{source.name}</strong>
                    <small>{source.type} · {source.status} · {source.permissions.join(", ")}</small>
                  </div>
                  <button
                    disabled={!source.disconnectAvailable || busyAction === `disconnect-${source.id}`}
                    onClick={() => handleDisconnect(source.id)}
                    type="button"
                  >
                    {busyAction === `disconnect-${source.id}` ? "Trennt..." : "Trennen"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="private-empty-state privacy-empty-state">
              <PlugZap size={18} />
              <p>Noch keine verbundenen Quellen. Connect bleibt leer, bis du bewusst etwas verknüpfst.</p>
            </div>
          )}
        </PrivacySection>

        <PrivacySection icon={<Brain size={18} />} label="KI-Analyse" title="Belege und Dokumente">
          <div className="privacy-toggle-list">
            <PrivacyToggle
              checked={false}
              disabled
              label="KI-Analyse für Belege und Dokumente"
              note="Analyse bleibt nutzerausgelöst. Korrektur läuft über das Dokument; gespeicherte Extraktionen können gelöscht werden."
              onChange={() => undefined}
            />
            <PrivacyToggle
              checked={!summary.aiControls.vaultAutoAnalysis}
              disabled
              label="Private Vault nie automatisch analysieren"
              note="Sensible Vault-Dokumente bleiben von automatischer Analyse getrennt."
              onChange={() => undefined}
            />
          </div>
          <button
            className="profile-secondary-action privacy-action-button"
            disabled={!summary.aiControls.deleteAvailable || !summary.aiControls.extractedRecordCount || busyAction === "delete-ai-data"}
            onClick={handleDeleteAiData}
            type="button"
          >
            <Trash2 size={16} />
            {busyAction === "delete-ai-data" ? "Löscht..." : "Extrahierte Daten löschen"}
          </button>
          <small>{summary.aiControls.extractedRecordCount ?? 0} Dokumente mit gespeicherten Extraktionen.</small>
        </PrivacySection>

        <PrivacySection icon={<FileLock2 size={18} />} label="Private Vault" title="Extra Schutz für sensible Dokumente">
          <p>Geschützter Bereich für Identität, Versicherungen, Zahlung, Medizin, Arbeits-, Vertrags- und Rechtsdokumente — PIN-gesichert und nie automatisch analysiert.</p>
          <div className="privacy-chip-row">
            {summary.privateVault.sensitiveCategories.slice(0, 7).map((category) => (
              <span key={category}>{formatVaultCategory(category)}</span>
            ))}
          </div>
          <div className="privacy-action-pair">
            <Link className="profile-secondary-action" to="/app/vault">Vault verwalten</Link>
          </div>
        </PrivacySection>

        <PrivacySection icon={<History size={18} />} label="Historie" title="Einwilligungen & Berechtigungen">
          {summary.consentHistory.length ? (
            <div className="privacy-source-list">
              {summary.consentHistory.map((event) => (
                <div className="privacy-source-row" key={event.id}>
                  <div>
                    <strong>{event.label}</strong>
                    <small>{event.createdAt} · {event.status}{event.legalBasis ? ` · ${event.legalBasis}` : ""}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="private-empty-state privacy-empty-state">
              <History size={18} />
              <p>Noch keine gespeicherte Consent-Historie. Speicherung und Widerruf werden als eigener Audit-Trail vorbereitet.</p>
            </div>
          )}
        </PrivacySection>

        <PrivacySection icon={<LockKeyhole size={18} />} label="Freigaben" title="Freundeskreis sichtbar halten">
          <div className="privacy-toggle-list">
            <PrivacyToggle
              checked={preferences.leaderboardEnabled}
              label="Fortschritt mit Freunden teilen"
              note="Aus: Freunde sehen nur, dass ihr verbunden seid — keine Werte. Serverseitig durchgesetzt."
              onChange={(checked) => onChange({ leaderboardEnabled: checked })}
            />
            <PrivacyToggle
              checked={preferences.hideXpFromFriends}
              disabled={!preferences.leaderboardEnabled}
              label="Meine XP vor Freunden verbergen"
              note="Freunde sehen dann nur, dass du privat bleibst."
              onChange={(checked) => onChange({ hideXpFromFriends: checked })}
            />
            <PrivacyToggle
              checked={preferences.hideStreakFromFriends}
              disabled={!preferences.leaderboardEnabled}
              label="Meinen Streak vor Freunden verbergen"
              note="Private Standardeinstellung für sensible Fortschrittsdaten."
              onChange={(checked) => onChange({ hideStreakFromFriends: checked })}
            />
          </div>
        </PrivacySection>

        <PrivacySection danger icon={<Trash2 size={18} />} label="Kritischer Bereich" title="Account und Daten löschen">
          <p>Eine Löschung muss Nutzerprofil, Auth-User, Objekte, Dokumente, extrahierte Metadaten, Erinnerungen, Care/Resolve-Daten, Connector-Tokens, Logs, Storage-Objekte und Backup-Regeln abdecken.</p>
          {deleteState === "confirm" ? (
            <div className="privacy-delete-confirm">
              <strong>Anfrage statt Sofortlöschung</strong>
              <span>{summary.deletion.userVisibleMessage}</span>
              <button disabled={busyAction === "account-deletion-request"} onClick={handleDeletionRequest} type="button">
                {busyAction === "account-deletion-request" ? "Protokolliert..." : "Löschanfrage protokollieren"}
              </button>
            </div>
          ) : null}
          <button className="leave-circle-button is-danger" onClick={() => setDeleteState("confirm")} type="button">
            <Trash2 size={16} />
            Account löschen
          </button>
        </PrivacySection>
      </div>
    </section>
  );
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

function PrivacySection({
  children,
  danger = false,
  icon,
  label,
  title
}: {
  children: ReactNode;
  danger?: boolean;
  icon: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <article className={danger ? "privacy-control-block is-danger" : "privacy-control-block"}>
      <div className="privacy-control-head">
        <span aria-hidden="true">{icon}</span>
        <div>
          <small>{label}</small>
          <h3>{title}</h3>
        </div>
      </div>
      {children}
    </article>
  );
}

function PrivacyDataRow({ item }: { item: PrivacyDataOverviewItem }) {
  return (
    <div className="privacy-data-row">
      <div>
        <strong>{item.label}</strong>
        <small>{item.note}</small>
      </div>
      <span>{item.value}</span>
    </div>
  );
}

function PrivacyToggle({
  checked,
  disabled = false,
  label,
  note,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  note: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={disabled ? "privacy-toggle is-disabled" : "privacy-toggle"}>
      <input checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
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

function buildPrivacyFallback(displayName: string): PrivacySummary {
  return {
    generatedAt: new Date().toISOString(),
    implementationState: "FOUNDATION_ONLY",
    dataOverview: [
      { id: "items", label: "Gespeicherte Objekte", value: 0, status: "TODO", note: `${displayName}s Objekt-Speicher wird geladen, sobald das Backend erreichbar ist.` },
      { id: "documents", label: "Dokumente / Belege", value: 0, status: "TODO", note: "Dokument-Metadaten und Upload-Speicher sind im Exportplan vorgesehen." },
      { id: "sources", label: "Verbundene Quellen", value: 0, status: "TODO", note: "Connect-Quellen werden erst nach bewusster Verknüpfung angezeigt." },
      { id: "ai-analysis", label: "KI-Analyse", value: 0, status: "TODO", note: "Analyse bleibt kontrolliert und korrigierbar." },
      { id: "private-vault", label: "Private Vault", value: 0, status: "TODO", note: "Sensible Dokumente werden nicht automatisch analysiert." }
    ],
    connectedSources: [],
    aiControls: {
      receiptDocumentAnalysis: "TODO_MODEL",
      vaultAutoAnalysis: false,
      userCorrection: "TODO",
      note: "Backend noch nicht erreichbar."
    },
    privateVault: {
      status: "PLANNED",
      sensitiveCategories: ["IDENTITY", "INSURANCE", "PAYMENT", "MEDICAL", "EMPLOYMENT", "CONTRACTS", "LEGAL"],
      requiresReauth: "TODO",
      strongerEncryption: "TODO"
    },
    consentHistory: [],
    export: {
      state: "FOUNDATION_ONLY",
      ready: false,
      userVisibleMessage: "Datenexport ist vorbereitet, aber noch nicht vollständig implementiert."
    },
    deletion: {
      state: "FOUNDATION_ONLY",
      ready: false,
      userVisibleMessage: "Kontolöschung ist als Orchestrierung geplant, aber noch nicht aktiv."
    },
    thirdPartyProviders: []
  };
}

function formatVaultCategory(category: string) {
  const labels: Record<string, string> = {
    IDENTITY: "Identität",
    INSURANCE: "Versicherung",
    PAYMENT: "Zahlung",
    MEDICAL: "Medizin",
    EMPLOYMENT: "Arbeit",
    CONTRACTS: "Verträge",
    LEGAL: "Recht",
    HIGHLY_PERSONAL: "Sehr persönlich"
  };
  return labels[category] ?? category.toLowerCase().replace(/_/g, " ");
}
