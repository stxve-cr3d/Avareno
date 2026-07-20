import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck2, Info, Sparkles } from "lucide-react";
import { api } from "../lib/api";

/* Activity module: GitHub-style heatmap over the user's real organisation
   actions. Data comes from /api/me/activity, derived exclusively from
   existing user-owned records — no synthetic activity, no page views.
   Every cell is explorable: hover/focus shows a tooltip with the date and
   a per-type breakdown, click/Enter pins the day into a detail panel. */

export type MeActivity = {
  rangeDays: number;
  days: { date: string; count: number; types?: Record<string, number> }[];
  totalActions: number;
  activeDays: number;
  currentStreakDays: number;
  longestStreakDays: number;
  byType: {
    productsCreated: number;
    documentsSaved: number;
    remindersCompleted: number;
    detailsAdded: number;
  };
};

type Period = 30 | 90 | 365;

const periodLabels: Record<Period, string> = { 30: "30 Tage", 90: "90 Tage", 365: "1 Jahr" };
/* Dative phrasing for running text ("3 in 90 Tagen", not "3 in 90 Tage"). */
const periodDative: Record<Period, string> = { 30: "in 30 Tagen", 90: "in 90 Tagen", 365: "im letzten Jahr" };
const weekdayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export const activityTypeLabels: Record<string, [string, string]> = {
  productsCreated: ["Produkt angelegt", "Produkte angelegt"],
  documentsSaved: ["Dokument gespeichert", "Dokumente gespeichert"],
  remindersCompleted: ["Erinnerung erledigt", "Erinnerungen erledigt"],
  detailsAdded: ["Angabe ergänzt", "Angaben ergänzt"]
};

export function typeBreakdownLines(types: Record<string, number> | undefined): string[] {
  if (!types) return [];
  return Object.entries(types)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => {
      const labels = activityTypeLabels[key];
      if (!labels) return `${value}`;
      return `${value} ${value === 1 ? labels[0] : labels[1]}`;
    });
}

const activityDefinition =
  "Ein aktiver Tag entsteht, wenn du ein Produkt anlegst, ein Dokument speicherst, Angaben ergänzt oder eine Erinnerung erledigst.";

function useCompactViewport() {
  const [compact, setCompact] = useState(() => (typeof window === "undefined" ? false : window.matchMedia("(max-width: 760px)").matches));
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return compact;
}

