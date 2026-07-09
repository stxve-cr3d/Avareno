import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  House,
  Monitor,
  Package,
  Plus,
  ScanLine,
  Search,
  Volume2,
  Wrench
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, isoDate } from "../lib/api";
import type { Item, ProductStructure } from "../lib/types";
import {
  ActionButton,
  ConsoleSkeleton,
  ObjectMemoryCard,
  QuickActionCard,
  SecondaryAction,
  StatusSummaryCard
} from "../components/app/AppKit";

type StatusFilter = "ALL" | "MISSING_RECEIPT" | "WARRANTY_SOON" | "OPEN" | "COMPLETE";

const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "Alle" },
  { id: "MISSING_RECEIPT", label: "Beleg fehlt" },
  { id: "WARRANTY_SOON", label: "Garantie läuft bald ab" },
  { id: "OPEN", label: "Offen" },
  { id: "COMPLETE", label: "Vollständig" }
];

const categories = ["TV / Media", "Audio", "Werkstatt", "Haushalt", "Sonstiges"] as const;
type Category = (typeof categories)[number];

export function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [, setStructure] = useState<ProductStructure | null>(null);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [category, setCategory] = useState<"ALL" | Category>("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [itemsResult, structureResult] = await Promise.all([api<Item[]>("/api/items"), api<ProductStructure>("/api/structure")]);
    setItems(itemsResult);
    setStructure(structureResult);
  }

  useEffect(() => {
    void load().catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "ALL" && categoryBucket(item) !== category) return false;
      if (status === "MISSING_RECEIPT" && hasReceipt(item)) return false;
      if (status === "WARRANTY_SOON" && !warrantySoon(item)) return false;
      if (status === "OPEN" && openPointsOf(item) === 0) return false;
      if (status === "COMPLETE" && (item.completenessScore ?? 0) < 100) return false;
      if (q) {
        const haystack = [item.name, item.model, item.manufacturer, item.category, item.merchant, item.itemType].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [category, items, query, status]);

  const documentCount = items.reduce((sum, item) => sum + (item.documents?.length ?? 0), 0);
  const openTotal = items.reduce((sum, item) => sum + openPointsOf(item), 0);
  const warrantyRiskCount = items.filter(warrantySoon).length;
  const hasItems = items.length > 0;

  if (loading) {
    return <ConsoleSkeleton label="Objekte werden geladen…" />;
  }

  return (
    <main className="av-console av-library">
      <section className="av-console-top">
        <div className="av-dashboard-header">
          <span className="av-console-kicker">Objektbibliothek</span>
          <div className="av-dashboard-title-row">
            <div>
              <h1>Objekte</h1>
              <p>Alle gespeicherten Objekte, Belege, Garantien und offenen Punkte.</p>
            </div>
            <Link className="av-console-primary" to="/app/capture/item">
              Objekt erfassen <Plus size={14} />
            </Link>
          </div>
          <div className="av-status-grid av-status-grid-4" aria-label="Objekt-Statusübersicht">
            <StatusSummaryCard label="Objekte" value={items.length} />
            <StatusSummaryCard label="Dokumente" value={documentCount} />
            <StatusSummaryCard label="Offen" value={openTotal} tone={openTotal > 0 ? "warning" : "neutral"} />
            <StatusSummaryCard label="Garantie-Risiken" value={warrantyRiskCount} tone={warrantyRiskCount > 0 ? "warning" : "neutral"} />
          </div>
        </div>
      </section>

      <div className="av-console-grid">
        <div className="av-console-main">
          <article className="av-console-section av-library-tools">
            <div className="av-console-section-head">
              <div>
                <span>Filter</span>
                <h2>Objekte eingrenzen</h2>
              </div>
              <Link to="/app/capture/receipt">Rechnung scannen</Link>
            </div>

            <div className="av-search">
              <Search size={15} />
              <input
                type="search"
                placeholder="Objekt, Modell, Beleg oder Kategorie suchen"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="av-filters">
              <FilterRow label="Status">
                {statusFilters.map((filter) => (
                  <FilterChip key={filter.id} active={status === filter.id} onClick={() => setStatus(filter.id)}>
                    {filter.label}
                  </FilterChip>
                ))}
              </FilterRow>
              <FilterRow label="Kategorie">
                <FilterChip active={category === "ALL"} onClick={() => setCategory("ALL")}>Alle</FilterChip>
                {categories.map((cat) => (
                  <FilterChip key={cat} active={category === cat} onClick={() => setCategory(cat)}>
                    {cat}
                  </FilterChip>
                ))}
              </FilterRow>
            </div>
          </article>

          <article className="av-console-section">
            <div className="av-console-section-head">
              <div>
                <span>Objektgedächtnis</span>
                <h2>{filtered.length === 1 ? "1 gespeichertes Objekt" : `${filtered.length} gespeicherte Objekte`}</h2>
              </div>
            </div>

            {filtered.length ? (
              <div className="av-things-grid">
                {filtered.map((item) => (
                  <ObjectMemoryCard
                    key={item.id}
                    to={`/app/dinge/${item.id}`}
                    category={categoryBucket(item)}
                    name={item.name}
                    icon={categoryIcon(categoryBucket(item))}
                    completeness={item.completenessScore ?? 0}
                    invoicePresent={hasReceipt(item)}
                    warranty={warrantyShort(item)}
                    openPoints={openPointsOf(item)}
                  />
                ))}
              </div>
            ) : hasItems ? (
              <FilteredEmpty onReset={() => { setStatus("ALL"); setCategory("ALL"); setQuery(""); }} />
            ) : (
              <LibraryEmpty />
            )}
          </article>
        </div>

        <aside className="av-console-side">
          <QuickActionCard
            primary
            to="/app/capture/item"
            icon={<Package size={16} />}
            title="Objekt erfassen"
            body="Produkt, Beleg, Garantie und offene Punkte strukturiert starten."
          />
          <QuickActionCard
            to="/app/capture/receipt"
            icon={<ScanLine size={16} />}
            title="Beleg nachtragen"
            body="Rechnung oder Nachweis mit einem bestehenden Objekt verbinden."
          />
        </aside>
      </div>
    </main>
  );
}

