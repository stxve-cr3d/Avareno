import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Archive,
  ArrowRight,
  BellRing,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FileText,
  FolderOpen,
  Home,
  Link2,
  MessageCircle,
  Monitor,
  Package,
  Plus,
  PlugZap,
  RadioTower,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Volume2,
  Wifi,
  Wrench
} from "lucide-react";
import { Link } from "react-router-dom";
import { api, isoDate } from "../lib/api";
import type { Item, LocalDiscoveryCandidate, LocalDiscoveryPayload, SmartHomeDevice, SmartHomeInsight, SmartHomePayload } from "../lib/types";
import homeMemoryCube from "../assets/generated/avareno-home-memory-cube-dark.png";

const providerLabels: Record<string, string> = {
  SAMSUNG_SMARTTHINGS: "Samsung SmartThings",
  BAMBU_LAB: "Device setup",
  ALEXA: "Alexa",
  GOOGLE_HOME: "Google Home",
  APPLE_HOME: "Apple Home",
  HOME_ASSISTANT: "Home Assistant",
  MATTER: "Matter",
  LOCAL_DISCOVERY: "Local Discovery"
};

const discoveryFilterLabels: Record<string, string> = {
  all: "All",
  printer: "Devices",
  hub: "Hubs",
  media: "TV / media",
  network: "Router / web",
  camera: "Cameras",
  storage: "Storage",
  unknown: "Unknown"
};

const discoveryFilterOrder = ["all", "media", "hub", "network", "camera", "storage", "unknown"];

const uiTextReplacements: [RegExp, string][] = [
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
  return uiTextReplacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function deviceTypeLabel(deviceType: string | null | undefined) {
  if (!deviceType) return "";
  return cleanUiText(deviceType.replace(/_/g, " "));
}

type BambuDiagnostic = {
  target: string;
  status: string;
  summary: string;
  ports: { port: number; label: string; meaning: string; open: boolean }[];
  nextSteps: string[];
  canPrepareSetup: boolean;
  suggestedSetup: {
    host: string;
    model: string;
    roomName: string;
  };
  matchedItem?: {
    id: string;
    name: string;
    location?: string | null;
  } | null;
};

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
      rawJson: {
        accessMode: "DEMO",
        documents: 18,
        warrantyProgress: 72,
        openLoops: 3,
        rooms: 6
      },
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
  localDiscovery: {
    mode: "DEMO",
    enabled: false,
    note: "Demo fallback keeps the Smart UI visible when backend data is unavailable."
  },
  wow: {
    label: "object-aware control",
    promise: "Connect devices to the real things they belong to."
  }
};

const smartFallbackDiscovery: LocalDiscoveryPayload = {
  mode: "DEMO",
  enabled: false,
  scannedAt: "2026-06-23T18:00:00.000Z",
  scope: "demo",
  candidates: [
    {
      id: "demo-local-tv",
      name: "LG OLED C3",
      host: "192.168.1.55",
      provider: "LOCAL_DISCOVERY",
      deviceType: "tv",
      category: "media",
      roomName: "Wohnzimmer",
      confidence: 0.92,
      confidenceLabel: "92%",
      signals: ["LAN candidate", "media device", "known room"],
      capabilities: ["documents", "warranty", "networkPresence"],
      identity: {
        label: "Very likely the living room TV",
        evidence: ["Media-like local service", "Room match"]
      },
      connectHint: "Link this device to the matching product memory.",
      recommendedAction: "Link device",
      manualCheck: "Confirm the name in your router client list.",
      filterTags: ["media", "tv"]
    },
    {
      id: "demo-local-router",
      name: "Home network gateway",
      host: "192.168.1.1",
      provider: "LOCAL_DISCOVERY",
      deviceType: "router",
      category: "network",
      roomName: "Home",
      confidence: 0.68,
      confidenceLabel: "68%",
      signals: ["gateway", "web admin", "network service"],
      capabilities: ["networkPresence"],
      identity: {
        label: "Likely network infrastructure",
        evidence: ["Gateway-style address", "Router-like service"]
      },
      connectHint: "Use the router client list to confirm the device IP.",
      recommendedAction: "Identify first",
      manualCheck: "Look for known device names in the router client list.",
      filterTags: ["network", "router"]
    }
  ]
};

