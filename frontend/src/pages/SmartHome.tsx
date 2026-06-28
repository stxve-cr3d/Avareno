import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive,
  ArrowRight,
  BellRing,
  ChevronRight,
  FileText,
  Flame,
  LifeBuoy,
  Monitor,
  Package,
  ReceiptText,
  ShieldCheck,
  Volume2,
  Wrench
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, isoDate } from "../lib/api";
import { formatUiText } from "../lib/uiText";
import {
  DottedGridPanel,
  MetricCard,
  ObjectMemoryMap,
  ObjectMemoryCard,
  QuickActionCard,
  StatusSummaryCard,
  defaultMemoryMapNodes
} from "../components/app/AppKit";
import type {
  Item,
  LocalDiscoveryCandidate,
  LocalDiscoveryPayload,
  MotivationSummary,
  SmartHomeDevice,
  SmartHomeInsight,
  SmartHomePayload
} from "../lib/types";

/* ── constants ──────────────────────────────────────────────── */

const smartHomeTextReplacements: [RegExp, string][] = [
  [/3d[-\s]?printer/gi, "device"],
  [/printer/gi, "device"],
  [/print-finished alerts/gi, "care reminders"],
  [/print done/gi, "completed"],
  [/printing/gi, "running"],
  [/print/gi, "run"],
  [/filament/gi, "material"],
  [/spool/gi, "stock"],
  [/nozzle/gi, "sensor"],
  [/chamber/gi, "area"],
  [/bambu lab/gi, "Device setup"],
  [/bambu/gi, "Avareno"]
];

function cleanUiText(value: string | null | undefined) {
  if (!value) return "";
  return smartHomeTextReplacements.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    formatUiText(value)
  );
}

/* ── fallback demo data ─────────────────────────────────────── */

const smartFallbackPayload: SmartHomePayload = {
  mode: "DEMO",
  providers: [
    {
      id: "BAMBU_LAB",
      name: "Device setup",
      mode: "DEMO",
      status: "READY",
      tokenConfigured: false,
      authNote: "Prepare local device identity, room and product match before live status is enabled."
    },
    {
      id: "LOCAL_DISCOVERY",
      name: "Local Discovery",
      mode: "DEMO",
      status: "READY",
      tokenConfigured: false,
      authNote: "Demo discovery keeps the UI usable until LAN probes are explicitly enabled on the server."
    },
    {
      id: "SAMSUNG_SMARTTHINGS",
      name: "Samsung SmartThings",
      mode: "PLANNED",
      status: "PLANNED",
      tokenConfigured: false,
      authNote: "SmartThings can sync household devices once OAuth credentials are configured."
    }
  ],
  devices: [
    {
      id: "demo-smart-device",
      userId: "demo-user",
      provider: "BAMBU_LAB",
      providerDeviceId: "demo-smart-device",
      itemId: null,
      itemName: null,
      itemImageUrl: null,
      name: "LG OLED C3",
      roomName: "Wohnzimmer",
      deviceType: "tv",
      capabilities: ["documents", "warranty", "networkPresence", "maintenance"],
      status: "ONLINE",
      powerState: "on",
      rawJson: { accessMode: "DEMO", documents: 18, warrantyProgress: 72, openLoops: 3 },
      lastSeenAt: "2026-06-23T18:00:00.000Z"
    }
  ],
  commands: [],
  insights: [
    {
      id: "demo-warranty-alerts",
      type: "PRINT_ALERTS",
      deviceId: "demo-smart-device",
      itemId: null,
      title: "Garantie-Check vorbereiten",
      subtitle: "Erinnere dich rechtzeitig an Belege, Fristen und fehlende Dokumente.",
      signal: "45 Tage verbleiben",
      priority: "HIGH",
      actionType: "CREATE_PLAN",
      cta: "Create plan",
      status: "READY",
      automation: {
        trigger: "Warranty window changes",
        action: "Notify and attach the reminder to product memory",
        outcome: "Important deadlines stop slipping away"
      }
    },
    {
      id: "demo-document-stock",
      type: "FILAMENT_STOCK",
      deviceId: "demo-smart-device",
      itemId: null,
      title: "Dokumente prüfen",
      subtitle: "Sammle Rechnung, Anleitung und Garantiebeleg an einem Ort.",
      signal: "18 Dokumente",
      priority: "MEDIUM",
      actionType: "CREATE_PLAN",
      cta: "Plan stock check",
      status: "READY"
    },
    {
      id: "demo-maintenance",
      type: "MAINTENANCE",
      deviceId: "demo-smart-device",
      itemId: null,
      title: "Reparaturhistorie anlegen",
      subtitle: "Notiere Service, Ersatzteile und Ansprechpartner beim Objekt.",
      signal: "Care due",
      priority: "LOW",
      actionType: "CREATE_PLAN",
      cta: "Create loop",
      status: "READY"
    }
  ],
  quickActions: [],
  localDiscovery: { mode: "DEMO", enabled: false, note: "Demo fallback." },
  wow: { label: "object-aware control", promise: "Connect devices to the real things they belong to." }
};