export function ActivityModule({ defaultPeriod = 90 }: { defaultPeriod?: Period }) {
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [data, setData] = useState<MeActivity | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");
    api<MeActivity>(`/api/me/activity?days=${period}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [period]);

  return (
    <section className="mem-activity" aria-labelledby="mem-activity-title">
      <div className="mem-activity-head">
        <h2 id="mem-activity-title">Aktivität</h2>
        <div className="mem-activity-periods" role="group" aria-label="Zeitraum wählen">
          {([30, 90, 365] as Period[]).map((value) => (
            <button
              className={`mem-activity-period${period === value ? " is-active" : ""}`}
              key={value}
              onClick={() => setPeriod(value)}
              type="button"
              aria-pressed={period === value}
            >
              {periodLabels[value]}
            </button>
          ))}
        </div>
      </div>

      {status === "loading" ? <div className="mem-activity-loading" aria-hidden="true" /> : null}
      {status === "error" ? (
        <p className="mem-activity-error" role="status">
          Deine Aktivität konnte gerade nicht geladen werden. Deine Daten wurden nicht verändert.
        </p>
      ) : null}

      {status === "ready" && data ? <ActivityBody data={data} period={period} /> : null}
    </section>
  );
}

function streakHeadline(data: MeActivity): { value: string; sentence: string } {
  if (data.currentStreakDays > 0) {
    return {
      value: `${data.currentStreakDays} ${data.currentStreakDays === 1 ? "Tag" : "Tage"}`,
      sentence:
        data.currentStreakDays === 1
          ? "Seit gestern oder heute hältst du dein Archiv aktuell — weiter so."
          : `Seit ${data.currentStreakDays} Tagen hältst du dein Archiv aktuell.`
    };
  }
  return {
    value: "Bereit",
    sentence: "Deine nächste sinnvolle Ergänzung startet eine neue Serie."
  };
}

function ActivityBody({ data, period }: { data: MeActivity; period: Period }) {
  const hasActivity = data.totalActions > 0;
  const streak = streakHeadline(data);
  const compact = useCompactViewport();

  return (
    <div className="mem-activity-layout">
      <div className="mem-activity-side">
        <div className="mem-streak" aria-live="polite">
          <span className="mem-streak-label">Aktuelle Serie</span>
          <strong className="mem-streak-value">{streak.value}</strong>
          <p className="mem-streak-sentence">{streak.sentence}</p>
          <dl className="mem-streak-secondary">
            <div>
              <dt><Sparkles size={14} aria-hidden="true" /> Längste Serie</dt>
              <dd>{data.longestStreakDays} {data.longestStreakDays === 1 ? "Tag" : "Tage"}</dd>
            </div>
            <div>
              <dt><CalendarCheck2 size={14} aria-hidden="true" /> Aktive Tage</dt>
              <dd>{data.activeDays} {periodDative[period]}</dd>
            </div>
          </dl>
        </div>

        <details className="mem-activity-definition" open={!compact}>
          <summary>
            <Info size={14} aria-hidden="true" /> Was zählt als Aktivität?
          </summary>
          <p>{activityDefinition}</p>
        </details>
      </div>

      <div className="mem-activity-main">
        {hasActivity ? (
          <Heatmap data={data} period={period} />
        ) : (
          <div className="mem-activity-empty">
            <p>
              <strong>Noch keine Aktivität in diesem Zeitraum.</strong> {activityDefinition}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Heatmap with tooltip + pinned day panel ─────────────────── */

type HeatmapDay = {
  date: string;
  readable: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  types?: Record<string, number>;
};

function Heatmap({ data, period }: { data: MeActivity; period: Period }) {
  const gridRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const compact = useCompactViewport();
  const [hovered, setHovered] = useState<HeatmapDay | null>(null);
  const [focusDate, setFocusDate] = useState<string | null>(null);

  useEffect(() => {
    // Long ranges overflow horizontally; the most recent weeks are the
    // relevant ones, so the strip starts scrolled to today.
    const wrap = wrapRef.current;
    if (wrap) wrap.scrollLeft = wrap.scrollWidth;
  }, [period, compact, data]);

  const weeks = useMemo(() => buildWeeks(data, period, compact), [data, period, compact]);
  const flatDays = useMemo(() => weeks.flat().filter(Boolean) as HeatmapDay[], [weeks]);
  const lastActive = useMemo(
    () => [...flatDays].reverse().find((day) => day.count > 0) ?? flatDays[flatDays.length - 1],
    [flatDays]
  );
  const [selected, setSelected] = useState<HeatmapDay | null>(null);
  const selectedDay = selected && flatDays.some((day) => day.date === selected.date) ? selected : lastActive ?? null;

  useEffect(() => {
    // Period switches re-anchor the pinned panel on the freshest active day.
    setSelected(null);
  }, [period, compact]);

  function moveFocus(from: string, columnDelta: number, rowDelta: number) {
    const index = flatDays.findIndex((day) => day.date === from);
    if (index < 0) return;
    const target = flatDays[index + columnDelta * 7 + rowDelta];
    if (!target) return;
    setFocusDate(target.date);
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${target.date}"]`)?.focus();
  }

  const monthMarks = useMemo(() => buildMonthMarks(weeks), [weeks]);
  const summary = `${periodLabels[period]}: ${data.totalActions} ${data.totalActions === 1 ? "sinnvolle Aktion" : "sinnvolle Aktionen"} an ${data.activeDays} ${data.activeDays === 1 ? "Tag" : "Tagen"}.`;

  return (
    <div className="mem-heatmap-area">
      <p className="sr-only">{summary} {activityDefinition}</p>
      <div className="mem-heatmap-wrap" data-period={compact ? "compact" : period} ref={wrapRef}>
        <div className="mem-heatmap-months" aria-hidden="true">
          {monthMarks.map((mark) => (
            <span key={`${mark.label}-${mark.week}`} style={{ gridColumnStart: mark.week + 1 }}>
              {mark.label}
            </span>
          ))}
        </div>
        <div className="mem-heatmap-body">
          <div className="mem-heatmap-weekdays" aria-hidden="true">
            {weekdayLabels.map((label, index) => (
              <span key={label} className={index % 2 === 1 ? "is-hidden" : ""}>
                {label}
              </span>
            ))}
          </div>
          <div
            className="mem-heatmap-grid"
            ref={gridRef}
            role="grid"
            aria-label={`Aktivität, ${compact ? "letzte 16 Wochen" : periodLabels[period]}`}
          >
            {weeks.map((week, weekIndex) => (
              <div className="mem-heatmap-week" key={weekIndex} role="row">
                {week.map((day, dayIndex) =>
                  day ? (
                    <button
                      aria-label={cellAriaLabel(day)}
                      className={`mem-heatmap-cell is-l${day.level}${selectedDay?.date === day.date ? " is-selected" : ""}`}
                      data-date={day.date}
                      key={day.date}
                      onBlur={() => setHovered(null)}
                      onClick={() => setSelected(day)}
                      onFocus={() => {
                        setFocusDate(day.date);
                        setHovered(day);
                      }}
                      onKeyDown={(event) => {
                        const moves: Record<string, [number, number]> = {
                          ArrowRight: [1, 0],
                          ArrowLeft: [-1, 0],
                          ArrowDown: [0, 1],
                          ArrowUp: [0, -1]
                        };
                        const move = moves[event.key];
                        if (!move) return;
                        event.preventDefault();
                        moveFocus(day.date, move[0], move[1]);
                      }}
                      onMouseEnter={() => setHovered(day)}
                      onMouseLeave={() => setHovered(null)}
                      role="gridcell"
                      tabIndex={focusDate === day.date || (!focusDate && day === lastActive) ? 0 : -1}
                      type="button"
                    />
                  ) : (
                    <span aria-hidden="true" className="mem-heatmap-cell is-empty" key={`${weekIndex}-${dayIndex}`} />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mem-heatmap-legend" aria-hidden="true">
          <i className="mem-heatmap-cell is-l0" /><span>0</span>
          <i className="mem-heatmap-cell is-l1" /><span>1</span>
          <i className="mem-heatmap-cell is-l2" /><span>2–3</span>
          <i className="mem-heatmap-cell is-l3" /><span>4–5</span>
          <i className="mem-heatmap-cell is-l4" /><span>6+ Aktionen</span>
        </div>
      </div>

      <div aria-hidden={!hovered} className={`mem-heatmap-tooltip${hovered ? " is-visible" : ""}`} role="status">
        {hovered ? (
          <>
            <strong>{hovered.readable}</strong>
            {hovered.count === 0 ? (
              <span>Keine Aktivität an diesem Tag</span>
            ) : (
              <>
                <span>{hovered.count} {hovered.count === 1 ? "Aktion" : "Aktionen"}</span>
                {typeBreakdownLines(hovered.types).map((line) => (
                  <span key={line}>• {line}</span>
                ))}
              </>
            )}
          </>
        ) : (
          <span>{summary}</span>
        )}
      </div>

      {selectedDay ? <DayDetail day={selectedDay} /> : null}
    </div>
  );
}

function cellAriaLabel(day: HeatmapDay) {
  if (day.count === 0) return `Keine Aktivität am ${day.readable}`;
  const breakdown = typeBreakdownLines(day.types).join(", ");
  return `${day.count} ${day.count === 1 ? "Aktion" : "Aktionen"} am ${day.readable}${breakdown ? `: ${breakdown}` : ""}`;
}

/* Pinned day panel — same height whether the day was active or quiet, so
   selecting cells never shifts the layout below. */
function DayDetail({ day }: { day: HeatmapDay }) {
  const lines = typeBreakdownLines(day.types);
  return (
    <div className="mem-day-detail" aria-live="polite">
      <div className="mem-day-detail-head">
        <strong>{day.readable}</strong>
        <span>{day.count === 0 ? "Keine Aktivität" : `${day.count} ${day.count === 1 ? "Aktion" : "Aktionen"}`}</span>
      </div>
      {day.count > 0 ? (
        <ul>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p>Ein ruhiger Tag — dein Archiv war trotzdem sicher.</p>
      )}
    </div>
  );
}

function buildWeeks(data: MeActivity, period: Period, compact: boolean): (HeatmapDay | null)[][] {
  const byDate = new Map(data.days.map((entry) => [entry.date, entry]));
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const totalDays = compact ? Math.min(period, 16 * 7) : period;
  const start = new Date(today);
  start.setDate(start.getDate() - (totalDays - 1));
  const startOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startOffset);

  const formatter = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" });
  const weeks: (HeatmapDay | null)[][] = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const week: (HeatmapDay | null)[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      if (cursor > today) {
        week.push(null);
      } else {
        const iso = cursor.toISOString().slice(0, 10);
        const entry = byDate.get(iso);
        const count = entry?.count ?? 0;
        week.push({
          date: iso,
          readable: formatter.format(cursor),
          count,
          level: levelFor(count),
          types: entry?.types
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/* Legend buckets: 0 / 1 / 2–3 / 4–5 / 6+ actions. */
export function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function buildMonthMarks(weeks: (HeatmapDay | null)[][]): { label: string; week: number }[] {
  const formatter = new Intl.DateTimeFormat("de-DE", { month: "short" });
  const marks: { label: string; week: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, index) => {
    const firstDay = week.find(Boolean);
    if (!firstDay) return;
    const month = new Date(firstDay.date).getMonth();
    if (month !== lastMonth) {
      marks.push({ label: formatter.format(new Date(firstDay.date)), week: index });
      lastMonth = month;
    }
  });
  return marks.length > 1 ? marks.slice(1) : marks;
}
