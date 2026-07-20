import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BadgeCheck,
  BellRing,
  BookOpenCheck,
  Boxes,
  CalendarCheck2,
  CalendarRange,
  FileCheck2,
  FileText,
  Flame,
  Layers,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { api } from "../lib/api";
import type { Item, Loop } from "../lib/types";
import type { MeActivity } from "./ActivityHeatmap";

/* Progression system: 29 milestones in five collections, all derived live
   from real user state (items, documents, loops, derived activity). Nothing
   is persisted, nothing invented — a locked milestone always shows its goal
   and the true remaining requirement. Layout follows the Visual-Grammar
   pass: one highlighted next goal, a medal row of recent unlocks, and
   compact collection lists instead of a uniform card grid. */

type Milestone = {
  id: string;
  collection: "Start" | "Archiv" | "Dokumentation" | "Care" | "Konsistenz";
  title: string;
  requirement: string;
  icon: React.ReactNode;
  earned: boolean;
  current: number;
  target: number;
  earnedAt?: string | null;
};

function firstDate(values: (string | null | undefined)[]): string | null {
  const times = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((time) => !Number.isNaN(time));
  if (!times.length) return null;
  return new Date(Math.min(...times)).toISOString();
}

export function buildMilestones(items: Item[], loops: Loop[], activity: MeActivity | null): Milestone[] {
  const documents = items.flatMap((item) => item.documents ?? []);
  const documentCount = documents.length;
  const completeItems = items.filter((item) => (item.missingFields?.length ?? 0) === 0);
  const warrantyItems = items.filter((item) => item.warrantyUntil);
  const fullyProven = items.filter(
    (item) => item.warrantyUntil && (item.documents ?? []).some((document) => document.type.toUpperCase() === "RECEIPT")
  );
  const receipts = documents.filter((document) => document.type.toUpperCase() === "RECEIPT");
  const manuals = documents.filter((document) => document.type.toUpperCase() === "MANUAL");
  const doneLoops = loops.filter((loop) => loop.status === "DONE" || loop.status === "ARCHIVED");
  const activeDays = activity?.activeDays ?? 0;
  const longestStreak = activity?.longestStreakDays ?? 0;
  const activeWeeks = activity
    ? new Set(
        activity.days
          .filter((day) => day.count > 0)
          .map((day) => {
            const date = new Date(`${day.date}T12:00:00`);
            const year = date.getFullYear();
            const week = Math.ceil(((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
            return `${year}-${week}`;
          })
      ).size
    : 0;
  const allItemsDocumented = items.length > 0 && items.every((item) => (item.documents?.length ?? 0) > 0);

  const count = (id: string, collection: Milestone["collection"], title: string, requirement: string, icon: React.ReactNode, current: number, target: number, earnedAt?: string | null): Milestone => ({
    id,
    collection,
    title,
    requirement,
    icon,
    earned: current >= target,
    current: Math.min(current, target),
    target,
    earnedAt: current >= target ? earnedAt ?? null : null
  });

  return [
    /* Start */
    count("first-product", "Start", "Erstes Produkt", "Lege deine erste Produktakte an.", <PackageCheck size={18} aria-hidden="true" />, items.length, 1, firstDate(items.map((item) => (item as { createdAt?: string }).createdAt))),
    count("first-document", "Start", "Erstes Dokument", "Speichere das erste Dokument.", <FileCheck2 size={18} aria-hidden="true" />, documentCount, 1, firstDate(documents.map((document) => document.createdAt))),
    count("first-warranty", "Start", "Erste Garantie", "Hinterlege das erste Garantie-Ende.", <ShieldCheck size={18} aria-hidden="true" />, warrantyItems.length, 1),
    count("first-reminder", "Start", "Erste Erinnerung", "Lege deine erste Erinnerung an.", <BellRing size={18} aria-hidden="true" />, loops.length, 1, firstDate(loops.map((loop) => (loop as { createdAt?: string }).createdAt))),
    count("first-complete", "Start", "Erste vollständige Akte", "Vervollständige eine Produktakte.", <BadgeCheck size={18} aria-hidden="true" />, completeItems.length, 1),

    /* Archiv */
    count("products-5", "Archiv", "5 Produkte", "Organisiere fünf Produkte.", <Boxes size={18} aria-hidden="true" />, items.length, 5),
    count("products-10", "Archiv", "10 Produkte", "Organisiere zehn Produkte.", <Boxes size={18} aria-hidden="true" />, items.length, 10),
    count("products-25", "Archiv", "25 Produkte", "Organisiere 25 Produkte.", <Boxes size={18} aria-hidden="true" />, items.length, 25),
    count("products-50", "Archiv", "50 Produkte", "Organisiere 50 Produkte.", <Boxes size={18} aria-hidden="true" />, items.length, 50),
    count("complete-5", "Archiv", "5 vollständige Akten", "Fünf Produktakten ohne fehlende Angaben.", <BookOpenCheck size={18} aria-hidden="true" />, completeItems.length, 5),
    count("complete-10", "Archiv", "10 vollständige Akten", "Zehn vollständige Produktakten.", <BookOpenCheck size={18} aria-hidden="true" />, completeItems.length, 10),
    count("complete-25", "Archiv", "25 vollständige Akten", "25 vollständige Produktakten.", <BookOpenCheck size={18} aria-hidden="true" />, completeItems.length, 25),

    /* Dokumentation */
    count("documents-5", "Dokumentation", "5 Dokumente", "Speichere fünf Dokumente.", <FileText size={18} aria-hidden="true" />, documentCount, 5),
    count("documents-10", "Dokumentation", "10 Dokumente", "Speichere zehn Dokumente.", <FileText size={18} aria-hidden="true" />, documentCount, 10),
    count("documents-25", "Dokumentation", "25 Dokumente", "Speichere 25 Dokumente.", <FileText size={18} aria-hidden="true" />, documentCount, 25),
    count("first-receipt", "Dokumentation", "Erste Rechnung", "Speichere den ersten Beleg.", <ReceiptText size={18} aria-hidden="true" />, receipts.length, 1, firstDate(receipts.map((document) => document.createdAt))),
    count("first-manual", "Dokumentation", "Erste Anleitung", "Hinterlege die erste Anleitung.", <BookOpenCheck size={18} aria-hidden="true" />, manuals.length, 1, firstDate(manuals.map((document) => document.createdAt))),
    count("all-documented", "Dokumentation", "Alles belegt", "Jedes Produkt besitzt mindestens ein Dokument.", <Layers size={18} aria-hidden="true" />, allItemsDocumented ? 1 : 0, 1),

    /* Care */
    count("done-1", "Care", "Erste erledigte Erinnerung", "Schließe eine Erinnerung ab.", <BellRing size={18} aria-hidden="true" />, doneLoops.length, 1),
    count("done-5", "Care", "5 erledigte Erinnerungen", "Schließe fünf Erinnerungen ab.", <BellRing size={18} aria-hidden="true" />, doneLoops.length, 5),
    count("done-10", "Care", "10 erledigte Erinnerungen", "Schließe zehn Erinnerungen ab.", <BellRing size={18} aria-hidden="true" />, doneLoops.length, 10),
    count("fully-proven", "Care", "Garantie komplett", "Ein Produkt mit Garantie-Ende und Beleg zusammen.", <ShieldCheck size={18} aria-hidden="true" />, fullyProven.length, 1),

    /* Konsistenz */
    count("active-3", "Konsistenz", "3 aktive Tage", "An drei Tagen etwas organisieren.", <CalendarCheck2 size={18} aria-hidden="true" />, activeDays, 3),
    count("active-7", "Konsistenz", "7 aktive Tage", "An sieben Tagen etwas organisieren.", <CalendarCheck2 size={18} aria-hidden="true" />, activeDays, 7),
    count("active-14", "Konsistenz", "14 aktive Tage", "An 14 Tagen etwas organisieren.", <CalendarCheck2 size={18} aria-hidden="true" />, activeDays, 14),
    count("active-30", "Konsistenz", "30 aktive Tage", "An 30 Tagen etwas organisieren.", <CalendarCheck2 size={18} aria-hidden="true" />, activeDays, 30),
    count("streak-3", "Konsistenz", "3-Tage-Serie", "Drei Tage in Folge aktiv.", <Flame size={18} aria-hidden="true" />, longestStreak, 3),
    count("streak-7", "Konsistenz", "7-Tage-Serie", "Sieben Tage in Folge aktiv.", <Flame size={18} aria-hidden="true" />, longestStreak, 7),
    count("weeks-4", "Konsistenz", "4 aktive Wochen", "In vier verschiedenen Wochen aktiv.", <CalendarRange size={18} aria-hidden="true" />, activeWeeks, 4)
  ];
}

export function pickNextMilestone(milestones: Milestone[]): Milestone | null {
  const open = milestones.filter((milestone) => !milestone.earned);
  if (!open.length) return null;
  // Closest real progress first; ties resolve by curated order.
  return [...open].sort((a, b) => b.current / b.target - a.current / a.target)[0];
}

const collections: Milestone["collection"][] = ["Start", "Archiv", "Dokumentation", "Care", "Konsistenz"];

export function ProfileAchievements({ items }: { items: Item[] }) {
  const [activity, setActivity] = useState<MeActivity | null>(null);
  const [loops, setLoops] = useState<Loop[]>([]);

  useEffect(() => {
    api<MeActivity>("/api/me/activity?days=730").then(setActivity).catch(() => setActivity(null));
    api<Loop[]>("/api/loops").then(setLoops).catch(() => setLoops([]));
  }, []);

  const milestones = useMemo(() => buildMilestones(items, loops, activity), [items, loops, activity]);
  const earned = milestones.filter((milestone) => milestone.earned);
  const next = pickNextMilestone(milestones);
  const recent = earned.slice(-6).reverse();

  return (
    <section className="profile-progression" aria-labelledby="profile-progression-title">
      <div className="profile-progression-head">
        <h2 id="profile-progression-title">
          <Award size={18} aria-hidden="true" /> Meilensteine
        </h2>
        <span className="profile-progression-count">{earned.length} von {milestones.length} erreicht</span>
      </div>

      {next ? (
        <div className="profile-next-milestone">
          <span className="profile-next-ring" aria-hidden="true">
            <svg viewBox="0 0 44 44">
              <circle className="profile-next-track" cx="22" cy="22" r="18" />
              <circle
                className="profile-next-fill"
                cx="22"
                cy="22"
                r="18"
                strokeDasharray={2 * Math.PI * 18}
                strokeDashoffset={2 * Math.PI * 18 * (1 - next.current / next.target)}
              />
            </svg>
            <i>{next.icon}</i>
          </span>
          <div className="profile-next-copy">
            <span>Als Nächstes</span>
            <strong>{next.title}</strong>
            <p>
              {next.requirement} {next.target > 1 ? `Aktuell: ${next.current} von ${next.target}.` : ""}
            </p>
          </div>
          <div className="profile-next-progress" role="img" aria-label={`Fortschritt: ${next.current} von ${next.target}`}>
            <i style={{ width: `${Math.round((next.current / next.target) * 100)}%` }} />
          </div>
        </div>
      ) : (
        <p className="profile-progression-donetext">Alle Meilensteine erreicht — dein Archiv ist außergewöhnlich gepflegt.</p>
      )}

      {recent.length ? (
        <div className="profile-medals" aria-label="Zuletzt erreicht">
          <span className="profile-medals-label"><Sparkles size={14} aria-hidden="true" /> Zuletzt erreicht</span>
          <ul>
            {recent.map((milestone) => (
              <li className="profile-medal" key={milestone.id} title={milestone.requirement}>
                <span aria-hidden="true">{milestone.icon}</span>
                <strong>{milestone.title}</strong>
                {milestone.earnedAt ? (
                  <small>{new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" }).format(new Date(milestone.earnedAt))}</small>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="profile-collections">
        {collections.map((collection) => {
          const entries = milestones.filter((milestone) => milestone.collection === collection);
          const done = entries.filter((milestone) => milestone.earned).length;
          return (
            <section className="profile-collection" key={collection} aria-label={`Sammlung ${collection}`}>
              <h3>
                {collection}
                <span>{done}/{entries.length}</span>
              </h3>
              <ul>
                {entries.map((milestone) => (
                  <li className={milestone.earned ? "is-earned" : ""} key={milestone.id}>
                    <span className="profile-collection-icon" aria-hidden="true">{milestone.icon}</span>
                    <span className="profile-collection-copy">
                      <strong>{milestone.title}</strong>
                      <small>
                        {milestone.earned
                          ? "Erreicht"
                          : milestone.target > 1
                            ? `${milestone.current} von ${milestone.target}`
                            : milestone.requirement}
                      </small>
                    </span>
                    {!milestone.earned && milestone.target > 1 ? (
                      <span className="profile-collection-bar" aria-hidden="true">
                        <i style={{ width: `${Math.round((milestone.current / milestone.target) * 100)}%` }} />
                      </span>
                    ) : null}
                    {milestone.earned ? <BadgeCheck className="profile-collection-check" size={16} aria-hidden="true" /> : null}
                    <span className="sr-only">
                      {milestone.earned ? "Erreicht." : `Noch nicht erreicht: ${milestone.requirement} Fortschritt ${milestone.current} von ${milestone.target}.`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}
