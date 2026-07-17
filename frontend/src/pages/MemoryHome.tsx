import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellRing,
  BookOpen,
  ChevronRight,
  FileText,
  Package,
  Plus,
  ReceiptText,
  ScanLine,
  ShieldCheck
} from "lucide-react";
import { api, isoDate } from "../lib/api";
import type { Document as MemoryDocument, Item } from "../lib/types";
import { missingFieldLabel } from "../lib/uiText";
import {
  ActionButton,
  AttentionRow,
  ConsoleSkeleton,
  ObjectMemoryCard,
  QuickActionCard,
  SecondaryAction,
  StatusSummaryCard
} from "../components/app/AppKit";

type LoadStatus = "loading" | "ready" | "error";

export function MemoryHome() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");

  async function load() {
    setStatus("loading");
    try {
      const all = await api<Item[]>("/api/items");
      setItems(all);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (status === "loading") {
    return <ConsoleSkeleton />;
  }

  if (status === "error") {
    return <MemoryLoadError onRetry={load} />;
  }

  const hasItems = items.length > 0;
  const recents = items.slice(0, 3);
  const documentCount = items.reduce((sum, item) => sum + (item.documents?.length ?? 0), 0);
  const expiring = items
    .filter((item) => warrantyStatus(item) === "soon")
    .sort((a, b) => (warrantyDaysLeft(a) ?? 0) - (warrantyDaysLeft(b) ?? 0));
  const incomplete = items.filter((item) => (item.missingFields?.length ?? 0) > 0);
  const recentDocuments = collectRecentDocuments(items);

  return (
    <main className="av-console mem-home">
      <header className="mem-home-head">
        <div className="mem-home-head-copy">
          <span className="av-page-kicker">Übersicht</span>
          <h1 className="av-page-title">Alle wichtigen Informationen zu deinen Produkten an einem Ort.</h1>
          <p className="av-page-sub">
            Speichere Rechnungen, Garantien, Seriennummern und Anleitungen und finde sie jederzeit wieder.
          </p>
        </div>
        <div className="mem-home-head-actions">
          <ActionButton to="/app/capture/item" icon={<Plus size={15} />}>
            Produkt hinzufügen
          </ActionButton>
          {hasItems ? (
            <SecondaryAction to="/app/capture/receipt" icon={<ScanLine size={15} />}>
              Beleg hochladen
            </SecondaryAction>
          ) : null}
        </div>
      </header>

      {!hasItems ? (
        <section className="av-console-section">
          <div className="av-empty">
            <p className="av-empty-title">Noch keine Produkte gespeichert.</p>
            <div className="av-empty-body">
              Füge dein erstes Produkt hinzu und speichere Rechnung, Garantie und Seriennummer an einem Ort.
            </div>
            <div className="av-empty-actions">
              <ActionButton to="/app/capture/item" icon={<Plus size={15} />}>Produkt hinzufügen</ActionButton>
              <SecondaryAction to="/onboarding?resume=1">Geführten Einstieg öffnen</SecondaryAction>
            </div>
          </div>
        </section>
      ) : null}

      {hasItems ? (
        <section className="av-console-section">
          <div className="av-console-section-head">
            <div>
              <span>Auf einen Blick</span>
              <h2>Dein Bestand</h2>
            </div>
          </div>
          <div className="mem-overview-grid">
            <StatusSummaryCard label="Produkte" value={items.length} />
            <StatusSummaryCard label="Dokumente" value={documentCount} tone={documentCount > 0 ? "neutral" : "warning"} />
            <StatusSummaryCard label="Aufmerksamkeit" value={expiring.length + incomplete.length} tone={expiring.length + incomplete.length > 0 ? "warning" : "success"} />
          </div>
        </section>
      ) : null}

      {hasItems ? (
        <section className="av-console-section">
          <div className="av-console-section-head">
            <div>
              <span>Meine Produkte</span>
              <h2>Zuletzt hinzugefügt</h2>
            </div>
            <Link to="/app/dinge">Alle Produkte</Link>
          </div>
          <div className="av-things-grid">
            {recents.map((item) => (
              <ObjectMemoryCard
                key={item.id}
                to={`/app/dinge/${item.id}`}
                category={item.category || itemTypeLabel(item.itemType)}
                name={item.name}
                icon={<Package size={14} />}
                completeness={item.completenessScore ?? 0}
                invoicePresent={hasReceipt(item)}
                warranty={warrantyShort(item)}
                openPoints={item.missingFields?.length ?? 0}
              />
            ))}
          </div>
        </section>
      ) : null}

      {expiring.length ? (
        <section className="av-console-section">
          <div className="av-console-section-head">
            <div>
              <span>Garantie</span>
              <h2>Garantien, die bald enden</h2>
            </div>
            <Link to="/app/care">Alle Erinnerungen</Link>
          </div>
          <div className="av-attention-list">
            {expiring.slice(0, 3).map((item, index) => {
              const days = warrantyDaysLeft(item) ?? 0;
              return (
                <AttentionRow
                  key={item.id}
                  to={`/app/dinge/${item.id}`}
                  tone="warranty"
                  icon={<ShieldCheck size={16} />}
                  label="Garantie endet bald"
                  title={item.name}
                  detail={`Garantie endet in ${days} ${days === 1 ? "Tag" : "Tagen"} (${isoDate(item.warrantyUntil)})`}
                  signal={`${days} Tage`}
                  action="Produkt öffnen"
                  primary={index === 0}
                  progress={item.completenessScore ?? 0}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {incomplete.length ? (
        <section className="av-console-section">
          <div className="av-console-section-head">
            <div>
              <span>Vervollständigen</span>
              <h2>Produkte mit fehlenden Angaben</h2>
            </div>
          </div>
          <div className="av-attention-list">
            {incomplete.slice(0, 3).map((item) => (
              <AttentionRow
                key={item.id}
                to={`/app/dinge/${item.id}`}
                tone="invoice"
                icon={<ReceiptText size={16} />}
                label="Angaben unvollständig"
                title={item.name}
                detail={`Fehlt noch: ${(item.missingFields ?? []).slice(0, 3).map(missingFieldLabel).join(", ")}`}
                signal={`${item.missingFields?.length ?? 0} offen`}
                action="Ergänzen"
              />
            ))}
          </div>
        </section>
      ) : null}

      {hasItems ? (
        <section className="av-console-section">
          <div className="av-console-section-head">
            <div>
              <span>Dokumente</span>
              <h2>Zuletzt gespeichert</h2>
            </div>
            <Link to="/app/reports/home-binder">Alle Dokumente</Link>
          </div>
          {recentDocuments.length ? (
            <div className="documents-item-list">
              {recentDocuments.map(({ document, itemId, itemName }) => (
                <Link className="documents-item-row" key={document.id} to={`/app/dinge/${itemId}`}>
                  <span className="documents-row-icon">{documentTypeIcon(document.type)}</span>
                  <span className="documents-row-copy">
                    <strong>{document.fileName}</strong>
                    <small>
                      {documentTypeLabel(document.type)} · gehört zu {itemName}
                    </small>
                  </span>
                  <ChevronRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="av-empty">
              <p className="av-empty-title">Noch keine Dokumente gespeichert.</p>
              <div className="av-empty-body">Lade eine Rechnung, Garantie oder Anleitung zu einem Produkt hoch.</div>
              <div className="av-empty-actions">
                <SecondaryAction to="/app/capture/receipt">Beleg hochladen</SecondaryAction>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {hasItems ? (
        <section className="av-console-section">
          <div className="av-console-section-head">
            <div>
              <span>Erfassen</span>
              <h2>Schnell erfassen</h2>
            </div>
          </div>
          <div className="av-quick-action-grid">
            <QuickActionCard primary to="/app/capture/item" icon={<Package size={16} />} title="Produkt hinzufügen" body="Produkt oder Gerät mit Beleg und Garantie speichern." />
            <QuickActionCard to="/app/capture/receipt" icon={<ScanLine size={16} />} title="Beleg hochladen" body="Rechnung oder Kassenbeleg speichern und zuordnen." />
            <QuickActionCard to="/app/capture/loop" icon={<BellRing size={16} />} title="Erinnerung anlegen" body="Garantieende, Service oder Frist festhalten." />
          </div>
        </section>
      ) : null}
    </main>
  );
}

function MemoryLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="av-console">
      <section className="av-console-section">
        <div className="av-empty">
          <p className="av-empty-title">Deine Übersicht konnte nicht geladen werden</p>
          <div className="av-empty-body">Die Verbindung ist gerade nicht erreichbar. Deine Daten sind sicher — versuch es gleich noch einmal.</div>
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
            <SecondaryAction onClick={onRetry}>Erneut versuchen</SecondaryAction>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ── honest derivations from stored data only ───────────────── */

type WarrantyStatus = "active" | "soon" | "expired" | "unknown";

function warrantyDaysLeft(item: Item): number | null {
  if (!item.warrantyUntil) return null;
  return Math.ceil((new Date(item.warrantyUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function warrantyStatus(item: Item): WarrantyStatus {
  const days = warrantyDaysLeft(item);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days < 60) return "soon";
  return "active";
}

function hasReceipt(item: Item): boolean {
  const docs = item.documents ?? [];
  return docs.some((doc) => (doc.type ?? "").toUpperCase() === "RECEIPT") || docs.length > 0;
}

function warrantyShort(item: Item): { text: string; urgent?: boolean } {
  const days = warrantyDaysLeft(item);
  if (days === null) return { text: "Unbekannt" };
  if (days < 0) return { text: "Abgelaufen", urgent: true };
  if (days < 60) return { text: `${days} Tage`, urgent: true };
  return { text: "Aktiv" };
}

type RecentDocument = { document: MemoryDocument; itemId: string; itemName: string };

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

function itemTypeLabel(value?: string | null) {
  const labels: Record<string, string> = {
    THING: "Produkt",
    ELECTRONIC: "Elektronik",
    FURNITURE: "Möbel",
    INFRASTRUCTURE: "Haus & Infrastruktur",
    VEHICLE: "Fahrzeug",
    COLLECTIBLE: "Sammlung"
  };
  return value ? labels[value] ?? value : "Produkt";
}
