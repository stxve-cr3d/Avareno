import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDownAZ, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Item, ProductStructure } from "../lib/types";
import {
  ActionButton,
  ConsoleSkeleton,
  SecondaryAction
} from "../components/app/AppKit";
import { ProductObjectCard, hasReceipt, warrantyDaysLeft } from "../components/ProductObjectCard";

type StatusFilter = "ALL" | "MISSING_RECEIPT" | "WARRANTY_SOON" | "OPEN" | "COMPLETE";
type SortMode = "UPDATED" | "NAME" | "OPEN" | "COMPLETE";

const statusFilters: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "Alle" },
  { id: "MISSING_RECEIPT", label: "Beleg fehlt" },
  { id: "WARRANTY_SOON", label: "Garantie endet bald" },
  { id: "OPEN", label: "Angaben fehlen" },
  { id: "COMPLETE", label: "Vollständig" }
];

const categories = ["TV / Media", "Audio", "Werkstatt", "Haushalt", "Sonstiges"] as const;
type Category = (typeof categories)[number];

const sortOptions: { id: SortMode; label: string }[] = [
  { id: "UPDATED", label: "Zuletzt aktualisiert" },
  { id: "OPEN", label: "Fehlende Angaben" },
  { id: "COMPLETE", label: "Vollständigkeit" },
  { id: "NAME", label: "Name" }
];

export function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [, setStructure] = useState<ProductStructure | null>(null);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [category, setCategory] = useState<"ALL" | Category>("ALL");
  const [sort, setSort] = useState<SortMode>("UPDATED");
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
    const result = items.filter((item) => {
      if (category !== "ALL" && categoryBucket(item) !== category) return false;
      if (status === "MISSING_RECEIPT" && hasReceipt(item)) return false;
      if (status === "WARRANTY_SOON" && !warrantySoon(item)) return false;
      if (status === "OPEN" && openPointsOf(item) === 0) return false;
      if (status === "COMPLETE" && (item.completenessScore ?? 0) < 100) return false;
      if (q) {
        const haystack = [item.name, item.model, item.manufacturer, item.serialNumber, item.category, item.merchant, item.itemType, item.location, item.space?.name]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return [...result].sort((a, b) => sortItems(a, b, sort));
  }, [category, items, query, sort, status]);

  const hasItems = items.length > 0;

  if (loading) {
    return <ConsoleSkeleton label="Produkte werden geladen…" />;
  }

  return (
    <main className="av-console av-library">
      <header className="mem-home-head">
        <div className="mem-home-head-copy">
          <span className="av-page-kicker">Produktarchiv</span>
          <h1 className="av-page-title">Meine Produkte</h1>
          <p className="av-page-sub">Alle gespeicherten Produkte mit Belegen, Garantien und Dokumenten.</p>
        </div>
        <div className="mem-home-head-actions">
          <Link className="av-btn av-btn-primary" to="/app/capture/item">
            <Plus size={18} aria-hidden="true" />
            Produkt hinzufügen
          </Link>
        </div>
      </header>

      {hasItems ? (
        <section className="av-library-tools" aria-label="Suche und Filter">
          <div className="av-search">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              placeholder="Produkt, Hersteller, Modell oder Seriennummer suchen"
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
            <label className="av-sort-control">
              <span><ArrowDownAZ size={14} aria-hidden="true" /> Sortieren</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                {sortOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>
      ) : null}

      <section className="av-library-stock" aria-live="polite">
        {hasItems ? (
          <h2 className="av-library-count">
            {filtered.length === items.length
              ? (items.length === 1 ? "1 gespeichertes Produkt" : `${items.length} gespeicherte Produkte`)
              : `${filtered.length} von ${items.length} Produkten`}
          </h2>
        ) : null}

        {filtered.length ? (
          <div className="mem-product-grid is-archive">
            {filtered.map((item, index) => (
              <ProductObjectCard
                key={item.id}
                item={item}
                to={`/app/dinge/${item.id}`}
                featured={index === 0 && sort === "UPDATED" && status === "ALL" && category === "ALL" && !query.trim() && filtered.length > 2}
              />
            ))}
          </div>
        ) : hasItems ? (
          <FilteredEmpty onReset={() => { setStatus("ALL"); setCategory("ALL"); setQuery(""); }} />
        ) : (
          <LibraryEmpty />
        )}
      </section>
    </main>
  );
}

/* ── Empty states ───────────────────────────────────────────── */

function LibraryEmpty() {
  return (
    <div className="av-empty-rich av-empty-start">
      <div className="av-empty-copy">
        <h3>Noch keine Produkte gespeichert.</h3>
        <p>Füge dein erstes Produkt hinzu und speichere Rechnung, Garantie und Seriennummer an einem Ort.</p>
        <div className="av-empty-actions">
          <ActionButton to="/app/capture/item" icon={<Plus size={15} />}>Produkt hinzufügen</ActionButton>
          <SecondaryAction to="/onboarding?resume=1">Geführten Einstieg öffnen</SecondaryAction>
        </div>
      </div>
    </div>
  );
}

function FilteredEmpty({ onReset }: { onReset: () => void }) {
  return (
    <div className="av-empty">
      <p className="av-empty-title">Keine Treffer</p>
      <div className="av-empty-body">Ändere Suche oder Filter, um andere Produkte zu sehen.</div>
      <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
        <SecondaryAction onClick={onReset}>Filter zurücksetzen</SecondaryAction>
      </div>
    </div>
  );
}

/* ── Archive derivations ────────────────────────────────────── */

function openPointsOf(item: Item): number {
  return (
    (item.missingFields?.length ?? 0) +
    (item.loops?.filter((loop) => loop.status === "OPEN").length ?? 0) +
    (item.repairLogs?.filter((repair) => repair.status !== "RESOLVED").length ?? 0)
  );
}

function warrantySoon(item: Item): boolean {
  const days = warrantyDaysLeft(item);
  return days !== null && days >= 0 && days < 60;
}

function sortItems(a: Item, b: Item, sort: SortMode) {
  if (sort === "NAME") return a.name.localeCompare(b.name, "de");
  if (sort === "OPEN") return openPointsOf(b) - openPointsOf(a) || (b.completenessScore ?? 0) - (a.completenessScore ?? 0);
  if (sort === "COMPLETE") return (b.completenessScore ?? 0) - (a.completenessScore ?? 0) || a.name.localeCompare(b.name, "de");
  return 0;
}

function categoryBucket(item: Item): Category {
  const s = `${item.category ?? ""} ${item.itemType ?? ""} ${item.name ?? ""}`.toLowerCase();
  if (/tv|fernseh|oled|media|monitor|display|beamer/.test(s)) return "TV / Media";
  if (/audio|sound|kopfhörer|kopfhoerer|headphone|speaker|lautsprecher|hifi/.test(s)) return "Audio";
  if (/haushalt|kitchen|küche|kueche|wasch|appliance|staubsauger|haus/.test(s)) return "Haushalt";
  if (/werkstatt|tool|werkzeug|repair|printer|drucker|maschine|bike|fahrrad|garten/.test(s)) return "Werkstatt";
  return "Sonstiges";
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
