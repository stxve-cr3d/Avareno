import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BellRing,
  BookOpen,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileText,
  ListChecks,
  Package,
  Plus,
  Receipt,
  ShieldCheck,
  Upload
} from "lucide-react";
import { api } from "../lib/api";
import type { Document as MemoryDocument, Item, User } from "../lib/types";
import { missingFieldLabel } from "../lib/uiText";
import { ActivityModule } from "../components/ActivityHeatmap";
import {
  ProductObjectCard,
  formatDate,
  warrantyDaysLeft,
  warrantyStatus
} from "../components/ProductObjectCard";

type LoadStatus = "loading" | "ready" | "error";
type RecentDocument = { document: MemoryDocument; itemId: string; itemName: string };
type DashboardTask = {
  key: string;
  to: string;
  icon: ReactNode;
  product: string;
  task: string;
  benefit: string;
  action: string;
  tone: "amber" | "neutral";
};

export function MemoryHome() {
  const [items, setItems] = useState<Item[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");

  async function load() {
    setStatus("loading");
    try {
      const [all, currentUser] = await Promise.all([
        api<Item[]>("/api/items"),
        api<User>("/api/me").catch(() => null)
      ]);
      setItems(all);
      setUser(currentUser);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (status === "loading") {
    return <MemoryDashboardSkeleton />;
  }

  if (status === "error") {
    return <MemoryLoadError onRetry={load} />;
  }

  const hasItems = items.length > 0;
  const recents = items.slice(0, 3);
  const documentCount = items.reduce((sum, item) => sum + (item.documents?.length ?? 0), 0);
  const itemsWithMissingFields = items.filter((item) => (item.missingFields?.length ?? 0) > 0).length;
  const warrantyItems = items
    .filter((item) => warrantyDaysLeft(item) !== null && (warrantyDaysLeft(item) ?? 0) >= 0)
    .sort((a, b) => (warrantyDaysLeft(a) ?? 0) - (warrantyDaysLeft(b) ?? 0));
  const expiring = items
    .filter((item) => warrantyStatus(item) === "soon")
    .sort((a, b) => (warrantyDaysLeft(a) ?? 0) - (warrantyDaysLeft(b) ?? 0));
  const recentDocuments = collectRecentDocuments(items);
  const nextTasks = buildNextTasks(items, expiring);
  const firstName = getFirstName(user?.name);

  return (
    <main className="av-console mem-home mem-dashboard">
      <header className="mem-home-head">
        <div className="mem-home-head-copy">
          <span className="av-page-kicker">Deine Übersicht</span>
          <h1 className="av-page-title">
            {firstName ? `Guten Morgen, ${firstName}` : "Willkommen bei Avareno"}
          </h1>
          <p className="av-page-sub">
            Deine Produkte, Dokumente und wichtigen Fristen auf einen Blick.
          </p>
        </div>
        <div className="mem-home-head-actions" aria-label="Dashboard-Aktionen">
          <Link className="av-btn av-btn-primary" to="/app/capture/item">
            <Plus size={18} aria-hidden="true" />
            Produkt hinzufügen
          </Link>
          <Link className="av-btn av-btn-secondary" to="/app/capture/receipt">
            <Upload size={18} aria-hidden="true" />
            Dokument hochladen
          </Link>
        </div>
      </header>

      {hasItems ? <ActivityModule defaultPeriod={90} /> : null}

      {hasItems ? (
        <section className="mem-archive-state" aria-labelledby="mem-archive-state-title">
          <h2 className="sr-only" id="mem-archive-state-title">Zustand deines Archivs</h2>
          <ArchiveScoreCard items={items} itemsWithMissingFields={itemsWithMissingFields} />
          {/* Quiet facts instead of a row of near-identical KPI cards: the
              ring is the one highlighted number, the rest is plain language. */}
          <ul className="mem-fact-list">
            <li>
              <Boxes size={17} aria-hidden="true" />
              <span><strong>{items.length}</strong> {items.length === 1 ? "gespeicherte Produktakte" : "gespeicherte Produktakten"}</span>
            </li>
            <li>
              <FileText size={17} aria-hidden="true" />
              <span>
                {documentCount === 0
                  ? "Noch kein Dokument zugeordnet"
                  : <><strong>{documentCount}</strong> {documentCount === 1 ? "Dokument sicher zugeordnet" : "Dokumente sicher zugeordnet"}</>}
              </span>
            </li>
            <li className={expiring.length ? "is-attention" : ""}>
              {expiring.length ? <CalendarClock size={17} aria-hidden="true" /> : <ShieldCheck size={17} aria-hidden="true" />}
              <span>
                {expiring.length === 0 && "Keine Garantie endet in den nächsten 60 Tagen"}
                {expiring.length === 1 && <><strong>1</strong> Garantie endet in den nächsten 60 Tagen</>}
                {expiring.length > 1 && <><strong>{expiring.length}</strong> Garantien enden in den nächsten 60 Tagen</>}
              </span>
            </li>
          </ul>
        </section>
      ) : null}

      <DashboardSection
        className="mem-products-section"
        eyebrow="Produktakten"
        title="Deine Produkte"
        subtitle="Zuletzt hinzugefügt und zuletzt aktualisiert"
        link={hasItems ? { to: "/app/dinge", label: "Alle Produkte" } : undefined}
      >
        {hasItems ? (
          <div className="mem-product-grid">
            {recents.map((item) => <ProductObjectCard item={item} key={item.id} to={`/app/dinge/${item.id}`} />)}
          </div>
        ) : (
          <div className="mem-dashboard-empty">
            <span className="mem-empty-icon" aria-hidden="true"><Package size={28} /></span>
            <div>
              <h3>Noch keine Produkte gespeichert</h3>
              <p>Lege deine erste Produktakte an. Danach kannst du Belege, Garantien und Anleitungen direkt zuordnen.</p>
            </div>
            <Link className="mem-inline-link" to="/app/capture/item">
              Erstes Produkt anlegen <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
        )}
      </DashboardSection>

      {hasItems ? (
        <div className="mem-dashboard-split">
          <DashboardSection
            className="mem-next-section"
            eyebrow="Priorisiert"
            title="Als Nächstes"
            subtitle="Mit diesen Angaben werden deine Produktakten hilfreicher."
            link={nextTasks.length ? { to: "/app/dinge", label: "Alle Produktakten" } : undefined}
          >
            {nextTasks.length ? (
              <div className="mem-task-list">
                {nextTasks.map((task) => <NextTask task={task} key={task.key} />)}
              </div>
            ) : (
              <div className="mem-all-current" role="status">
                <span aria-hidden="true"><CheckCircle2 size={24} /></span>
                <div>
                  <strong>Alles Wichtige ist aktuell</strong>
                  <p>Für deine Produktakten gibt es gerade keine offenen Angaben oder nahen Garantiefristen.</p>
                </div>
              </div>
            )}
          </DashboardSection>

          <DashboardSection
            className="mem-documents-section"
            eyebrow="Dokumente"
            title="Zuletzt gespeichert"
            subtitle="Schnell zurück zu deinen letzten Unterlagen"
            link={{ to: "/app/reports/home-binder", label: "Alle Dokumente" }}
          >
            {recentDocuments.length ? (
              <div className="mem-document-list">
                {recentDocuments.map(({ document, itemId, itemName }) => (
                  <Link className="mem-document-row" key={document.id} to={`/app/dinge/${itemId}`}>
                    <span className={`mem-document-icon is-${documentTone(document.type)}`} aria-hidden="true">
                      {documentTypeIcon(document.type)}
                    </span>
                    <span className="mem-document-copy">
                      <strong title={document.fileName}>{document.fileName}</strong>
                      <small>{documentTypeLabel(document.type)} · {itemName}</small>
                      <span>
                        {formatDocumentDate(document)}
                        {formatFileSize(documentSize(document)) ? ` · ${formatFileSize(documentSize(document))}` : ""}
                      </span>
                    </span>
                    <ChevronRight size={17} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mem-documents-empty">
                <span aria-hidden="true"><FileText size={22} /></span>
                <div>
                  <strong>Noch keine Dokumente gespeichert</strong>
                  <p>Belege, Garantien und Anleitungen erscheinen nach dem Upload hier.</p>
                </div>
                <Link to="/app/capture/receipt">Dokument hochladen</Link>
              </div>
            )}
          </DashboardSection>
        </div>
      ) : null}

      {warrantyItems.length ? (
        <DashboardSection
          className="mem-warranty-section"
          eyebrow="Fristen"
          title="Garantie-Überblick"
          subtitle="Deine Garantien, sortiert nach Ablaufdatum"
        >
          <div className="mem-warranty-list">
            {warrantyItems.slice(0, 4).map((item) => {
              const days = warrantyDaysLeft(item) ?? 0;
              const soon = days < 60;
              return (
                <Link className={`mem-warranty-row${soon ? " is-soon" : ""}`} key={item.id} to={`/app/dinge/${item.id}`}>
                  <span className="mem-warranty-icon" aria-hidden="true"><ShieldCheck size={19} /></span>
                  <span className="mem-warranty-copy">
                    <strong>{item.name}</strong>
                    <small>Garantie bis {formatDate(item.warrantyUntil)}</small>
                  </span>
                  <span className="mem-warranty-days">
                    {soon ? `endet in ${days} ${days === 1 ? "Tag" : "Tagen"}` : `noch ${Math.round(days / 30)} Monate`}
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </DashboardSection>
      ) : null}

      <DashboardSection
        className="mem-quick-section"
        eyebrow="Direkt starten"
        title="Schnellaktionen"
        subtitle="Häufige Aufgaben ohne Umwege erledigen"
      >
        <div className="mem-quick-grid">
          <QuickAction
            to="/app/capture/item"
            icon={<Package size={23} />}
            title="Produkt hinzufügen"
            body="Eine neue Produktakte mit den wichtigsten Grunddaten anlegen."
          />
          <QuickAction
            to="/app/capture/receipt"
            icon={<Upload size={23} />}
            title="Dokument hochladen"
            body="Beleg, Garantie oder Anleitung einem Produkt zuordnen."
          />
          <QuickAction
            to="/app/capture/loop"
            icon={<BellRing size={23} />}
            title="Erinnerung anlegen"
            body="Eine Frist, Rückgabe oder Wartung zuverlässig festhalten."
          />
        </div>
      </DashboardSection>
    </main>
  );
}

/* Archive score: mean of the per-item completeness values the backend
   already maintains. Rendered as a radial ring with the calculation
   explained in plain language next to it — never a naked number. */
function ArchiveScoreCard({ items, itemsWithMissingFields }: { items: Item[]; itemsWithMissingFields: number }) {
  const score = Math.round(items.reduce((sum, item) => sum + (item.completenessScore ?? 0), 0) / items.length);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const summary = itemsWithMissingFields
    ? `Dein Archiv ist im Schnitt zu ${score} % vollständig. ${itemsWithMissingFields === 1 ? "Ein Produkt braucht" : `${itemsWithMissingFields} Produkte brauchen`} noch wichtige Angaben.`
    : `Dein Archiv ist zu ${score} % vollständig. Alle Produktakten sind auf dem aktuellen Stand.`;

  return (
    <article className="mem-score-card">
      <svg
        className="mem-score-ring"
        viewBox="0 0 104 104"
        role="img"
        aria-label={`Archiv zu ${score} Prozent vollständig`}
      >
        <circle className="mem-score-track" cx="52" cy="52" r={radius} />
        <circle
          className="mem-score-value"
          cx="52"
          cy="52"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
        <text className="mem-score-number" x="52" y="49">{score} %</text>
        <text className="mem-score-caption" x="52" y="66">vollständig</text>
      </svg>
      <div className="mem-score-copy">
        <span className="mem-score-label">Archiv-Vollständigkeit</span>
        <p>{summary}</p>
        <small>Berechnet aus der Vollständigkeit aller {items.length === 1 ? "gespeicherten Produktakte" : `${items.length} gespeicherten Produktakten`}.</small>
        {itemsWithMissingFields ? (
          <Link className="mem-inline-link" to="/app/dinge">
            Angaben ergänzen <ChevronRight size={15} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function DashboardSection({
  className = "",
  eyebrow,
  title,
  subtitle,
  link,
  children
}: {
  className?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  link?: { to: string; label: string };
  children: ReactNode;
}) {
  const id = `mem-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  /* One eyebrow per page is enough (page kicker) — section heads carry
     title + a short subtitle only. */
  void eyebrow;
  return (
    <section className={`mem-dashboard-section ${className}`.trim()} aria-labelledby={id}>
      <div className="mem-section-head">
        <div>
          <h2 id={id}>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {link ? (
          <Link to={link.to}>{link.label}<ChevronRight size={15} aria-hidden="true" /></Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function NextTask({ task }: { task: DashboardTask }) {
  return (
    <Link className={`mem-task-row is-${task.tone}`} to={task.to}>
      <span className="mem-task-icon" aria-hidden="true">{task.icon}</span>
      <span className="mem-task-copy">
        <small>{task.product}</small>
        <strong>{task.task}</strong>
        <span>{task.benefit}</span>
      </span>
      <span className="mem-task-action">{task.action}<ChevronRight size={15} aria-hidden="true" /></span>
    </Link>
  );
}

function QuickAction({ to, icon, title, body }: { to: string; icon: ReactNode; title: string; body: string }) {
  return (
    <Link className="mem-quick-card" to={to}>
      <span className="mem-quick-icon" aria-hidden="true">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </Link>
  );
}

function MemoryDashboardSkeleton() {
  return (
    <main className="av-console mem-home mem-dashboard mem-dashboard-skeleton" aria-busy="true" aria-label="Deine Übersicht wird geladen">
      <div className="mem-skeleton-line is-kicker" />
      <div className="mem-skeleton-line is-title" />
      <div className="mem-skeleton-line is-subtitle" />
      <div className="mem-summary">
        {Array.from({ length: 4 }).map((_, index) => <div className="mem-summary-card mem-skeleton-card" key={index} />)}
      </div>
      <div className="mem-dashboard-section mem-skeleton-section" />
    </main>
  );
}

function MemoryLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="av-console mem-home mem-dashboard">
      <section className="mem-dashboard-section mem-dashboard-error" role="alert">
        <span className="mem-empty-icon" aria-hidden="true"><CircleAlert size={28} /></span>
        <h1>Deine Übersicht konnte nicht geladen werden</h1>
        <p>Die Verbindung ist gerade nicht erreichbar. Deine Daten wurden nicht verändert.</p>
        <button className="av-btn av-btn-secondary" onClick={onRetry} type="button">Erneut versuchen</button>
      </section>
    </main>
  );
}

/* Honest dashboard derivations from the already loaded, user-owned records. */

function getFirstName(name?: string | null) {
  const normalized = name?.trim();
  return normalized ? normalized.split(/\s+/)[0] : null;
}

function buildNextTasks(items: Item[], expiring: Item[]): DashboardTask[] {
  const tasks: DashboardTask[] = [];
  const usedItems = new Set<string>();

  for (const item of expiring) {
    const days = warrantyDaysLeft(item) ?? 0;
    tasks.push({
      key: `warranty-${item.id}`,
      to: `/app/dinge/${item.id}`,
      icon: <CalendarClock size={20} />,
      product: item.name,
      task: `Garantie läuft in ${days} ${days === 1 ? "Tag" : "Tagen"} ab`,
      benefit: "Prüfe Beleg und Garantiebedingungen, solange noch Zeit zum Handeln ist.",
      action: "Garantie prüfen",
      tone: "amber"
    });
    usedItems.add(item.id);
    if (tasks.length === 3) return tasks;
  }

  const incomplete = items
    .filter((item) => (item.missingFields?.length ?? 0) > 0 && !usedItems.has(item.id))
    .sort((a, b) => missingPriority(a) - missingPriority(b));

  /* Same open field across several products becomes ONE row ("3 Produkte"),
     not three visually identical rows. */
  const byField = new Map<string, Item[]>();
  for (const item of incomplete) {
    const field = prioritizedMissingField(item);
    byField.set(field, [...(byField.get(field) ?? []), item]);
  }

  for (const [field, fieldItems] of byField) {
    const single = fieldItems.length === 1 ? fieldItems[0] : null;
    tasks.push({
      key: `missing-${field}`,
      to: single
        ? (field === "receipt" ? `/app/capture/receipt?itemId=${encodeURIComponent(single.id)}` : `/app/dinge/${single.id}`)
        : "/app/dinge",
      icon: field === "receipt" ? <Receipt size={20} /> : <ListChecks size={20} />,
      product: single ? single.name : productListLabel(fieldItems),
      task: single
        ? `${missingFieldLabel(field)} ergänzen`
        : `${missingFieldLabel(field)} für ${fieldItems.length} Produkte ergänzen`,
      benefit: missingFieldBenefit(field),
      action: field === "receipt" ? (single ? "Beleg hochladen" : "Produkte öffnen") : (single ? "Angabe ergänzen" : "Produkte öffnen"),
      tone: "neutral"
    });
    if (tasks.length === 3) break;
  }

  return tasks;
}

function productListLabel(items: Item[]) {
  const names = items.map((item) => item.name);
  if (names.length <= 2) return names.join(" und ");
  return `${names.slice(0, 2).join(", ")} und ${names.length - 2} ${names.length - 2 === 1 ? "weiteres Produkt" : "weitere Produkte"}`;
}

const missingFieldOrder = [
  "receipt",
  "warranty date",
  "serial number",
  "model data",
  "purchase data",
  "manual",
  "support contact",
  "driver/software"
];

function prioritizedMissingField(item: Item) {
  const fields = item.missingFields ?? [];
  return missingFieldOrder.find((field) => fields.includes(field)) ?? fields[0] ?? "model data";
}

function missingPriority(item: Item) {
  const index = missingFieldOrder.indexOf(prioritizedMissingField(item));
  return index < 0 ? missingFieldOrder.length : index;
}

function missingFieldBenefit(field: string) {
  const benefits: Record<string, string> = {
    receipt: "Mit dem Beleg bleiben Kaufdatum und Nachweis direkt am Produkt griffbereit.",
    "warranty date": "So kann Avareno dich rechtzeitig an das Garantieende erinnern.",
    "serial number": "Die Seriennummer hilft bei Support, Reparatur oder Rückruf.",
    "model data": "Genaue Modelldaten erleichtern die Suche nach passendem Support.",
    "purchase data": "Kaufdaten machen Garantie und spätere Rückfragen nachvollziehbar.",
    manual: "Dann ist die passende Anleitung direkt in der Produktakte verfügbar.",
    "support contact": "Ein hinterlegter Kontakt spart Zeit, wenn du Hilfe brauchst.",
    "driver/software": "Passende Software bleibt zusammen mit dem Gerät verfügbar."
  };
  return benefits[field] ?? "Die Angabe macht deine Produktakte später schneller nutzbar.";
}

function collectRecentDocuments(items: Item[]): RecentDocument[] {
  return items
    .flatMap((item) => (item.documents ?? []).map((document) => ({ document, itemId: item.id, itemName: item.name })))
    .sort((a, b) => documentTime(b.document) - documentTime(a.document))
    .slice(0, 4);
}

function documentTime(document: MemoryDocument) {
  const value = document.updatedAt ?? document.createdAt;
  const time = value ? new Date(value).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function documentSize(document: MemoryDocument) {
  return (document as MemoryDocument & { fileSize?: number | null }).fileSize ?? null;
}

/* Null when the size is unknown — the row then simply omits it instead of
   repeating "Größe unbekannt" under every document. */
function formatFileSize(bytes: number | null): string | null {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 1) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function formatDocumentDate(document: MemoryDocument) {
  return formatDate(document.updatedAt ?? document.createdAt);
}

const documentTypeLabels: Record<string, string> = {
  RECEIPT: "Beleg",
  WARRANTY: "Garantie",
  MANUAL: "Anleitung",
  DRIVER: "Treiber",
  SOFTWARE: "Software",
  OTHER: "Dokument"
};

function documentTypeLabel(type: string) {
  return documentTypeLabels[type.toUpperCase()] ?? "Dokument";
}

function documentTypeIcon(type: string) {
  switch (type.toUpperCase()) {
    case "RECEIPT": return <Receipt size={19} />;
    case "WARRANTY": return <ShieldCheck size={19} />;
    case "MANUAL": return <BookOpen size={19} />;
    default: return <FileText size={19} />;
  }
}

/* Semantic document identity (Manifest §7.3): Rechnung amber, Garantie grün,
   Anleitung blau, Sonstiges graphit. */
function documentTone(type: string) {
  const upper = type.toUpperCase();
  if (upper === "RECEIPT") return "amber";
  if (upper === "WARRANTY") return "green";
  if (upper === "MANUAL") return "blue";
  return "neutral";
}
