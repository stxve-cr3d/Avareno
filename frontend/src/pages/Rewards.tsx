import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Archive, CheckCircle2, ChevronRight, FileText, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { RewardsOverview } from "../components/Motivation";
import type { MotivationSummary, User } from "../lib/types";

type RewardsPayload = {
  user: User;
  completedLoopsThisWeek: number;
  completionRate: number;
  motivation: MotivationSummary;
  badges: { name: string; earned: boolean }[];
  transactions: { id: string; action: string; points: number; createdAt: string }[];
};

type MotivationPreferences = {
  gentleNudgesEnabled?: boolean;
  motivationEnabled?: boolean;
};

const preferenceKey = "avareno-motivation-preferences";

export function Rewards() {
  const [profile, setProfile] = useState<RewardsPayload | null>(null);
  const [preferences, setPreferences] = useState<MotivationPreferences>(() => readMotivationPreferences());

  useEffect(() => {
    api<RewardsPayload>("/api/rewards").then(setProfile).catch(console.error);
  }, []);

  const motivation = profile
    ? {
      ...profile.motivation,
      gentleNudgesEnabled: preferences.gentleNudgesEnabled ?? profile.motivation.gentleNudgesEnabled,
      motivationEnabled: preferences.motivationEnabled ?? profile.motivation.motivationEnabled
    }
    : null;

  if (!profile || !motivation) return <div className="profile-loading">Profil wird geladen...</div>;

  function updatePreferences(next: MotivationPreferences) {
    setPreferences((current) => {
      const merged = { ...current, ...next };
      window.localStorage.setItem(preferenceKey, JSON.stringify(merged));
      return merged;
    });
  }

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">
          {profile.user.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1>Ich</h1>
          <p>{profile.user.name}</p>
          <span>{profile.user.email}</span>
        </div>
      </section>

      <section className="profile-focus">
        <div>
          <span>Motivation</span>
          <h2>{motivation.motivationEnabled ? "Weiter so, ohne Druck." : "Motivation ist pausiert."}</h2>
          <p>{motivation.motivationEnabled ? motivation.nudgeText : "Avareno funktioniert auch ohne Fortschrittsanzeige ganz normal weiter."}</p>
        </div>
        <Link className="profile-primary-action" to="/app/items">
          Kleine Aktion
          <ChevronRight size={16} />
        </Link>
      </section>

      <section className="profile-stats" aria-label="Profil Überblick">
        <ProfileStat icon={<Sparkles size={18} />} label="Woche" value={`${motivation.weeklyXP} XP`} />
        <ProfileStat icon={<UserRound size={18} />} label="Level" value={motivation.levelName} />
        <ProfileStat icon={<CheckCircle2 size={18} />} label="Streak" value={`${motivation.currentStreakDays} Tage`} />
      </section>

      <RewardsOverview
        motivation={motivation}
        onMotivationChange={(enabled) => updatePreferences({ motivationEnabled: enabled })}
        onNudgeChange={(enabled) => updatePreferences({ gentleNudgesEnabled: enabled })}
      />

      <section className="profile-links" aria-label="Profil Bereiche">
        <ProfileLink icon={<Archive size={18} />} label="Meine Dinge" body="Produkte, Belege und Garantien" to="/app/items" />
        <ProfileLink icon={<ShieldCheck size={18} />} label="Care" body="Erinnerungen und offene Punkte" to="/app/capture/loop" />
        <ProfileLink icon={<FileText size={18} />} label="Dokumente" body="Gesicherte Nachweise und Dateien" to="/app/reports/home-binder" />
      </section>
    </main>
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

function ProfileLink({ body, icon, label, to }: { body: string; icon: ReactNode; label: string; to: string }) {
  return (
    <Link className="profile-link" to={to}>
      <span>{icon}</span>
      <div>
        <strong>{label}</strong>
        <small>{body}</small>
      </div>
      <ChevronRight size={17} />
    </Link>
  );
}

function readMotivationPreferences(): MotivationPreferences {
  try {
    return JSON.parse(window.localStorage.getItem(preferenceKey) ?? "{}") as MotivationPreferences;
  } catch {
    return {};
  }
}
