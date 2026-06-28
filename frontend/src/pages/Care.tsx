import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  PackageCheck,
  PauseCircle,
  Plus,
  ReceiptText,
  ScanBarcode,
  ShieldCheck
} from "lucide-react";
import { api, dateInputValue } from "../lib/api";
import type { Item, Loop } from "../lib/types";
import {
  ActionButton,
  AppMainColumn,
  AppMainGrid,
  AppPage,
  AppPageHeader,
  AppSection,
  AppSideColumn,
  CareTimeline,
  EmptyState,
  IconTile,
  MetadataRow,
  ObjectMemoryGraph,
  OpenLoopRow,
  SecondaryAction
} from "../components/app/AppKit";
import type { CareStep, GraphEdge, StatusTone } from "../components/app/AppKit";

type CareStatus = "loading" | "ready";

const mockCareLoops: Loop[] = [
  {
    id: "care_return_monitor",
    itemId: "item_monitor",
    title: "Rückgabe Monitor prüfen",
    description: "Rückgabefenster endet bald. Beleg und Originalverpackung liegen im Arbeitszimmer.",
    sourceType: "MANUAL",
    priority: "HIGH",
    status: "OPEN",
    dueDate: daysFromNow(2),
    reminderAt: daysFromNow(1),
    xpReward: 50,
    item: {
      id: "item_monitor",
      name: "Dell UltraSharp Monitor",
      category: "Elektronik",
      currency: "EUR",
      completenessScore: 82,
      status: "ACTIVE"
    }
  },
  {
    id: "care_bike_service",
    itemId: "item_bike",
    title: "Fahrrad Service nachfassen",
    description: "Werkstatt wollte sich mit Kostenvoranschlag melden.",
    sourceType: "MANUAL",
    priority: "MEDIUM",
    status: "OPEN",
    dueDate: daysFromNow(5),
    reminderAt: daysFromNow(5),
    xpReward: 25,
    item: {
      id: "item_bike",
      name: "VanMoof S3",
      category: "Mobilität",
      currency: "EUR",
      completenessScore: 76,
      status: "ACTIVE"
    }
  },
  {
    id: "care_warranty_washer",
    itemId: "item_washer",
    title: "Garantie Waschmaschine sichern",
    description: "Seriennummer fehlt noch auf der Produktkarte. Rechnung ist vorhanden.",
    sourceType: "RECEIPT",
    priority: "LOW",
    status: "SNOOZED",
    dueDate: daysFromNow(12),
    reminderAt: daysFromNow(9),
    xpReward: 10,
    item: {
      id: "item_washer",
      name: "Bosch Serie 6 Waschmaschine",
      category: "Haushalt",
      currency: "EUR",
      completenessScore: 68,
      status: "ACTIVE"
    }
  }
];

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(9, 0, 0, 0);
  return date.toISOString();
}

export function Care() {
  const { loopId } = useParams();
  const location = useLocation();
  const [loops, setLoops] = useState<Loop[]>([]);
  const [status, setStatus] = useState<CareStatus>("loading");
  const [usingDemo, setUsingDemo] = useState(false);
  const careBasePath = location.pathname.startsWith("/app") ? "/app/care" : "/care";

  async function loadLoops() {
    setStatus("loading");
    try {
      const data = await api<Loop[]>("/api/loops");
      setLoops(data);
      setUsingDemo(false);
    } catch {
      setLoops(mockCareLoops);
      setUsingDemo(true);
    } finally {
      setStatus("ready");
    }
  }

  useEffect(() => {
    void loadLoops();
  }, []);

  if (loopId) {
    return (
      <CareDetail
        basePath={careBasePath}
        loopId={loopId}
        loops={loops}
        loading={status === "loading"}
        setLoops={setLoops}
        usingDemo={usingDemo}
      />
    );
  }

  return <CareOverview basePath={careBasePath} loading={status === "loading"} loops={loops} usingDemo={usingDemo} />;
}

