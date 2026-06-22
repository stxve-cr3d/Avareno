import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, BellRing, Bot, CheckCircle2, Link2, Monitor, PlugZap, Printer, RadioTower, RefreshCw, Search, ShieldCheck, Sparkles, Thermometer, Volume2, Wifi } from "lucide-react";
import { Link } from "react-router-dom";
import { api, isoDate } from "../lib/api";
import type { Item, LocalDiscoveryCandidate, LocalDiscoveryPayload, SmartHomeDevice, SmartHomeInsight, SmartHomePayload } from "../lib/types";

const providerLabels: Record<string, string> = {
  SAMSUNG_SMARTTHINGS: "Samsung SmartThings",
  BAMBU_LAB: "Bambu Lab",
  ALEXA: "Alexa",
  GOOGLE_HOME: "Google Home",
  APPLE_HOME: "Apple Home",
  HOME_ASSISTANT: "Home Assistant",
  MATTER: "Matter",
  LOCAL_DISCOVERY: "Local Discovery"
};

const discoveryFilterLabels: Record<string, string> = {
  all: "All",
  printer: "Printers",
  hub: "Hubs",
  media: "TV / media",
  network: "Router / web",
  camera: "Cameras",
  storage: "Storage",
  unknown: "Unknown"
};

const discoveryFilterOrder = ["all", "printer", "hub", "media", "network", "camera", "storage", "unknown"];

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
    model: "Bambu Lab P1S",
    serial: "",
    accessCode: "",
    roomName: "Werkstatt",
    createItem: true
  });

  async function load() {
    const [smartHome, allItems] = await Promise.all([api<SmartHomePayload>("/api/smart-home"), api<Item[]>("/api/items")]);
    setPayload(smartHome);
    setItems(allItems);
  }

  useEffect(() => {
    void load().catch(console.error);
  }, []);

  const linkedCount = payload?.devices.filter((device) => device.itemId).length ?? 0;
  const liveReady = payload?.providers.some((provider) => provider.id === "SAMSUNG_SMARTTHINGS" && provider.tokenConfigured) ?? false;
  const mainDevice = payload?.devices.find((device) => device.deviceType === "3d_printer") ?? payload?.devices.find((device) => device.deviceType === "tv") ?? payload?.devices[0];
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
    setMessage(`${host} prepared for Bambu setup`);
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
          jobName: eventType === "FILAMENT_LOW" ? "Loaded spool" : "Mavora test print",
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

  if (!payload) return <div className="py-12 text-center text-sm font-semibold text-muted">Loading Smart Home...</div>;

  return (
    <div className="smart-page mx-auto max-w-7xl space-y-5">
      <section className="smart-hero rounded-lg">
        <div>
          <p className="text-xs font-black uppercase text-leaf">Mavora Smart Layer</p>
          <h1 className="mt-3 max-w-5xl text-[clamp(3rem,8vw,7.6rem)] font-black leading-[0.88] text-white">
            dein zuhause kennt seine dinge
          </h1>
          <p className="smart-hero-copy mt-5 max-w-2xl text-base font-semibold leading-7">
            SmartThings, Alexa, Google Home, Home Assistant und Matter werden nicht nur verbunden. Sie werden mit echten Produkten, Belegen, Raeumen und Garantie verbunden.
          </p>
        </div>
        <div className="smart-hero-device">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-ink">
            <Monitor size={21} />
          </span>
          <p>{mainDevice?.roomName ?? "Wohnzimmer"}</p>
          <strong>{mainDevice?.name ?? "No device yet"}</strong>
          <small>{mainDevice?.provider ? providerLabels[mainDevice.provider] ?? mainDevice.provider : "Ready for providers"}</small>
        </div>
      </section>

      <section className="smart-signal-grid">
        <Signal icon={<Wifi />} label="Mode" value={payload.mode} />
        <Signal icon={<Link2 />} label="Linked things" value={`${linkedCount}/${payload.devices.length}`} />
        <Signal icon={<RadioTower />} label="Live token" value={liveReady ? "configured" : "demo-safe"} />
        <Signal icon={<Sparkles />} label="Wow" value={payload.wow.label} />
      </section>

      {message ? <p className="rounded-full bg-leaf/10 px-4 py-2 text-sm font-black text-leaf">{message}</p> : null}

      <section className="smart-insight-panel rounded-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-muted">Mavora recommends</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-ink">Smart plans from real objects</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">
              Connected devices become useful reminders: care, warranty context, local identity and missing product matches.
            </p>
          </div>
          <span className="smart-insight-count">
            <BellRing size={16} />
            {insights.filter((insight) => insight.status !== "ACTIVE").length} open
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

      <section className="smart-bambu-panel rounded-lg">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase text-muted">Bambu Lab setup</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-ink">3D printer als echtes Objekt</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-muted">
              Printer, Produktprofil, Raum, Filament-Status und Care-Reminder werden in einem Flow verbunden.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="smart-capability">LAN-ready</span>
              <span className="smart-capability">Bambu Lab</span>
              <span className="smart-capability">print alerts</span>
            </div>
          </div>

          <form className="smart-bambu-form" onSubmit={setupBambu}>
            <div className="smart-bambu-fields">
              <label>
                <span>Model</span>
                <input value={bambuSetup.model} onChange={(event) => updateBambu("model", event.target.value)} />
              </label>
              <label>
                <span>IP address</span>
                <input value={bambuSetup.host} onChange={(event) => updateBambu("host", event.target.value)} required />
              </label>
              <label>
                <span>Serial</span>
                <input value={bambuSetup.serial} onChange={(event) => updateBambu("serial", event.target.value)} placeholder="optional" />
              </label>
              <label>
                <span>Access code</span>
                <input value={bambuSetup.accessCode} onChange={(event) => updateBambu("accessCode", event.target.value)} placeholder="optional for MVP" type="password" />
              </label>
              <label>
                <span>Room</span>
                <input value={bambuSetup.roomName} onChange={(event) => updateBambu("roomName", event.target.value)} />
              </label>
              <label className="smart-bambu-check">
                <input checked={bambuSetup.createItem} onChange={(event) => updateBambu("createItem", event.target.checked)} type="checkbox" />
                <span>Create Mavora product</span>
              </label>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button className="smart-local-button" disabled={busy === "bambu-setup"} type="submit">
                <Printer size={16} />
                {busy === "bambu-setup" ? "Preparing..." : "Prepare Bambu"}
              </button>
              <button className="smart-local-button smart-local-button-light" disabled={busy === "bambu-diagnose"} onClick={diagnoseBambu} type="button">
                <RadioTower size={16} />
                {busy === "bambu-diagnose" ? "Testing..." : "Test Bambu IP"}
              </button>
            </div>
            {bambuDiagnostic ? <BambuDiagnosticPanel diagnostic={bambuDiagnostic} /> : null}
          </form>
        </div>
      </section>

      <section className="smart-local-panel rounded-lg">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <p className="text-xs font-black uppercase text-muted">Opt-in local discovery</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-ink">Lokale Geraete suchen</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-muted">
              Mavora sucht nur, wenn du es startest. Standard ist Demo-safe. Echter LAN-Modus wird erst aktiv, wenn der Server mit MAVORA_ENABLE_LAN_DISCOVERY=1 gestartet wird.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="smart-capability">{localDiscovery.mode}</span>
              <span className="smart-capability">{localDiscovery.enabled ? "LAN probes enabled" : "demo candidates"}</span>
            </div>
            <button className="smart-local-button mt-5" onClick={discoverLocal} disabled={busy === "local-discover"} type="button">
              <Search size={16} />
              {busy === "local-discover" ? "Searching..." : "Lokale Geraete suchen"}
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
              <div className="smart-local-empty">Run discovery to see local candidates and Mavora product matches.</div>
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
                <h2 className="mt-1 text-xl font-black text-ink">{provider.name}</h2>
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

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
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
                onPrinterEvent={recordBambuEvent}
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
    </div>
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
      <p className="mt-4 text-xs font-black uppercase text-muted">{insight.signal}</p>
      <h3 className="mt-1 text-xl font-black leading-tight text-ink">{insight.title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-muted">{insight.subtitle}</p>
      {insight.itemName ? <p className="mt-3 truncate text-sm font-black text-ink">{insight.itemName}</p> : null}
      {insight.automation ? (
        <div className="smart-automation-preview">
          <div>
            <span>Trigger</span>
            <strong>{insight.automation.trigger}</strong>
          </div>
          <div>
            <span>Action</span>
            <strong>{insight.automation.action}</strong>
          </div>
          <div>
            <span>Outcome</span>
            <strong>{insight.automation.outcome}</strong>
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
        {isActive ? "Already planned" : busy === `insight-${insight.id}` ? "Creating..." : insight.cta}
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
          <h3 className="mt-1 text-lg font-black text-ink">{diagnostic.target}</h3>
        </div>
        <span className={`bambu-diagnostic-status ${diagnostic.status === "LAN_READY" ? "bambu-diagnostic-status-good" : ""}`}>
          {diagnostic.status === "LAN_READY" ? <CheckCircle2 size={15} /> : <RadioTower size={15} />}
          {diagnostic.status === "LAN_READY" ? "Ready" : "Check"}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-muted">{diagnostic.summary}</p>

      <div className="bambu-port-grid">
        {diagnostic.ports.map((port) => (
          <div className={`bambu-port ${port.open ? "bambu-port-open" : ""}`} key={port.port}>
            <p>{port.label}</p>
            <strong>
              {port.port} {port.open ? "open" : "closed"}
            </strong>
          </div>
        ))}
      </div>

      <div className="bambu-next-steps">
        {diagnostic.nextSteps.slice(0, 4).map((step) => (
          <p key={step}>{step}</p>
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
  onLink,
  onPrinterEvent
}: {
  busy: string;
  device: SmartHomeDevice;
  items: Item[];
  onCommand: (deviceId: string, action: string) => void;
  onLink: (deviceId: string, itemId: string) => void;
  onPrinterEvent: (deviceId: string, eventType: string) => void;
}) {
  const linked = Boolean(device.itemId);
  const imageUrl = device.itemImageUrl;
  const isPrinter = device.deviceType === "3d_printer";
  const metrics = printerMetrics(device);
  return (
    <article className="smart-device-card">
      <div className="smart-device-media">
        {imageUrl ? <img src={imageUrl} alt="" /> : isPrinter ? <Printer size={30} /> : <Bot size={28} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-muted">{providerLabels[device.provider] ?? device.provider}</p>
            <h2 className="mt-1 break-words text-2xl font-black text-ink">{device.name}</h2>
            <p className="mt-1 text-sm font-semibold text-muted">
              {[device.roomName, device.deviceType, device.status].filter(Boolean).join(" - ")}
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
            {isPrinter ? (
              <>
                <button disabled={busy === `${device.id}-printer_pause`} onClick={() => onCommand(device.id, "printer_pause")} type="button">
                  <Printer size={15} /> Pause
                </button>
                <button disabled={busy === `${device.id}-printer_resume`} onClick={() => onCommand(device.id, "printer_resume")} type="button">
                  Resume
                </button>
                <div className="smart-printer-metric">
                  <Thermometer size={15} />
                  <span>{metrics.nozzle}</span>
                </div>
                <div className="smart-printer-metric">
                  <PlugZap size={15} />
                  <span>{metrics.filament}</span>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {isPrinter ? (
          <>
            <div className="smart-printer-strip">
              <PrinterMetric label="Status" value={metrics.status} />
              <PrinterMetric label="Bed" value={metrics.bed} />
              <PrinterMetric label="Chamber" value={metrics.chamber} />
              <PrinterMetric label="Mode" value={String(device.rawJson?.accessMode ?? "DEMO")} />
            </div>
            <div className="smart-printer-events">
              <button disabled={busy === `${device.id}-event-FINISHED`} onClick={() => onPrinterEvent(device.id, "FINISHED")} type="button">
                <CheckCircle2 size={15} /> Print done
              </button>
              <button disabled={busy === `${device.id}-event-PAUSED`} onClick={() => onPrinterEvent(device.id, "PAUSED")} type="button">
                Paused
              </button>
              <button className="smart-printer-event-alert" disabled={busy === `${device.id}-event-FAILED`} onClick={() => onPrinterEvent(device.id, "FAILED")} type="button">
                Failed
              </button>
              <button disabled={busy === `${device.id}-event-FILAMENT_LOW`} onClick={() => onPrinterEvent(device.id, "FILAMENT_LOW")} type="button">
                Filament low
              </button>
            </div>
          </>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {device.capabilities.slice(0, 5).map((capability) => (
            <span className="smart-capability" key={capability}>
              {capability}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function PrinterMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="smart-printer-stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function printerMetrics(device: SmartHomeDevice) {
  const raw = device.rawJson ?? {};
  const temp = (value: unknown) => (typeof value === "number" ? `${value}C` : "n/a");
  const filament = typeof raw.filamentRemaining === "number" ? `${raw.filamentRemaining}% filament` : "filament n/a";
  return {
    status: String(raw.printStatus ?? device.powerState ?? device.status),
    filament,
    nozzle: temp(raw.nozzleTemp),
    bed: temp(raw.bedTemp),
    chamber: temp(raw.chamberTemp)
  };
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
  const isPrinterLike = category === "printer" || candidate.deviceType === "3d_printer" || candidate.filterTags?.includes("printer");
  const canTryBambu = isPrinterLike || category === "unknown";
  const confidence = candidate.confidenceLabel ?? `${Math.round(candidate.confidence * 100)}%`;
  const identityLabel = candidate.identity?.label ?? "Mavora needs more evidence";
  const evidence = candidate.identity?.evidence ?? [];
  return (
    <article className="smart-local-candidate">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-muted">{candidate.host}</p>
          <h3 className="mt-1 break-words text-xl font-black text-ink">{candidate.name}</h3>
          <p className="mt-1 text-sm font-semibold text-muted">
            {[candidate.roomName, discoveryFilterLabels[category] ?? category, `${confidence} confidence`].filter(Boolean).join(" - ")}
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf/10 text-leaf">
          {isPrinterLike ? <Printer size={17} /> : <RadioTower size={17} />}
        </span>
      </div>

      <div className="smart-candidate-identity">
        <p>Likely identity</p>
        <strong>{identityLabel}</strong>
        {candidate.connectHint ? <span>{candidate.connectHint}</span> : null}
        {evidence.length ? (
          <div className="smart-candidate-evidence">
            {evidence.slice(0, 2).map((entry) => (
              <small key={entry}>{entry}</small>
            ))}
          </div>
        ) : null}
      </div>

      {candidate.matchedItemName ? (
        <div className="smart-local-match">
          {candidate.matchedItemImageUrl ? <img src={candidate.matchedItemImageUrl} alt="" /> : <Link2 size={18} />}
          <div className="min-w-0">
            <p>Suggested product</p>
            <strong>{candidate.matchedItemName}</strong>
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
            {signal}
          </span>
        ))}
      </div>

      {candidate.manualCheck ? (
        <div className="smart-candidate-guidance">
          <span>Manual check</span>
          <strong>{candidate.manualCheck}</strong>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button className="smart-mini-action w-full" onClick={() => onImport(candidate)} disabled={busy === `import-${candidate.id}`} type="button">
          {busy === `import-${candidate.id}` ? "Importing..." : candidate.recommendedAction?.startsWith("Import") ? candidate.recommendedAction : "Import"}
        </button>
        {canTryBambu ? (
          <button className="smart-mini-action smart-mini-action-light w-full" onClick={() => onUseForBambu(candidate)} type="button">
            <Printer size={15} /> {isPrinterLike ? "Use for Bambu" : "Test as Bambu"}
          </button>
        ) : (
          <div className="smart-local-action-note">{candidate.recommendedAction ?? "Identify first"}</div>
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
  if (device.deviceType === "3d_printer" && (haystack.includes("bambu") || haystack.includes("printer") || haystack.includes("3d") || haystack.includes("drucker"))) score += 6;
  return score;
}

function candidateMatchesDiscoveryFilter(candidate: LocalDiscoveryCandidate, filter: string) {
  if (filter === "all") return true;
  const tags = new Set([candidate.category, candidate.deviceType, ...(candidate.filterTags ?? [])].filter(Boolean));
  if (filter === "printer") return tags.has("printer") || tags.has("3d_printer");
  if (filter === "network") return tags.has("network") || tags.has("router") || tags.has("web");
  return tags.has(filter);
}
