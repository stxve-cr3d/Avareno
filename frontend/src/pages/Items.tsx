import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  FileText,
  House,
  LayoutGrid,
  Monitor,
  Package,
  Plus,
  Rows3,
  ScanLine,
  Search,
  Share2,
  ShieldCheck,
  Volume2,
  Wrench
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, isoDate } from "../lib/api";
import type { Item, ProductStructure } from "../lib/types";
import { ItemCard } from "../components/ItemCard";
import {
  ActionButton,
  AppPage,
  AppPageHeader,
  AppSection,
  IconTile,
  ObjectMemoryCard,
  ObjectMemoryGraph,
  SecondaryAction
} from "../components/app/AppKit";
import type { GraphEdge, StatusTone } from "../components/app/AppKit";

type StatusFilter = "ALL" | "MISSING_RECEIPT" | "WARRANTY_SOON" | "OPEN" | "COMPLETE";
type ViewMode = "cards" | "list" | "memory";

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
  const [view, setView] = useState<ViewMode>("cards");

  async function load() {
    const [itemsResult, structureResult] = await Promise.all([api<Item[]>("/api/items"), api<ProductStructure>("/api/structure")]);
    setItems(itemsResult);
    setStructure(structureResult);
  }

  useEffect(() => {
    void load().catch(console.error);
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
  const incompleteCount = items.filter((item) => (item.completenessScore ?? 0) < 100).length;
  const attentionItem = items.find((item) => !hasReceipt(item)) ?? items.find((item) => (item.completenessScore ?? 0) < 100) ?? items[0];
  const hasItems = items.length > 0;

  return (
    <AppPage>
      <AppPageHeader
        kicker="Object Memory Library"
        title="Dinge"
        subtitle="Alle gespeicherten Dinge, Belege, Garantien und offenen Punkte."
        actions={
          <>
            <SecondaryAction to="/app/capture/receipt" icon={<ScanLine size={15} />}>Rechnung scannen</SecondaryAction>
            <ActionButton to="/app/capture/item" icon={<Plus size={15} />}>Ding erfassen</ActionButton>
          </>
        }
      />

      {/* Vault / library summary */}
      <div className="av-stat-grid av-stat-grid-4">
        <StatCard icon={<Archive size={16} />} tone="teal" label="Dinge" value={items.length} />
        <StatCard icon={<FileText size={16} />} tone="neutral" label="Dokumente" value={documentCount} />
        <StatCard icon={<AlertCircle size={16} />} tone="teal" label="Offene Punkte" value={openTotal} />
        <StatCard icon={<ShieldCheck size={16} />} tone="amber" label="Unvollständig" value={incompleteCount} />
      </div>

      {/* Next action focus */}
      {hasItems && attentionItem ? (
        <AppSection title="Als Nächstes" slim>
          <Link className="av-focus-row" to={`/app/items/${attentionItem.id}`}>
            <IconTile tone={!hasReceipt(attentionItem) ? "red" : "amber"}>
              <ScanLine size={16} />
            </IconTile>
            <div className="av-focus-copy">
              <strong>{!hasReceipt(attentionItem) ? "Beleg fehlt" : "Produkt vervollständigen"}</strong>
              <p>{attentionItem.name} braucht noch Kontext, damit Garantie, Support und spätere Suche wirklich nützlich werden.</p>
            </div>
            <span className="av-focus-go">
              Produkt öffnen <ArrowRight size={15} />
            </span>
          </Link>
        </AppSection>
      ) : null}

      {/* Library + search + filters */}
      <article className="av-section">
        <div className="av-section-head">
          <h2 className="av-section-title">{filtered.length} Dinge</h2>
          <div className="av-view-toggle">
            <button className={`av-view-btn${view === "cards" ? " is-active" : ""}`} onClick={() => setView("cards")} type="button">
              <LayoutGrid size={14} /> Karten
            </button>
            <button className={`av-view-btn${view === "list" ? " is-active" : ""}`} onClick={() => setView("list")} type="button">
              <Rows3 size={14} /> Liste
            </button>
            <button className={`av-view-btn${view === "memory" ? " is-active" : ""}`} onClick={() => setView("memory")} type="button">
              <Share2 size={14} /> Memory
            </button>
          </div>
        </div>

        <div className="av-search">
          <Search size={15} />
          <input
            type="search"
            placeholder="Ding, Modell, Beleg oder Kategorie suchen"
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

        {filtered.length ? (
          view === "cards" ? (
            <div className="av-things-grid">
              {filtered.map((item) => (
                <ObjectMemoryCard
                  key={item.id}
                  to={`/app/items/${item.id}`}
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
          ) : view === "list" ? (
            <div className="av-item-grid">
              {filtered.map((item) => <ItemCard key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="av-graph-grid">
              {filtered.map((item) => (
                <ObjectMemoryGraph
                  key={item.id}
                  title={item.name}
                  category={categoryBucket(item)}
                  icon={categoryIcon(categoryBucket(item))}
                  edges={itemGraphEdges(item)}
                />
              ))}
            </div>
          )
        ) : hasItems ? (
          <FilteredEmpty onReset={() => { setStatus("ALL"); setCategory("ALL"); setQuery(""); }} />
        ) : (
          <LibraryEmpty />
        )}
      </article>
    </AppPage>
  );
}

/* ── Empty states ───────────────────────────────────────────── */

function LibraryEmpty() {
  return (
    <div className="av-empty-rich">
      <div className="av-empty-visual">
        <ObjectMemoryGraph
          title="LG OLED C3"
          category="TV / Media · Beispiel"
          icon={<Monitor size={14} />}
          edges={[
            { tone: "green", label: "Beleg gespeichert" },
            { tone: "amber", label: "Garantie endet in 45 Tagen" },
            { tone: "teal", label: "Erinnerung öffnen" }
          ]}
        />
      </div>
      <div className="av-empty-copy">
        <h3>Noch keine Dinge gespeichert</h3>
        <p>Füge dein erstes Ding hinzu und Avareno merkt sich Beleg, Garantie und offene Punkte.</p>
        <div className="av-empty-actions">
          <ActionButton to="/app/capture/item" icon={<Plus size={15} />}>Ding erfassen</ActionButton>
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
      <div className="av-empty-body">Ändere Suche oder Filter, um andere Dinge zu sehen.</div>
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
  if (/werkstatt|tool|werkzeug|repair|printer|drucker|maschine|bike|fahrrad|garten/.test(s)) return "Werkstatt";
  if (/haushalt|kitchen|küche|kueche|wasch|appliance|staubsauger|haus/.test(s)) return "Haushalt";
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

/* Sparse, product-specific relationship edges for the memory graph view. */
function itemGraphEdges(item: Item): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const receipt = hasReceipt(item);
  edges.push({ tone: receipt ? "green" : "red", label: receipt ? "Beleg gespeichert" : "Beleg fehlt" });

  const days = warrantyDays(item);
  if (days === null) edges.push({ tone: "neutral", label: "Garantie unbekannt" });
  else if (days < 0) edges.push({ tone: "red", label: "Garantie abgelaufen" });
  else if (days < 60) edges.push({ tone: "amber", label: `Garantie endet in ${days} Tagen` });
  else edges.push({ tone: "neutral", label: `Garantie bis ${isoDate(item.warrantyUntil)}` });

  const open = openPointsOf(item);
  if (open > 0) edges.push({ tone: "teal", label: `${open} offener Punkt${open === 1 ? "" : "e"}` });

  return edges;
}

/* ── Small building blocks ──────────────────────────────────── */

function StatCard({ icon, tone, label, value }: { icon: ReactNode; tone: StatusTone; label: string; value: number }) {
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
