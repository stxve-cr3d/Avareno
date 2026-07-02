import { ArrowLeft, ChevronRight, Copy, Sparkles, Trash2, UserPlus, UserRound } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { acceptInvite, getFriendsOverview, removeFriend } from "../lib/friendsApi";
import type { ApiFriend, ApiInvite } from "../lib/friendsApi";

type LoadStatus = "loading" | "ready" | "error";

export function FriendsListPage() {
  const location = useLocation();
  const basePath = location.pathname.startsWith("/app") ? "/app/friends" : "/friends";
  const [friends, setFriends] = useState<ApiFriend[]>([]);
  const [invite, setInvite] = useState<ApiInvite | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [inviteInput, setInviteInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setStatus("loading");
    try {
      const overview = await getFriendsOverview();
      setFriends(overview.friends);
      setInvite(overview.invite);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function copyCode() {
    if (!invite) return;
    try {
      await navigator.clipboard?.writeText(invite.inviteCode);
    } catch {
      // Clipboard may be blocked; the code stays visible on screen.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function handleAccept() {
    const code = inviteInput.trim();
    if (!code) return;
    setMessage(null);
    try {
      const result = await acceptInvite(code);
      setInviteInput("");
      setMessage(result.alreadyConnected ? "Ihr seid bereits verbunden." : `${result.friend.displayName} ist jetzt verbunden.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Code konnte nicht eingelöst werden.");
    }
  }

  return (
    <main className="friends-page">
      <section className="friends-hero">
        <div>
          <span>Privat</span>
          <h1>Freunde</h1>
          <p>Ein privater Kreis. Nur du und deine Freunde sehen, dass ihr verbunden seid — keine Werte, kein Ranking.</p>
        </div>
        <button className="friends-primary-action" disabled={!invite} onClick={() => void copyCode()} type="button">
          <Copy size={16} />
          {copied ? "Code kopiert" : "Code kopieren"}
        </button>
      </section>

      <section className="friends-board" aria-label="Private Freunde Übersicht">
        <div className="friends-board-head">
          <div>
            <span>Dein Kreis</span>
            <h2>Verbundene Freunde</h2>
          </div>
          <small>{friends.length} {friends.length === 1 ? "Person" : "Personen"}</small>
        </div>

        {status === "loading" ? (
          <div className="private-empty-state">
            <UserRound size={18} />
            <p>Freunde werden geladen…</p>
          </div>
        ) : status === "error" ? (
          <div className="private-empty-state">
            <UserRound size={18} />
            <p>Freunde konnten nicht geladen werden.</p>
            <button className="profile-secondary-action" onClick={() => void load()} type="button">Erneut versuchen</button>
          </div>
        ) : friends.length ? (
          <div className="friends-board-list">
            {sortFriends(friends).map((friend) => (
              <Link className="friends-board-row" key={friend.id} to={`${basePath}/${friend.id}`}>
                <FriendAvatar name={friend.displayName} />
                <div className="friends-board-person">
                  <strong>{friend.displayName}</strong>
                  <small>seit {formatDate(friend.addedAt)}</small>
                </div>
                <span className="friends-board-value">{friend.hidesXp ? "XP privat" : `${friend.weeklyXp ?? 0} XP`}</span>
                <span className="friends-board-value">{friend.hidesStreak ? "Privat" : `${friend.currentStreakDays ?? 0} Tage`}</span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="private-empty-state">
            <UserRound size={18} />
            <p>Noch keine Freunde. Teile deinen Code oder gib den Code eines Freundes ein.</p>
          </div>
        )}
      </section>

      <section className="friends-invite-strip">
        <UserPlus size={17} />
        <div>
          <strong>{invite?.inviteCode ?? "…"}</strong>
          <span>Dein Einladungscode für deinen privaten Kreis</span>
        </div>
      </section>

      <section className="friend-invite-box">
        <label>
          <span>Code eines Freundes</span>
          <input
            onChange={(event) => setInviteInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleAccept();
            }}
            placeholder="AVARENO-XXXXXX"
            type="text"
            value={inviteInput}
          />
        </label>
        <button className="friends-primary-action" disabled={!inviteInput.trim()} onClick={() => void handleAccept()} type="button">
          <UserPlus size={16} /> Verbinden
        </button>
        {message ? <small>{message}</small> : null}
      </section>
    </main>
  );
}

export function FriendProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { friendId } = useParams();
  const basePath = location.pathname.startsWith("/app") ? "/app/friends" : "/friends";
  const [friend, setFriend] = useState<ApiFriend | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    getFriendsOverview()
      .then((overview) => {
        if (!active) return;
        setFriend(overview.friends.find((entry) => entry.id === friendId) ?? null);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [friendId]);

  async function handleRemove() {
    if (!friend) return;
    setRemoving(true);
    try {
      await removeFriend(friend.id);
      navigate(basePath);
    } finally {
      setRemoving(false);
    }
  }

  if (status === "loading") return <div className="profile-loading">Freund wird geladen...</div>;

  if (!friend) {
    return (
      <main className="friends-page">
        <section className="friends-profile-card">
          <Link className="friend-detail-back" to={basePath}>
            <ArrowLeft size={16} />
            Zurück zu Freunde
          </Link>
          <p>Dieser Freund ist nicht in deinem privaten Kreis.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="friends-page">
      <section className="friends-profile-card">
        <Link className="friend-detail-back" to={basePath}>
          <ArrowLeft size={16} />
          Zurück zu Freunde
        </Link>

        <div className="friends-profile-hero">
          <FriendAvatar name={friend.displayName} />
          <div>
            <span>Freund</span>
            <h1>{friend.displayName}</h1>
            <p>Verbunden seit {formatDate(friend.addedAt)}</p>
          </div>
        </div>

        <div className="friends-profile-stats">
          <ProfileMetric label="Woche" value={friend.hidesXp ? "Privat" : `${friend.weeklyXp ?? 0} XP`} />
          <ProfileMetric label="Streak" value={friend.hidesStreak ? "Privat" : `${friend.currentStreakDays ?? 0} Tage`} />
        </div>

        <div className="friends-profile-note">
          <UserRound size={17} />
          <p>Was du siehst, hängt von den Einstellungen deines Freundes ab. Werte können jederzeit privat gestellt werden.</p>
        </div>

        <button className="leave-circle-button is-danger" disabled={removing} onClick={() => void handleRemove()} type="button">
          <Trash2 size={16} />
          {removing ? "Wird entfernt…" : "Freund entfernen"}
        </button>
      </section>
    </main>
  );
}

function FriendAvatar({ name }: { name: string }) {
  return (
    <span className="friends-avatar" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Sparkles size={16} />
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function sortFriends(friends: ApiFriend[]) {
  return [...friends].sort((a, b) => {
    const av = a.hidesXp ? -1 : a.weeklyXp ?? 0;
    const bv = b.hidesXp ? -1 : b.weeklyXp ?? 0;
    return bv - av;
  });
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}
