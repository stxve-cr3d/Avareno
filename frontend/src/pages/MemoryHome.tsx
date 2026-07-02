import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  FileText,
  Home,
  Monitor,
  Package,
  PlugZap,
  Plus,
  ReceiptText,
  Router,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Wrench
} from "lucide-react";
import { api } from "../lib/api";
import type { Item } from "../lib/types";
import {
  ActionButton,
  AttentionRow,
  ConsoleSkeleton,
  ObjectMemoryCard,
  QuickActionCard,
  SecondaryAction
} from "../components/app/AppKit";

type LoadStatus = "loading" | "ready" | "error";
type NodeTone = "accent" | "warn";
type GraphNode = { title: string; sub: string; icon: ReactNode; tone: NodeTone };
type ConnectionCounts = { devices: number; providers: number };

/* Fixed anchor slots (percent of the graph box) — three per side, flanking the core. */
const SLOTS = [
  { x: 22, y: 18 },
  { x: 16, y: 50 },
  { x: 22, y: 82 },
  { x: 78, y: 18 },
  { x: 84, y: 50 },
  { x: 78, y: 82 }
];

const EXAMPLE_NODES: GraphNode[] = [
  { title: "MacBook Pro", sub: "Arbeitszimmer", icon: <Monitor size={15} />, tone: "accent" },
  { title: "Waschmaschine", sub: "Keller", icon: <Home size={15} />, tone: "accent" },
  { title: "Care · Filter", sub: "fällig in 12 Tagen", icon: <Wrench size={15} />, tone: "accent" },
  { title: "Beleg · MediaMarkt", sub: "Nachweis gesichert", icon: <ReceiptText size={15} />, tone: "accent" },
  { title: "Garantie", sub: "endet in 45 Tagen", icon: <ShieldCheck size={15} />, tone: "warn" },
  { title: "SmartThings", sub: "verbunden", icon: <PlugZap size={15} />, tone: "accent" }
];