/* ── Empty states ───────────────────────────────────────────── */

function LibraryEmpty() {
  return (
    <div className="av-empty-rich av-empty-start">
      <div className="av-empty-copy">
        <h3>Noch keine Objekte gespeichert</h3>
        <p>Füge dein erstes echtes Objekt hinzu. Danach bleiben Belege, Garantie, Dokumente, Smart-Home-Verknüpfungen und offene Punkte damit verbunden.</p>
        <div className="av-empty-actions">
          <ActionButton to="/app/capture/item" icon={<Plus size={15} />}>Objekt erfassen</ActionButton>
          <SecondaryAction to="/app/capture/receipt" icon={<ScanLine size={15} />}>Rechnung scannen</SecondaryAction>
        </div>
      </div>
    </div>
  );
}

function FilteredEmpty({ onReset }: { onReset: () => void }) {
  return (
    <div className="av-empty">
      <p className="av-empty-title">Keine Treffer</p>
      <div className="av-empty-body">Ändere Suche oder Filter, um andere Objekte zu sehen.</div>
      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
        <SecondaryAction onClick={onReset}>Filter zurücksetzen</SecondaryAction>
      </div>
    </div>
  );
}

/* ── Object-memory derivations ──────────────────────────────── */

function hasReceipt(item: Item): boolean {
  const docs = item.documents ?? [];
  if (docs.some((doc) => (doc.type ?? "").toUpperCase() === "RECEIPT")) return true;
  return docs.length > 0;
}

function openPointsOf(item: Item): number {
  return (
    (item.missingFields?.length ?? 0) +
    (item.loops?.filter((loop) => loop.status === "OPEN").length ?? 0) +
    (item.repairLogs?.filter((repair) => repair.status !== "RESOLVED").length ?? 0)
  );
}

function warrantyDays(item: Item): number | null {
  if (!item.warrantyUntil) return null;
  return Math.ceil((new Date(item.warrantyUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function warrantySoon(item: Item): boolean {
  const days = warrantyDays(item);
  return days !== null && days >= 0 && days < 60;
}

function warrantyShort(item: Item): { text: string; urgent?: boolean } {
  const days = warrantyDays(item);
  if (days === null) return { text: "Unbekannt" };
  if (days < 0) return { text: "Abgelaufen", urgent: true };
  if (days < 60) return { text: `${days} Tage`, urgent: true };
  return { text: `bis ${isoDate(item.warrantyUntil)}` };
}

function categoryBucket(item: Item): Category {
  const s = `${item.category ?? ""} ${item.itemType ?? ""} ${item.name ?? ""}`.toLowerCase();
  if (/tv|fernseh|oled|media|monitor|display|beamer/.test(s)) return "TV / Media";
  if (/audio|sound|kopfhörer|kopfhoerer|headphone|speaker|lautsprecher|hifi/.test(s)) return "Audio";
  if (/haushalt|kitchen|küche|kueche|wasch|appliance|staubsauger|haus/.test(s)) return "Haushalt";
  if (/werkstatt|tool|werkzeug|repair|printer|drucker|maschine|bike|fahrrad|garten/.test(s)) return "Werkstatt";
  return "Sonstiges";
}

function categoryIcon(category: Category): ReactNode {
  switch (category) {
    case "TV / Media": return <Monitor size={14} />;
    case "Audio": return <Volume2 size={14} />;
    case "Werkstatt": return <Wrench size={14} />;
    case "Haushalt": return <House size={14} />;
    default: return <Package size={14} />;
  }
}

/* ── Small building blocks ──────────────────────────────────── */

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="av-filter-row">
      <span className="av-filter-label">{label}</span>
      <div className="av-filter-chips no-scrollbar">{children}</div>
    </div>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button className={`av-filter-chip${active ? " is-active" : ""}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}
