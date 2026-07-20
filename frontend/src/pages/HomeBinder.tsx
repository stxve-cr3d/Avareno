import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Archive, BookOpen, ChevronRight, FileCheck2, FileText, Home, Package, Plus, ReceiptText, ScanLine, Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { api, isoDate } from "../lib/api";
import type { Document as MemoryDocument, HomeBinderReport } from "../lib/types";
import { ActionButton, ObjectMemoryGraph, SecondaryAction } from "../components/app/AppKit";

/* Flat archive entry: a document plus the object it belongs to. */
type ArchiveEntry = {
  document: MemoryDocument;
  itemId: string;
  itemName: string;
};

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
    case "RECEIPT": return <ReceiptText size={17} />;
    case "WARRANTY": return <ShieldCheck size={17} />;
    case "MANUAL": return <BookOpen size={17} />;
    default: return <FileText size={17} />;
  }
}

/* Receipt context from already-extracted data. Never invents values. */
function receiptSummary(document: MemoryDocument): string | null {
  if (!document.extractedJson) return null;
  try {
    const data = JSON.parse(document.extractedJson) as { merchant?: string; price?: number; currency?: string };
    const parts = [data.merchant, typeof data.price === "number" ? `${data.price} ${data.currency ?? "EUR"}` : null].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
  } catch {
    return null;
  }
}