const fallbackHomeMotivation: MotivationSummary = {
  motivationEnabled: true,
  streakTrackingEnabled: true,
  gentleNudgesEnabled: true,
  currentStreakDays: 6,
  longestStreakDays: 14,
  freezeDaysAvailable: 2,
  weeklyXP: 180,
  totalXP: 1240,
  levelName: "Organisiert",
  levelProgress: 40,
  statusText: "6 Tage gut gepflegt",
  nudgeText: "Heute reicht schon eine kleine Aktion.",
  pauseText: "Kein Stress — Avareno belohnt Fortschritt, nicht Perfektion.",
  freezeState: { active: true, title: "Pausentag verfügbar", body: "Pausentage schützen deine Serie." },
  recentXPEvents: [
    { id: "mock-receipt", label: "Rechnung für MacBook hinzugefügt", points: 25, createdAt: new Date().toISOString() },
    { id: "mock-warranty", label: "Garantie für Sony Kopfhörer erkannt", points: 15, createdAt: new Date().toISOString() }
  ],
  xpRules: []
};

/* ── types ──────────────────────────────────────────────────── */

type HomeRewardsPayload = { motivation: MotivationSummary };

type ImportantHomeItem = {
  action: string;
  detail: string;
  icon: ReactNode;
  progress: number;
  product: string;
  signal: string;
  title: string;
  to: string;
  type: "warranty" | "invoice" | "care";
};

type RecentHomeThing = {
  category: string;
  completeness: number;
  invoiceStatus: string;
  name: string;
  openPoints: number;
  to: string;
  warrantyStatus: string;
};

/* ── main component ─────────────────────────────────────────── */

