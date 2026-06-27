import { ArrowLeft, ChevronRight, Copy, LockKeyhole, Sparkles, UserPlus } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../lib/authProvider";
import { buildCurrentUserProgress, defaultMotivationPrivacy, mockFriendInvite, mockFriends } from "../lib/friendsData";
import type { FriendProgress, MotivationPrivacyPreferences } from "../lib/friendsData";

const preferenceKey = "avareno-private-motivation-preferences";

export function FriendsListPage() {
  const { profile } = useAuth();
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const preferences = readMotivationPreferences();
  const basePath = location.pathname.startsWith("/app") ? "/app/friends" : "/friends";
  const friends = useFriendRows(profile ? buildCurrentUserProgress(profile, preferences) : null, preferences);

  if (!profile) return <div className="profile-loading">Freunde werden geladen...</div>;

  function copyInvite() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="friends-page">
      <section className="friends-hero">
        <div>
          <span>Privat</span>
          <h1>Freunde</h1>
          <p>Eine minimalistische Wochenuebersicht fuer enge Freunde. Nur dein Kreis ist sichtbar.</p>
        </div>
        <button className="friends-primary-action" onClick={copyInvite} type="button">
          <Copy size={16} />
          {copied ? "Code bereit" : "Einladen"}
        </button>
      </section>

      <section className="friends-board" aria-label="Private Freunde Uebersicht">
        <div className="friends-board-head">
          <div>
            <span>Diese Woche</span>
            <h2>Freundliche Rangfolge</h2>
          </div>
          <small>{friends.length} Personen · kein oeffentliches Ranking</small>
        </div>

        <div className="friends-board-list">
          {friends.map((friend, index) => (
            <FriendBoardRow basePath={basePath} friend={friend} index={index + 1} key={friend.id} />
          ))}
        </div>
      </section>

      <section className="friends-invite-strip">
        <UserPlus size={17} />
        <div>
          <strong>{mockFriendInvite.inviteCode}</strong>
          <span>Einladungscode fuer deinen privaten Kreis</span>
        </div>
      </section>
    </main>
  );
}

export function FriendProfilePage() {
  const { profile } = useAuth();
  const location = useLocation();
  const { friendId } = useParams();
  const preferences = readMotivationPreferences();
  const basePath = location.pathname.startsWith("/app") ? "/app/friends" : "/friends";
  const friends = useFriendRows(profile ? buildCurrentUserProgress(profile, preferences) : null, preferences);
  const friend = friends.find((item) => item.id === friendId) ?? null;

  if (!profile) return <div className="profile-loading">Freund wird geladen...</div>;

  if (!friend) {
    return (
      <main className="friends-page">
        <section className="friends-profile-card">
          <Link className="friend-detail-back" to={basePath}>
            <ArrowLeft size={16} />
            Zurueck zu Freunde
          </Link>
          <p>Dieser Freund ist nicht in deinem privaten Kreis sichtbar.</p>
        </section>
      </main>
    );
  }

  const weeklyLabel = friend.hidesXp ? "XP privat" : `${friend.weeklyXp} XP`;
  const streakLabel = friend.hidesStreak ? "Privat" : `${friend.currentStreakDays} Tage`;

  return (
    <main className="friends-page">
      <section className="friends-profile-card">
        <Link className="friend-detail-back" to={basePath}>
          <ArrowLeft size={16} />
          Zurueck zu Freunde
        </Link>

        <div className="friends-profile-hero">
          <FriendAvatar name={friend.displayName} />
          <div>
            <span>{friend.isCurrentUser ? "Dein Profil" : "Freund"}</span>
            <h1>{friend.isCurrentUser ? `${friend.displayName} (du)` : friend.displayName}</h1>
            <p>{friend.note}</p>
          </div>
        </div>

        <div className="friends-profile-stats">
          <ProfileMetric label="Woche" value={weeklyLabel} />
          <ProfileMetric label="Aktionen" value={String(friend.helpfulActions)} />
          <ProfileMetric label="Streak" value={streakLabel} />
        </div>

        <div className="friends-profile-note">
          <LockKeyhole size={17} />
          <p>Ihr seid privat verbunden. Sichtbare Werte koennen jederzeit ausgeblendet werden.</p>
        </div>

        <div className="friends-source-list">
          {friend.sourceBreakdown.map((source) => (
            <span key={source.label}>{source.count} {source.label}</span>
          ))}
        </div>
      </section>
    </main>
  );
}

function FriendBoardRow({ basePath, friend, index }: { basePath: string; friend: FriendProgress; index: number }) {
  const weeklyLabel = friend.hidesXp ? "Privat" : `${friend.weeklyXp} XP`;
  const streakLabel = friend.hidesStreak ? "Privat" : `${friend.currentStreakDays} Tage`;

  return (
    <Link className={friend.isCurrentUser ? "friends-board-row is-you" : "friends-board-row"} to={`${basePath}/${friend.id}`}>
      <span className="friends-board-rank">{index}</span>
      <FriendAvatar name={friend.displayName} />
      <div className="friends-board-person">
        <strong>{friend.isCurrentUser ? `${friend.displayName} (du)` : friend.displayName}</strong>
        <small>{friend.label}</small>
      </div>
      <span className="friends-board-value">{weeklyLabel}</span>
      <span className="friends-board-value">{streakLabel}</span>
      <ChevronRight size={16} />
    </Link>
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

function FriendAvatar({ name }: { name: string }) {
  return (
    <span className="friends-avatar" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function useFriendRows(currentUser: FriendProgress | null, preferences: MotivationPrivacyPreferences) {
  return useMemo(() => {
    const accepted = mockFriends.filter((friend) => friend.status === "accepted");
    const rows = currentUser ? [currentUser, ...accepted] : accepted;
    return [...rows].sort((a, b) => visibleWeeklyXp(b, preferences) - visibleWeeklyXp(a, preferences));
  }, [currentUser, preferences]);
}

function visibleWeeklyXp(friend: FriendProgress, preferences: MotivationPrivacyPreferences) {
  if (!preferences.leaderboardEnabled || friend.hidesXp) return 0;
  return friend.weeklyXp;
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
