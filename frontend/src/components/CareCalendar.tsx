import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PauseCircle,
  ShieldCheck
} from "lucide-react";
import type { Item, Loop } from "../lib/types";

/* Care surface: a real month calendar plus an agenda over the user's actual
   deadlines — open reminders/loops and warranty end dates. No synthetic
   events; every entry links back to its reminder or product record. */

export type CareEvent = {
  id: string;
  kind: "loop" | "warranty";
  date: Date | null;
  title: string;
  context: string;
  overdue: boolean;
  soon: boolean;
  snoozed: boolean;
  to: string;
  loop?: Loop;
};

export function buildCareEvents(loops: Loop[], items: Item[], basePath: string, itemBasePath: string): CareEvent[] {
  const now = Date.now();
  const soonLimit = now + 7 * 24 * 60 * 60 * 1000;

  const loopEvents: CareEvent[] = loops
    .filter((loop) => loop.status !== "DONE" && loop.status !== "ARCHIVED")
    .map((loop) => {
      const raw = loop.dueDate ?? loop.reminderAt;
      const date = raw ? new Date(raw) : null;
      const time = date?.getTime() ?? Number.NaN;
      return {
        id: `loop-${loop.id}`,
        kind: "loop" as const,
        date: date && !Number.isNaN(time) ? date : null,
        title: loop.title,
        context: loop.item?.name ?? sourceLabel(loop.sourceType),
        overdue: !Number.isNaN(time) && time < now && loop.status !== "SNOOZED",
        soon: !Number.isNaN(time) && time >= now && time <= soonLimit,
        snoozed: loop.status === "SNOOZED",
        to: `${basePath}/${loop.id}`,
        loop
      };
    });

  const warrantyEvents: CareEvent[] = items
    .filter((item) => item.warrantyUntil && !Number.isNaN(new Date(item.warrantyUntil).getTime()))
    .map((item) => {
      const date = new Date(item.warrantyUntil as string);
      const time = date.getTime();
      return {
        id: `warranty-${item.id}`,
        kind: "warranty" as const,
        date,
        title: `Garantie endet: ${item.name}`,
        context: item.location ?? item.category ?? "Produktakte",
        overdue: false,
        soon: time >= now && time <= soonLimit,
        snoozed: false,
        to: `${itemBasePath}/${item.id}`
      };
    })
    .filter((event) => (event.date as Date).getTime() >= now - 30 * 24 * 60 * 60 * 1000);

  return [...loopEvents, ...warrantyEvents];
}

function sourceLabel(sourceType: Loop["sourceType"]) {
  const labels: Record<Loop["sourceType"], string> = {
    DEVICE: "Gerät",
    DOCUMENT: "Dokument",
    MANUAL: "Manuell",
    MESSAGE: "Nachricht",
    RECEIPT: "Beleg"
  };
  return labels[sourceType];
}

/* ── Month calendar ─────────────────────────────────────────── */

const weekdayHead = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function isoDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function CareMonthCalendar({ events, onSelectDay, selectedDay }: {
  events: CareEvent[];
  onSelectDay: (day: string) => void;
  selectedDay: string;
}) {
  const [viewDate, setViewDate] = useState(() => {
    const initial = new Date(`${selectedDay}T12:00:00`);
    return Number.isNaN(initial.getTime()) ? new Date() : initial;
  });

  const monthLabel = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(viewDate);
  const todayIso = isoDay(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, CareEvent[]>();
    for (const event of events) {
      if (!event.date) continue;
      const key = isoDay(event.date);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [viewDate]);

  function shiftMonth(delta: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function moveSelection(dayIso: string, deltaDays: number) {
    const date = new Date(`${dayIso}T12:00:00`);
    date.setDate(date.getDate() + deltaDays);
    const next = isoDay(date);
    onSelectDay(next);
    if (date.getMonth() !== viewDate.getMonth()) {
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-care-day="${next}"]`)?.focus();
    });
  }

  return (
    <div className="care-calendar" aria-label="Monatskalender">
      <div className="care-calendar-head">
        <h3>{monthLabel}</h3>
        <div className="care-calendar-nav">
          <button aria-label="Voriger Monat" onClick={() => shiftMonth(-1)} type="button"><ChevronLeft size={16} /></button>
          <button
            className="care-calendar-today"
            onClick={() => {
              setViewDate(new Date());
              onSelectDay(todayIso);
            }}
            type="button"
          >
            Heute
          </button>
          <button aria-label="Nächster Monat" onClick={() => shiftMonth(1)} type="button"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="care-calendar-grid" role="grid">
        <div className="care-calendar-week is-head" role="row">
          {weekdayHead.map((label) => (
            <span className="care-calendar-daylabel" key={label} role="columnheader">{label}</span>
          ))}
        </div>
        {Array.from({ length: 6 }, (_, weekIndex) => (
          <div className="care-calendar-week" key={weekIndex} role="row">
            {cells.slice(weekIndex * 7, weekIndex * 7 + 7).map((date) => {
              const dayIso = isoDay(date);
              const dayEvents = byDay.get(dayIso) ?? [];
              const inMonth = date.getMonth() === viewDate.getMonth();
              const isToday = dayIso === todayIso;
              const isSelected = dayIso === selectedDay;
              const hasOverdue = dayEvents.some((event) => event.overdue);
              return (
                <button
                  aria-label={`${new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long" }).format(date)}${dayEvents.length ? `, ${dayEvents.length} ${dayEvents.length === 1 ? "Eintrag" : "Einträge"}` : ", keine Einträge"}`}
                  aria-selected={isSelected}
                  className={`care-calendar-cell${inMonth ? "" : " is-outside"}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`}
                  data-care-day={dayIso}
                  key={dayIso}
                  onClick={() => onSelectDay(dayIso)}
                  onKeyDown={(event) => {
                    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 };
                    const delta = moves[event.key];
                    if (delta === undefined) return;
                    event.preventDefault();
                    moveSelection(dayIso, delta);
                  }}
                  role="gridcell"
                  tabIndex={isSelected ? 0 : -1}
                  type="button"
                >
                  <span className="care-calendar-daynum">{date.getDate()}</span>
                  {dayEvents.length ? (
                    <span aria-hidden="true" className="care-calendar-dots">
                      {dayEvents.slice(0, 3).map((event) => (
                        <i className={`care-dot is-${event.overdue ? "overdue" : event.kind}`} key={event.id} />
                      ))}
                      {dayEvents.length > 3 ? <em>+{dayEvents.length - 3}</em> : null}
                    </span>
                  ) : null}
                  {hasOverdue ? <span className="sr-only">Enthält überfällige Einträge</span> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="care-calendar-legend" aria-hidden="true">
        <span><i className="care-dot is-loop" /> Erinnerung</span>
        <span><i className="care-dot is-warranty" /> Garantie-Ende</span>
        <span><i className="care-dot is-overdue" /> Überfällig</span>
      </div>

      <CareDayDetail day={selectedDay} events={byDay.get(selectedDay) ?? []} />
    </div>
  );
}

function CareDayDetail({ day, events }: { day: string; events: CareEvent[] }) {
  const date = new Date(`${day}T12:00:00`);
  const label = Number.isNaN(date.getTime())
    ? day
    : new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(date);

  return (
    <div className="care-day-detail" aria-live="polite">
      <h4>{label}</h4>
      {events.length ? (
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <CareEventRow event={event} compact />
            </li>
          ))}
        </ul>
      ) : (
        <p>Für diesen Tag steht nichts an.</p>
      )}
    </div>
  );
}

