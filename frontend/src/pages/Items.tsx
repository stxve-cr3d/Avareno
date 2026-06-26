import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Archive, ArrowRight, Crown, FileText, Home, Link2, Network, Plus, ScanLine, Share2, ShieldCheck, SlidersHorizontal, Sparkles, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Item, ProductStructure } from "../lib/types";
import { ItemCard } from "../components/ItemCard";
import { EmptyState } from "../components/EmptyState";

const healthFilters = ["All", "Warranty soon", "Incomplete", "Missing receipt", "Missing serial number"] as const;
const spaceTypes = ["ROOM", "BUILDING", "FLOOR", "ZONE", "STORAGE"] as const;
const planTiers = ["FREE", "PREMIUM", "PRO"] as const;

const healthFilterLabels: Record<(typeof healthFilters)[number], string> = {
  All: "Alle",
  "Warranty soon": "Garantie bald",
  Incomplete: "Unvollständig",
  "Missing receipt": "Beleg fehlt",
  "Missing serial number": "Seriennummer fehlt"
};

export function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [structure, setStructure] = useState<ProductStructure | null>(null);
  const [healthFilter, setHealthFilter] = useState<(typeof healthFilters)[number]>("All");
  const [spaceId, setSpaceId] = useState("ALL");
  const [itemType, setItemType] = useState("ALL");
  const [spaceName, setSpaceName] = useState("");
  const [spaceType, setSpaceType] = useState<(typeof spaceTypes)[number]>("ROOM");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [message, setMessage] = useState("");

  async function load() {
    const [itemsResult, structureResult] = await Promise.all([api<Item[]>("/api/items"), api<ProductStructure>("/api/structure")]);
    setItems(itemsResult);
    setStructure(structureResult);
  }

  useEffect(() => {
    void load().catch(console.error);
  }, []);

  async function createSpace() {
    if (!spaceName.trim()) return;
    await api("/api/structure/spaces", {
      method: "POST",
      body: JSON.stringify({ name: spaceName.trim(), type: spaceType })
    });
    setSpaceName("");
    setMessage("Space created");
    await load();
  }

  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    await api("/api/structure/household/invites", {
      method: "POST",
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
    });
    setInviteEmail("");
    setMessage("Invite prepared");
    await load();
  }

  async function changePlan(tier: string) {
    await api("/api/structure/plan", {
      method: "PATCH",
      body: JSON.stringify({ tier })
    });
    setMessage(`${tier} plan active`);
    await load();
  }

  async function connectSmartHome() {
    await api("/api/structure/smart-home/connect", {
      method: "POST",
      body: JSON.stringify({ provider: "SAMSUNG_SMARTTHINGS" })
    });
    setMessage("Samsung SmartThings slot connected");
    await load();
  }

  const spaces = structure?.spaces ?? [];
  const visibleSpaces = spaces.filter((space) => space.type !== "HOME");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (spaceId !== "ALL" && item.spaceId !== spaceId) return false;
      if (itemType !== "ALL" && item.itemType !== itemType) return false;
      if (healthFilter === "All") return true;
      if (healthFilter === "Warranty soon") return item.warrantyUntil && new Date(item.warrantyUntil).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 60;
      if (healthFilter === "Incomplete") return item.completenessScore < 100;
      if (healthFilter === "Missing receipt") return item.missingFields?.includes("receipt");
      if (healthFilter === "Missing serial number") return item.missingFields?.includes("serial number");
      return true;
    });
  }, [healthFilter, itemType, items, spaceId]);

  const premium = structure?.plan?.tier ?? "FREE";
  const familyCount = structure?.members.length ?? 1;
  const reorderCount = items.filter((item) => item.reorderUrl || item.affiliateUrl).length;
  const smartHomeConnected = structure?.smartHome.connections.some((connection) => connection.status === "CONNECTED");
  const smartHomeReady = smartHomeConnected || structure?.smartHome.connections.some((connection) => connection.status === "AVAILABLE");
  const documentCount = items.reduce((sum, item) => sum + (item.documents?.length ?? 0), 0);
  const warrantySoonCount = items.filter((item) => item.warrantyUntil && new Date(item.warrantyUntil).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 60).length;
  const incompleteCount = items.filter((item) => item.completenessScore < 100).length;
  const attentionItem = items.find((item) => item.missingFields?.includes("receipt")) ?? items.find((item) => item.completenessScore < 100) ?? items[0];

  return (
    <div className="things-workspace things-calm-workspace">
      <section className="things-calm-hero">
        <div>
          <h1>Dinge</h1>
          <p>Produkte, Belege, Garantien und Handbücher bleiben an einem Ort. Erst Überblick, dann Detail.</p>
        </div>
        <Link className="things-calm-primary" to="/app/capture/item">
          Produkt hinzufügen
          <Plus size={16} />
        </Link>
      </section>

      {attentionItem ? (
        <section className="things-calm-focus">
          <div>
            <span>Als Nächstes</span>
            <h2>{attentionItem.missingFields?.includes("receipt") ? "Beleg fehlt" : "Produkt vervollständigen"}</h2>
            <p>{attentionItem.name} braucht noch Kontext, damit Garantie, Support und spätere Suche wirklich nützlich werden.</p>
          </div>
          <Link className="things-calm-secondary" to={`/app/items/${attentionItem.id}`}>
            Produkt öffnen
            <ArrowRight size={16} />
          </Link>
        </section>
      ) : null}

      <section className="things-calm-stats" aria-label="Dinge Überblick">
        <StatusBlock icon={<Archive />} title="Dinge" value={`${items.length}/${structure?.usage.itemLimit ?? 25}`} />
        <StatusBlock icon={<FileText />} title="Dokumente" value={`${documentCount}`} />
        <StatusBlock icon={<ShieldCheck />} title="Garantie bald" value={`${warrantySoonCount}`} />
      </section>

      {message ? <p className="rounded-full bg-leaf/10 px-4 py-2 text-sm font-black text-leaf">{message}</p> : null}

      <section className="things-calm-actions" aria-label="Schnellaktionen">
        <ThingsAction icon={<ScanLine size={18} />} label="Beleg scannen" to="/app/capture/receipt" />
        <ThingsAction icon={<Sparkles size={18} />} label="Problem lösen" to="/app/resolve/create" />
        <ThingsAction icon={<Network size={18} />} label="Räume ordnen" to="/app/items" />
      </section>

      <section className="things-filter-panel things-calm-list-panel rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white">
              <SlidersHorizontal size={18} />
            </span>
            <div>
              <p className="text-xs font-black uppercase text-muted">Liste</p>
              <h2 className="text-2xl font-black text-ink">{filtered.length} Dinge</h2>
            </div>
          </div>
          <Link className="ozma-text-link" to="/app/capture/item">
            <Plus size={16} />
            Hinzufügen
          </Link>
        </div>

        <FilterRow label="Räume">
          <FilterButton active={spaceId === "ALL"} onClick={() => setSpaceId("ALL")}>
            Alle
          </FilterButton>
          {visibleSpaces.map((space) => (
            <FilterButton key={space.id} active={spaceId === space.id} onClick={() => setSpaceId(space.id)}>
              {space.name} {space.itemCount ? `(${space.itemCount})` : ""}
            </FilterButton>
          ))}
        </FilterRow>

        <FilterRow label="Typen">
          <FilterButton active={itemType === "ALL"} onClick={() => setItemType("ALL")}>
            Alle
          </FilterButton>
          {(structure?.itemTypes ?? []).map((type) => (
            <FilterButton key={type.id} active={itemType === type.id} onClick={() => setItemType(type.id)}>
              {type.label}
            </FilterButton>
          ))}
        </FilterRow>

        <FilterRow label="Status">
          {healthFilters.map((filter) => (
            <FilterButton key={filter} active={healthFilter === filter} onClick={() => setHealthFilter(filter)}>
              {healthFilterLabels[filter]}
            </FilterButton>
          ))}
        </FilterRow>
      </section>

      <div className="things-calm-grid">
        {filtered.length ? filtered.map((item) => <ItemCard key={item.id} item={item} />) : <EmptyState title="Noch nichts hier">Ändere den Filter oder füge ein Produkt hinzu.</EmptyState>}
      </div>
    </div>
  );
}

function ThingsAction({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  return (
    <Link className="things-calm-action" to={to}>
      <span>{icon}</span>
      <strong>{label}</strong>
    </Link>
  );
}

function SystemTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="things-system-tile">
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBlock({ icon, title, value, tone = "light" }: { icon: ReactNode; title: string; value: string; tone?: "light" | "dark" }) {
  return (
    <div className={`things-status-block ${tone === "dark" ? "things-status-block-dark" : ""}`}>
      <span>{icon}</span>
      <p>{title}</p>
      <strong>{value}</strong>
    </div>
  );
}

function OperatorPanel({ icon, label, title, children }: { icon: ReactNode; label: string; title: string; children: ReactNode }) {
  return (
    <div className="things-operator-panel">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted">{label}</p>
          <h3 className="mt-1 text-xl font-black text-ink">{title}</h3>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white">{icon}</span>
      </div>
      {children}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="things-filter-row">
      <span>{label}</span>
      <div className="no-scrollbar flex gap-2 overflow-auto">{children}</div>
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button className={`things-filter-button ${active ? "things-filter-button-active" : ""}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}