export function SmartHome() {
  const [payload, setPayload] = useState<SmartHomePayload | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [motivation, setMotivation] = useState<MotivationSummary | null>(null);

  async function load() {
    try {
      const [smartHome, allItems, rewards] = await Promise.all([
        api<SmartHomePayload>("/api/smart-home"),
        api<Item[]>("/api/items"),
        api<HomeRewardsPayload>("/api/rewards").catch(() => ({ motivation: fallbackHomeMotivation }))
      ]);
      setPayload(smartHome);
      setItems(allItems);
      setMotivation(rewards.motivation);
    } catch (error) {
      console.warn("Smart home API unavailable; using demo fallback.", error);
      setPayload(smartFallbackPayload);
      setItems([]);
      setMotivation(fallbackHomeMotivation);
    }
  }

  useEffect(() => { void load(); }, []);

  if (!payload) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "var(--av-text-muted)", fontSize: "0.85rem" }}>
        Privater Speicher wird geladen…
      </div>
    );
  }

  const insights = payload.insights ?? [];
  const openInsightCount = insights.filter((i) => i.status !== "ACTIVE").length;
  const dashboardDocumentCount = items.reduce((n, item) => n + (item.documents?.length ?? 0), 0) || 18;
  const matchItem = items.find((item) => /oled|tv|fernseher/i.test([item.name, item.category, item.manufacturer, item.model].join(" "))) ?? null;
  const matchName = matchItem?.name ?? "LG OLED C3";
  const itemCount = items.length || payload.devices.length || 7;

  const nextItems = buildHomeNextItems(items, matchName, dashboardDocumentCount, openInsightCount);
  const importantItems = buildTodayImportantItems(items, matchName);
  const recentThings = buildRecentThings(items, matchName);

  const appPath = (path: string) => (path === "/" ? "/app" : `/app${path}`);

  return (
    <main className="av-console">
      <section className="av-console-top">
        <div className="av-dashboard-header">
          <span className="av-console-kicker">Private workspace</span>
          <div className="av-dashboard-title-row">
            <div>
              <h1>Avareno Home</h1>
              <p>Dein privater Speicher für Dinge, Belege, Garantien und offene Punkte.</p>
            </div>
            <Link className="av-console-primary" to={appPath("/care")}>
              Offene Punkte prüfen <ArrowRight size={14} />
            </Link>
          </div>
          <div className="av-status-grid" aria-label="Status summary">
            <StatusSummaryCard label="Status" value="Bereit" tone="success" />
            <StatusSummaryCard label="Dinge" value={itemCount} />
            <StatusSummaryCard label="Dokumente" value={dashboardDocumentCount} />
            <StatusSummaryCard label="Offen" value={openInsightCount || 3} tone="warning" />
            <StatusSummaryCard label="Letzter Scan" value="Heute" />
          </div>
        </div>

        <DottedGridPanel>
          <ObjectMemoryMap nodes={defaultMemoryMapNodes(importantItems[0]?.product)} />
        </DottedGridPanel>
      </section>

      <div className="av-console-grid">
        <div className="av-console-main">
          <article className="av-console-section">
            <div className="av-console-section-head">
              <div>
                <span>Needs attention</span>
                <h2>Aktuelle offene Punkte</h2>
              </div>
              <Link to={appPath("/care")}>Care öffnen</Link>
            </div>
            <div className="av-attention-list">
              {importantItems.map((item, i) => (
                <AttentionCard key={item.product + item.title} item={item} primary={i === 0} />
              ))}
            </div>
          </article>

          <article className="av-console-section">
            <div className="av-console-section-head">
              <div>
                <span>Object memory</span>
                <h2>Zuletzt gespeicherte Dinge</h2>
              </div>
              <Link to={appPath("/items")}>Alle Dinge</Link>
            </div>
            <div className="av-things-grid">
              {recentThings.map((thing) => {
                const warranty = shortWarranty(thing.warrantyStatus);
                return (
                  <ObjectMemoryCard
                    key={thing.name}
                    to={thing.to}
                    category={thing.category}
                    name={thing.name}
                    icon={categoryIcon(thing.category)}
                    completeness={thing.completeness}
                    invoicePresent={!thing.invoiceStatus.toLowerCase().includes("fehlt")}
                    warranty={warranty}
                    openPoints={thing.openPoints}
                  />
                );
              })}
            </div>
          </article>

          <article className="av-console-section">
            <div className="av-console-section-head">
              <div>
                <span>Memory Capture</span>
                <h2>Schnell erfassen</h2>
              </div>
            </div>
            <div className="av-quick-action-grid">
              <QuickActionCard
                primary
                to={appPath("/capture/item")}
                icon={<Archive size={16} />}
                title="Produkt hinzufügen"
                body="Ein Ding mit Beleg, Garantie und Care-Kontext starten."
              />
              <QuickActionCard
                to={appPath("/capture/receipt")}
                icon={<ReceiptText size={16} />}
                title="Rechnung scannen"
                body="Nachweis speichern und mit einem Objekt verbinden."
              />
              <QuickActionCard
                to={appPath("/resolve/create")}
                icon={<LifeBuoy size={16} />}
                title="Ticket erstellen"
                body="Eine konkrete Care-Frage zu einem Ding öffnen."
              />
              <QuickActionCard
                to={appPath("/capture/loop")}
                icon={<BellRing size={16} />}
                title="Erinnerung anlegen"
                body="Frist, Rückgabe oder offenen Punkt festhalten."
              />
            </div>
          </article>
        </div>

        <aside className="av-console-side">
          <MetricCard label="Belege im Speicher" value={dashboardDocumentCount} progress={74} tone="teal" />
          <MetricCard label="Object Loops offen" value={openInsightCount || 3} progress={42} tone="warning" />
          <MetricCard label="Garantie-Risiken" value="1" progress={28} tone="warning" />
          <MetricCard label="Care-Streak" value={motivation?.currentStreakDays ?? 6} progress={motivation?.levelProgress ?? 40} tone="teal" />
          <ModuleNav appPath={appPath} itemCount={itemCount} openCount={openInsightCount} />
          {motivation ? <StreakBar motivation={motivation} /> : null}
        </aside>
      </div>
    </main>
  );
}