function CareOverview({ basePath, loading, loops, usingDemo }: { basePath: string; loading: boolean; loops: Loop[]; usingDemo: boolean }) {
  const openLoops = useMemo(() => sortOpenLoops(loops), [loops]);
  const focus = openLoops[0];
  const dueSoon = openLoops.filter((loop) => isWithinDays(loop.dueDate ?? loop.reminderAt, 7));
  const snoozed = openLoops.filter((loop) => loop.status === "SNOOZED");

  return (
    <AppPage>
      <AppPageHeader
        kicker="Care · Support & Fristen"
        title="Was braucht Aufmerksamkeit?"
        subtitle="Garantien, Rückgaben, Reparaturen und offene Zusagen bleiben sichtbar, bis sie erledigt sind."
        actions={
          <ActionButton to="/app/capture/loop" icon={<Plus size={15} />}>
            Erinnerung hinzufügen
          </ActionButton>
        }
      />

      <div className="av-stat-grid">
        <CareStatCard icon={<AlertCircle size={16} />} tone="teal" label="Offen" value={openLoops.length} />
        <CareStatCard icon={<CalendarClock size={16} />} tone="amber" label="Nächste 7 Tage" value={dueSoon.length} />
        <CareStatCard icon={<PauseCircle size={16} />} tone="neutral" label="Pausiert" value={snoozed.length} />
      </div>

      {focus ? (
        <AppSection title="Nächster offener Punkt" slim>
          <Link className="av-focus-row" to={`${basePath}/${focus.id}`}>
            <IconTile tone={loopTone(focus)}>
              <CareTypeIcon loop={focus} />
            </IconTile>
            <div className="av-focus-copy">
              <strong>{focus.title}</strong>
              <p>{careReason(focus)}</p>
            </div>
            <span className="av-focus-go">
              Öffnen <ChevronRight size={15} />
            </span>
          </Link>
        </AppSection>
      ) : null}

      <AppSection title="Offene Punkte" link={usingDemo ? undefined : undefined}>
        {loading ? (
          <div className="av-loop-list">
            <div className="av-skeleton-row" />
            <div className="av-skeleton-row" />
            <div className="av-skeleton-row" />
          </div>
        ) : openLoops.length === 0 ? (
          <EmptyState title="Nichts fällig.">Wenn etwas wieder auftauchen soll, lege eine Care-Erinnerung an.</EmptyState>
        ) : (
          <div className="av-loop-list">
            {openLoops.map((loop) => (
              <OpenLoopRow
                key={loop.id}
                to={`${basePath}/${loop.id}`}
                tone={loopTone(loop)}
                icon={<CareTypeIcon loop={loop} />}
                title={loop.title}
                product={`${loop.item?.name ?? careSourceLabel(loop.sourceType)} · ${careDateLabel(loop.dueDate ?? loop.reminderAt)}`}
                signal={careStateLabel(loop)}
              />
            ))}
          </div>
        )}
      </AppSection>
    </AppPage>
  );
}

