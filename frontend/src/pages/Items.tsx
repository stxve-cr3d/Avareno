import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Archive, Crown, Home, Link2, Network, Plus, ScanLine, Share2, SlidersHorizontal, Sparkles, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { Item, ProductStructure } from "../lib/types";
import { ItemCard } from "../components/ItemCard";
import { EmptyState } from "../components/EmptyState";

const healthFilters = ["All", "Warranty soon", "Incomplete", "Missing receipt", "Missing serial number"] as const;
const spaceTypes = ["ROOM", "BUILDING", "FLOOR", "ZONE", "STORAGE"] as const;
const planTiers = ["FREE", "PREMIUM", "PRO"] as const;

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

  return (
    <div className="things-workspace mx-auto max-w-7xl space-y-5">
      <section className="things-command rounded-lg">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase text-leaf">Avareno inventory</p>
            <h1 className="mt-3 max-w-3xl text-[clamp(2.8rem,7vw,6.7rem)] font-black leading-[0.9] text-white">
              alles was du besitzt, sauber sortiert
            </h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SystemTile icon={<Home size={18} />} label="Household" value={structure?.household?.name ?? "Home"} />
            <SystemTile icon={<Crown size={18} />} label="Plan" value={premium} />
            <SystemTile icon={<Share2 size={18} />} label="Family" value={`${familyCount} member${familyCount === 1 ? "" : "s"}`} />
            <SystemTile icon={<Link2 size={18} />} label="Reorder" value={`${reorderCount} links`} />
          </div>
        </div>
      </section>

      <section className="things-system-grid">
        <StatusBlock icon={<Network />} title="Spaces" value={`${visibleSpaces.length} groups`} tone="dark" />
        <StatusBlock icon={<Archive />} title="Things" value={`${items.length}/${structure?.usage.itemLimit ?? 25}`} />
        <StatusBlock icon={<Wifi />} title="Smart Home" value={smartHomeConnected ? "connected" : smartHomeReady ? "ready" : "planned"} />
        <StatusBlock icon={<Sparkles />} title="Wow Layer" value={`${structure?.wowFeatures.length ?? 0} ideas`} />
      </section>

      <section className="things-ops-grid">
        <OperatorPanel icon={<Network size={18} />} label="Groups" title="Create a space">
          <div className="grid gap-2">
            <input className="things-input" value={spaceName} onChange={(event) => setSpaceName(event.target.value)} placeholder="z.B. Badezimmer, Buero, Ferienwohnung" />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <select className="things-input" value={spaceType} onChange={(event) => setSpaceType(event.target.value as (typeof spaceTypes)[number])}>
                {spaceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <button className="things-mini-action" onClick={createSpace} type="button">
                Add
              </button>
            </div>
          </div>
        </OperatorPanel>

        <OperatorPanel icon={<Share2 size={18} />} label="Family" title="Invite member">
          <div className="grid gap-2">
            <input className="things-input" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="email@family.com" />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <select className="things-input" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)}>
                <option value="VIEWER">VIEWER</option>
                <option value="EDITOR">EDITOR</option>
              </select>
              <button className="things-mini-action" onClick={inviteMember} type="button">
                Invite
              </button>
            </div>
          </div>
        </OperatorPanel>

        <OperatorPanel icon={<Crown size={18} />} label="Money" title="Free / Premium">
          <div className="grid gap-2">
            {planTiers.map((tier) => (
              <button className={`things-plan-button ${premium === tier ? "things-plan-button-active" : ""}`} key={tier} onClick={() => changePlan(tier)} type="button">
                {tier}
              </button>
            ))}
          </div>
        </OperatorPanel>

        <OperatorPanel icon={<Wifi size={18} />} label="Wow" title="Smart Home">
          <div className="grid gap-2">
            <p className="text-sm font-semibold leading-6 text-muted">{smartHomeConnected ? "Smart provider is ready." : "Prepare Samsung, Alexa, Google, Home Assistant and Matter."}</p>
            <button className="things-mini-action" onClick={connectSmartHome} type="button">
              {smartHomeConnected ? "Mark ready" : "Connect Samsung"}
            </button>
            <Link className="things-plan-button inline-flex items-center justify-center" to="/smart-home">
              Open Smart Home
            </Link>
          </div>
        </OperatorPanel>
      </section>

      {message ? <p className="rounded-full bg-leaf/10 px-4 py-2 text-sm font-black text-leaf">{message}</p> : null}

      <section className="things-filter-panel rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white">
              <SlidersHorizontal size={18} />
            </span>
            <div>
              <p className="text-xs font-black uppercase text-muted">Spaces / types / health</p>
              <h2 className="text-2xl font-black text-ink">{filtered.length} visible things</h2>
            </div>
          </div>
          <Link className="ozma-text-link" to="/capture/item">
            <Plus size={16} />
            Add
          </Link>
        </div>

        <FilterRow label="Spaces">
          <FilterButton active={spaceId === "ALL"} onClick={() => setSpaceId("ALL")}>
            All
          </FilterButton>
          {visibleSpaces.map((space) => (
            <FilterButton key={space.id} active={spaceId === space.id} onClick={() => setSpaceId(space.id)}>
              {space.name} {space.itemCount ? `(${space.itemCount})` : ""}
            </FilterButton>
          ))}
        </FilterRow>

        <FilterRow label="Types">
          <FilterButton active={itemType === "ALL"} onClick={() => setItemType("ALL")}>
            All
          </FilterButton>
          {(structure?.itemTypes ?? []).map((type) => (
            <FilterButton key={type.id} active={itemType === type.id} onClick={() => setItemType(type.id)}>
              {type.label}
            </FilterButton>
          ))}
        </FilterRow>

        <FilterRow label="State">
          {healthFilters.map((filter) => (
            <FilterButton key={filter} active={healthFilter === filter} onClick={() => setHealthFilter(filter)}>
              {filter}
            </FilterButton>
          ))}
        </FilterRow>
      </section>

      <section className="things-capture-strip">
        {(structure?.captureMethods ?? []).slice(0, 6).map((method) => (
          <div className="things-capture-method" key={method.id}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink">
              <ScanLine size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{method.label}</p>
              <p className="text-xs font-black uppercase text-white/50">{method.status}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.length ? filtered.map((item) => <ItemCard key={item.id} item={item} />) : <EmptyState title="Nothing here yet">Try another filter or add a receipt.</EmptyState>}
      </div>
    </div>
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