export function MemoryHome() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [connections, setConnections] = useState<ConnectionCounts | null>(null);

  async function load() {
    setStatus("loading");
    try {
      const all = await api<Item[]>("/api/items");
      setItems(all);
      setStatus("ready");
    } catch {
      setStatus("error");
      return;
    }
    // Best-effort connections summary; a smart-home outage must not break the home.
    try {
      const payload = await api<{ devices?: unknown[]; providers?: { status?: string }[] }>("/api/smart-home");
      setConnections({
        devices: payload.devices?.length ?? 0,
        providers: (payload.providers ?? []).filter((provider) => provider?.status === "CONNECTED").length
      });
    } catch {
      setConnections(null);
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
  const heroNodes = hasItems ? itemsToNodes(items) : EXAMPLE_NODES;
  const attention = buildAttention(items);
  const recents = items.slice(0, 3);

  return (
    <main className="av-console mem-home">
      <MemoryGraphHero hasItems={hasItems} nodes={heroNodes} />

      {hasItems ? (
        <>
          <section className="av-console-section">
            <div className="av-console-section-head">
              <div>
                <span>Heute</span>
                <h2>Heute wichtig</h2>
              </div>
              <Link to="/app/care">Care öffnen</Link>
            </div>
            {attention.length ? (
              <div className="av-attention-list">
                {attention.map((entry, index) => (
                  <AttentionRow key={entry.title + entry.to} {...entry} primary={index === 0} />
                ))}
              </div>
            ) : (
              <div className="av-empty">
                <p className="av-empty-title">Alles ruhig</p>
                <div className="av-empty-body">Neue Fristen, fehlende Belege und offene Care-Punkte erscheinen hier automatisch.</div>
              </div>
            )}
          </section>

          <section className="av-console-section">
            <div className="av-console-section-head">
              <div>
                <span>Objektgedächtnis</span>
                <h2>Zuletzt gesichert</h2>
              </div>
              <Link to="/app/dinge">Alle Objekte</Link>
            </div>
            <div className="av-things-grid">
              {recents.map((item) => (
                <ObjectMemoryCard
                  key={item.id}
                  to={`/app/dinge/${item.id}`}
                  category={item.category || itemTypeLabel(item.itemType)}
                  name={displayName(item.name)}
                  icon={<Package size={14} />}
                  completeness={item.completenessScore ?? 0}
                  invoicePresent={hasReceipt(item)}
                  warranty={warrantyShort(item)}
                  openPoints={openPointsOf(item)}
                />
              ))}
            </div>
          </section>

          {connections ? (
            <section className="av-console-section">
              <div className="av-console-section-head">
                <div>
                  <span>Zuhause</span>
                  <h2>Verbunden</h2>
                </div>
              </div>
              <QuickActionCard
                to="/app/smart-home"
                icon={<Router size={16} />}
                title="Geräte & Quellen"
                body={`${connections.devices} ${connections.devices === 1 ? "Gerät" : "Geräte"} · ${connections.providers} ${connections.providers === 1 ? "Quelle" : "Quellen"} verbunden`}
              />
            </section>
          ) : null}

          <QuickCapture />
        </>
      ) : (
        <QuickCapture firstRun />
      )}
    </main>
  );
}

function MemoryGraphHero({ hasItems, nodes }: { hasItems: boolean; nodes: GraphNode[] }) {
  return (
    <section className="mem-hero">
      <div className="mem-hero-copy">
        <span className="mem-hero-eyebrow">Privater Speicher</span>
        <h1 className="mem-hero-title">Dein privates Gedächtnis für alles, was zählt.</h1>
        <p className="mem-hero-sub">
          Produkte, Belege, Garantien, Dokumente und Geräte — an einem ruhigen, privaten Ort verbunden.
        </p>
        <div className="mem-hero-actions">
          <ActionButton to="/app/capture/item" icon={<Plus size={15} />}>
            Erstes Objekt erfassen
          </ActionButton>
          <SecondaryAction to="/app/dinge" icon={<ArrowRight size={15} />}>
            {hasItems ? "Alle Objekte ansehen" : "Beispiel-Gedächtnis ansehen"}
          </SecondaryAction>
        </div>
        <p className="mem-hero-trust">
          <ShieldCheck size={14} /> Privat als Standard · Export jederzeit · keine Werbung
        </p>
      </div>

      <MemoryGraph isExample={!hasItems} nodes={nodes} />
    </section>
  );
}

function MemoryGraph({ isExample, nodes }: { isExample: boolean; nodes: GraphNode[] }) {
  const shown = nodes.slice(0, 6);
  return (
    <div className="mem-graph" aria-hidden="true">
      {isExample ? <span className="mem-graph-tag">Beispiel</span> : null}
      <svg className="mem-graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {shown.map((node, index) => {
          const slot = SLOTS[index];
          return (
            <line
              key={index}
              className={node.tone === "warn" ? "mem-arc is-warn" : "mem-arc"}
              x1="50"
              y1="50"
              x2={slot.x}
              y2={slot.y}
              vectorEffect="non-scaling-stroke"
              style={{ animationDelay: `${-index * 0.8}s` }}
            />
          );
        })}
      </svg>
      <div className="mem-graph-core">
        <Sparkles size={20} />
        <small>dein Objektgedächtnis</small>
      </div>
      {shown.map((node, index) => {
        const slot = SLOTS[index];
        return (
          <div
            key={index}
            className={node.tone === "warn" ? "mem-graph-node is-warn" : "mem-graph-node"}
            style={{ left: `${slot.x}%`, top: `${slot.y}%`, animationDelay: `${-index * 1.3}s` }}
          >
            <span className="mem-node-ic">{node.icon}</span>
            <span className="mem-node-copy">
              <strong>{node.title}</strong>
              <small>{node.sub}</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function QuickCapture({ firstRun = false }: { firstRun?: boolean }) {
  return (
    <section className="av-console-section">
      <div className="av-console-section-head">
        <div>
          <span>Erfassen</span>
          <h2>{firstRun ? "Starte mit einer Sache" : "Schnell erfassen"}</h2>
        </div>
      </div>
      <div className="av-quick-action-grid">
        <QuickActionCard primary to="/app/capture/item" icon={<Package size={16} />} title="Objekt hinzufügen" body="Produkt mit Beleg, Garantie und Care-Kontext starten." />
        <QuickActionCard to="/app/capture/receipt" icon={<ScanLine size={16} />} title="Beleg scannen" body="Nachweis speichern und mit einem Objekt verbinden." />
        <QuickActionCard to="/app/reports/home-binder" icon={<FileText size={16} />} title="Dokument hochladen" body="Anleitung, Vertrag oder wichtiges PDF ablegen." />
        <QuickActionCard to="/app/capture/loop" icon={<BellRing size={16} />} title="Erinnerung anlegen" body="Frist, Rückgabe oder offenen Punkt festhalten." />
      </div>
    </section>
  );
}

function MemoryLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="av-console">
      <section className="av-console-section">
        <div className="av-empty">
          <p className="av-empty-title">Dein Gedächtnis konnte nicht geladen werden</p>
          <div className="av-empty-body">Die Verbindung ist gerade nicht erreichbar. Deine Daten sind sicher — versuch es gleich noch einmal.</div>
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
            <SecondaryAction onClick={onRetry}>Erneut versuchen</SecondaryAction>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ── honest derivations (self-contained; no dependency on SmartHome.tsx) ── */

function openPointsOf(item: Item): number {
  return (
    (item.missingFields?.length ?? 0) +
    (item.loops?.filter((loop) => loop.status === "OPEN").length ?? 0) +
    (item.repairLogs?.filter((repair) => repair.status !== "RESOLVED").length ?? 0)
  );
}

function warrantyDaysLeft(item: Item): number | null {
  if (!item.warrantyUntil) return null;
  return Math.ceil((new Date(item.warrantyUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
  return { text: "Geschützt" };
}

type AttentionEntry = {
  to: string;
  tone: "warranty" | "invoice" | "care";
  icon: ReactNode;
  label: string;
  title: string;
  detail: string;
  signal: string;
  action: string;
  progress: number;
};

function buildAttention(items: Item[]): AttentionEntry[] {
  const out: AttentionEntry[] = [];

  const warrantyItem = items
    .filter((item) => {
      const days = warrantyDaysLeft(item);
      return days !== null && days >= 0 && days < 60;
    })
    .sort((a, b) => (warrantyDaysLeft(a) ?? 0) - (warrantyDaysLeft(b) ?? 0))[0];
  if (warrantyItem) {
    const days = warrantyDaysLeft(warrantyItem) ?? 0;
    out.push({
      to: `/app/dinge/${warrantyItem.id}`,
      tone: "warranty",
      icon: <ShieldCheck size={16} />,
      label: "Garantie endet bald",
      title: displayName(warrantyItem.name),
      detail: `Garantie läuft in ${days} Tagen ab`,
      signal: `${days} Tage`,
      action: "Erinnerung öffnen",
      progress: warrantyItem.completenessScore ?? 0
    });
  }

  const noReceipt = items.find((item) => (item.documents?.length ?? 0) === 0);
  if (noReceipt) {
    out.push({
      to: `/app/dinge/${noReceipt.id}`,
      tone: "invoice",
      icon: <ReceiptText size={16} />,
      label: "Nachweis unvollständig",
      title: displayName(noReceipt.name),
      detail: "Rechnung fehlt noch",
      signal: "Beleg fehlt",
      action: "Beleg hinzufügen",
      progress: noReceipt.completenessScore ?? 0
    });
  }

  const openItem =
    items.find((item) => (item.loops ?? []).some((loop) => loop.status === "OPEN")) ??
    items.find((item) => item.repairLogs?.some((repair) => repair.status !== "RESOLVED"));
  if (openItem) {
    out.push({
      to: `/app/dinge/${openItem.id}`,
      tone: "care",
      icon: <Wrench size={16} />,
      label: "Care-Punkt offen",
      title: displayName(openItem.name),
      detail: "Offener Care-Punkt",
      signal: "Offen",
      action: "Ansehen",
      progress: openItem.completenessScore ?? 0
    });
  }

  return out;
}

function itemsToNodes(items: Item[]): GraphNode[] {
  return items.slice(0, 6).map((item) => {
    const days = warrantyDaysLeft(item);
    const soon = days !== null && days >= 0 && days < 60;
    return {
      title: displayName(item.name),
      sub: item.category || item.space?.name || item.location || "Objekt",
      icon: <Package size={15} />,
      tone: soon ? "warn" : "accent"
    };
  });
}

function displayName(name: string) {
  if (name.toLowerCase().includes("3d printer")) return "Smartes Gerät";
  if (name.toLowerCase().includes("test passport")) return "Produktpass";
  return name;
}

function itemTypeLabel(value?: string | null) {
  const labels: Record<string, string> = {
    THING: "Objekt",
    ELECTRONIC: "Elektronik",
    FURNITURE: "Möbel",
    INFRASTRUCTURE: "Infrastruktur",
    VEHICLE: "Fahrzeug",
    COLLECTIBLE: "Sammlung"
  };
  return value ? labels[value] ?? value : "Objekt";
}
