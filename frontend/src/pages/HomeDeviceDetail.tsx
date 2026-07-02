import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Home,
  Link2,
  Power,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Tv,
  Volume2,
  VolumeX,
  Wrench
} from "lucide-react";
import { api, isoDate } from "../lib/api";
import { ConsoleSkeleton } from "../components/app/AppKit";
import type { Item, SmartHomeCommand, SmartHomeDevice, SmartHomePayload } from "../lib/types";

export type HomeCapability =
  | "power"
  | "brightness"
  | "color"
  | "colorTemperature"
  | "temperature"
  | "humidity"
  | "lock"
  | "scene"
  | "motion"
  | "contact"
  | "battery"
  | "energy"
  | "mediaPlayback"
  | "volume"
  | "source"
  | "cleaning"
  | "camera"
  | "alarm"
  | "presence";

export type HomeDeviceRelation = {
  id: string;
  label: string;
  type: "device" | "document" | "receipt" | "warranty" | "manual" | "provider" | "room" | "task";
  status?: "linked" | "missing" | "planned" | "warning";
};

export type HomeDeviceTimelineItem = {
  id: string;
  date: string;
  title: string;
  description?: string;
  type: "created" | "connected" | "controlled" | "document" | "warranty" | "issue" | "care";
};

export type HomeDeviceCareTask = {
  id: string;
  title: string;
  description?: string;
  status: "open" | "done" | "upcoming";
  dueLabel?: string;
};

export type HomeDeviceResolveTopic = {
  id: string;
  title: string;
  description: string;
  steps: string[];
  status?: "available" | "planned";
};

type DetailStatus = "loading" | "ready" | "error";
type TvCommand = "power_on" | "power_off" | "volume_up" | "volume_down" | "mute_toggle" | "source_menu";
type DetailBusy = TvCommand | "link" | null;
type OpenControl = "volume" | "source" | "moment" | null;

