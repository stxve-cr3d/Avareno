import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Cpu, Lightbulb, Link2, Power, Printer, Radar, RefreshCw, Router, Search, Tv } from "lucide-react";
import { api } from "../lib/api";
import { ConsoleSkeleton } from "../components/app/AppKit";
import { ProviderLogo } from "../features/home-graph/components/ProviderLogo";
import { homeProviders } from "../features/home-graph/providers/homeProviders";
import type {
  Item,
  LocalDiscoveryCandidate,
  LocalDiscoveryPayload,
  SmartHomeCommand,
  SmartHomeDevice,
  SmartHomePayload
} from "../lib/types";

type BusyActionName = "command" | "load" | "discover" | "import" | "pair";

type BusyAction = {
  candidateId?: string;
  deviceId?: string;
  action: BusyActionName;
} | null;

export function SmartHome() {
  const [payload, setPayload] = useState<SmartHomePayload | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [localCandidates, setLocalCandidates] = useState<LocalDiscoveryCandidate[]>([]);
  const [probeHost, setProbeHost] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<BusyAction>({ action: "load" });

  async function load() {
    setBusy({ action: "load" });
    setStatus((current) => (current === "ready" ? "ready" : "loading"));
    setMessage("");
    try {
      const [next, nextItems] = await Promise.all([api<SmartHomePayload>("/api/smart-home"), api<Item[]>("/api/items")]);
      setPayload(next);
      setItems(nextItems);
      setStatus("ready");
    } catch (error) {
      console.warn("Smart home data could not be loaded.", error);
      setStatus("error");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const devices = useMemo(() => mainSmartHomeDevices(payload?.devices ?? []), [payload]);
  const smartLocalCandidates = useMemo(
    () => sortLocalCandidates(localCandidates.filter(isUsefulLocalCandidate).filter((candidate) => !isAlreadyImported(candidate, devices))),
    [devices, localCandidates]
  );

  async function sendCommand(device: SmartHomeDevice, command: "power_on" | "power_off" | "set_brightness", value?: number) {
    setBusy({ action: "command", deviceId: device.id });
    setMessage("");
    try {
      const result = await api<SmartHomeCommand>(`/api/smart-home/devices/${device.id}/commands`, {
        method: "POST",
        body: JSON.stringify({ command, value })
      });
      setMessage(commandFeedback(device, command, result));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Befehl konnte nicht ausgeführt werden.");
    } finally {
      setBusy(null);
    }
  }

  async function linkDevice(device: SmartHomeDevice, itemId: string | null) {
    setBusy({ action: "command", deviceId: device.id });
    setMessage("");
    try {
      await api(`/api/smart-home/devices/${device.id}/link`, {
        method: "PATCH",
        body: JSON.stringify({ itemId })
      });
      setMessage(itemId ? `${device.name} wurde mit einer Produktakte verbunden.` : `${device.name} wurde von der Produktakte gelöst.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gerät konnte nicht verbunden werden.");
    } finally {
      setBusy(null);
    }
  }

  async function pairDevice(device: SmartHomeDevice) {
    setBusy({ action: "pair", deviceId: device.id });
    setMessage("Avareno wartet auf die Freigabe am Gerät. Bitte am Fernseher bestätigen, falls ein Hinweis erscheint.");
    try {
      const result = await api<{ paired?: boolean; result?: { pairingHint?: string } }>(`/api/smart-home/devices/${device.id}/pair`, {
        method: "POST"
      });
      setMessage(
        result.paired
          ? `${device.name}: Fernbedienung freigegeben. Ein und Aus kannst du jetzt testen.`
          : `${device.name}: Bitte am Fernseher Avareno als Fernbedienung zulassen und danach erneut testen.`
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Freigabe konnte nicht gestartet werden.");
    } finally {
      setBusy(null);
    }
  }

  async function discoverLocalDevices() {
    setBusy({ action: "discover" });
    setMessage("");
    try {
      const result = await api<LocalDiscoveryPayload>("/api/smart-home/local/discover", { method: "POST" });
      const usefulCandidates = result.candidates.filter(isUsefulLocalCandidate);
      setLocalCandidates(usefulCandidates);
      setMessage(
        usefulCandidates.length
          ? `${usefulCandidates.length} steuerbares Gerät gefunden.`
          : result.candidates.length
            ? "Nur Netzwerkgeräte ohne sichere Steuerung gefunden. Diese bleiben ausgeblendet."
          : result.enabled
            ? "Keine lokalen Geräte gefunden. Du kannst eine IP gezielt prüfen."
            : "Die lokale Suche ist serverseitig noch nicht aktiviert. Du kannst eine private IP gezielt prüfen."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Lokale Suche konnte nicht gestartet werden.");
    } finally {
      setBusy(null);
    }
  }

  async function probeLocalHost() {
    const host = probeHost.trim();
    if (!host) {
      setMessage("Bitte gib die lokale IP oder Host-Adresse deines Geräts ein.");
      return;
    }
    setBusy({ action: "discover" });
    setMessage("");
    try {
      const result = await api<LocalDiscoveryPayload>("/api/smart-home/local/probe", {
        method: "POST",
        body: JSON.stringify({ host })
      });
      const usefulCandidates = result.candidates.filter(isUsefulLocalCandidate);
      setLocalCandidates(usefulCandidates);
      setMessage(usefulCandidates.length ? `${host} wurde als steuerbares Gerät erkannt.` : `${host} wurde nicht als steuerbares Gerät erkannt.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Diese Adresse konnte nicht geprüft werden.");
    } finally {
      setBusy(null);
    }
  }

  async function importLocalDevice(candidate: LocalDiscoveryCandidate) {
    setBusy({ action: "import", candidateId: candidate.id });
    setMessage("");
    try {
      await api("/api/smart-home/local/import", {
        method: "POST",
        body: JSON.stringify({ candidateId: candidate.id })
      });
      setMessage(`${candidate.name} wurde zu Avareno hinzugefügt.`);
      setLocalCandidates((current) => current.filter((entry) => entry.id !== candidate.id));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gerät konnte nicht hinzugefügt werden.");
    } finally {
      setBusy(null);
    }
  }

  if (status === "loading") {
    return <ConsoleSkeleton />;
  }

  if (status === "error" || !payload) {
    return (
      <main className="sh-page">
        <section className="sh-hero">
          <div className="sh-hero-top">
            <div>
              <span className="sh-kicker">Avareno Zuhause</span>
              <h1>Smart Home nicht erreichbar</h1>
            </div>
            <button className="sh-ghost" onClick={() => void load()} type="button">
              <RefreshCw size={15} /> Erneut versuchen
            </button>
          </div>
          <p className="sh-hero-sub">Die Verbindung ist gerade nicht erreichbar. Deine Zugangsdaten werden nicht im Browser gespeichert.</p>
        </section>
      </main>
    );
  }

  const linkedCount = devices.filter((device) => device.itemId).length;
  const onCount = devices.filter((device) => canPowerDevice(device) && device.powerState === "on").length;

  return (
    <main className="sh-page">
      <section className="sh-hero">
        <div className="sh-hero-top">
          <div>
            <span className="sh-kicker">Avareno Zuhause</span>
            <h1>Smart Home</h1>
          </div>
          <button className="sh-ghost" disabled={busy?.action === "load"} onClick={() => void load()} type="button">
            <RefreshCw size={15} /> Aktualisieren
          </button>
        </div>
        <p className="sh-hero-sub">Steuere verbundene Geräte und öffne Details, ohne technische Netzwerkdaten sortieren zu müssen.</p>
        {devices.length ? (
          <div className="sh-hero-stats">
            <HeroStat label="Geräte" value={devices.length} />
            <HeroStat label="Mit Produktakte" value={linkedCount} />
            <HeroStat label="Aktiv" value={onCount} tone="accent" />
          </div>
        ) : null}
      </section>

      {message ? <p className="sh-message">{message}</p> : null}

      <section className="sh-provider-map" aria-label="Smart Home Connect Überblick">
        <div className="sh-provider-column">
          <h2>Connected providers</h2>
          <div className="sh-provider-rows">
            {payload.providers.filter((provider) => provider.status === "CONNECTED").length ? (
              payload.providers.filter((provider) => provider.status === "CONNECTED").map((provider) => (
                <ProviderRow key={provider.id} label={provider.name} meta={`${providerDeviceCount(provider.id, devices)} Geräte`} status="Verbunden" />
              ))
            ) : (
              <ProviderRow label="Noch kein Provider" meta="Geräte können trotzdem manuell angelegt werden." status="Offen" />
            )}
          </div>
        </div>
        <div className="sh-provider-column">
          <h2>Available integrations</h2>
          <div className="sh-provider-tiles">
            {homeProviders.slice(0, 4).map((provider) => (
              <Link className="sh-provider-tile" key={provider.id} to="/app/home-graph/connect">
                <ProviderLogo provider={provider} size="sm" />
                <span>
                  <strong>{provider.name}</strong>
                  <small>{provider.connectionStatus === "planned" ? "Geplant" : "Vorbereitet"}</small>
                </span>
              </Link>
            ))}
          </div>
        </div>
        <div className="sh-provider-column is-wide">
          <h2>Manual device passports</h2>
          <p>{linkedCount ? `${linkedCount} Geräte sind mit einer Produktakte verbunden.` : "Verbinde Geräte mit Produktakten, damit Beleg, Garantie und Support sichtbar bleiben."}</p>
        </div>
        <div className="sh-provider-column is-wide">
          <h2>Local bridge / future connectors</h2>
          <p>{payload.localDiscovery.note || "Lokale Suche startet nur auf Aktion. Unsichere Netzwerkfunde bleiben ausgeblendet."}</p>
        </div>
      </section>

      {devices.length ? (
        <section className="sh-section">
          <div className="sh-section-head">
            <h2>Deine Geräte</h2>
            <span className="sh-count">{devices.length}</span>
          </div>
          <div className="sh-device-list">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                busy={busy?.deviceId === device.id}
                device={device}
                items={items}
                onBrightness={(value) => void sendCommand(device, "set_brightness", value)}
                onLinkItem={(itemId) => void linkDevice(device, itemId)}
                onPair={() => void pairDevice(device)}
                onPowerOff={() => void sendCommand(device, "power_off")}
                onPowerOn={() => void sendCommand(device, "power_on")}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="sh-section">
          <div className="sh-empty">
            <span className="sh-empty-icon"><Link2 size={20} /></span>
            <strong>Noch kein Gerät verbunden</strong>
            <p>Verbinde starke Bridges oder finde lokale Geräte in deinem Netzwerk. Avareno importiert keine Zugangsdaten in den Browser.</p>
          </div>
        </section>
      )}

      <details className="sh-connect" open={!devices.length}>
        <summary>
          <span className="sh-connect-summary">
            <strong>{devices.length ? "Weiteres Gerät verbinden" : "Gerät verbinden"}</strong>
            <small>Nur bei Bedarf. Router, Drucker und unsichere Netzwerkfunde bleiben ausgeblendet.</small>
          </span>
          <ChevronDown className="sh-connect-chevron" size={16} />
        </summary>

        <p className="sh-connect-note">Avareno sucht erst, wenn du es startest. Es werden keine Zugangsdaten importiert.</p>

        <div className="sh-connect-actions">
          <button className="sh-primary" disabled={busy?.action === "discover"} onClick={() => void discoverLocalDevices()} type="button">
            <Radar size={15} /> Suche starten
          </button>
          <form
            className="sh-probe"
            onSubmit={(event) => {
              event.preventDefault();
              void probeLocalHost();
            }}
          >
            <Search size={14} />
            <input
              aria-label="IP oder Host prüfen"
              disabled={busy?.action === "discover"}
              onChange={(event) => setProbeHost(event.currentTarget.value)}
              placeholder="IP prüfen"
              value={probeHost}
            />
            <button disabled={busy?.action === "discover"} type="submit">Prüfen</button>
          </form>
        </div>

        {smartLocalCandidates.length ? (
          <div className="sh-candidate-list">
            {smartLocalCandidates.map((candidate) => (
              <CandidateRow
                busy={busy?.candidateId === candidate.id}
                candidate={candidate}
                key={candidate.id}
                onImport={() => void importLocalDevice(candidate)}
              />
            ))}
          </div>
        ) : null}
      </details>
    </main>
  );
}

function ProviderRow({ label, meta, status }: { label: string; meta: string; status: string }) {
  return (
    <div className="sh-provider-row">
      <span>{providerInitials(label)}</span>
      <div>
        <strong>{label}</strong>
        <small>{meta}</small>
      </div>
      <em>{status}</em>
    </div>
  );
}

function HeroStat({ label, value, tone }: { label: string; value: number; tone?: "accent" }) {
  return (
    <div className={tone === "accent" ? "sh-stat is-accent" : "sh-stat"}>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function providerDeviceCount(providerId: string, devices: SmartHomeDevice[]) {
  const normalized = providerId.toLowerCase();
  return devices.filter((device) => device.provider.toLowerCase() === normalized).length;
}

function providerInitials(name: string) {
  return name
    .replace(/[!/+]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function DeviceCard({
  busy,
  device,
  items,
  onBrightness,
  onLinkItem,
  onPair,
  onPowerOff,
  onPowerOn
}: {
  busy: boolean;
  device: SmartHomeDevice;
  items: Item[];
  onBrightness: (value: number) => void;
  onLinkItem: (itemId: string | null) => void;
  onPair: () => void;
  onPowerOff: () => void;
  onPowerOn: () => void;
}) {
  const powerable = canPowerDevice(device);
  const on = device.powerState === "on";
  const canDim = device.capabilities.some((capability) => capability.toLowerCase().includes("switchlevel"));
  const needsPairing = powerable && isTvLike(device) && !hasSamsungToken(device);
  const currentBrightness = brightnessFromDevice(device);

  return (
    <article className="sh-device">
      <span className={`sh-device-icon${on ? " is-on" : ""}`}>{deviceIcon(device)}</span>

      <div className="sh-device-main">
        <Link className="sh-device-title" to={`/app/smart-home/devices/${device.id}`}>{device.name}</Link>
        <span className="sh-device-meta">
          {deviceTypeLabel(device)}
          {device.roomName ? ` · ${device.roomName}` : ""}
        </span>

        {device.itemId ? (
          <Link className="sh-device-link" to={`/app/dinge/${device.itemId}`}>
            <Link2 size={13} /> {device.itemName || "Produktakte"}
          </Link>
        ) : (
          <label className="sh-device-select">
            <span>Produktakte</span>
            <select disabled={busy} defaultValue="" onChange={(event) => onLinkItem(event.currentTarget.value || null)}>
              <option value="">Verbinden…</option>
              {items.slice(0, 24).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="sh-device-controls">
        {powerable ? (
          needsPairing ? (
            <button className="sh-pair" disabled={busy} onClick={onPair} type="button">
              Fernbedienung freigeben
            </button>
          ) : (
            <div className="sh-toggle" role="group" aria-label={`${device.name} steuern`}>
              <button className={on ? "is-active" : ""} disabled={busy} onClick={onPowerOn} type="button" aria-pressed={on}>
                <Power size={13} /> Ein
              </button>
              <button className={!on ? "is-active" : ""} disabled={busy} onClick={onPowerOff} type="button" aria-pressed={!on}>
                Aus
              </button>
            </div>
          )
        ) : (
          <span className="sh-status">{powerStateLabel(device)}</span>
        )}

        {canDim ? (
          <label className="sh-slider">
            <span>Helligkeit</span>
            <input
              aria-label={`${device.name} Helligkeit`}
              defaultValue={currentBrightness}
              disabled={busy}
              max={100}
              min={0}
              onKeyUp={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
                  onBrightness(Number(event.currentTarget.value));
                }
              }}
              onMouseUp={(event) => onBrightness(Number(event.currentTarget.value))}
              onTouchEnd={(event) => onBrightness(Number(event.currentTarget.value))}
              step={10}
              type="range"
            />
          </label>
        ) : null}

        <Link className="sh-device-details" to={`/app/home-graph/devices/${device.id}`}>
          <Link2 size={12} /> Details öffnen
        </Link>
      </div>
    </article>
  );
}

function CandidateRow({
  busy,
  candidate,
  onImport
}: {
  busy: boolean;
  candidate: LocalDiscoveryCandidate;
  onImport: () => void;
}) {
  return (
    <article className="sh-candidate">
      <span className="sh-candidate-icon">{localCandidateIcon(candidate)}</span>
      <div className="sh-candidate-main">
        <strong>{candidate.name}</strong>
        <span className="sh-candidate-meta">
          {candidateTypeLabel(candidate)}
          {candidate.host ? ` · ${candidate.host}` : ""}
        </span>
        <small>{candidate.matchedItemName ? `Passende Produktakte: ${candidate.matchedItemName}` : "Kann als Smart-Home-Gerät gespeichert werden."}</small>
        {candidate.capabilities.length ? (
          <div className="sh-device-caps">
            {candidate.capabilities.slice(0, 3).map((capability) => (
              <span key={capability}>{capabilityLabel(capability)}</span>
            ))}
          </div>
        ) : null}
      </div>
      <button className="sh-secondary" disabled={busy} onClick={onImport} type="button">
        {busy ? "Wird hinzugefügt…" : "Hinzufügen"}
      </button>
    </article>
  );
}

/* ── feedback + parsing ─────────────────────────────────────── */

function commandFeedback(device: SmartHomeDevice, command: "power_on" | "power_off" | "set_brightness", result: SmartHomeCommand) {
  const parsed = parseCommandResult(result.result);
  if (parsed?.mode === "already_off") return `${device.name} ist bereits aus.`;
  if (parsed?.mode === "already_on") return `${device.name} ist bereits an.`;
  if (parsed?.mode === "unknown_state") {
    return `${device.name}: Status nicht eindeutig. Avareno hat Ausschalten nicht gesendet, um kein Einschalten auszulösen.`;
  }
  if (parsed?.pairingHint) {
    return `${device.name}: Befehl gesendet. Falls nichts passiert, bestätige am Gerät die Fernbedienung für Avareno.`;
  }
  if (parsed?.mode === "wake_on_lan") {
    return `${device.name}: Aufwecken gesendet. Das Gerät kann ein paar Sekunden brauchen.`;
  }
  if (command === "power_off") return `${device.name}: Ausschalten gesendet.`;
  if (command === "power_on") return `${device.name}: Einschalten gesendet.`;
  return `${device.name}: Befehl gesendet.`;
}

function parseCommandResult(raw: string | null | undefined): { mode?: string; pairingHint?: string } | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { mode?: string; pairingHint?: string };
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

/* ── device helpers (behavior preserved) ────────────────────── */

function brightnessFromDevice(device: SmartHomeDevice) {
  const raw = device.rawJson;
  if (raw && typeof raw === "object" && "brightness" in raw && typeof raw.brightness === "number") {
    return raw.brightness;
  }
  return device.powerState === "on" ? 70 : 0;
}

function powerStateLabel(device: SmartHomeDevice) {
  if (!canPowerDevice(device)) return "Erkannt";
  if (device.powerState === "on") return "An";
  if (device.powerState === "off") return "Aus";
  return "Bereit";
}

function isTvLike(device: SmartHomeDevice) {
  const text = `${device.name} ${device.deviceType}`.toLowerCase();
  return text.includes("tv") || text.includes("samsung");
}

function deviceTypeLabel(device: SmartHomeDevice) {
  const text = `${device.name} ${device.deviceType}`.toLowerCase();
  if (text.includes("tv") || text.includes("samsung")) return "Fernseher";
  if (text.includes("cast") || text.includes("media")) return "Media-Gerät";
  if (text.includes("3d_printer") || text.includes("printer") || text.includes("bambu")) return "Drucker";
  if (text.includes("hub") || text.includes("assistant") || text.includes("bridge")) return "Bridge";
  if (text.includes("light") || text.includes("lampe")) return "Licht";
  return "Smart-Home-Gerät";
}

function hasSamsungToken(device: SmartHomeDevice) {
  return typeof device.rawJson?.samsungRemoteToken === "string" && device.rawJson.samsungRemoteToken.length > 0;
}

function candidateTypeLabel(candidate: LocalDiscoveryCandidate) {
  const text = `${candidate.name} ${candidate.deviceType} ${candidate.category ?? ""}`.toLowerCase();
  if (text.includes("tv") || text.includes("samsung")) return "Fernseher";
  if (text.includes("cast") || text.includes("media")) return "Media-Gerät";
  if (text.includes("3d_printer") || text.includes("printer") || text.includes("bambu")) return "Drucker";
  if (text.includes("hub") || text.includes("assistant") || text.includes("bridge")) return "Bridge";
  if (text.includes("light") || text.includes("lampe")) return "Licht";
  return "Smart-Home-Gerät";
}

function localCandidateIcon(candidate: LocalDiscoveryCandidate) {
  const text = `${candidate.name} ${candidate.deviceType} ${candidate.category ?? ""}`.toLowerCase();
  if (text.includes("tv") || text.includes("cast") || text.includes("media")) return <Tv size={17} />;
  if (text.includes("printer") || text.includes("bambu")) return <Printer size={17} />;
  if (candidate.category === "hub" || text.includes("hub") || text.includes("router") || text.includes("bridge")) return <Router size={17} />;
  return <Cpu size={17} />;
}

function deviceIcon(device: SmartHomeDevice) {
  const text = `${device.deviceType} ${device.name}`.toLowerCase();
  if (text.includes("tv") || text.includes("samsung") || text.includes("cast") || text.includes("media")) return <Tv size={17} />;
  if (text.includes("printer") || text.includes("bambu")) return <Printer size={17} />;
  if (text.includes("light") || text.includes("lampe")) return <Lightbulb size={17} />;
  if (text.includes("hub") || text.includes("bridge") || text.includes("router") || text.includes("assistant")) return <Router size={17} />;
  return <Cpu size={17} />;
}

function capabilityLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "networkpresence") return "Netzwerk";
  if (normalized === "mediarenderer") return "Medien";
  if (normalized === "printerjob") return "Druckauftrag";
  if (normalized === "temperature") return "Temperatur";
  if (normalized === "filament") return "Material";
  if (normalized === "bridge") return "Bridge";
  if (normalized === "deviceimport") return "Import";
  if (normalized === "switch") return "Schalten";
  if (normalized === "switchlevel") return "Helligkeit";
  if (normalized === "admininterface") return "Router";
  return "Funktion";
}

function mainSmartHomeDevices(devices: SmartHomeDevice[]) {
  return devices.filter((device) => {
    const rawSource = typeof device.rawJson?.avarenoSource === "string" ? device.rawJson.avarenoSource.toLowerCase() : "";
    const providerDeviceId = device.providerDeviceId.toLowerCase();
    if (providerDeviceId.includes("demo") || rawSource.includes("demo") || rawSource.includes("mock")) return false;
    return isSmartHomeCapableDevice(device);
  });
}

function isSmartHomeCapableDevice(device: SmartHomeDevice) {
  const text = `${device.name} ${device.deviceType}`.toLowerCase();
  const capabilities = device.capabilities.map((capability) => capability.toLowerCase());
  return (
    text.includes("tv") ||
    text.includes("samsung") ||
    text.includes("cast") ||
    text.includes("media") ||
    text.includes("printer") ||
    text.includes("bambu") ||
    text.includes("hub") ||
    text.includes("assistant") ||
    capabilities.includes("switch") ||
    capabilities.includes("switchlevel") ||
    capabilities.includes("mediarenderer") ||
    capabilities.includes("printerjob") ||
    capabilities.includes("bridge") ||
    capabilities.includes("deviceimport")
  );
}

function canPowerDevice(device: SmartHomeDevice) {
  const text = `${device.name} ${device.deviceType}`.toLowerCase();
  const capabilities = device.capabilities.map((capability) => capability.toLowerCase());
  return text.includes("tv") || text.includes("samsung") || capabilities.includes("switch");
}

function isUsefulLocalCandidate(candidate: LocalDiscoveryCandidate) {
  const text = `${candidate.name} ${candidate.deviceType} ${candidate.category ?? ""}`.toLowerCase();
  const capabilities = candidate.capabilities.map((capability) => capability.toLowerCase());
  return (
    text.includes("samsung") ||
    text.includes("tv") ||
    text.includes("cast") ||
    text.includes("media") ||
    text.includes("printer") ||
    text.includes("bambu") ||
    text.includes("hub") ||
    text.includes("assistant") ||
    capabilities.includes("switch") ||
    capabilities.includes("switchlevel") ||
    capabilities.includes("mediarenderer") ||
    capabilities.includes("printerjob") ||
    capabilities.includes("bridge") ||
    capabilities.includes("deviceimport")
  );
}

function isAlreadyImported(candidate: LocalDiscoveryCandidate, devices: SmartHomeDevice[]) {
  const candidateId = candidate.id.toLowerCase();
  const candidateHost = hostWithoutPort(candidate.host).toLowerCase();
  return devices.some((device) => {
    const providerDeviceId = device.providerDeviceId.toLowerCase();
    const rawHost = typeof device.rawJson?.host === "string" ? hostWithoutPort(device.rawJson.host).toLowerCase() : "";
    return providerDeviceId === candidateId || Boolean(candidateHost && rawHost === candidateHost);
  });
}

function hostWithoutPort(host: string) {
  const value = host.trim();
  const parts = value.split(":");
  if (parts.length === 2 && /^\d+$/.test(parts[1])) return parts[0];
  return value;
}

function sortLocalCandidates(candidates: LocalDiscoveryCandidate[]) {
  return [...candidates].sort((a, b) => localCandidateRank(a) - localCandidateRank(b) || b.confidence - a.confidence);
}

function localCandidateRank(candidate: LocalDiscoveryCandidate) {
  if (candidate.category === "media" || candidate.deviceType.toLowerCase().includes("tv")) return 0;
  if (candidate.category === "hub") return 1;
  return 2;
}