/* ── presentation components ────────────────────────────────── */

function AttentionCard({ item, primary = false }: { item: ImportantHomeItem; primary?: boolean }) {
  return (
    <Link
      className={`av-attention-card av-att-${item.type}${primary ? " av-att-primary" : ""}`}
      to={item.to}
    >
      <span className="av-att-icon">{item.icon}</span>
      <div className="av-att-copy">
        <small>{item.title}</small>
        <strong>{item.product}</strong>
        <p>{item.detail}</p>
      </div>
      <div className="av-att-right">
        <span className={`av-tag av-tag-${item.type}`}>{item.signal}</span>
        <em className="av-att-cta">{item.action}</em>
      </div>
      {/* Progress strip spanning full card width — shows warranty/completeness */}
      {primary && (
        <div className="av-att-track">
          <div className="av-att-bar" style={{ width: `${item.progress}%` }} />
        </div>
      )}
    </Link>
  );
}

function shortWarranty(status: string): { text: string; urgent: boolean } {
  const s = status.toLowerCase();
  if (s.includes("unbekannt")) return { text: "Unbekannt", urgent: false };
  if (s.includes("fällig")) return { text: "Fällig", urgent: true };
  const dayMatch = status.match(/(\d+)\s*Tag/i);
  if (dayMatch) return { text: `${dayMatch[1]} Tage`, urgent: true };
  if (s.includes("bis")) return { text: status.replace(/.*bis\s*/i, "bis "), urgent: false };
  if (s.includes("offen")) return { text: "Offen", urgent: false };
  return { text: status, urgent: false };
}

function QuickCapture({ appPath }: { appPath: (path: string) => string }) {
  return (
    <div className="av-capture">
      <span className="av-capture-label">Quick Capture</span>
      <Link className="av-capture-lead" to={appPath("/capture/item")}>
        {/* Scan corner brackets — two spans give all four corners */}
        <span className="av-scan-frame av-scan-a" aria-hidden="true" />
        <span className="av-scan-frame av-scan-b" aria-hidden="true" />
        <span className="av-capture-icon"><Archive size={21} /></span>
        <div>
          <strong>Produkt hinzufügen</strong>
          <small>Ein Ding mit Beleg, Garantie und Care-Kontext starten</small>
        </div>
        <ChevronRight size={15} />
      </Link>
      <div className="av-capture-actions">
        <Link className="av-capture-action" to={appPath("/capture/receipt")}>
          <ReceiptText size={15} /> Rechnung scannen
        </Link>
        <Link className="av-capture-action" to={appPath("/resolve/create")}>
          <LifeBuoy size={15} /> Ticket erstellen
        </Link>
        <Link className="av-capture-action" to={appPath("/capture/loop")}>
          <BellRing size={15} /> Erinnerung anlegen
        </Link>
      </div>
    </div>
  );
}

function MemoryStatus({ itemCount, docCount, openCount }: {
  itemCount: number;
  docCount: number;
  openCount: number;
}) {
  return (
    <div className="av-mem-status">
      <span className="av-mem-label">Privater Speicher</span>
      <div className="av-mem-numbers">
        <div className="av-mem-number">
          <strong>{itemCount}</strong>
          <small>Dinge</small>
        </div>
        <div className="av-mem-number">
          <strong>{docCount}</strong>
          <small>Dokumente</small>
        </div>
        <div className={`av-mem-number${openCount > 0 ? " is-warn" : ""}`}>
          <strong>{openCount || 3}</strong>
          <small>Offen</small>
        </div>
      </div>
    </div>
  );
}