function CareDetail({
  basePath,
  loading,
  loopId,
  loops,
  setLoops,
  usingDemo
}: {
  basePath: string;
  loading: boolean;
  loopId: string;
  loops: Loop[];
  setLoops: Dispatch<SetStateAction<Loop[]>>;
  usingDemo: boolean;
}) {
  const navigate = useNavigate();
  const loop = loops.find((entry) => entry.id === loopId);
  const [saving, setSaving] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [linkedItem, setLinkedItem] = useState<Item | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setDueDate(dateInputValue(loop?.dueDate));
    setReminderAt(dateInputValue(loop?.reminderAt));
  }, [loop?.dueDate, loop?.reminderAt]);

  useEffect(() => {
    let ignore = false;
    setLinkedItem(loop?.item ?? null);

    if (!loop?.itemId || usingDemo) return () => {
      ignore = true;
    };

    api<Item>(`/api/items/${loop.itemId}`)
      .then((item) => {
        if (!ignore) setLinkedItem(item);
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, [loop?.itemId, loop?.item, usingDemo]);

  function replaceLoop(nextLoop: Loop) {
    setLoops((current) => current.map((entry) => (entry.id === nextLoop.id ? nextLoop : entry)));
  }

  async function completeLoop() {
    if (!loop) return;
    setSaving(true);
    setActionMessage(null);
    try {
      if (usingDemo) {
        replaceLoop({ ...loop, status: "DONE" });
        navigate(basePath);
        return;
      }
      const result = await api<{ loop: Loop }>(`/api/loops/${loop.id}/complete`, { method: "POST" });
      replaceLoop(result.loop);
      navigate(basePath);
    } catch (error) {
      setActionMessage({ tone: "error", text: errorText(error) });
    } finally {
      setSaving(false);
    }
  }

  async function snoozeLoop() {
    if (!loop) return;
    setSaving(true);
    setActionMessage(null);
    try {
      const nextDate = daysFromNow(2);
      if (usingDemo) {
        replaceLoop({ ...loop, status: "SNOOZED", reminderAt: nextDate });
        setActionMessage({ tone: "success", text: "Care-Punkt wurde um 2 Tage verschoben." });
        return;
      }
      const updated = await api<Loop>(`/api/loops/${loop.id}/snooze`, {
        method: "POST",
        body: JSON.stringify({ reminderAt: nextDate })
      });
      replaceLoop(updated);
      setActionMessage({ tone: "success", text: "Care-Punkt wurde um 2 Tage verschoben." });
    } catch (error) {
      setActionMessage({ tone: "error", text: errorText(error) });
    } finally {
      setSaving(false);
    }
  }

  async function saveDates() {
    if (!loop) return;
    setSaving(true);
    setActionMessage(null);
    try {
      const payload = {
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null
      };
      if (usingDemo) {
        replaceLoop({ ...loop, ...payload });
        setActionMessage({ tone: "success", text: "Datum wurde gespeichert." });
        return;
      }
      const updated = await api<Loop>(`/api/loops/${loop.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      replaceLoop(updated);
      setActionMessage({ tone: "success", text: "Datum wurde gespeichert." });
    } catch (error) {
      setActionMessage({ tone: "error", text: errorText(error) });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppPage>
        <AppSection title="Care-Punkt wird geöffnet" slim>
          <p className="av-note">Einen Moment, Avareno holt den Kontext.</p>
        </AppSection>
      </AppPage>
    );
  }

  if (!loop) {
    return (
      <AppPage>
        <Link className="av-back" to={basePath}>
          <ArrowLeft size={15} /> Zurück zu Care
        </Link>
        <EmptyState title="Dieser Care-Punkt ist nicht verfügbar.">
          Zurück zur Übersicht, dort siehst du alle offenen Punkte.
        </EmptyState>
      </AppPage>
    );
  }

  const isDone = loop.status === "DONE" || loop.status === "ARCHIVED";
  const itemBasePath = basePath.startsWith("/app") ? "/app/items" : "/items";
  const overdue = dateScore(loop.dueDate ?? loop.reminderAt) < Date.now();
  const steps = buildCareSteps(loop, linkedItem, isDone, overdue);

  return (
    <AppPage>
      <Link className="av-back" to={basePath}>
        <ArrowLeft size={15} /> Zurück zu Care
      </Link>

      <AppPageHeader
        kicker={careStateLabel(loop)}
        title={loop.title}
        subtitle={loop.description || "Kein zusätzlicher Kontext hinterlegt."}
      />

      <AppMainGrid>
        <AppMainColumn>
          <AppSection title="Verlauf">
            <CareTimeline steps={steps} />
          </AppSection>

          {linkedItem ? (
            <AppSection title="Produktkontext" link={{ to: `${itemBasePath}/${linkedItem.id}`, label: "Ding öffnen" }}>
              <ObjectMemoryGraph
                title={linkedItem.name}
                category={linkedItem.category || "Produkt"}
                icon={<PackageCheck size={14} />}
                edges={careGraphEdges(linkedItem)}
              />
            </AppSection>
          ) : null}

          <AppSection title="Warum offen?" slim>
            <p className="av-note">{careReason(loop)}</p>
          </AppSection>
        </AppMainColumn>

        <AppSideColumn>
          <AppSection title="Status" slim>
            <dl className="av-metalist">
              <MetadataRow label="Fällig" value={careDateLabel(loop.dueDate)} tone={overdue && !isDone ? "red" : "neutral"} />
              <MetadataRow label="Erinnerung" value={careDateLabel(loop.reminderAt)} />
              <MetadataRow label="Verbunden mit" value={loop.item?.name ?? careSourceLabel(loop.sourceType)} />
            </dl>
          </AppSection>

          <AppSection title="Aktionen" slim>
            <div className="av-action-stack">
              <ActionButton onClick={completeLoop} disabled={saving || isDone} icon={<CheckCircle2 size={14} />}>
                Als erledigt markieren
              </ActionButton>
              <SecondaryAction onClick={snoozeLoop} disabled={saving || isDone} icon={<PauseCircle size={15} />}>
                2 Tage verschieben
              </SecondaryAction>
            </div>
            {actionMessage ? <p className={`av-msg is-${actionMessage.tone}`}>{actionMessage.text}</p> : null}
          </AppSection>

          <AppSection title="Zeitpunkt" slim>
            <div className="av-date-grid">
              <label className="av-field">
                Fällig am
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </label>
              <label className="av-field">
                Erinnern am
                <input type="date" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} />
              </label>
            </div>
            <SecondaryAction onClick={saveDates} disabled={saving}>
              Datum speichern
            </SecondaryAction>
          </AppSection>
        </AppSideColumn>
      </AppMainGrid>
    </AppPage>
  );
}

function CareStatCard({ icon, tone, label, value }: { icon: ReactNode; tone: StatusTone; label: string; value: number }) {
  return (
    <div className="av-stat-card">
      <IconTile tone={tone}>{icon}</IconTile>
      <div className="av-stat-copy">
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

/* Lifecycle steps for the CareTimeline — opened → context → reminder → due → resolved. */
function buildCareSteps(loop: Loop, item: Item | null, isDone: boolean, overdue: boolean): CareStep[] {
  const steps: CareStep[] = [];
  steps.push({ title: "Care-Punkt geöffnet", detail: careSourceLabel(loop.sourceType), state: "done", tone: "teal" });
  if (item?.warrantyUntil) {
    steps.push({ title: "Garantie aktiv", detail: `bis ${careLongDateLabel(item.warrantyUntil)}`, state: "done", tone: "amber" });
  }
  if (loop.reminderAt) {
    steps.push({ title: "Erinnerung", detail: careDateLabel(loop.reminderAt), state: isDone ? "done" : "todo" });
  }
  if (loop.dueDate) {
    steps.push({
      title: "Fällig",
      detail: careDateLabel(loop.dueDate),
      state: isDone ? "done" : overdue ? "active" : "todo",
      tone: "amber"
    });
  }
  steps.push({
    title: isDone ? "Erledigt" : "Abschluss offen",
    detail: isDone ? "Care-Punkt geschlossen" : "Als erledigt markieren, wenn gelöst",
    state: isDone ? "done" : "todo",
    tone: isDone ? "green" : undefined
  });
  return steps;
}

/* Product memory edges for the Care detail graph. */
function careGraphEdges(item: Item): GraphEdge[] {
  const hasReceipt = item.documents?.some((document) => document.type.toUpperCase() === "RECEIPT") ?? false;
  return [
    { tone: hasReceipt ? "green" : "red", label: hasReceipt ? "Beleg gespeichert" : "Beleg fehlt" },
    {
      tone: item.warrantyUntil ? "amber" : "neutral",
      label: item.warrantyUntil ? `Garantie bis ${careLongDateLabel(item.warrantyUntil)}` : "Garantie unbekannt"
    },
    { tone: item.serialNumber ? "green" : "red", label: item.serialNumber ? "Seriennummer ✓" : "Seriennummer fehlt" }
  ];
}

function loopTone(loop: Loop): StatusTone {
  if (loop.status === "SNOOZED") return "neutral";
  if (dateScore(loop.dueDate ?? loop.reminderAt) < Date.now()) return "red";
  if (isWithinDays(loop.dueDate ?? loop.reminderAt, 7)) return "amber";
  return "teal";
}

function CareTypeIcon({ loop }: { loop: Loop }) {
  if (loop.sourceType === "RECEIPT") return <FileText size={17} />;
  if (loop.itemId) return <PackageCheck size={17} />;
  return <CalendarClock size={17} />;
}

function sortOpenLoops(loops: Loop[]) {
  return loops
    .filter((loop) => loop.status !== "DONE" && loop.status !== "ARCHIVED")
    .slice()
    .sort((a, b) => dateScore(a.dueDate ?? a.reminderAt) - dateScore(b.dueDate ?? b.reminderAt));
}

function dateScore(value?: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function isWithinDays(value: string | null | undefined, days: number) {
  const score = dateScore(value);
  if (score === Number.MAX_SAFE_INTEGER) return false;
  const now = new Date();
  const limit = new Date();
  limit.setDate(now.getDate() + days);
  return score <= limit.getTime();
}

function careDateLabel(value?: string | null) {
  if (!value) return "Ohne Datum";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(new Date(value));
}

function careLongDateLabel(value?: string | null) {
  if (!value) return "Kein Datum";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function careStateLabel(loop: Loop) {
  if (loop.status === "SNOOZED") return "Pausiert";
  if (dateScore(loop.dueDate ?? loop.reminderAt) < Date.now()) return "Fällig";
  if (isWithinDays(loop.dueDate ?? loop.reminderAt, 7)) return "Bald";
  return "Offen";
}

function careReason(loop: Loop) {
  const item = loop.item?.name ? `${loop.item.name}: ` : "";
  if (loop.priority === "HIGH" || loop.priority === "BOSS") return `${item}Frist oder Entscheidung sollte zeitnah geklärt werden.`;
  if (loop.status === "SNOOZED") return `${item}Pausiert, aber nicht vergessen.`;
  return `${item}Offener Punkt mit Datum und Kontext.`;
}

function careSourceLabel(sourceType: Loop["sourceType"]) {
  const labels: Record<Loop["sourceType"], string> = {
    DEVICE: "Gerät",
    DOCUMENT: "Dokument",
    MANUAL: "Manuell",
    MESSAGE: "Nachricht",
    RECEIPT: "Beleg"
  };
  return labels[sourceType];
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Aktion konnte nicht ausgeführt werden.";
}