export function SmartHome() {
  const [payload, setPayload] = useState<SmartHomePayload | null>(null);
  const [discovery, setDiscovery] = useState<LocalDiscoveryPayload | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [probeHost, setProbeHost] = useState("");
  const [discoveryFilter, setDiscoveryFilter] = useState("all");
  const [bambuDiagnostic, setBambuDiagnostic] = useState<BambuDiagnostic | null>(null);
  const [bambuSetup, setBambuSetup] = useState({
    host: "192.168.1.55",
    model: "Smart device",
    serial: "",
    accessCode: "",
    roomName: "Wohnzimmer",
    createItem: true
  });

  async function load() {
    try {
      const [smartHome, allItems] = await Promise.all([api<SmartHomePayload>("/api/smart-home"), api<Item[]>("/api/items")]);
      setPayload(smartHome);
      setItems(allItems);
    } catch (error) {
      console.warn("Smart home API unavailable; using demo fallback.", error);
      setPayload(smartFallbackPayload);
      setItems([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const linkedCount = payload?.devices.filter((device) => device.itemId).length ?? 0;
  const liveReady = payload?.providers.some((provider) => provider.id === "SAMSUNG_SMARTTHINGS" && provider.tokenConfigured) ?? false;
  const mainDevice = payload?.devices.find((device) => device.deviceType !== "3d_printer") ?? payload?.devices[0] ?? null;
  const localDiscovery = payload?.localDiscovery ?? { mode: "DEMO", enabled: false, note: "Local search only runs when the user starts it." };
  const insights = payload?.insights ?? [];
  const discoveryCandidates = discovery?.candidates ?? [];
  const discoveryFilterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: discoveryCandidates.length };
    for (const candidate of discoveryCandidates) {
      for (const filter of discoveryFilterOrder.filter((entry) => entry !== "all")) {
        if (candidateMatchesDiscoveryFilter(candidate, filter)) {
          counts[filter] = (counts[filter] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [discoveryCandidates]);
  const filteredDiscoveryCandidates = useMemo(
    () => discoveryCandidates.filter((candidate) => candidateMatchesDiscoveryFilter(candidate, discoveryFilter)),
    [discoveryCandidates, discoveryFilter]
  );

  async function connect(provider: string) {
    setBusy(`connect-${provider}`);
    try {
      await api("/api/smart-home/providers/connect", {
        method: "POST",
        body: JSON.stringify({ provider })
      });
      setMessage(`${providerLabels[provider] ?? provider} prepared`);
      await load();
    } finally {
      setBusy("");
    }
  }

  async function sync(provider: string) {
    setBusy(`sync-${provider}`);
    try {
      const result = await api<{ source: string; synced: number }>(`/api/smart-home/providers/${provider}/sync`, { method: "POST" });
      setMessage(`${result.synced} devices synced from ${result.source}`);
      await load();
    } finally {
      setBusy("");
    }
  }

  async function command(deviceId: string, action: string) {
    setBusy(`${deviceId}-${action}`);
    try {
      const result = await api<{ status: string }>(`/api/smart-home/devices/${deviceId}/commands`, {
        method: "POST",
        body: JSON.stringify({ command: action })
      });
      setMessage(`${action.replace("_", " ")} ${result.status.toLowerCase()}`);
      await load();
    } finally {
      setBusy("");
    }
  }

  async function linkItem(deviceId: string, itemId: string) {
    setBusy(`link-${deviceId}`);
    try {
      await api(`/api/smart-home/devices/${deviceId}/link`, {
        method: "PATCH",
        body: JSON.stringify({ itemId: itemId || null })
      });
      setMessage(itemId ? "Smart thing linked to product" : "Smart thing unlinked");
      await load();
    } finally {
      setBusy("");
    }
  }

  async function discoverLocal() {
    setBusy("local-discover");
    try {
      const result = await api<LocalDiscoveryPayload>("/api/smart-home/local/discover", { method: "POST" });
      setDiscovery(result);
      setMessage(`${result.candidates.length} local candidates found in ${result.mode}`);
    } catch (error) {
      console.warn("Local discovery unavailable; using demo candidates.", error);
      setDiscovery(smartFallbackDiscovery);
      setMessage(`${smartFallbackDiscovery.candidates.length} demo local candidates found`);
    } finally {
      setBusy("");
    }
  }

  async function probeLocal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!probeHost.trim()) return;
    setBusy("local-probe");
    try {
      const result = await api<LocalDiscoveryPayload>("/api/smart-home/local/probe", {
        method: "POST",
        body: JSON.stringify({ host: probeHost.trim() })
      });
      setDiscovery(result);
      setMessage(
        result.candidates.length
          ? `${result.candidates[0].host} answered in targeted probe`
          : `${result.target ?? probeHost} did not answer on known smart-home ports`
      );
    } catch (error) {
      console.warn("Local probe unavailable; using demo probe result.", error);
      setDiscovery({ ...smartFallbackDiscovery, target: probeHost.trim() });
      setMessage(`${probeHost.trim()} prepared as demo probe result`);
    } finally {
      setBusy("");
    }
  }

  async function importCandidate(candidate: LocalDiscoveryCandidate) {
    setBusy(`import-${candidate.id}`);
    try {
      await api("/api/smart-home/local/import", {
        method: "POST",
        body: JSON.stringify({ candidateId: candidate.id, host: candidate.host })
      });
      setMessage("Local device imported as smart thing");
      await load();
    } finally {
      setBusy("");
    }
  }

  function useCandidateForBambu(candidate: LocalDiscoveryCandidate) {
    const host = candidate.host.split(":")[0];
    setBambuSetup((current) => ({
      ...current,
      host,
      roomName: candidate.roomName || current.roomName
    }));
    setMessage(`${host} prepared for device setup`);
  }

  async function activateInsight(insight: SmartHomeInsight) {
    if (insight.actionType === "DISCOVER_LOCAL") {
      await discoverLocal();
      return;
    }
    if (insight.actionType === "LINK_ITEM") {
      setMessage("Choose a physical product in the smart thing card below");
      return;
    }
    setBusy(`insight-${insight.id}`);
    try {
      const result = await api<{ message: string }>(`/api/smart-home/insights/${insight.id}/activate`, { method: "POST" });
      setMessage(result.message);
      await load();
    } finally {
      setBusy("");
    }
  }

  async function setupBambu(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("bambu-setup");
    try {
      const result = await api<{ message: string }>("/api/smart-home/bambu/setup", {
        method: "POST",
        body: JSON.stringify(bambuSetup)
      });
      setMessage(result.message);
      await load();
    } finally {
      setBusy("");
    }
  }

  async function diagnoseBambu() {
    if (!bambuSetup.host.trim()) return;
    setBusy("bambu-diagnose");
    try {
      const result = await api<BambuDiagnostic>("/api/smart-home/bambu/diagnose", {
        method: "POST",
        body: JSON.stringify({ host: bambuSetup.host.trim() })
      });
      setBambuDiagnostic(result);
      setBambuSetup((current) => ({
        ...current,
        host: result.suggestedSetup.host || current.host,
        model: current.model || result.suggestedSetup.model,
        roomName: current.roomName || result.suggestedSetup.roomName
      }));
      setMessage(result.summary);
    } finally {
      setBusy("");
    }
  }

  async function recordBambuEvent(deviceId: string, eventType: string) {
    setBusy(`${deviceId}-event-${eventType}`);
    try {
      const result = await api<{ message: string }>("/api/smart-home/bambu/events", {
        method: "POST",
        body: JSON.stringify({
          deviceId,
          eventType,
          jobName: eventType === "FILAMENT_LOW" ? "Loaded spool" : "Avareno test print",
          filamentRemaining: eventType === "FILAMENT_LOW" ? 8 : undefined,
          nozzleTemp: eventType === "STARTED" ? 218 : eventType === "FINISHED" ? 38 : undefined,
          bedTemp: eventType === "STARTED" ? 62 : eventType === "FINISHED" ? 31 : undefined
        })
      });
      setMessage(result.message);
      await load();
    } finally {
      setBusy("");
    }
  }

  function updateBambu(field: keyof typeof bambuSetup, value: string | boolean) {
    setBambuSetup((current) => ({ ...current, [field]: value }));
  }

  const suggestions = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const device of payload?.devices ?? []) {
      map.set(device.id, rankItems(device, items));
    }
    return map;
  }, [items, payload?.devices]);

  if (!payload) return <div className="smart-loading-screen">Loading Smart Home...</div>;

  const isOnline = mainDevice ? !["offline", "error"].includes(String(mainDevice.status ?? "").toLowerCase()) : true;
  const roomName = (mainDevice?.roomName ?? bambuSetup.roomName) || "Wohnzimmer";
  const primaryInsight = insights.find((insight) => insight.status !== "ACTIVE") ?? insights[0];
  const primaryPlanLabel = mainDevice ? cleanUiText(primaryInsight?.title ?? "3 recommendations") : "3 recommendations";
  const openInsightCount = insights.filter((insight) => insight.status !== "ACTIVE").length;
  const dashboardDocumentCount = items.reduce((count, item) => count + (item.documents?.length ?? 0), 0) || 18;
  const warrantyCount = items.filter((item) => item.warrantyUntil).length || 4;
  const roomCount = new Set(items.map((item) => item.location || item.space?.name).filter(Boolean)).size || 6;
  const matchItem = items.find((item) => /oled|tv|fernseher/i.test([item.name, item.category, item.manufacturer, item.model].join(" "))) ?? null;
  const matchName = matchItem?.name ?? "LG OLED C3";
  const appPath = (path: string) => (path === "/" ? "/app" : `/app${path}`);
  const scrollToPanel = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="smart-page smart-app-page">
      <section className="smart-mobile-shell" aria-label="Avareno Smart mobile control">
        <div className="smart-status-row" aria-hidden="true">
          <span>9:41</span>
          <span className="smart-status-icons">
            <Wifi size={17} />
            <span>100</span>
          </span>
        </div>

        <header className="smart-mobile-header">
          <div>
            <button className="smart-home-selector" type="button">
              Zuhause
              <ChevronDown size={20} />
            </button>
            <p className={isOnline ? "smart-online-label" : "smart-online-label smart-offline-label"}>
              <span />
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
          <div className="smart-header-actions" aria-label="Smart controls">
            <button type="button" aria-label="Notifications">
              <BellRing size={22} />
            </button>
            <button onClick={() => scrollToPanel("bambu-setup-panel")} type="button" aria-label="Add device">
              <Plus size={23} />
            </button>
          </div>
        </header>

        <div className="smart-context-tabs" aria-label="Device context">
          <Link className="smart-context-tab smart-context-tab-active" to={appPath("/")}>
            <Home size={18} />
            Avareno
          </Link>
          <Link className="smart-context-tab" to={appPath("/items")}>
            <Monitor size={18} />
            {roomName === "Werkstatt" ? "Wohnzimmer" : roomName}
          </Link>
        </div>

        <section className="smart-device-stage" aria-label="Avareno home memory overview">
          <SmartTelemetryPill to={appPath("/reports/home-binder")} className="smart-pill-nozzle" icon={<FileText size={22} />} label="Dokumente" value={`${dashboardDocumentCount}`} />
          <SmartTelemetryPill to={appPath("/items")} className="smart-pill-bed" icon={<ShieldCheck size={22} />} label="Garantien" value={`${warrantyCount}`} />
          <SmartTelemetryPill onClick={() => scrollToPanel("smart-plans-panel")} className="smart-pill-chamber" icon={<CircleDot size={22} />} label="Offene Loops" value={`${openInsightCount || 3}`} />
          <SmartTelemetryPill to={appPath("/items")} className="smart-pill-filament" icon={<Home size={22} />} label="Räume" value={`${roomCount}`} />
          <Link className="smart-device-render" to={appPath("/items")} aria-label="Open Home Memory">
            <img src={homeMemoryCube} alt="" />
          </Link>
        </section>

        <div className="smart-device-title-row">
          <span className="smart-device-cube">
            <Archive size={25} />
            <i />
          </span>
          <div>
            <h1>Home Memory</h1>
            <p>Dinge, Belege, Garantien</p>
          </div>
          <Link className="smart-stage-next" to={appPath("/items")} aria-label="Open things">
            <ChevronRight size={24} />
          </Link>
        </div>

        <div className="smart-stage-dots" aria-hidden="true">
          <span />
          <span />
        </div>

        <section className="smart-queue-card">
          <div className="smart-queue-art">
            <ShieldCheck size={34} />
          </div>
          <div className="smart-queue-copy">
            <div className="smart-queue-head">
              <div>
                <h2>Heute wichtig</h2>
                <p>Garantie läuft bald ab</p>
              </div>
              <span>Aktiv</span>
            </div>
            <div className="smart-queue-progress" aria-label="72% complete">
              <span style={{ width: "72%" }} />
            </div>
            <strong>{matchName}</strong>
            <p className="smart-queue-meta">Endet in 45 Tagen | 26. Juli 2026</p>
          </div>
          <button
            className="smart-queue-pause"
            onClick={() => scrollToPanel("smart-plans-panel")}
            type="button"
            aria-label="Open reminder"
          >
            <ChevronRight size={23} />
          </button>
        </section>

        <section className="smart-object-match-card">
          <span className="smart-object-match-thumb">
            <Monitor size={26} />
          </span>
          <div>
            <h2>Object Match</h2>
            <p>{matchName}</p>
            <span>Wohnzimmer - {dashboardDocumentCount} Dokumente - 94% Match</span>
            <strong>
              <CheckCircle2 size={17} />
              Matched with product memory
            </strong>
          </div>
          <Link to={matchItem ? appPath(`/items/${matchItem.id}`) : appPath("/items")} aria-label="Open matched product">
            <ChevronRight size={21} />
          </Link>
        </section>

        <section className="smart-command-grid" aria-label="Device Control">
          <Link className="smart-command-card" to={appPath("/reports/home-binder")}>
            <FolderOpen size={29} />
            <span>
              <strong>Dokumente</strong>
              <small>{dashboardDocumentCount} Dateien</small>
            </span>
            <ChevronRight size={20} />
          </Link>
          <button onClick={discoverLocal} disabled={busy === "local-discover"} type="button">
            <PlugZap size={31} />
            <span>
              <strong>Geräte</strong>
              <small>{busy === "local-discover" ? "Suche..." : `${linkedCount || 7} online`}</small>
            </span>
            <ChevronRight size={20} />
          </button>
          <Link className="smart-command-card" to={appPath("/capture/loop")}>
            <Wrench size={29} />
            <span>
              <strong>Reparaturen</strong>
              <small>2 Historien</small>
            </span>
            <ChevronRight size={20} />
          </Link>
        </section>

        <button className="smart-plans-row" onClick={() => scrollToPanel("smart-plans-panel")} type="button">
          <span>
            <Sparkles size={24} />
          </span>
          <span>
            <strong>Smart Plans</strong>
                  <small>{primaryPlanLabel}</small>
          </span>
          <em>{openInsightCount || insights.length} new</em>
          <ChevronRight size={21} />
        </button>

        <Link className="smart-assistant-fab" to={appPath("/ask")} aria-label="Ask Avareno">
          <Bot size={31} />
        </Link>

        <SmartBottomNav appPath={appPath} />
      </section>

      <section className="smart-workbench" aria-label="Avareno Smart workbench">
        <div className="smart-workbench-head">
          <div>
            <p>Avareno App Workspace</p>
            <h2>Dein Zuhause als Arbeitsfläche</h2>
            <span>
              Links ist die mobile Home-Ansicht. Rechts liegen die Module, Listen und Setup-Flows, die später mit Usern, Rollen und Haushalten wachsen.
            </span>
          </div>
          <div className="smart-workbench-signals">
            <Signal icon={<Wifi />} label="Modus" value={payload.mode} />
            <Signal icon={<Link2 />} label="Verknüpft" value={`${linkedCount}/${payload.devices.length}`} />
            <Signal icon={<RadioTower />} label="Status" value={liveReady ? "configured" : "demo-safe"} />
          </div>
        </div>

        {message ? <p className="smart-message-pill">{message}</p> : null}

        <section className="smart-insight-panel rounded-lg" id="smart-plans-panel">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-muted">Smart Plans</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-ink">Empfehlungen aus echten Objekten</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">
                Avareno macht aus Dingen, Belegen, Geräten und Fristen konkrete nächste Schritte.
              </p>
            </div>
            <span className="smart-insight-count">
              <BellRing size={16} />
              {openInsightCount} open
            </span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {insights.length ? (
              insights.slice(0, 3).map((insight) => (
                <InsightCard busy={busy} insight={insight} key={insight.id} onActivate={activateInsight} />
              ))
            ) : (
              <div className="smart-local-empty lg:col-span-3">Connect or discover a smart thing to get product-aware suggestions.</div>
            )}
          </div>
        </section>

        <section className="smart-bambu-panel rounded-lg" id="bambu-setup-panel">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase text-muted">Geräte-Setup</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-ink">Geräte als echte Objekte</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                Geräte-ID, Produktprofil, Raum, Dokumente und Care-Erinnerungen werden in einem Flow verbunden.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="smart-capability">LAN-ready</span>
                <span className="smart-capability">product match</span>
                <span className="smart-capability">care alerts</span>
              </div>
            </div>

            <form className="smart-bambu-form" onSubmit={setupBambu}>
              <div className="smart-bambu-fields">
                <label>
                  <span>Modell</span>
                  <input value={bambuSetup.model} onChange={(event) => updateBambu("model", event.target.value)} />
                </label>
                <label>
                  <span>IP-Adresse</span>
                  <input value={bambuSetup.host} onChange={(event) => updateBambu("host", event.target.value)} required />
                </label>
                <label>
                  <span>Serial</span>
                  <input value={bambuSetup.serial} onChange={(event) => updateBambu("serial", event.target.value)} placeholder="optional" />
                </label>
                <label>
                  <span>Zugriffscode</span>
                  <input value={bambuSetup.accessCode} onChange={(event) => updateBambu("accessCode", event.target.value)} placeholder="optional for MVP" type="password" />
                </label>
                <label>
                  <span>Raum</span>
                  <input value={bambuSetup.roomName} onChange={(event) => updateBambu("roomName", event.target.value)} />
                </label>
                <label className="smart-bambu-check">
                  <input checked={bambuSetup.createItem} onChange={(event) => updateBambu("createItem", event.target.checked)} type="checkbox" />
                  <span>Avareno-Objekt anlegen</span>
                </label>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button className="smart-local-button" disabled={busy === "bambu-setup"} type="submit">
                  <PlugZap size={16} />
                  {busy === "bambu-setup" ? "Wird vorbereitet..." : "Gerät vorbereiten"}
                </button>
                <button className="smart-local-button smart-local-button-light" disabled={busy === "bambu-diagnose"} onClick={diagnoseBambu} type="button">
                  <RadioTower size={16} />
                  {busy === "bambu-diagnose" ? "Teste..." : "IP testen"}
                </button>
              </div>
              {bambuDiagnostic ? <BambuDiagnosticPanel diagnostic={bambuDiagnostic} /> : null}
            </form>
          </div>
        </section>

        <section className="smart-local-panel rounded-lg">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase text-muted">Local Discovery</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-ink">Lokale Geräte finden</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                Avareno sucht nur, wenn du es startest. Standard bleibt demo-safe; echte LAN-Suche läuft erst, wenn der Server dafür aktiviert ist.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="smart-capability">{localDiscovery.mode}</span>
                <span className="smart-capability">{localDiscovery.enabled ? "LAN probes enabled" : "demo candidates"}</span>
                <span className="smart-capability">{discoveryCandidates.length} found</span>
              </div>
              <button className="smart-local-button mt-5" onClick={discoverLocal} disabled={busy === "local-discover"} type="button">
                <Search size={16} />
                {busy === "local-discover" ? "Searching..." : "Local Discovery"}
              </button>
              <form className="smart-probe-form" onSubmit={probeLocal}>
                <label>
                  <span>Exact IP or host</span>
                  <input value={probeHost} onChange={(event) => setProbeHost(event.target.value)} placeholder="192.168.178.44 or 192.168.178.44:8883" />
                </label>
                <button disabled={busy === "local-probe"} type="submit">
                  <RadioTower size={16} />
                  {busy === "local-probe" ? "Checking..." : "Check IP"}
                </button>
              </form>
            </div>

            <div className="grid gap-3">
              {discovery ? (
                discovery.candidates.length ? (
                  <>
                    <DiscoveryFilterBar activeFilter={discoveryFilter} counts={discoveryFilterCounts} onChange={setDiscoveryFilter} />
                    {filteredDiscoveryCandidates.length ? (
                      filteredDiscoveryCandidates.map((candidate) => (
                        <LocalCandidateCard busy={busy} candidate={candidate} key={candidate.id} onImport={importCandidate} onUseForBambu={useCandidateForBambu} />
                      ))
                    ) : (
                      <div className="smart-local-empty">No candidates in this filter. Try All or probe the exact device IP.</div>
                    )}
                  </>
                ) : (
                  <div className="smart-local-empty">
                    No local candidates found{discovery.target ? ` at ${discovery.target}` : ""}. Check the device IP, LAN mode, firewall, or router client list.
                  </div>
                )
              ) : (
                <div className="smart-local-empty">Run discovery to see local candidates and Avareno product matches.</div>
              )}
            </div>
          </div>
        </section>

        <section className="smart-provider-grid">
          {payload.providers.map((provider) => (
            <div className="smart-provider" key={provider.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-muted">{provider.mode}</p>
                  <h2 className="mt-1 text-xl font-black text-ink">{providerLabels[provider.id] ?? cleanUiText(provider.name)}</h2>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white">
                  <PlugZap size={17} />
                </span>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-muted">{provider.authNote}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="smart-mini-action" onClick={() => connect(provider.id)} disabled={busy === `connect-${provider.id}`} type="button">
                  Connect
                </button>
                <button className="smart-mini-action smart-mini-action-light" onClick={() => sync(provider.id)} disabled={busy === `sync-${provider.id}` || provider.mode === "PLANNED" || provider.id === "LOCAL_DISCOVERY"} type="button">
                  <RefreshCw size={15} /> Sync
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="smart-device-ledger">
          <div className="space-y-3">
            {payload.devices.length ? (
              payload.devices.map((device) => (
                <SmartDeviceCard
                  busy={busy}
                  device={device}
                  items={suggestions.get(device.id) ?? []}
                  key={device.id}
                  onCommand={command}
                  onLink={linkItem}
                />
              ))
            ) : (
              <div className="smart-panel rounded-lg p-5 text-sm font-bold text-muted">No smart devices yet. Sync Samsung SmartThings to create the first Object Control card.</div>
            )}
          </div>

          <aside className="smart-panel rounded-lg p-4 lg:sticky lg:top-28 lg:self-start">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-muted">Recent commands</p>
                <h2 className="mt-1 text-2xl font-black text-ink">Control history</h2>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-leaf/10 text-leaf">
                <ShieldCheck size={18} />
              </span>
            </div>
            <div className="mt-5 grid gap-2">
              {payload.commands.length ? (
                payload.commands.map((command) => (
                  <div className="smart-command-row" key={command.id}>
                    <p>{command.deviceName ?? "Device"}</p>
                    <strong>{command.command.replace("_", " ")}</strong>
                    <span>
                      {command.status} - {isoDate(command.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-line bg-white/70 p-4 text-sm font-bold text-muted">No commands yet.</div>
              )}
            </div>
          </aside>
        </section>
      </section>
    </div>
  );
}

function SmartTelemetryPill({
  className,
  icon,
  label,
  onClick,
  to,
  value
}: {
  className: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  to?: string;
  value: string;
}) {
  const content = (
    <>
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </>
  );

  if (to) {
    return (
      <Link className={`smart-telemetry-pill ${className}`} to={to}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button className={`smart-telemetry-pill ${className}`} onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className={`smart-telemetry-pill ${className}`}>
      {content}
    </div>
  );
}

function SmartBottomNav({ appPath }: { appPath: (path: string) => string }) {
  return (
    <nav className="smart-bottom-nav" aria-label="Avareno mobile sections">
      <Link to={appPath("/items")}>
        <Archive size={24} />
        <span>Dinge</span>
      </Link>
      <Link className="active" to={appPath("/")}>
        <Home size={25} />
        <span>Smart</span>
      </Link>
      <Link to={appPath("/ask")}>
        <MessageCircle size={25} />
        <span>Ask</span>
      </Link>
      <Link to={appPath("/rewards")}>
        <UserRound size={24} />
        <span>Ich</span>
      </Link>
    </nav>
  );
}

function InsightCard({
  busy,
  insight,
  onActivate
}: {
  busy: string;
  insight: SmartHomeInsight;
  onActivate: (insight: SmartHomeInsight) => void;
}) {
  const isActive = insight.status === "ACTIVE";
  return (
    <article className={`smart-insight-card ${isActive ? "smart-insight-card-active" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="smart-insight-icon">
          {isActive ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
        </span>
        <span className="smart-insight-priority">{isActive ? "planned" : insight.priority}</span>
      </div>
      <p className="mt-4 text-xs font-black uppercase text-muted">{cleanUiText(insight.signal)}</p>
      <h3 className="mt-1 text-xl font-black leading-tight text-ink">{cleanUiText(insight.title)}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-muted">{cleanUiText(insight.subtitle)}</p>
      {insight.itemName ? <p className="mt-3 truncate text-sm font-black text-ink">{cleanUiText(insight.itemName)}</p> : null}
      {insight.automation ? (
        <div className="smart-automation-preview">
          <div>
            <span>Trigger</span>
            <strong>{cleanUiText(insight.automation.trigger)}</strong>
          </div>
          <div>
            <span>Action</span>
            <strong>{cleanUiText(insight.automation.action)}</strong>
          </div>
          <div>
            <span>Outcome</span>
            <strong>{cleanUiText(insight.automation.outcome)}</strong>
          </div>
          <div className="smart-automation-meta">
            {insight.automation.nextRun ? <small>{insight.automation.nextRun}</small> : null}
            {insight.automation.channels?.slice(0, 3).map((channel) => (
              <small key={channel}>{channel}</small>
            ))}
          </div>
        </div>
      ) : null}
      <button
        className="smart-mini-action mt-4 w-full"
        disabled={isActive || busy === `insight-${insight.id}`}
        onClick={() => onActivate(insight)}
        type="button"
      >
        {isActive ? "Already planned" : busy === `insight-${insight.id}` ? "Creating..." : cleanUiText(insight.cta)}
      </button>
    </article>
  );
}

function BambuDiagnosticPanel({ diagnostic }: { diagnostic: BambuDiagnostic }) {
  return (
    <div className="bambu-diagnostic">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted">{diagnostic.status.replace("_", " ")}</p>
          <h3 className="mt-1 text-lg font-black text-ink">{cleanUiText(diagnostic.target)}</h3>
        </div>
        <span className={`bambu-diagnostic-status ${diagnostic.status === "LAN_READY" ? "bambu-diagnostic-status-good" : ""}`}>
          {diagnostic.status === "LAN_READY" ? <CheckCircle2 size={15} /> : <RadioTower size={15} />}
          {diagnostic.status === "LAN_READY" ? "Ready" : "Check"}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-muted">{cleanUiText(diagnostic.summary)}</p>

      <div className="bambu-port-grid">
        {diagnostic.ports.map((port) => (
          <div className={`bambu-port ${port.open ? "bambu-port-open" : ""}`} key={port.port}>
            <p>{cleanUiText(port.label)}</p>
            <strong>
              {port.port} {port.open ? "open" : "closed"}
            </strong>
          </div>
        ))}
      </div>

      <div className="bambu-next-steps">
        {diagnostic.nextSteps.slice(0, 4).map((step) => (
          <p key={step}>{cleanUiText(step)}</p>
        ))}
      </div>
    </div>
  );
}

function SmartDeviceCard({
  busy,
  device,
  items,
  onCommand,
  onLink
}: {
  busy: string;
  device: SmartHomeDevice;
  items: Item[];
  onCommand: (deviceId: string, action: string) => void;
  onLink: (deviceId: string, itemId: string) => void;
}) {
  const linked = Boolean(device.itemId);
  const imageUrl = device.deviceType === "3d_printer" ? "" : device.itemImageUrl;
  return (
    <article className="smart-device-card">
      <div className="smart-device-media">
        {imageUrl ? <img src={imageUrl} alt="" /> : <Bot size={28} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-muted">{providerLabels[device.provider] ?? device.provider}</p>
            <h2 className="mt-1 break-words text-2xl font-black text-ink">{device.name}</h2>
            <p className="mt-1 text-sm font-semibold text-muted">
              {[device.roomName, deviceTypeLabel(device.deviceType), cleanUiText(device.status)].filter(Boolean).join(" - ")}
            </p>
          </div>
          <span className={`smart-link-badge ${linked ? "smart-link-badge-on" : ""}`}>
            {linked ? <CheckCircle2 size={14} /> : <Link2 size={14} />}
            {linked ? "linked" : "needs product"}
          </span>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.42fr)]">
          <div className="smart-device-object">
            <p>Product match</p>
            {linked ? (
              <Link to={`/items/${device.itemId}`} className="group mt-1 inline-flex items-center gap-2 text-base font-black text-ink">
                {device.itemName}
                <ArrowRight className="transition group-hover:translate-x-0.5" size={16} />
              </Link>
            ) : (
              <strong>Choose the physical thing this belongs to.</strong>
            )}
            <select value={device.itemId ?? ""} onChange={(event) => onLink(device.id, event.target.value)} className="smart-select">
              <option value="">No linked product</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="smart-device-controls">
            <button disabled={busy === `${device.id}-power_on`} onClick={() => onCommand(device.id, "power_on")} type="button">
              <PlugZap size={15} /> On
            </button>
            <button disabled={busy === `${device.id}-power_off`} onClick={() => onCommand(device.id, "power_off")} type="button">
              Off
            </button>
            <button disabled={busy === `${device.id}-volume_up`} onClick={() => onCommand(device.id, "volume_up")} type="button">
              <Volume2 size={15} /> +
            </button>
            <button disabled={busy === `${device.id}-mute`} onClick={() => onCommand(device.id, "mute")} type="button">
              Mute
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {device.capabilities.slice(0, 5).map((capability) => (
            <span className="smart-capability" key={capability}>
              {cleanUiText(capability)}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function DiscoveryFilterBar({
  activeFilter,
  counts,
  onChange
}: {
  activeFilter: string;
  counts: Record<string, number>;
  onChange: (filter: string) => void;
}) {
  const filters = discoveryFilterOrder.filter((filter) => filter === "all" || counts[filter]);
  return (
    <div className="smart-discovery-filter">
      <div>
        <p>Filter found devices</p>
        <strong>Pick the type before connecting</strong>
      </div>
      <div className="smart-discovery-filter-chips">
        {filters.map((filter) => (
          <button className={activeFilter === filter ? "active" : ""} key={filter} onClick={() => onChange(filter)} type="button">
            {discoveryFilterLabels[filter] ?? filter}
            <span>{counts[filter] ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LocalCandidateCard({
  busy,
  candidate,
  onImport,
  onUseForBambu
}: {
  busy: string;
  candidate: LocalDiscoveryCandidate;
  onImport: (candidate: LocalDiscoveryCandidate) => void;
  onUseForBambu: (candidate: LocalDiscoveryCandidate) => void;
}) {
  const category = candidate.category ?? candidate.deviceType ?? "unknown";
  const canUseForSetup = category === "unknown" || category === "printer" || candidate.deviceType === "3d_printer" || candidate.filterTags?.includes("printer");
  const confidence = candidate.confidenceLabel ?? `${Math.round(candidate.confidence * 100)}%`;
  const identityLabel = cleanUiText(candidate.identity?.label ?? "Avareno needs more evidence");
  const evidence = candidate.identity?.evidence ?? [];
  return (
    <article className="smart-local-candidate">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-muted">{candidate.host}</p>
          <h3 className="mt-1 break-words text-xl font-black text-ink">{candidate.name}</h3>
          <p className="mt-1 text-sm font-semibold text-muted">
            {[candidate.roomName, discoveryFilterLabels[category] ?? deviceTypeLabel(category), `${confidence} confidence`].filter(Boolean).join(" - ")}
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf/10 text-leaf">
          <RadioTower size={17} />
        </span>
      </div>

      <div className="smart-candidate-identity">
        <p>Likely identity</p>
        <strong>{identityLabel}</strong>
        {candidate.connectHint ? <span>{cleanUiText(candidate.connectHint)}</span> : null}
        {evidence.length ? (
          <div className="smart-candidate-evidence">
            {evidence.slice(0, 2).map((entry) => (
              <small key={entry}>{cleanUiText(entry)}</small>
            ))}
          </div>
        ) : null}
      </div>

      {candidate.matchedItemName ? (
        <div className="smart-local-match">
          {candidate.matchedItemImageUrl ? <img src={candidate.matchedItemImageUrl} alt="" /> : <Link2 size={18} />}
          <div className="min-w-0">
            <p>Suggested product</p>
            <strong>{cleanUiText(candidate.matchedItemName)}</strong>
          </div>
        </div>
      ) : (
        <div className="smart-local-match">
          <Link2 size={18} />
          <div>
            <p>Suggested product</p>
            <strong>No confident product match yet</strong>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {candidate.signals.slice(0, 4).map((signal) => (
          <span className="smart-capability" key={signal}>
              {cleanUiText(signal)}
          </span>
        ))}
      </div>

      {candidate.manualCheck ? (
        <div className="smart-candidate-guidance">
          <span>Manual check</span>
          <strong>{cleanUiText(candidate.manualCheck)}</strong>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button className="smart-mini-action w-full" onClick={() => onImport(candidate)} disabled={busy === `import-${candidate.id}`} type="button">
          {busy === `import-${candidate.id}` ? "Importing..." : candidate.recommendedAction?.startsWith("Import") ? cleanUiText(candidate.recommendedAction) : "Import"}
        </button>
        {canUseForSetup ? (
          <button className="smart-mini-action smart-mini-action-light w-full" onClick={() => onUseForBambu(candidate)} type="button">
            <PlugZap size={15} /> Use for setup
          </button>
        ) : (
          <div className="smart-local-action-note">{cleanUiText(candidate.recommendedAction ?? "Identify first")}</div>
        )}
      </div>
    </article>
  );
}

function Signal({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="smart-signal">
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function rankItems(device: SmartHomeDevice, items: Item[]) {
  return [...items].sort((left, right) => itemScore(device, right) - itemScore(device, left));
}

function itemScore(device: SmartHomeDevice, item: Item) {
  const haystack = [item.name, item.category, item.manufacturer, item.model, item.location, item.space?.name, item.itemType].join(" ").toLowerCase();
  const words = device.name.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
  let score = words.filter((word) => haystack.includes(word)).length;
  if (device.roomName && haystack.includes(device.roomName.toLowerCase())) score += 3;
  if (device.deviceType === "tv" && (haystack.includes("tv") || haystack.includes("oled"))) score += 5;
  if (device.deviceType === "light" && (haystack.includes("light") || haystack.includes("lampe"))) score += 4;
  return score;
}

function candidateMatchesDiscoveryFilter(candidate: LocalDiscoveryCandidate, filter: string) {
  if (filter === "all") return true;
  const tags = new Set([candidate.category, candidate.deviceType, ...(candidate.filterTags ?? [])].filter(Boolean));
  if (filter === "network") return tags.has("network") || tags.has("router") || tags.has("web");
  return tags.has(filter);
}
