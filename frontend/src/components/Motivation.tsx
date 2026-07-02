import type { CSSProperties, ReactNode } from "react";
import { CalendarClock, ChevronRight, Leaf, PauseCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { isoDate } from "../lib/api";
import type { MotivationSummary, XPEvent } from "../lib/types";
import { ProgressBar } from "./ProgressBar";

export function MotivationWidget({ motivation, to = "/app/rewards" }: { motivation: MotivationSummary; to?: string }) {
  if (!motivation.motivationEnabled) {
    return (
      <div className="motivation-widget is-disabled">
        <span>Motivation</span>
        <strong>Optional pausiert</strong>
        <small>Du kannst sie im Profil jederzeit aktivieren.</small>
        <Link to={to}>
          Details
          <ChevronRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div className="motivation-widget">
      <span>Motivation</span>
      <strong>{motivation.statusText}</strong>
      <ProgressBar value={motivation.levelProgress} />
      <small>{motivation.freezeDaysAvailable} Pausentage verfügbar · {motivation.weeklyXP} XP diese Woche</small>
      <Link to={to}>
        Details
        <ChevronRight size={15} />
      </Link>
    </div>
  );
}

export function RewardsOverview({
  motivation,
  onMotivationChange,
  onNudgeChange
}: {
  motivation: MotivationSummary;
  onMotivationChange: (enabled: boolean) => void;
  onNudgeChange: (enabled: boolean) => void;
}) {
  if (!motivation.motivationEnabled) {
    return (
      <section className="motivation-empty">
        <Sparkles size={22} />
        <h2>Motivation ist ausgeschaltet.</h2>
        <p>Kein Problem. Avareno funktioniert ruhig weiter. Du kannst Fortschritt und Pausentage jederzeit wieder aktivieren.</p>
        <button onClick={() => onMotivationChange(true)} type="button">Motivation aktivieren</button>
      </section>
    );
  }

  return (
    <section className="motivation-overview">
      <article className="motivation-focus-card">
        <div>
          <span>Streak</span>
          <h2>{motivation.currentStreakDays} Tage gut gepflegt</h2>
          <p>{motivation.pauseText}</p>
        </div>
        <div
          className="motivation-ring"
          style={{ "--progress": `${motivation.levelProgress}%` } as CSSProperties}
          aria-label={`${motivation.levelProgress}% Fortschritt bis zum nächsten Level`}
        >
          <strong>{motivation.levelProgress}%</strong>
          <small>bis zum nächsten Schritt</small>
        </div>
      </article>

      <section className="motivation-stat-grid" aria-label="Motivation Überblick">
        <MotivationStat icon={<Sparkles size={18} />} label="Diese Woche" value={`${motivation.weeklyXP} XP`} />
        <MotivationStat icon={<ShieldCheck size={18} />} label="Level" value={motivation.levelName} />
        <MotivationStat icon={<PauseCircle size={18} />} label="Pausentage" value={String(motivation.freezeDaysAvailable)} />
      </section>

      <FreezeDayStateView motivation={motivation} />

      <section className="motivation-detail-grid">
        <article className="motivation-panel">
          <div className="motivation-panel-head">
            <div>
              <span>Zuletzt verdient</span>
              <h2>Kleine Fortschritte</h2>
            </div>
            <Leaf size={18} />
          </div>
          <XPEventList events={motivation.recentXPEvents} />
        </article>

        <article className="motivation-panel">
          <div className="motivation-panel-head">
            <div>
              <span>So entsteht XP</span>
              <h2>Sinnvolle Aktionen</h2>
            </div>
            <CalendarClock size={18} />
          </div>
          <div className="motivation-rule-list">
            {motivation.xpRules.slice(0, 7).map((rule) => (
              <div key={rule.action}>
                <span>{rule.action}</span>
                <strong>+{rule.points} XP</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <MotivationSettings motivation={motivation} onMotivationChange={onMotivationChange} onNudgeChange={onNudgeChange} />
    </section>
  );
}

export function XPEventList({ events }: { events: XPEvent[] }) {
  if (!events.length) {
    return <p className="motivation-note">Noch keine XP-Aktivität. Eine kleine Aktion reicht, wenn es passt.</p>;
  }

  return (
    <div className="motivation-xp-list">
      {events.slice(0, 5).map((event) => (
        <div className="motivation-xp-row" key={event.id}>
          <div>
            <strong>{event.label}</strong>
            <small>{formatMotivationDate(event.createdAt)}</small>
          </div>
          <span>+{event.points} XP</span>
        </div>
      ))}
    </div>
  );
}

export function MotivationSettings({
  motivation,
  onMotivationChange,
  onNudgeChange
}: {
  motivation: MotivationSummary;
  onMotivationChange: (enabled: boolean) => void;
  onNudgeChange: (enabled: boolean) => void;
}) {
  return (
    <section className="motivation-settings">
      <div>
        <span>Einstellungen</span>
        <h2>Motivation bleibt optional.</h2>
        <p>Pausentage helfen dir, ohne Druck dranzubleiben. Sanfte Hinweise erinnern nur an sinnvolle Pflege, nicht an perfekte Serien.</p>
      </div>
      <label>
        <input checked={motivation.motivationEnabled} onChange={(event) => onMotivationChange(event.target.checked)} type="checkbox" />
        <span>Motivation anzeigen</span>
      </label>
      <label>
        <input checked={motivation.gentleNudgesEnabled} disabled={!motivation.motivationEnabled} onChange={(event) => onNudgeChange(event.target.checked)} type="checkbox" />
        <span>Sanfte Hinweise erlauben</span>
      </label>
    </section>
  );
}

export function FreezeDayStateView({ motivation }: { motivation: MotivationSummary }) {
  return (
    <section className="motivation-freeze-state">
      <PauseCircle size={18} />
      <div>
        <strong>{motivation.freezeState.title}</strong>
        <p>{motivation.freezeState.body}</p>
      </div>
    </section>
  );
}

function MotivationStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="motivation-stat">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function formatMotivationDate(value: string) {
  return isoDate(value);
}