function ModuleNav({ appPath, itemCount, openCount }: {
  appPath: (path: string) => string;
  itemCount: number;
  openCount: number;
}) {
  return (
    <div className="av-module-list">
      <Link className="av-module-row av-mod-teal" to={appPath("/items")}>
        <span className="av-module-icon"><Archive size={14} /></span>
        <div className="av-module-copy">
          <strong>Dinge</strong>
          <small>Produktakten</small>
        </div>
        <em className="av-module-count">{itemCount}</em>
        <ChevronRight size={13} />
      </Link>
      <Link className="av-module-row av-mod-warn" to={appPath("/resolve")}>
        <span className="av-module-icon"><LifeBuoy size={14} /></span>
        <div className="av-module-copy">
          <strong>Resolve</strong>
          <small>Offene Anfragen</small>
        </div>
        <em className="av-module-count">{openCount || 2}</em>
        <ChevronRight size={13} />
      </Link>
      <Link className="av-module-row" to={appPath("/care")}>
        <span className="av-module-icon"><BellRing size={14} /></span>
        <div className="av-module-copy">
          <strong>Care</strong>
          <small>Garantien & Erinnerungen</small>
        </div>
        <em className="av-module-count">3</em>
        <ChevronRight size={13} />
      </Link>
    </div>
  );
}

function StreakBar({ motivation }: { motivation: MotivationSummary }) {
  return (
    <Link className="av-streak" to="/app/rewards">
      <span className="av-streak-icon"><Flame size={14} /></span>
      <div className="av-streak-copy">
        <strong>{motivation.statusText}</strong>
        <small>{motivation.weeklyXP} XP · {motivation.freezeDaysAvailable} Pausentage</small>
      </div>
      <div className="av-streak-track">
        <div className="av-streak-fill" style={{ width: `${motivation.levelProgress}%` }} />
      </div>
    </Link>
  );
}

function categoryIcon(category: string) {
  const n = category.toLowerCase();
  if (n.includes("audio") || n.includes("sound")) return <Volume2 size={14} />;
  if (n.includes("werkstatt") || n.includes("repair")) return <Wrench size={14} />;
  if (n.includes("tv") || n.includes("media")) return <Monitor size={14} />;
  return <Package size={14} />;
}

/* ── data helpers ───────────────────────────────────────────── */

function buildHomeNextItems(
  items: Item[],
  matchName: string,
  documentCount: number,
  openInsightCount: number
) {
  const itemWithMissingContext = items.find((item) => (item.documents?.length ?? 0) === 0 || !item.warrantyUntil);
  const itemWithWarranty = items.find((item) => item.warrantyUntil);

  return [
    {
      body: `${openInsightCount || 2} offene Punkte sinnvoll einordnen`,
      icon: <LifeBuoy size={16} />,
      title: "Resolve fortsetzen",
      to: "/app/resolve"
    },
    {
      body: itemWithMissingContext
        ? `${displayHomeItemName(itemWithMissingContext.name)} braucht noch einen Beleg`
        : `${documentCount} Dokumente sind abgelegt`,
      icon: <FileText size={16} />,
      title: "Beleg ergänzen",
      to: itemWithMissingContext ? `/app/dinge/${itemWithMissingContext.id}` : "/app/reports/home-binder"
    },
    {
      body: itemWithWarranty?.warrantyUntil
        ? `Garantie bis ${displayHomeDate(itemWithWarranty.warrantyUntil)}`
        : `${displayHomeItemName(matchName)} in 45 Tagen prüfen`,
      icon: <ShieldCheck size={16} />,
      title: "Garantie prüfen",
      to: itemWithWarranty ? `/app/dinge/${itemWithWarranty.id}` : "/app/care"
    }
  ];
}

