import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  Home,
  KeyRound,
  Link2,
  Radio,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { ProviderLogo } from "../features/home-graph/components/ProviderLogo";
import { homeProviders } from "../features/home-graph/providers/homeProviders";
import type { HomeProvider, HomeProviderConnectionStatus } from "../features/home-graph/types";
import { api } from "../lib/api";
import type { SmartHomeDevice, SmartHomePayload } from "../lib/types";

const featuredProviderIds = ["smartthings", "home_assistant", "philips_hue"];

type HomeGraphPreviewDevice = {
  id: string;
  name: string;
  roomName?: string | null;
  deviceType: string;
  connectionLevel: number;
  isControllable: boolean;
  capabilities: string[];
};

type HomeGraphConnectPreview = {
  providerId: string;
  providerName?: string;
  appName?: string;
  available: boolean;
  mode: "MOCK_CONNECT" | "PLANNED";
  title: string;
  message: string;
  safeCapabilities: string[];
  devices: HomeGraphPreviewDevice[];
  privacyNotes: string[];
};

type HomeGraphConnectResult = {
  providerId: string;
  provider: string;
  mode: "MOCK_CONNECT";
  connected: boolean;
  synced: number;
  safeCapabilities: string[];
  message: string;
};

export function HomeGraphConnect() {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [preview, setPreview] = useState<HomeGraphConnectPreview | null>(null);
  const [acceptedCapabilities, setAcceptedCapabilities] = useState<string[]>([]);
  const [smartHomeDevices, setSmartHomeDevices] = useState<SmartHomeDevice[]>([]);
  const [smartHomeStatus, setSmartHomeStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [connectState, setConnectState] = useState<"idle" | "loading" | "ready" | "saving" | "done" | "error">("idle");
  const [connectMessage, setConnectMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setSmartHomeStatus("loading");
    api<SmartHomePayload>("/api/smart-home")
      .then((payload) => {
        if (cancelled) return;
        setSmartHomeDevices(payload.devices ?? []);
        setSmartHomeStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setSmartHomeStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProviders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return homeProviders.filter((provider) => {
      return (
        !normalizedQuery ||
        [provider.name, provider.appName, provider.category, provider.userFriendlyLabel, provider.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      );
    });
  }, [query]);

  const isExploring = query.trim().length > 0 || showAll;
  const visibleProviders = isExploring
    ? filteredProviders
    : featuredProviderIds
        .map((providerId) => homeProviders.find((provider) => provider.id === providerId))
        .filter((provider): provider is HomeProvider => Boolean(provider));
  const localDevices = useMemo(
    () => smartHomeDevices.filter((device) => device.provider === "LOCAL_DISCOVERY" && !device.providerDeviceId.includes("demo")),
    [smartHomeDevices]
  );
  const highlightedDevices = useMemo(() => {
    const ranked = [...localDevices].sort((a, b) => localDeviceRank(a) - localDeviceRank(b));
    return ranked.slice(0, 3);
  }, [localDevices]);

  async function openConnectReview(provider: HomeProvider) {
    setConnectState("loading");
    setConnectMessage("");
    try {
      const nextPreview = await api<HomeGraphConnectPreview>("/api/smart-home/home-graph/connect/preview", {
        method: "POST",
        body: JSON.stringify({ providerId: provider.id })
      });
      setPreview(nextPreview);
      setAcceptedCapabilities(nextPreview.safeCapabilities);
      setConnectState("ready");
    } catch (error) {
      setConnectState("error");
      setConnectMessage(error instanceof Error ? error.message : "Connect Flow konnte nicht vorbereitet werden.");
    }
  }

  async function confirmConnect() {
    if (!preview) return;
    setConnectState("saving");
    setConnectMessage("");
    try {
      const result = await api<HomeGraphConnectResult>("/api/smart-home/home-graph/connect/confirm", {
        method: "POST",
        body: JSON.stringify({ providerId: preview.providerId, acceptedCapabilities })
      });
      setConnectState("done");
      setConnectMessage(`${result.synced} Geraete wurden als Home-Graph-Quelle vorgemerkt.`);
    } catch (error) {
      setConnectState("error");
      setConnectMessage(error instanceof Error ? error.message : "Provider konnte nicht vorgemerkt werden.");
    }
  }

  function toggleCapability(capability: string) {
    setAcceptedCapabilities((current) =>
      current.includes(capability) ? current.filter((item) => item !== capability) : [...current, capability]
    );
  }

  return (
    <main className="av-homegraph">
      <section className="av-homegraph-hero">
        <div>
          <span className="av-homegraph-kicker">Avareno Home Graph</span>
          <h1>Zuhause verbinden</h1>
          <p>Erkannte Geraete, passende Anbieter und spaetere Steuerung an einem ruhigen Ort.</p>
        </div>
      </section>

      <section className="av-homegraph-live" aria-label="Echt erkannte lokale Geraete">
        <div>
          <span><Radio size={15} /> Echt erkannt</span>
          <strong>{highlightedDevices.length ? "Lokale Geraete aus deinem Netzwerk" : "Noch keine lokalen Geraete auf dieser Seite"}</strong>
          <p>
            {highlightedDevices.length
              ? "Diese Eintraege kommen aus der echten LAN-Erkennung, nicht aus dem Beta-Provider-Flow."
              : smartHomeStatus === "loading"
                ? "Avareno liest die aktuelle Smart-Home-Liste."
                : "Starte im Smart-Home-Hub die lokale Suche, damit erkannte Geraete hier erscheinen."}
          </p>
        </div>
        <div className="av-homegraph-live-devices">
          {highlightedDevices.map((device) => (
            <article key={device.id}>
              <strong>{device.name}</strong>
              <small>{device.itemName ? `Verbunden mit ${device.itemName}` : device.roomName ?? "Noch nicht verknuepft"}</small>
            </article>
          ))}
        </div>
        <Link className="av-homegraph-live-link" to="/app/smart-home">
          Geraeteliste oeffnen <ArrowRight size={14} />
        </Link>
      </section>

      {preview || connectState === "loading" || connectMessage ? (
        <ConnectReview
          acceptedCapabilities={acceptedCapabilities}
          connectMessage={connectMessage}
          connectState={connectState}
          onClose={() => {
            setPreview(null);
            setConnectMessage("");
            setConnectState("idle");
          }}
          onConfirm={() => void confirmConnect()}
          onToggleCapability={toggleCapability}
          preview={preview}
        />
      ) : null}

      <div className="av-homegraph-list-head">
        <div>
          <span><Link2 size={15} /> Anbieter</span>
          <strong>{isExploring ? "Passende Anbieter" : "Naechste sinnvolle Verbindungen"}</strong>
          <p>
            {isExploring
              ? `${visibleProviders.length} von ${homeProviders.length} Anbietern`
              : "Nur die wichtigsten Optionen. Alles Weitere bleibt ausgeblendet."}
          </p>
        </div>
        {!isExploring ? (
          <button onClick={() => setShowAll(true)} type="button">
            Alle Anbieter anzeigen
          </button>
        ) : null}
      </div>

      <section className="av-homegraph-toolbar" aria-label="Provider suchen">
        <label className="av-homegraph-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setShowAll(true);
            }}
            placeholder="Provider suchen"
            type="search"
          />
        </label>
      </section>

      <section className="av-homegraph-grid" aria-label="Smart Home Provider">
        {visibleProviders.map((provider) => (
          <ProviderCard onConnect={() => void openConnectReview(provider)} provider={provider} key={provider.id} />
        ))}
      </section>

      {visibleProviders.length === 0 ? (
        <section className="av-homegraph-empty">
          <strong>Dein Zuhause ist noch nicht verbunden.</strong>
          <p>Fuege Geraete, Apps oder Anbieter hinzu. Avareno hilft dir, jedes Geraet verstaendlich zu speichern - auch wenn es noch nicht steuerbar ist.</p>
          <button type="button">Erstes Geraet hinzufuegen</button>
        </section>
      ) : null}
    </main>
  );
}

function ConnectReview({
  acceptedCapabilities,
  connectMessage,
  connectState,
  onClose,
  onConfirm,
  onToggleCapability,
  preview
}: {
  acceptedCapabilities: string[];
  connectMessage: string;
  connectState: "idle" | "loading" | "ready" | "saving" | "done" | "error";
  onClose: () => void;
  onConfirm: () => void;
  onToggleCapability: (capability: string) => void;
  preview: HomeGraphConnectPreview | null;
}) {
  if (connectState === "loading") {
    return (
      <section className="av-homegraph-review">
        <strong>Connect Flow wird vorbereitet</strong>
        <p>Avareno prueft, welche sicheren Schritte fuer diesen Anbieter moeglich sind.</p>
      </section>
    );
  }

  if (!preview) {
    return connectMessage ? <p className="av-homegraph-message">{connectMessage}</p> : null;
  }

  return (
    <section className="av-homegraph-review">
      <div className="av-homegraph-review-head">
        <div>
          <span>{preview.mode === "MOCK_CONNECT" ? "Sicherer Beta-Flow" : "Steuerung geplant"}</span>
          <strong>{preview.title}</strong>
          <p>{preview.message}</p>
        </div>
        <button onClick={onClose} type="button">Schliessen</button>
      </div>

      {preview.available ? (
        <>
          <div className="av-homegraph-review-grid">
            <div>
              <span>Erlaubte Funktionen</span>
              <div className="av-homegraph-capability-list">
                {preview.safeCapabilities.map((capability) => (
                  <label key={capability}>
                    <input
                      checked={acceptedCapabilities.includes(capability)}
                      onChange={() => onToggleCapability(capability)}
                      type="checkbox"
                    />
                    {capabilityLabel(capability)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span>Vorschau</span>
              <div className="av-homegraph-preview-devices">
                {preview.devices.slice(0, 2).map((device) => (
                  <article key={device.id}>
                    <strong>{device.name}</strong>
                    <small>{device.roomName ?? "Ohne Raum"} · Level {device.connectionLevel} · {device.capabilities.map(capabilityLabel).join(", ")}</small>
                  </article>
                ))}
              </div>
            </div>
          </div>
          <ul className="av-homegraph-privacy-notes">
            {preview.privacyNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
          {connectMessage ? <p className="av-homegraph-message">{connectMessage}</p> : null}
          <button
            className="av-homegraph-confirm"
            disabled={connectState === "saving" || acceptedCapabilities.length === 0}
            onClick={onConfirm}
            type="button"
          >
            {connectState === "saving" ? "Wird vorgemerkt..." : "Sicheren Import vormerken"}
          </button>
        </>
      ) : (
        <>
          <ul className="av-homegraph-privacy-notes">
            {preview.privacyNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
          <button className="av-homegraph-confirm" onClick={onClose} type="button">Verstanden</button>
        </>
      )}
    </section>
  );
}

function ProviderCard({ onConnect, provider }: { onConnect: () => void; provider: HomeProvider }) {
  const cta = providerCta(provider.connectionStatus);
  const connectionTags = [
    provider.supportsCloud ? <ConnectionTag icon={<Cloud size={13} />} label="Cloud-Verbindung" key="cloud" /> : null,
    provider.supportsLocal ? <ConnectionTag icon={<Home size={13} />} label="Lokal moeglich" key="local" /> : null,
    provider.supportsMatter ? <ConnectionTag icon={<Radio size={13} />} label="Matter-kompatibel" key="matter" /> : null,
    provider.category === "bridge" || provider.category === "local_bridge" ? <ConnectionTag icon={<SlidersHorizontal size={13} />} label="Bridge" key="bridge" /> : null,
    provider.supportsApiToken ? <ConnectionTag icon={<KeyRound size={13} />} label="API Token" key="token" /> : null
  ].filter(Boolean).slice(0, 3);

  return (
    <article className="av-homegraph-card">
      <div className="av-homegraph-card-top">
        <ProviderLogo provider={provider} />
      </div>
      <div className="av-homegraph-card-copy">
        <h2>{provider.name}</h2>
        <span>{provider.appName ? `${provider.appName} App` : provider.userFriendlyLabel}</span>
        <p>{provider.description}</p>
      </div>
      <div className="av-homegraph-connection-types" aria-label="Verbindungstypen">
        {connectionTags}
      </div>
      <span className={`av-homegraph-badge is-${provider.connectionStatus}`}>{providerStatusLabel(provider.connectionStatus)}</span>
      <button className={cta.kind === "primary" ? "av-homegraph-card-cta is-primary" : "av-homegraph-card-cta"} onClick={onConnect} type="button">
        {cta.kind === "primary" ? <CheckCircle2 size={14} /> : <ArrowRight size={14} />}
        {cta.label}
      </button>
    </article>
  );
}

function ConnectionTag({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span>
      {icon}
      {label}
    </span>
  );
}

function providerStatusLabel(status: HomeProviderConnectionStatus) {
  switch (status) {
    case "available":
      return "Verfuegbar";
    case "beta":
      return "Beta";
    case "planned":
      return "Steuerung geplant";
    case "not_available":
      return "Nur speichern";
  }
}

function capabilityLabel(capability: string) {
  if (capability === "power") return "An/Aus";
  if (capability === "brightness") return "Helligkeit";
  return capability;
}

function localDeviceRank(device: SmartHomeDevice) {
  const text = `${device.name} ${device.deviceType} ${device.itemName ?? ""}`.toLowerCase();
  if (text.includes("samsung") || text.includes("tv") || text.includes("oled")) return 0;
  if (device.deviceType === "media") return 1;
  return 2;
}

function providerCta(status: HomeProviderConnectionStatus) {
  if (status === "available" || status === "beta") return { label: "Verbinden", kind: "primary" as const };
  if (status === "planned") return { label: "Geplant", kind: "secondary" as const };
  return { label: "Geraet trotzdem speichern", kind: "secondary" as const };
}
