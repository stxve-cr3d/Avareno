import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BellRing,
  FileText,
  Package,
  Plus,
  ReceiptText,
  Router,
  ScanLine,
  ShieldCheck,
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
  SecondaryAction,
  StatusSummaryCard
} from "../components/app/AppKit";

type LoadStatus = "loading" | "ready" | "error";
type ConnectionCounts = { devices: number; providers: number };

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
  const attention = buildAttention(items);
  const recents = items.slice(0, 3);
  const receiptCount = items.reduce((sum, item) => sum + (item.documents?.length ?? 0), 0);
  const reminderCount = items.reduce((sum, item) => sum + (item.loops?.length ?? 0), 0);
  const openCount = items.reduce((sum, item) => sum + openPointsOf(item), 0);
  const memoryHealth = hasItems
    ? Math.round(items.reduce((sum, item) => sum + (item.completenessScore ?? 0), 0) / items.length)
    : 0;

  return (
    <main className="av-console mem-home">
      <header className="mem-home-head">
        <div className="mem-home-head-copy">
          <span className="av-page-kicker">Privater Speicher</span>
          <h1 className="av-page-title">Zuhause</h1>
          <p className="av-page-sub">
            {hasItems
              ? "Alles, was zu deinen Objekten gehört, an einem Ort."
              : "Avareno ist ein privates Gedächtnis für das echte Leben — es verknüpft Produkte, Dokumente, Garantien, Reparaturen, Erinnerungen und Geräte, damit alles Wichtige organisiert, auffindbar und nutzbar bleibt."}
          </p>
        </div>
        <div className="mem-home-head-actions">
          <ActionButton to="/app/capture" icon={<Plus size={15} />}>
            Erfassen
          </ActionButton>
        </div>
      </header>

      {!hasItems ? <QuickCapture firstRun /> : null}

      <section className="av-console-section">
        <div className="av-console-section-head">
          <div>
            <span>Heute</span>
            <h2>Braucht Aufmerksamkeit</h2>
          </div>
          <Link to="/app/resolve">Alle offenen Punkte</Link>
        </div>
        {attention.length ? (
          <div className="av-attention-list">
            {attention.map((entry, index) => (
              <AttentionRow key={`${entry.tone}-${entry.to}`} {...entry} primary={index === 0} />
            ))}
          </div>
        ) : (
          <div className="av-empty">
            <p className="av-empty-title">Alles ruhig.</p>
            <div className="av-empty-body">Wenn etwas fehlt, abläuft oder Aufmerksamkeit braucht, erscheint es hier.</div>
          </div>
        )}
      </section>

      <section className="av-console-section">
        <div className="av-console-section-head">
          <div>
            <span>Dein Speicher</span>
            <h2>Zuletzt hinzugefügt</h2>
          </div>
          {hasItems ? <Link to="/app/dinge">Alle Objekte</Link> : null}
        </div>
        {hasItems ? (
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
                openPoints={openPointsOf(item)}
              />
            ))}
          </div>
        ) : (
          <div className="av-empty">
            <p className="av-empty-title">Noch nichts gespeichert.</p>
            <div className="av-empty-body">Füge dein erstes Objekt oder einen Beleg hinzu.</div>
            <div className="av-empty-actions">
              <SecondaryAction to="/app/capture/item">Objekt hinzufügen</SecondaryAction>
            </div>
          </div>
        )}
      </section>

      {hasItems ? <QuickCapture /> : null}

      {hasItems ? (
        <section className="av-console-section">
          <div className="av-console-section-head">
            <div>
              <span>Memory Health</span>
              <h2>Was dein Gedächtnis schon kennt</h2>
            </div>
          </div>
          <div className="mem-overview-grid">
            <StatusSummaryCard
              label="Gedächtnis-Stand"
              value={`${memoryHealth}%`}
              tone={memoryHealth >= 80 ? "success" : memoryHealth >= 40 ? "neutral" : "warning"}
            />
            <StatusSummaryCard label="Objekte" value={items.length} />
            <StatusSummaryCard label="Belege & Dokumente" value={receiptCount} tone={receiptCount > 0 ? "neutral" : "warning"} />
            <StatusSummaryCard label="Erinnerungen" value={reminderCount} />
            <StatusSummaryCard label="Offene Punkte" value={openCount} tone={openCount > 0 ? "warning" : "success"} />
          </div>
        </section>
      ) : null}

      {connections && hasItems ? (
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
    </main>
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
        <QuickActionCard primary to="/app/capture/item" icon={<Package size={16} />} title="Objekt hinzufügen" body="Produkt oder Gerät mit Beleg und Garantie speichern." />
        <QuickActionCard to="/app/capture/receipt" icon={<ScanLine size={16} />} title="Beleg scannen" body="Kaufbeleg speichern und mit einem Objekt verbinden." />
        <QuickActionCard to="/app/reports/home-binder" icon={<FileText size={16} />} title="Dokument hochladen" body="Anleitung, Garantie, Vertrag oder wichtiges PDF ablegen." />
        <QuickActionCard to="/app/capture/loop" icon={<BellRing size={16} />} title="Erinnerung anlegen" body="Service, Frist oder Rückgabe festhalten." />
      </div>
    </section>
  );
}

function MemoryLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="av-console">
      <section className="av-console-section">
        <div className="av-empty">
          <p className="av-empty-title">Dein Speicher konnte nicht geladen werden</p>
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
      label: "Garantie läuft bald ab",
      title: warrantyItem.name,
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
      label: "Beleg fehlt",
      title: noReceipt.name,
      detail: "Für dieses Objekt ist noch kein Beleg gespeichert",
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
      label: "Offener Punkt",
      title: openItem.name,
      detail: "Ein offener Punkt wartet bei diesem Objekt",
      signal: "Offen",
      action: "Ansehen",
      progress: openItem.completenessScore ?? 0
    });
  }

  return out;
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