function buildTodayImportantItems(items: Item[], matchName: string): ImportantHomeItem[] {
  const itemWithMissingInvoice = items.find((item) => (item.documents?.length ?? 0) === 0);
  const itemWithOpenLoop =
    items.find((item) => (item.loops ?? []).some((loop) => loop.status === "OPEN")) ??
    items.find((item) => item.repairLogs?.some((repair) => repair.status !== "RESOLVED"));

  return [
    {
      action: "Erinnerung öffnen",
      detail: "Garantie läuft in 45 Tagen ab",
      icon: <ShieldCheck size={16} />,
      progress: 74,
      product: displayHomeItemName(matchName),
      signal: "45 Tage",
      title: "Garantie endet bald",
      to: "/app/care",
      type: "warranty"
    },
    {
      action: "Beleg hinzufügen",
      detail: "Rechnung fehlt noch",
      icon: <ReceiptText size={16} />,
      progress: 38,
      product: displayHomeItemName(itemWithMissingInvoice?.name ?? "Sony WH-1000XM5"),
      signal: "Beleg fehlt",
      title: "Nachweis unvollständig",
      to: itemWithMissingInvoice ? `/app/dinge/${itemWithMissingInvoice.id}` : "/app/capture/receipt",
      type: "invoice"
    },
    {
      action: "Ansehen",
      detail: "Wartung offen",
      icon: <Wrench size={16} />,
      progress: 62,
      product: displayHomeItemName(itemWithOpenLoop?.name ?? "Bambu Lab X1C"),
      signal: "Offen",
      title: "Care-Punkt offen",
      to: itemWithOpenLoop ? `/app/dinge/${itemWithOpenLoop.id}` : "/app/care",
      type: "care"
    }
  ];
}

function buildRecentThings(items: Item[], matchName: string): RecentHomeThing[] {
  if (items.length) {
    return items.slice(0, 3).map((item) => {
      const openPoints =
        (item.missingFields?.length ?? 0) +
        (item.loops?.filter((loop) => loop.status === "OPEN").length ?? 0) +
        (item.repairLogs?.filter((repair) => repair.status !== "RESOLVED").length ?? 0);
      return {
        category: cleanUiText(item.category || item.itemType || "Ding"),
        completeness: item.completenessScore ?? 64,
        invoiceStatus: (item.documents?.length ?? 0) > 0 ? "Rechnung gespeichert" : "Rechnung fehlt",
        name: displayHomeItemName(item.name),
        openPoints,
        to: `/app/dinge/${item.id}`,
        warrantyStatus: item.warrantyUntil
          ? `Garantie bis ${displayHomeDate(item.warrantyUntil)}`
          : "Garantie unbekannt"
      };
    });
  }

  return [
    {
      category: "TV · Media",
      completeness: 86,
      invoiceStatus: "Rechnung gespeichert",
      name: displayHomeItemName(matchName),
      openPoints: 1,
      to: "/app/dinge",
      warrantyStatus: "Garantie endet in 45 Tagen"
    },
    {
      category: "Audio",
      completeness: 48,
      invoiceStatus: "Rechnung fehlt",
      name: "Sony WH-1000XM5",
      openPoints: 1,
      to: "/app/capture/receipt",
      warrantyStatus: "Garantie offen"
    },
    {
      category: "Werkstatt",
      completeness: 72,
      invoiceStatus: "Beleg gespeichert",
      name: "Bambu Lab X1C",
      openPoints: 2,
      to: "/app/care",
      warrantyStatus: "Wartung fällig"
    }
  ];
}

function displayHomeDate(value?: string | null) {
  const formatted = isoDate(value);
  return formatted === "No date" ? "kein Datum" : formatted;
}

function displayHomeItemName(name: string) {
  if (name.toLowerCase().includes("3d printer")) return "Smartes Gerät";
  if (name.toLowerCase().includes("test passport")) return "Produktpass";
  return name;
}

/* ── preserved rank helpers ─────────────────────────────────── */

function rankItems(device: SmartHomeDevice, items: Item[]) {
  return [...items].sort((a, b) => itemScore(device, b) - itemScore(device, a));
}

function itemScore(device: SmartHomeDevice, item: Item) {
  const haystack = [item.name, item.category, item.manufacturer, item.model, item.location, item.space?.name, item.itemType]
    .join(" ")
    .toLowerCase();
  const words = device.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  let score = words.filter((w) => haystack.includes(w)).length;
  if (device.roomName && haystack.includes(device.roomName.toLowerCase())) score += 3;
  if (device.deviceType === "tv" && (haystack.includes("tv") || haystack.includes("oled"))) score += 5;
  if (device.deviceType === "light" && (haystack.includes("light") || haystack.includes("lampe"))) score += 4;
  return score;
}