export function HomeBinder() {
  const [report, setReport] = useState<HomeBinderReport | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  useEffect(() => {
    api<HomeBinderReport>("/api/reports/home-binder").then(setReport).catch(console.error);
  }, []);


  const archive = useMemo<ArchiveEntry[]>(() => {
    if (!report) return [];
    return report.items.flatMap((item) =>
      (item.documents ?? []).map((document) => ({ document, itemId: item.id, itemName: item.name }))
    );
  }, [report]);

  const filteredArchive = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de");
    return archive.filter(({ document, itemName }) => {
      if (typeFilter !== "ALL") {
        const type = document.type.toUpperCase();
        if (typeFilter === "OTHER") {
          if (["RECEIPT", "WARRANTY", "MANUAL"].includes(type)) return false;
        } else if (type !== typeFilter) {
          return false;
        }
      }
      if (!normalizedQuery) return true;
      return [document.fileName, documentTypeLabel(document.type), itemName]
        .some((value) => value.toLocaleLowerCase("de").includes(normalizedQuery));
    });
  }, [archive, query, typeFilter]);

  if (!report) return <div className="documents-loading">Dokumente werden geladen...</div>;

  if (report.items.length === 0) {
    return <DocumentsEmpty />;
  }

  const productsWithReceipt = report.items.filter((entry) =>
    (entry.documents ?? []).some((document) => document.type.toUpperCase() === "RECEIPT")
  ).length;
  const monthGroups = groupByMonth(filteredArchive);

  return (
    <main className="documents-page is-canvas">
      <header className="documents-header">
        <div>
          <h1>Dokumente</h1>
          <p>Belege, Garantien und Anleitungen — verbunden mit den Produkten, zu denen sie gehören.</p>
        </div>
        <Link className="av-btn av-btn-primary" to="/app/capture/receipt">
          <Plus size={18} aria-hidden="true" />
          Beleg hochladen
        </Link>
      </header>

      <div className="documents-toolbar">
        <label className="documents-search">
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Dokumente durchsuchen</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Datei, Dokumenttyp oder Produkt suchen"
          />
        </label>
        <div className="documents-type-filter" role="group" aria-label="Nach Dokumenttyp filtern">
          {[
            { id: "ALL", label: "Alle" },
            { id: "RECEIPT", label: "Belege" },
            { id: "WARRANTY", label: "Garantien" },
            { id: "MANUAL", label: "Anleitungen" },
            { id: "OTHER", label: "Sonstiges" }
          ].map((entry) => (
            <button
              aria-pressed={typeFilter === entry.id}
              className={`documents-type-chip${typeFilter === entry.id ? " is-active" : ""}`}
              key={entry.id}
              onClick={() => setTypeFilter(entry.id)}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {productsWithReceipt < report.items.length ? (
        <p className="documents-completeness">
          <ShieldCheck size={15} aria-hidden="true" />
          {productsWithReceipt} von {report.items.length} Produkten {productsWithReceipt === 1 ? "besitzt" : "besitzen"} einen Beleg.
          <Link to="/app/capture/receipt">Beleg nachtragen</Link>
        </p>
      ) : null}

      {archive.length === 0 ? (
        <div className="av-empty">
          <p className="av-empty-title">Noch keine Dokumente gespeichert.</p>
          <div className="av-empty-body">Belege, Garantien und Anleitungen, die du hochlädst oder erfasst, erscheinen hier — verbunden mit dem Produkt, zu dem sie gehören.</div>
        </div>
      ) : monthGroups.length === 0 ? (
        <div className="av-empty">
          <p className="av-empty-title">Keine passenden Dokumente.</p>
          <div className="av-empty-body">Prüfe den Suchbegriff oder den Typfilter.</div>
        </div>
      ) : (
        <div className="documents-archive">
          {monthGroups.map((group) => (
            <section className="documents-month" key={group.key} aria-label={group.label}>
              <h2>{group.label}</h2>
              <ul>
                {group.entries.map(({ document, itemId, itemName }) => {
                  const summary = receiptSummary(document);
                  return (
                    <li key={document.id}>
                      <Link className="documents-row" to={`/app/dinge/${itemId}`}>
                        <span className={`documents-row-type is-${documentTone(document.type)}`} aria-hidden="true">
                          {documentTypeIcon(document.type)}
                        </span>
                        <span className="documents-row-copy">
                          <strong>{document.fileName}</strong>
                          <small>
                            {documentTypeLabel(document.type)} · {itemName}
                            {summary ? ` · ${summary}` : ""}
                          </small>
                        </span>
                        <span className="documents-row-facts">
                          {displayDate(document.createdAt)}
                          {displayDocumentFileSize(document) ? ` · ${displayDocumentFileSize(document)}` : ""}
                        </span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

/* Month buckets, newest first — the archive reads as a timeline. */
function groupByMonth(entries: ArchiveEntry[]) {
  const formatter = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });
  const groups = new Map<string, { key: string; label: string; entries: ArchiveEntry[]; time: number }>();
  for (const entry of entries) {
    const raw = entry.document.createdAt;
    const date = raw ? new Date(raw) : null;
    const valid = date && !Number.isNaN(date.getTime());
    const key = valid ? `${date.getFullYear()}-${date.getMonth()}` : "unknown";
    const label = valid ? formatter.format(date) : "Ohne Datum";
    const bucket = groups.get(key) ?? { key, label, entries: [], time: valid ? new Date(date.getFullYear(), date.getMonth(), 1).getTime() : 0 };
    bucket.entries.push(entry);
    groups.set(key, bucket);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      entries: [...group.entries].sort((a, b) => (b.document.createdAt ?? "").localeCompare(a.document.createdAt ?? ""))
    }))
    .sort((a, b) => b.time - a.time);
}

function documentTone(type: string) {
  const upper = type.toUpperCase();
  if (upper === "RECEIPT") return "amber";
  if (upper === "WARRANTY") return "green";
  if (upper === "MANUAL") return "blue";
  return "neutral";
}

function DocumentsEmpty() {
  return (
    <main className="documents-page">
      <section className="documents-hero">
        <div>
          <span>Dokumente & Belege</span>
          <h1>Dokumente</h1>
          <p>Belege, Garantien und wichtige Nachweise bleiben bei den Produkten, zu denen sie gehören.</p>
        </div>
      </section>

      <section className="documents-panel">
        <div className="av-empty-rich">
          <div className="av-empty-visual">
            <ObjectMemoryGraph
              title="Kaffeemaschine"
              category="Beispiel · Dokumente eines Produkts"
              icon={<Package size={14} />}
              edges={[
                { tone: "green", label: "Rechnung gespeichert" },
                { tone: "amber", label: "Garantie hinterlegt" },
                { tone: "neutral", label: "Anleitung verbunden" }
              ]}
            />
          </div>
          <div className="av-empty-copy">
            <h3>Noch keine Dokumente gespeichert.</h3>
            <p>Lade eine Rechnung, Garantie oder Anleitung zu einem Produkt hoch — sie bleibt bei dem Produkt, zu dem sie gehört.</p>
            <div className="av-empty-actions">
              <ActionButton to="/app/capture/item" icon={<Plus size={15} />}>Erstes Produkt hinzufügen</ActionButton>
              <SecondaryAction to="/app/capture/receipt" icon={<ScanLine size={15} />}>Beleg hochladen</SecondaryAction>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


function displayDate(value?: string | null) {
  return isoDate(value);
}

/* Null when unknown — the row omits the size instead of repeating
   "Größe unbekannt" under every document. */
function displayFileSize(value?: number | null): string | null {
  if (!value || value < 1) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
}

function displayDocumentFileSize(document: MemoryDocument) {
  const value = (document as MemoryDocument & { fileSize?: number | null }).fileSize;
  return displayFileSize(value);
}
