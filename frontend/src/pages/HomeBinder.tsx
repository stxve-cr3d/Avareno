import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Archive, BookOpen, ChevronRight, FileCheck2, FileText, Home, Package, Plus, ReceiptText, ScanLine, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { api, isoDate } from "../lib/api";
import type { Document as MemoryDocument, HomeBinderReport } from "../lib/types";
import { ProgressBar } from "../components/ProgressBar";
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

  useEffect(() => {
    api<HomeBinderReport>("/api/reports/home-binder").then(setReport).catch(console.error);
  }, []);

  const missingItems = useMemo(
    () => report?.items.filter((item) => !item.binderStatus.insuranceReady) ?? [],
    [report]
  );
  const focusItem = missingItems[0] ?? report?.items[0];

  const archive = useMemo<ArchiveEntry[]>(() => {
    if (!report) return [];
    return report.items.flatMap((item) =>
      (item.documents ?? []).map((document) => ({ document, itemId: item.id, itemName: item.name }))
    );
  }, [report]);

  if (!report) return <div className="documents-loading">Dokumente werden geladen...</div>;

  if (report.items.length === 0) {
    return <DocumentsEmpty />;
  }

  return (
    <main className="documents-page">
      <section className="documents-hero">
        <div>
          <span>Hausakte</span>
          <h1>Dokumente</h1>
          <p>Belege, Garantien und wichtige Nachweise bleiben bei den Objekten, zu denen sie gehören.</p>
        </div>
      </section>

      <section className="documents-focus">
        <div>
          <span>Heute sinnvoll</span>
          <h2>{report.summary.readiness}% vollständig</h2>
          <p>
            {missingItems.length > 0
              ? `${missingItems.length} Objekte brauchen noch einen Beleg, eine Garantie oder einen Standort.`
              : "Alle wichtigen Objekte haben aktuell genug Kontext für Garantie, Versicherung und Support."}
          </p>
          <ProgressBar value={report.summary.readiness} />
        </div>
        <Link className="documents-primary-action" to={focusItem ? `/app/dinge/${focusItem.id}` : "/app/dinge"}>
          Fehlende Punkte prüfen
          <ChevronRight size={16} />
        </Link>
      </section>

      <section className="documents-stats" aria-label="Dokumente Überblick">
        <DocumentStat icon={<FileText size={18} />} label="Dokumente" value={String(archive.length)} />
        <DocumentStat icon={<Archive size={18} />} label="Objekte" value={String(report.summary.itemCount)} />
        <DocumentStat icon={<ShieldCheck size={18} />} label="Geschützt" value={String(report.summary.protectedCount)} />
        <DocumentStat icon={<FileCheck2 size={18} />} label="Offen" value={String(report.summary.missingDataPoints)} />
      </section>

      <section className="documents-panel">
        <div className="documents-panel-head">
          <div>
            <span>Archiv</span>
            <h2>Gespeicherte Dokumente</h2>
          </div>
          <Link to="/app/capture/receipt">Beleg hochladen</Link>
        </div>
        {archive.length ? (
          <div className="documents-item-list">
            {archive.map(({ document, itemId, itemName }) => {
              const summary = receiptSummary(document);
              return (
                <Link className="documents-item-row" key={document.id} to={`/app/dinge/${itemId}`}>
                  <span className="documents-row-icon">{documentTypeIcon(document.type)}</span>
                  <span className="documents-row-copy">
                    <strong>{document.fileName}</strong>
                    <small>
                      {documentTypeLabel(document.type)} · gehört zu {itemName}
                      {summary ? ` · ${summary}` : ""}
                    </small>
                    {!document.extractedJson && document.type.toUpperCase() === "RECEIPT" ? (
                      <span className="documents-row-signals">
                        <em>Daten noch nicht ausgelesen</em>
                      </span>
                    ) : null}
                  </span>
                  <span className="documents-pill is-ready">Verknüpft</span>
                  <ChevronRight size={16} />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="av-empty">
            <p className="av-empty-title">Noch keine Dokumente gespeichert.</p>
            <div className="av-empty-body">Belege, Garantien und Anleitungen, die du hochlädst oder erfasst, erscheinen hier — verbunden mit dem Objekt, zu dem sie gehören.</div>
          </div>
        )}
      </section>

      <section className="documents-grid">
        <article className="documents-panel documents-main-list">
          <div className="documents-panel-head">
            <div>
              <span>Produktakten</span>
              <h2>Wichtige Objekte</h2>
            </div>
            <Link to="/app/dinge">Alle anzeigen</Link>
          </div>
          <div className="documents-item-list">
            {report.items.slice(0, 6).map((item) => (
              <Link className="documents-item-row" key={item.id} to={`/app/dinge/${item.id}`}>
                <span className="documents-row-icon">
                  <Package size={17} />
                </span>
                <span className="documents-row-copy">
                  <strong>{item.name}</strong>
                  <small>
                    {item.space?.name ?? item.location ?? "Kein Raum"} / {displayDate(item.warrantyUntil)}
                  </small>
                  <span className="documents-row-signals">
                    <em className={item.binderStatus.hasProof ? "is-ready" : ""}>
                      <ReceiptText size={12} /> {item.binderStatus.hasProof ? `${item.documents?.length ?? 0} Dokumente` : "Beleg fehlt"}
                    </em>
                    <em className={item.binderStatus.warrantySoon ? "is-warn" : item.binderStatus.warrantyActive ? "is-ready" : ""}>
                      <ShieldCheck size={12} /> {item.binderStatus.warrantySoon ? "Garantie bald" : item.binderStatus.warrantyActive ? "Garantie aktiv" : "Garantie offen"}
                    </em>
                    {item.missingFields?.length ? <em>{item.missingFields.length} fehlende Daten</em> : null}
                  </span>
                </span>
                <span className={item.binderStatus.insuranceReady ? "documents-pill is-ready" : "documents-pill"}>
                  {item.binderStatus.insuranceReady ? "Bereit" : "Fehlt"}
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        </article>

        <article className="documents-panel documents-space-panel">
          <div className="documents-panel-head">
            <div>
              <span>Räume</span>
              <h2>Wo es liegt</h2>
            </div>
            <Home size={18} />
          </div>
          <div className="documents-space-list">
            {report.spaces.slice(0, 5).map((space) => (
              <div className="documents-space-row" key={space.name}>
                <div>
                  <strong>{space.name}</strong>
                  <small>{space.itemCount} Objekte</small>
                </div>
                <span>{Math.round(space.value)} EUR</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function DocumentsEmpty() {
  return (
    <main className="documents-page">
      <section className="documents-hero">
        <div>
          <span>Hausakte</span>
          <h1>Dokumente</h1>
          <p>Belege, Garantien und wichtige Nachweise bleiben bei den Objekten, zu denen sie gehören.</p>
        </div>
      </section>

      <section className="documents-panel">
        <div className="av-empty-rich">
          <div className="av-empty-visual">
            <ObjectMemoryGraph
              title="LG OLED C3"
              category="Beispiel · Hausakte eines Objekts"
              icon={<Package size={14} />}
              edges={[
                { tone: "green", label: "Rechnung gespeichert" },
                { tone: "amber", label: "Garantie bis 2027" },
                { tone: "neutral", label: "Anleitung verbunden" }
              ]}
            />
          </div>
          <div className="av-empty-copy">
            <h3>Noch keine Dokumente abgelegt</h3>
            <p>Lade Belege, Garantien, Anleitungen oder wichtige PDFs hoch. Du kannst sie mit Produkten verbinden — sie bleiben bei dem Objekt, zu dem sie gehören.</p>
            <div className="av-empty-actions">
              <ActionButton to="/app/capture/item" icon={<Plus size={15} />}>Erstes Objekt erfassen</ActionButton>
              <SecondaryAction to="/app/capture/receipt" icon={<ScanLine size={15} />}>Beleg hochladen</SecondaryAction>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function DocumentStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="documents-stat">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function displayDate(value?: string | null) {
  return isoDate(value);
}