export function HomeDeviceDetailPage() {
  const { deviceId } = useParams();
  const [payload, setPayload] = useState<SmartHomePayload | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<DetailStatus>("loading");
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState<DetailBusy>(null);
  const [openControl, setOpenControl] = useState<OpenControl>(null);
  const [selectedItemId, setSelectedItemId] = useState("");

  async function load() {
    setStatus((current) => (current === "ready" ? "ready" : "loading"));
    try {
      const [nextPayload, nextItems] = await Promise.all([api<SmartHomePayload>("/api/smart-home"), api<Item[]>("/api/items")]);
      setPayload(nextPayload);
      setItems(nextItems);
      setStatus("ready");
    } catch (error) {
      console.warn("Home device detail could not be loaded.", error);
      setStatus("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const device = useMemo(() => payload?.devices.find((entry) => entry.id === deviceId) ?? null, [payload, deviceId]);
  const linkedItem = useMemo(() => items.find((item) => item.id === device?.itemId) ?? null, [items, device?.itemId]);
  const rankedItems = useMemo(() => (device ? rankItemsForDevice(device, items) : items).slice(0, 30), [device, items]);

  useEffect(() => {
    setSelectedItemId(device?.itemId ?? "");
  }, [device?.itemId]);

  async function sendDeviceCommand(command: TvCommand) {
    if (!device) return;
    setBusyAction(command);
    setMessage("");
    try {
      const result = await api<SmartHomeCommand>(`/api/smart-home/devices/${device.id}/commands`, {
        method: "POST",
        body: JSON.stringify({ command })
      });
      setMessage(commandFeedback(device, command, result));
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Befehl konnte nicht ausgeführt werden.");
    } finally {
      setBusyAction(null);
    }
  }

  async function linkDeviceToItem(itemId: string | null) {
    if (!device) return;
    setBusyAction("link");
    setMessage("");
    try {
      await api(`/api/smart-home/devices/${device.id}/link`, {
        method: "PATCH",
        body: JSON.stringify({ itemId })
      });
      setMessage(itemId ? `${displayDeviceName(device)} wurde mit einer Produktakte verbunden.` : `${displayDeviceName(device)} wurde von der Produktakte gelöst.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Produktakte konnte nicht verbunden werden.");
    } finally {
      setBusyAction(null);
    }
  }

  if (status === "loading") return <ConsoleSkeleton />;

  if (status === "error" || !payload) {
    return (
      <main className="hd-page">
        <section className="hd-empty">
          <span>Home Graph</span>
          <h1>Gerät nicht erreichbar</h1>
          <p>Die Smart-Home-Verbindung konnte gerade nicht geladen werden. Es werden keine Zugangsdaten im Browser gespeichert.</p>
          <button className="hd-secondary" onClick={() => void load()} type="button">
            <RefreshCw size={15} /> Erneut versuchen
          </button>
        </section>
      </main>
    );
  }

  if (!device) {
    return (
      <main className="hd-page">
        <section className="hd-empty">
          <span>Home Graph</span>
          <h1>Gerät nicht gefunden</h1>
          <p>Dieses Gerät ist nicht mehr verbunden oder gehört nicht zu deinem aktuellen Avareno-Konto.</p>
          <Link className="hd-secondary" to="/app/smart-home">
            <ArrowLeft size={15} /> Zurück zur Übersicht
          </Link>
        </section>
      </main>
    );
  }

  const isOn = device.powerState === "on";
  const powerAvailable = canPowerDevice(device) && (!isTvLike(device) || hasSamsungToken(device));
  const relations = buildRelations(device, linkedItem);
  const careTasks = buildCareTasks(linkedItem);
  const topics = buildResolveTopics(device);
  const timeline = buildTimeline(device, linkedItem);
  const contextActions = buildContextActions(device, linkedItem);

  return (
    <main className="hd-page">
      <Link className="hd-back" to="/app/smart-home">
        <ArrowLeft size={15} /> Smart Home
      </Link>

      <section className="hd-hero">
        <div className="hd-hero-copy">
          <span className="hd-kicker">Avareno Home Graph</span>
          <h1>{displayDeviceName(device)}</h1>
          <p>Ein echtes Gerät in deinem Zuhause, verbunden mit App, Raum, Belegen, Garantie und Aktionen.</p>
          <div className="hd-badges">
            <StatusBadge label={device.status === "ONLINE" ? "Online" : powerStateLabel(device)} tone={device.status === "ONLINE" ? "accent" : "muted"} />
            <StatusBadge label={`Level ${connectionLevel(device)} · ${powerAvailable ? "Steuerbar" : "Erkannt"}`} tone="accent" />
            <StatusBadge label={providerLabel(device.provider)} tone="muted" />
          </div>
        </div>

        <div className="hd-hero-actions">
          {powerAvailable ? (
            <button
              className="hd-primary"
              disabled={Boolean(busyAction)}
              onClick={() => void sendDeviceCommand(isOn ? "power_off" : "power_on")}
              type="button"
            >
              <Power size={16} /> {busyAction === "power_on" || busyAction === "power_off" ? "Wird gesendet..." : isOn ? "Ausschalten" : "Einschalten"}
            </button>
          ) : (
            <span className="hd-unavailable">Steuerung nicht verbunden</span>
          )}
          <Link className="hd-secondary" to="/app/resolve">
            <Wrench size={15} /> Problem lösen
          </Link>
          <Link className="hd-secondary" to={linkedItem ? `/app/dinge/${linkedItem.id}` : "/app/capture/receipt"}>
            <FileText size={15} /> {linkedItem ? "Produktakte öffnen" : "Rechnung hochladen"}
          </Link>
        </div>
      </section>

      {message ? <p className="hd-message">{message}</p> : null}

      <section className="hd-grid">
        <article className="hd-panel hd-controls">
          <SectionIntro title="Steuerung" subtitle="Nur echte, sichere Funktionen sind aktiv. Alles andere bleibt klar markiert." />
          <div className="hd-control-list">
            <ControlRow
              available={powerAvailable}
              actionLabel={isOn ? "Ausschalten" : "Einschalten"}
              busy={busyAction === "power_on" || busyAction === "power_off"}
              icon={<Power size={17} />}
              label="Ein/Aus"
              note={powerAvailable ? "Verfügbar über die bestehende Integration" : "Freigabe oder Provider-Verbindung fehlt"}
              onAction={() => void sendDeviceCommand(isOn ? "power_off" : "power_on")}
              status={powerAvailable ? "Verfügbar" : "Nicht verbunden"}
            />
            <ControlRow
              available={powerAvailable && isTvLike(device)}
              actionLabel="Öffnen"
              icon={<Volume2 size={17} />}
              label="Lautstärke"
              note={powerAvailable && isTvLike(device) ? "Lauter, leiser und stumm direkt am TV senden" : "TV-Fernbedienung ist noch nicht verbunden"}
              onAction={() => setOpenControl(openControl === "volume" ? null : "volume")}
              status={powerAvailable && isTvLike(device) ? "Verfügbar" : "Nicht verbunden"}
            />
            <ControlRow
              available={powerAvailable && isTvLike(device)}
              actionLabel="Öffnen"
              icon={<Tv size={17} />}
              label="HDMI / Quelle"
              note="Öffnet die Quellen-Auswahl am TV. Einzelne HDMI-Tasten folgen erst mit Provider-Support."
              onAction={() => setOpenControl(openControl === "source" ? null : "source")}
              status={powerAvailable && isTvLike(device) ? "Basis" : "Geplant"}
            />
            <ControlRow
              actionLabel="Ansehen"
              icon={<Home size={17} />}
              label="Filmabend vorbereiten"
              note="TV, Licht und Audio später als Moment bündeln"
              onAction={() => setOpenControl(openControl === "moment" ? null : "moment")}
              status="Geplant"
            />
          </div>
          {openControl ? (
            <ControlDetailPanel
              busyAction={busyAction}
              control={openControl}
              onCommand={(command) => void sendDeviceCommand(command)}
              powerAvailable={powerAvailable}
            />
          ) : null}
        </article>

        <article className="hd-panel hd-knowledge">
          <SectionIntro title="Was Avareno weiß" subtitle="Der Unterschied: Kontrolle, Dokumente und Kontext gehören zusammen." />
          <div className="hd-facts">
            <Fact label="Anbieter/App" value={providerLabel(device.provider)} />
            <Fact label="Raum" value={device.roomName || linkedItem?.location || "Noch nicht gesetzt"} />
            <Fact label="Gerätetyp" value={deviceTypeLabel(device)} />
            <Fact label="Steuerbar" value={powerAvailable ? "Ja, Ein/Aus" : "Noch nicht"} />
            <Fact label="Rechnung" value={linkedItem?.documents?.length ? "Verknüpft" : "Fehlt noch"} tone={linkedItem?.documents?.length ? "good" : "missing"} />
            <Fact label="Garantie" value={linkedItem?.warrantyUntil ? `bis ${isoDate(linkedItem.warrantyUntil)}` : "Fehlt noch"} tone={linkedItem?.warrantyUntil ? "good" : "missing"} />
            <Fact label="Anleitung" value={linkedItem?.manualUrl ? "Verknüpft" : "Fehlt noch"} tone={linkedItem?.manualUrl ? "good" : "missing"} />
            <Fact label="Support" value={linkedItem?.supportUrl ? "Verfügbar" : "Vorbereitet"} />
          </div>
          <div className="hd-next-actions">
            {contextActions.map((action) => (
              <Link className="hd-next-action" key={action.label} to={action.to}>
                <span>{action.icon}</span>
                <strong>{action.label}</strong>
                <small>{action.description}</small>
              </Link>
            ))}
          </div>
          <ProductLinkPanel
            busy={busyAction === "link"}
            device={device}
            items={rankedItems}
            linkedItem={linkedItem}
            onLink={(itemId) => void linkDeviceToItem(itemId)}
            selectedItemId={selectedItemId}
            setSelectedItemId={setSelectedItemId}
          />
        </article>
      </section>

      <section className="hd-panel hd-graph-panel">
        <SectionIntro title="Home Graph" subtitle="Alles, was zu diesem Gerät gehört, an einem Ort verbunden." />
        <HomeGraphVisual device={device} relations={relations} />
      </section>

      <section className="hd-grid">
        <article className="hd-panel">
          <SectionIntro title="Avareno Resolve" subtitle="Wenn etwas nicht funktioniert, führt dich Avareno durch die wichtigsten Schritte." />
          <div className="hd-topic-list">
            {topics.map((topic) => (
              <details className="hd-topic" key={topic.id}>
                <summary>
                  <span>
                    <strong>{topic.title}</strong>
                    <small>{topic.description}</small>
                  </span>
                  <em>{topic.status === "planned" ? "Geplant" : "Verfügbar"}</em>
                </summary>
                <ol>
                  {topic.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </article>

        <article className="hd-panel">
          <SectionIntro title="Avareno Care" subtitle="Wartung, Erinnerungen und wichtige Aufgaben rund um dein Gerät." />
          <div className="hd-care-list">
            {careTasks.map((task) => (
              <div className="hd-care" key={task.id}>
                <CheckCircle2 size={16} />
                <span>
                  <strong>{task.title}</strong>
                  <small>{task.description}</small>
                </span>
                <em>{task.status === "done" ? "Erledigt" : task.dueLabel || "Offen"}</em>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="hd-grid">
        <article className="hd-panel">
          <SectionIntro title="Timeline" subtitle="Avareno merkt sich, was mit diesem Gerät passiert." />
          <div className="hd-timeline">
            {timeline.map((item) => (
              <div className="hd-time" key={item.id}>
                <Clock3 size={15} />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
                <em>{item.date}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="hd-panel hd-moment">
          <SectionIntro title="Avareno Moments" subtitle="Szenen werden später aus echten Geräten, Räumen und Care-Kontext zusammengesetzt." />
          <div className="hd-moment-card">
            <span>Teilweise verfügbar</span>
            <h3>Filmabend vorbereiten</h3>
            <p>TV einschalten, Licht dimmen, Soundbar prüfen und verbundene Geräte vorbereiten.</p>
            <button disabled type="button">Geplant</button>
          </div>
        </article>
      </section>
    </main>
  );
}

function SectionIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="hd-section-intro">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </header>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "accent" | "muted" }) {
  return <span className={tone === "accent" ? "hd-badge is-accent" : "hd-badge"}>{label}</span>;
}

function ControlRow({
  actionLabel,
  available = false,
  busy = false,
  icon,
  label,
  note,
  onAction,
  status
}: {
  actionLabel?: string;
  available?: boolean;
  busy?: boolean;
  icon: ReactNode;
  label: string;
  note: string;
  onAction?: () => void;
  status: string;
}) {
  const content = (
    <>
      <span>{icon}</span>
      <strong>{label}</strong>
      <small>{note}</small>
      <em>{status}</em>
      {actionLabel ? <b>{busy ? "Wird gesendet..." : actionLabel}</b> : null}
    </>
  );

  if (onAction) {
    return (
      <button className={available ? "hd-control is-live is-clickable" : "hd-control is-clickable"} disabled={busy} onClick={onAction} type="button">
        {content}
      </button>
    );
  }

  return (
    <div className={available ? "hd-control is-live" : "hd-control"}>
      {content}
    </div>
  );
}

function ControlDetailPanel({
  busyAction,
  control,
  onCommand,
  powerAvailable
}: {
  busyAction: DetailBusy;
  control: OpenControl;
  onCommand: (command: TvCommand) => void;
  powerAvailable: boolean;
}) {
  if (control === "volume") {
    return (
      <div className="hd-control-detail">
        <div>
          <strong>Lautstärke</strong>
          <small>Direkte TV-Befehle. Der Fernseher zeigt die Lautstärke selbst an.</small>
        </div>
        <div className="hd-command-grid">
          <button disabled={!powerAvailable || busyAction === "volume_down"} onClick={() => onCommand("volume_down")} type="button">
            <Volume2 size={15} /> Leiser
          </button>
          <button disabled={!powerAvailable || busyAction === "volume_up"} onClick={() => onCommand("volume_up")} type="button">
            <Volume2 size={15} /> Lauter
          </button>
          <button disabled={!powerAvailable || busyAction === "mute_toggle"} onClick={() => onCommand("mute_toggle")} type="button">
            <VolumeX size={15} /> Stumm
          </button>
        </div>
      </div>
    );
  }

  if (control === "source") {
    return (
      <div className="hd-control-detail">
        <div>
          <strong>Quelle / HDMI</strong>
          <small>Samsung liefert lokal meist ein Quellenmenü, aber keine verlässliche einzelne HDMI-Auswahl.</small>
        </div>
        <button className="hd-detail-command" disabled={!powerAvailable || busyAction === "source_menu"} onClick={() => onCommand("source_menu")} type="button">
          <Tv size={15} /> Quellenmenü am TV öffnen
        </button>
      </div>
    );
  }

  return (
    <div className="hd-control-detail">
      <div>
        <strong>Filmabend vorbereiten</strong>
        <small>Kommt erst, wenn TV, Licht und Audio als echte steuerbare Geräte verbunden sind.</small>
      </div>
      <Link className="hd-detail-command" to="/app/smart-home">
        <Link2 size={15} /> Weitere Geräte verbinden
      </Link>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "good" | "missing" }) {
  return (
    <div className={tone ? `hd-fact is-${tone}` : "hd-fact"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProductLinkPanel({
  busy,
  device,
  items,
  linkedItem,
  onLink,
  selectedItemId,
  setSelectedItemId
}: {
  busy: boolean;
  device: SmartHomeDevice;
  items: Item[];
  linkedItem: Item | null;
  onLink: (itemId: string | null) => void;
  selectedItemId: string;
  setSelectedItemId: (value: string) => void;
}) {
  return (
    <div className="hd-link-panel">
      <div>
        <strong>Produktakte</strong>
        <small>{linkedItem ? `Verbunden mit ${linkedItem.name}` : "Verbinde dieses Gerät mit dem echten Produkt."}</small>
      </div>
      <label>
        <span>Produkt auswählen</span>
        <select disabled={busy} onChange={(event) => setSelectedItemId(event.currentTarget.value)} value={selectedItemId}>
          <option value="">Nicht verbunden</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <div className="hd-link-actions">
        <button disabled={busy || selectedItemId === (device.itemId ?? "")} onClick={() => onLink(selectedItemId || null)} type="button">
          {busy ? "Speichern..." : "Speichern"}
        </button>
        {device.itemId ? (
          <button disabled={busy} onClick={() => onLink(null)} type="button">
            Lösen
          </button>
        ) : null}
      </div>
    </div>
  );
}

function HomeGraphVisual({ device, relations }: { device: SmartHomeDevice; relations: HomeDeviceRelation[] }) {
  return (
    <div className="hd-graph" aria-label="Home Graph Visual">
      <div className="hd-graph-center">
        <Tv size={22} />
        <strong>{displayDeviceName(device)}</strong>
        <small>{deviceTypeLabel(device)}</small>
      </div>
      {relations.map((relation, index) => (
        <div className={`hd-node hd-node-${index + 1} is-${relation.status ?? "linked"}`} key={relation.id}>
          <span>{relationIcon(relation.type)}</span>
          <strong>{relation.label}</strong>
          <small>{relation.status === "missing" ? "Fehlt" : relation.status === "planned" ? "Geplant" : "Verbunden"}</small>
        </div>
      ))}
    </div>
  );
}

function relationIcon(type: HomeDeviceRelation["type"]) {
  if (type === "provider") return <RadioTower size={15} />;
  if (type === "room") return <Home size={15} />;
  if (type === "receipt") return <FileText size={15} />;
  if (type === "warranty") return <ShieldCheck size={15} />;
  if (type === "manual") return <BookOpen size={15} />;
  if (type === "task") return <Wrench size={15} />;
  if (type === "document") return <Link2 size={15} />;
  return <Tv size={15} />;
}

function buildRelations(device: SmartHomeDevice, item: Item | null): HomeDeviceRelation[] {
  return [
    { id: "provider", label: providerLabel(device.provider), type: "provider", status: "linked" },
    { id: "room", label: device.roomName || item?.location || "Raum fehlt", type: "room", status: device.roomName || item?.location ? "linked" : "missing" },
    { id: "receipt", label: "Rechnung", type: "receipt", status: item?.documents?.length ? "linked" : "missing" },
    { id: "warranty", label: "Garantie", type: "warranty", status: item?.warrantyUntil ? "linked" : "missing" },
    { id: "manual", label: "Anleitung", type: "manual", status: item?.manualUrl ? "linked" : "missing" },
    { id: "router", label: "Router", type: "device", status: "planned" },
    { id: "soundbar", label: "Soundbar", type: "device", status: "planned" },
    { id: "care", label: "Care Tasks", type: "task", status: "linked" }
  ];
}

function buildCareTasks(item: Item | null): HomeDeviceCareTask[] {
  return [
    { id: "firmware", title: "Firmware prüfen", description: "Version und Herstellerhinweise später direkt am Gerät speichern.", status: "open", dueLabel: "Offen" },
    { id: "clean", title: "Display reinigen", description: "Schonende Reinigung als wiederkehrende Care-Aufgabe.", status: "upcoming", dueLabel: "Bald" },
    {
      id: "warranty",
      title: "Garantie prüfen",
      description: item?.warrantyUntil ? `Garantie bis ${isoDate(item.warrantyUntil)} hinterlegt.` : "Garantie und Kaufdatum fehlen noch.",
      status: item?.warrantyUntil ? "done" : "open",
      dueLabel: item?.warrantyUntil ? "Erledigt" : "Offen"
    },
    {
      id: "receipt",
      title: "Rechnung hinzufügen",
      description: item?.documents?.length ? "Mindestens ein Dokument ist verknüpft." : "Beleg hochladen, damit Garantie und Support leichter werden.",
      status: item?.documents?.length ? "done" : "open",
      dueLabel: item?.documents?.length ? "Erledigt" : "Offen"
    }
  ];
}

function buildContextActions(device: SmartHomeDevice, item: Item | null): Array<{ description: string; icon: ReactNode; label: string; to: string }> {
  const actions: Array<{ description: string; icon: ReactNode; label: string; to: string }> = [];
  if (!item) {
    actions.push({
      description: "Verbinde den TV mit dem echten Produkt in deiner Objektbibliothek.",
      icon: <Link2 size={15} />,
      label: "Produktakte verbinden",
      to: "/app/smart-home"
    });
  }
  if (!item?.documents?.length) {
    actions.push({
      description: "Damit Garantie und Support später belastbarer sind.",
      icon: <FileText size={15} />,
      label: "Rechnung hochladen",
      to: "/app/capture/receipt"
    });
  }
  if (!item?.warrantyUntil) {
    actions.push({
      description: "Kaufdatum und Garantieende beim Gerät speichern.",
      icon: <ShieldCheck size={15} />,
      label: "Garantie hinzufügen",
      to: item ? `/app/dinge/${item.id}` : "/app/capture/item"
    });
  }
  if (!item?.manualUrl) {
    actions.push({
      description: "Anleitung oder Support-Link direkt am Gerät ablegen.",
      icon: <BookOpen size={15} />,
      label: "Anleitung verknüpfen",
      to: item ? `/app/dinge/${item.id}` : "/app/capture/item"
    });
  }
  if (!actions.length) {
    actions.push({
      description: `${displayDeviceName(device)} ist gut mit seiner Produktakte verbunden.`,
      icon: <CheckCircle2 size={15} />,
      label: "Produktakte öffnen",
      to: item ? `/app/dinge/${item.id}` : "/app/dinge"
    });
  }
  return actions.slice(0, 3);
}

function buildResolveTopics(device: SmartHomeDevice): HomeDeviceResolveTopic[] {
  const onlineStep = device.powerState === "on" ? "Der Fernseher ist laut Avareno aktuell an." : "Prüfe zuerst, ob der Fernseher eingeschaltet oder erreichbar ist.";
  return [
    {
      id: "no-signal",
      title: "Kein Signal",
      description: "HDMI, Quelle und angeschlossene Geräte strukturiert prüfen.",
      status: "available",
      steps: [onlineStep, "Prüfe die HDMI-Quelle am Fernseher.", "Prüfe, ob das angeschlossene Gerät eingeschaltet ist.", "Prüfe Kabel und Eingang.", "Öffne Anleitung oder Support-Seite in der Produktakte."]
    },
    {
      id: "offline",
      title: "TV offline",
      description: "Netzwerk, Strom und lokale Steuerung eingrenzen.",
      status: "available",
      steps: ["Prüfe Stromversorgung und Standby.", "Prüfe, ob TV und Avareno im gleichen Netzwerk sind.", "Starte die lokale Suche erneut.", "Falls nötig: Fernbedienung am TV erneut freigeben."]
    },
    {
      id: "sound",
      title: "Kein Ton über Soundbar",
      description: "Soundbar-Relation ist geplant und wird später tiefer geprüft.",
      status: "planned",
      steps: ["Prüfe Soundbar-Strom.", "Prüfe HDMI ARC/eARC.", "Prüfe TV-Audioausgabe.", "Speichere Soundbar später als verknüpftes Gerät."]
    },
    {
      id: "remote",
      title: "Fernbedienung reagiert nicht",
      description: "Avareno merkt Kopplung und Support-Schritte.",
      status: "available",
      steps: ["Prüfe Batterien oder Ladezustand.", "Prüfe, ob Avareno als Fernbedienung freigegeben ist.", "Starte TV und Avareno neu.", "Dokumentiere den Schritt in der Produktakte."]
    }
  ];
}

function buildTimeline(device: SmartHomeDevice, item: Item | null): HomeDeviceTimelineItem[] {
  return [
    { id: "connected", type: "connected", title: "Gerät verbunden", description: `${providerLabel(device.provider)} wurde als Quelle gespeichert.`, date: device.lastSeenAt ? isoDate(device.lastSeenAt) : "Heute" },
    { id: "state", type: "controlled", title: "Status erkannt", description: `Aktueller Zustand: ${powerStateLabel(device)}.`, date: "Jetzt" },
    {
      id: "receipt",
      type: "document",
      title: item?.documents?.length ? "Rechnung verknüpft" : "Rechnung fehlt noch",
      description: item?.documents?.length ? "Avareno kann Beleg und Gerät zusammenführen." : "Lade die Rechnung hoch, damit Support und Garantie belastbarer werden.",
      date: item?.documents?.length ? "Gespeichert" : "Offen"
    },
    {
      id: "warranty",
      type: "warranty",
      title: item?.warrantyUntil ? "Garantie gespeichert" : "Garantie offen",
      description: item?.warrantyUntil ? `Läuft bis ${isoDate(item.warrantyUntil)}.` : "Garantiezeitraum kann ergänzt werden.",
      date: item?.warrantyUntil ? isoDate(item.warrantyUntil) : "Offen"
    }
  ];
}

function commandFeedback(device: SmartHomeDevice, command: TvCommand, result: SmartHomeCommand) {
  const parsed = parseCommandResult(result.result);
  if (parsed?.mode === "already_off") return `${device.name} ist bereits aus.`;
  if (parsed?.mode === "already_on") return `${device.name} ist bereits an.`;
  if (parsed?.mode === "unknown_state") return `${device.name}: Ausschalten wurde nicht gesendet, weil der TV-Status nicht eindeutig war.`;
  if (parsed?.pairingHint) return `${device.name}: Falls nichts passiert, bestätige Avareno am Fernseher als Fernbedienung.`;
  if (parsed?.mode === "wake_on_lan") return `${device.name}: Aufwecken gesendet. Das kann ein paar Sekunden dauern.`;
  if (command === "volume_up") return `${device.name}: Lauter gesendet.`;
  if (command === "volume_down") return `${device.name}: Leiser gesendet.`;
  if (command === "mute_toggle") return `${device.name}: Stumm umschalten gesendet.`;
  if (command === "source_menu") return `${device.name}: Quellenmenü geöffnet.`;
  return command === "power_on" ? `${device.name}: Einschalten gesendet.` : `${device.name}: Ausschalten gesendet.`;
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

function canPowerDevice(device: SmartHomeDevice) {
  const text = `${device.name} ${device.deviceType}`.toLowerCase();
  const capabilities = device.capabilities.map((capability) => capability.toLowerCase());
  return text.includes("tv") || text.includes("samsung") || capabilities.includes("switch");
}

function hasSamsungToken(device: SmartHomeDevice) {
  return typeof device.rawJson?.samsungRemoteToken === "string" && device.rawJson.samsungRemoteToken.length > 0;
}

function isTvLike(device: SmartHomeDevice) {
  const text = `${device.name} ${device.deviceType}`.toLowerCase();
  return text.includes("tv") || text.includes("samsung");
}

function deviceTypeLabel(device: SmartHomeDevice) {
  const text = `${device.name} ${device.deviceType}`.toLowerCase();
  if (text.includes("tv") || text.includes("samsung")) return "Fernseher";
  if (text.includes("cast") || text.includes("media")) return "Media-Gerät";
  if (text.includes("printer") || text.includes("bambu")) return "Drucker";
  if (text.includes("light") || text.includes("lampe")) return "Licht";
  return "Smart-Home-Gerät";
}

function powerStateLabel(device: SmartHomeDevice) {
  if (device.powerState === "on") return "An";
  if (device.powerState === "off") return "Aus";
  return "Bereit";
}

function providerLabel(provider: string) {
  if (provider === "LOCAL_DISCOVERY") return "Lokale Verbindung";
  if (provider === "SAMSUNG_SMARTTHINGS") return "Samsung SmartThings";
  if (provider === "HOME_ASSISTANT") return "Home Assistant";
  if (provider === "AVARENO_BRIDGE") return "Avareno Bridge";
  return provider.replace(/_/g, " ");
}

function connectionLevel(device: SmartHomeDevice) {
  if (canPowerDevice(device) && device.itemId) return 3;
  if (canPowerDevice(device)) return 2;
  if (device.itemId) return 2;
  return 1;
}

function displayDeviceName(device: SmartHomeDevice) {
  const name = device.name.replace(/\s+candidate$/i, "").trim();
  if (isTvLike(device) && device.roomName) return `${device.roomName} TV`;
  return name || "Smart-Home-Gerät";
}

function rankItemsForDevice(device: SmartHomeDevice, items: Item[]) {
  return [...items].sort((a, b) => itemMatchScore(device, b) - itemMatchScore(device, a) || a.name.localeCompare(b.name));
}

function itemMatchScore(device: SmartHomeDevice, item: Item) {
  const haystack = [item.name, item.category, item.manufacturer, item.model, item.location, item.itemType].join(" ").toLowerCase();
  const deviceText = `${device.name} ${device.deviceType} ${device.roomName ?? ""}`.toLowerCase();
  let score = 0;
  for (const word of deviceText.split(/\s+/).filter((entry) => entry.length > 2)) {
    if (haystack.includes(word)) score += 1;
  }
  if (isTvLike(device) && (haystack.includes("tv") || haystack.includes("fernseher") || haystack.includes("oled") || haystack.includes("samsung"))) score += 8;
  if (device.roomName && haystack.includes(device.roomName.toLowerCase())) score += 4;
  if (item.documents?.length) score += 1;
  if (item.warrantyUntil) score += 1;
  return score;
}
