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

type CareStatus = "loading" | "ready";

const mockCareLoops: Loop[] = [
  {
    id: "care_return_monitor",
    itemId: "item_monitor",
    title: "Rueckgabe Monitor pruefen",
    description: "Rueckgabefenster endet bald. Beleg und Originalverpackung liegen im Arbeitszimmer.",
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
      category: "Mobilitaet",
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
    <main className="care-page care-workspace">
      <section className="care-hero care-overview-hero">
        <div>
          <span>Care</span>
          <h1>Was braucht Aufmerksamkeit?</h1>
          <p>Garantien, Rueckgaben, Reparaturen und offene Zusagen bleiben hier sichtbar, bis sie erledigt sind.</p>
        </div>
        <Link className="care-primary-action" to="/app/capture/loop">
          <Plus size={16} />
          Erinnerung hinzufuegen
        </Link>
      </section>

      {focus ? (
        <section className="care-focus care-next-card">
          <div>
            <span>Naechster offener Punkt</span>
            <h2>{focus.title}</h2>
            <p>{careReason(focus)}</p>
          </div>
          <Link className="care-secondary-action" to={`${basePath}/${focus.id}`}>
            Oeffnen
            <ChevronRight size={16} />
          </Link>
        </section>
      ) : (
        <section className="care-focus care-empty-focus">
          <div>
            <span>{loading ? "Wird geladen" : "Alles ruhig"}</span>
            <h2>{loading ? "Care wird vorbereitet." : "Keine offenen Care-Punkte."}</h2>
            <p>{loading ? "Avareno sucht nach Erinnerungen und Fristen." : "Neue Fristen kannst du jederzeit als Erinnerung hinzufuegen."}</p>
          </div>
        </section>
      )}

      <section className="care-stat-grid" aria-label="Care Status">
        <CareStat icon={<AlertCircle size={17} />} label="Offen" value={String(openLoops.length)} />
        <CareStat icon={<CalendarClock size={17} />} label="Naechste 7 Tage" value={String(dueSoon.length)} />
        <CareStat icon={<PauseCircle size={17} />} label="Pausiert" value={String(snoozed.length)} />
      </section>

      <section className="care-list-panel">
        <div className="care-panel-head">
          <div>
            <span>Offene Punkte</span>
            <h2>Eine Liste, keine Wand.</h2>
          </div>
          {usingDemo ? <small>Demo-Daten</small> : null}
        </div>

        <div className="care-list" aria-label="Offene Care Punkte">
          {loading ? <CareLoadingRows /> : null}
          {!loading && openLoops.length === 0 ? (
            <div className="care-empty-state">
              <CheckCircle2 size={20} />
              <strong>Nichts faellig.</strong>
              <p>Wenn etwas wieder auftauchen soll, lege eine Care-Erinnerung an.</p>
            </div>
          ) : null}
          {!loading
            ? openLoops.map((loop) => (
                <Link className="care-list-row" key={loop.id} to={`${basePath}/${loop.id}`}>
                  <span className="care-row-icon">
                    <CareTypeIcon loop={loop} />
                  </span>
                  <span className="care-row-copy">
                    <strong>{loop.title}</strong>
                    <small>{loop.item?.name ?? careSourceLabel(loop.sourceType)}</small>
                  </span>
                  <span className={`care-row-status ${careStateClass(loop)}`}>{careStateLabel(loop)}</span>
                  <span className="care-row-date">{careDateLabel(loop.dueDate ?? loop.reminderAt)}</span>
                  <ChevronRight size={16} />
                </Link>
              ))
            : null}
        </div>
      </section>
    </main>
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
      <main className="care-page care-workspace">
        <section className="care-focus care-empty-focus">
          <div>
            <span>Wird geladen</span>
            <h2>Care-Punkt wird geoeffnet.</h2>
            <p>Einen Moment, Avareno holt den Kontext.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!loop) {
    return (
      <main className="care-page care-workspace">
        <section className="care-focus care-empty-focus">
          <div>
            <span>Nicht gefunden</span>
            <h2>Dieser Care-Punkt ist nicht verfuegbar.</h2>
            <p>Zurueck zur Uebersicht, dort siehst du alle offenen Punkte.</p>
          </div>
          <Link className="care-secondary-action" to={basePath}>
            Zurueck
          </Link>
        </section>
      </main>
    );
  }

  const isDone = loop.status === "DONE" || loop.status === "ARCHIVED";
  const itemBasePath = basePath.startsWith("/app") ? "/app/items" : "/items";

  return (
    <main className="care-page care-workspace">
      <Link className="care-back-link" to={basePath}>
        <ArrowLeft size={16} />
        Zurueck zu Care
      </Link>

      <section className="care-detail-card">
        <div className="care-detail-head">
          <span className={`care-row-status ${careStateClass(loop)}`}>{careStateLabel(loop)}</span>
          <h1>{loop.title}</h1>
          <p>{loop.description || "Kein zusaetzlicher Kontext hinterlegt."}</p>
        </div>

        <div className="care-detail-grid">
          <CareFact icon={<CalendarClock size={17} />} label="Faellig" value={careDateLabel(loop.dueDate)} />
          <CareFact icon={<Clock3 size={17} />} label="Erinnerung" value={careDateLabel(loop.reminderAt)} />
          <CareFact icon={<PackageCheck size={17} />} label="Verbunden mit" value={loop.item?.name ?? careSourceLabel(loop.sourceType)} />
        </div>

        {linkedItem ? <CareProductContext item={linkedItem} itemPath={`${itemBasePath}/${linkedItem.id}`} /> : null}

        <div className="care-detail-note">
          <span>Warum offen?</span>
          <p>{careReason(loop)}</p>
        </div>

        <div className="care-detail-actions">
          <button className="care-primary-action" disabled={saving || isDone} onClick={completeLoop} type="button">
            <CheckCircle2 size={16} />
            Als erledigt markieren
          </button>
          <button className="care-secondary-action" disabled={saving || isDone} onClick={snoozeLoop} type="button">
            <PauseCircle size={16} />
            2 Tage verschieben
          </button>
        </div>
        {actionMessage ? <p className={`care-action-message is-${actionMessage.tone}`}>{actionMessage.text}</p> : null}
      </section>

      <section className="care-date-panel">
        <div className="care-panel-head">
          <div>
            <span>Zeitpunkt</span>
            <h2>Nur die wichtigen Daten.</h2>
          </div>
        </div>
        <div className="care-date-grid">
          <label>
            Faellig am
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
          <label>
            Erinnern am
            <input type="date" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} />
          </label>
        </div>
        <button className="care-secondary-action care-save-date" disabled={saving} onClick={saveDates} type="button">
          Datum speichern
        </button>
      </section>
    </main>
  );
}

function CareStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="care-stat">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function CareFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="care-fact">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function CareProductContext({ item, itemPath }: { item: Item; itemPath: string }) {
  const hasReceipt = item.documents?.some((document) => document.type.toUpperCase() === "RECEIPT") ?? false;
  const facts = [
    {
      icon: <ReceiptText size={16} />,
      label: "Beleg",
      value: hasReceipt ? "Gespeichert" : "Fehlt",
      ready: hasReceipt
    },
    {
      icon: <ShieldCheck size={16} />,
      label: "Garantie",
      value: item.warrantyUntil ? careLongDateLabel(item.warrantyUntil) : "Kein Datum",
      ready: Boolean(item.warrantyUntil)
    },
    {
      icon: <ScanBarcode size={16} />,
      label: "Seriennummer",
      value: item.serialNumber ? "Gespeichert" : "Fehlt",
      ready: Boolean(item.serialNumber)
    }
  ];

  return (
    <div className="care-product-context">
      <div className="care-context-head">
        <div>
          <span>Produktkontext</span>
          <strong>{item.name}</strong>
        </div>
        <Link className="care-context-link" to={itemPath}>
          Ding oeffnen
          <ChevronRight size={15} />
        </Link>
      </div>
      <div className="care-context-list">
        {facts.map((fact) => (
          <div className={fact.ready ? "care-context-line is-ready" : "care-context-line"} key={fact.label}>
            <span>{fact.icon}</span>
            <small>{fact.label}</small>
            <strong>{fact.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function CareTypeIcon({ loop }: { loop: Loop }) {
  if (loop.sourceType === "RECEIPT") return <FileText size={17} />;
  if (loop.itemId) return <PackageCheck size={17} />;
  return <CalendarClock size={17} />;
}

function CareLoadingRows() {
  return (
    <>
      <div className="care-list-row is-loading" />
      <div className="care-list-row is-loading" />
      <div className="care-list-row is-loading" />
    </>
  );
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
  if (dateScore(loop.dueDate ?? loop.reminderAt) < Date.now()) return "Faellig";
  if (isWithinDays(loop.dueDate ?? loop.reminderAt, 7)) return "Bald";
  return "Offen";
}

function careStateClass(loop: Loop) {
  if (loop.status === "SNOOZED") return "is-muted";
  if (dateScore(loop.dueDate ?? loop.reminderAt) < Date.now()) return "is-due";
  if (isWithinDays(loop.dueDate ?? loop.reminderAt, 7)) return "is-soon";
  return "";
}

function careReason(loop: Loop) {
  const item = loop.item?.name ? `${loop.item.name}: ` : "";
  if (loop.priority === "HIGH" || loop.priority === "BOSS") return `${item}Frist oder Entscheidung sollte zeitnah geklaert werden.`;
  if (loop.status === "SNOOZED") return `${item}Pausiert, aber nicht vergessen.`;
  return `${item}Offener Punkt mit Datum und Kontext.`;
}

function careSourceLabel(sourceType: Loop["sourceType"]) {
  const labels: Record<Loop["sourceType"], string> = {
    DEVICE: "Geraet",
    DOCUMENT: "Dokument",
    MANUAL: "Manuell",
    MESSAGE: "Nachricht",
    RECEIPT: "Beleg"
  };
  return labels[sourceType];
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Aktion konnte nicht ausgefuehrt werden.";
}