/* ── Agenda ─────────────────────────────────────────────────── */

export function CareAgenda({ events, onComplete, onSnooze, busyId }: {
  events: CareEvent[];
  onComplete: (loop: Loop) => void;
  onSnooze: (loop: Loop) => void;
  busyId: string | null;
}) {
  const groups = useMemo(() => groupAgenda(events), [events]);

  return (
    <div className="care-agenda">
      {groups.map((group) =>
        group.events.length ? (
          <section className={`care-agenda-group is-${group.id}`} key={group.id}>
            <h3>{group.label}</h3>
            <ul>
              {group.events.map((event) => (
                <li key={event.id}>
                  <CareEventRow busy={busyId === event.loop?.id} event={event} onComplete={onComplete} onSnooze={onSnooze} />
                </li>
              ))}
            </ul>
          </section>
        ) : null
      )}
    </div>
  );
}

function groupAgenda(events: CareEvent[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const overdue: CareEvent[] = [];
  const today: CareEvent[] = [];
  const week: CareEvent[] = [];
  const later: CareEvent[] = [];
  const undated: CareEvent[] = [];

  const sorted = [...events].sort((a, b) => (a.date?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.date?.getTime() ?? Number.MAX_SAFE_INTEGER));
  for (const event of sorted) {
    if (!event.date) {
      undated.push(event);
    } else if (event.overdue) {
      overdue.push(event);
    } else if (event.date >= startOfToday && event.date < endOfToday) {
      today.push(event);
    } else if (event.date < endOfWeek) {
      week.push(event);
    } else {
      later.push(event);
    }
  }

  return [
    { id: "overdue", label: "Überfällig", events: overdue },
    { id: "today", label: "Heute", events: today },
    { id: "week", label: "Diese Woche", events: week },
    { id: "later", label: "Später", events: later },
    { id: "undated", label: "Ohne Datum", events: undated }
  ];
}

function CareEventRow({ event, onComplete, onSnooze, busy = false, compact = false }: {
  event: CareEvent;
  onComplete?: (loop: Loop) => void;
  onSnooze?: (loop: Loop) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const dateLabel = event.date
    ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(event.date)
    : "Ohne Datum";

  return (
    <div className={`care-event-row${event.overdue ? " is-overdue" : ""}${compact ? " is-compact" : ""}`}>
      <span aria-hidden="true" className={`care-event-icon is-${event.overdue ? "overdue" : event.kind}`}>
        {event.kind === "warranty" ? <ShieldCheck size={17} /> : event.snoozed ? <PauseCircle size={17} /> : <BellRing size={17} />}
      </span>
      <Link className="care-event-copy" to={event.to}>
        <strong>{event.title}</strong>
        <small>
          {event.context} · {event.overdue ? `überfällig seit ${dateLabel}` : dateLabel}
          {event.snoozed ? " · pausiert" : ""}
        </small>
      </Link>
      {!compact && event.loop && onComplete && onSnooze ? (
        <span className="care-event-actions">
          <button disabled={busy} onClick={() => onComplete(event.loop as Loop)} type="button">
            <CheckCircle2 size={15} aria-hidden="true" /> Erledigen
          </button>
          <button disabled={busy} onClick={() => onSnooze(event.loop as Loop)} type="button">
            <CalendarClock size={15} aria-hidden="true" /> +2 Tage
          </button>
        </span>
      ) : null}
    </div>
  );
}
