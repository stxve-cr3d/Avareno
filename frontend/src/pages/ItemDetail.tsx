import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Cpu,
  ExternalLink,
  FileText,
  Hammer,
  Home,
  ImageOff,
  LifeBuoy,
  Link2,
  MapPin,
  Package,
  PlugZap,
  Plus,
  Power,
  Printer,
  RadioTower,
  ReceiptText,
  Repeat2,
  Save,
  ScanBarcode,
  Send,
  ShieldCheck,
  Store,
  Thermometer,
  UploadCloud,
  Users,
  Volume2,
  Wrench
} from "lucide-react";
import { api, isoDate } from "../lib/api";
import type { Item, Loop, RepairLog, SmartHomeDevice, SupportDraft } from "../lib/types";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { LoopCard } from "../components/LoopCard";
import { ProgressBar } from "../components/ProgressBar";

type ImageSuggestion = {
  imageUrl: string;
  sourceName: string;
  sourceUrl: string;
};

const documentTypes = ["RECEIPT", "WARRANTY", "MANUAL", "DRIVER", "SOFTWARE", "OTHER"] as const;

export function ItemDetail() {
  const { id } = useParams();
  const [item, setItem] = useState<Item | null>(null);
  const [serialNumber, setSerialNumber] = useState("");
  const [passportLinks, setPassportLinks] = useState({
    manualUrl: "",
    driverUrl: "",
    softwareUrl: "",
    supportUrl: "",
    supportContact: ""
  });
  const [reminderTitle, setReminderTitle] = useState("");
  const [imageSource, setImageSource] = useState<ImageSuggestion | null>(null);
  const [reorderUrl, setReorderUrl] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<(typeof documentTypes)[number]>("MANUAL");
  const [repairDraft, setRepairDraft] = useState({
    date: new Date().toISOString().slice(0, 10),
    problem: "",
    resolution: "",
    cost: "",
    status: "OPEN"
  });
  const [supportDraft, setSupportDraft] = useState<SupportDraft | null>(null);
  const [detailMessage, setDetailMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    if (!id) return;
    const result = await api<Item>(`/api/items/${id}`);
    setItem(result);
    setSerialNumber(result.serialNumber ?? "");
    setPassportLinks({
      manualUrl: result.manualUrl ?? "",
      driverUrl: result.driverUrl ?? "",
      softwareUrl: result.softwareUrl ?? "",
      supportUrl: result.supportUrl ?? "",
      supportContact: result.supportContact ?? ""
    });
    setReorderUrl(result.reorderUrl ?? "");
    setAffiliateUrl(result.affiliateUrl ?? "");
  }

  useEffect(() => {
    void load();
  }, [id]);

  useEffect(() => {
    if (!item || item.imageUrl) return;
    let ignore = false;

    async function fillProductImage() {
      if (!item) return;
      try {
        const suggestion = await api<ImageSuggestion>(`/api/items/${item.id}/image-suggestion`);
        if (ignore) return;
        setImageSource(suggestion);
        const updated = await api<Item>(`/api/items/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ imageUrl: suggestion.imageUrl })
        });
        if (!ignore) setItem(updated);
      } catch {
        if (!ignore) setImageSource(null);
      }
    }

    void fillProductImage();
    return () => {
      ignore = true;
    };
  }, [item?.id, item?.imageUrl]);

  async function saveSerial() {
    if (!item) return;
    setItem(await api<Item>(`/api/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ serialNumber }) }));
  }

  async function savePassportLinks() {
    if (!item) return;
    const cleaned = Object.fromEntries(
      Object.entries(passportLinks).map(([key, value]) => [key, value.trim() || null])
    );
    const updated = await api<Item>(`/api/items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify(cleaned)
    });
    setItem(updated);
    setDetailMessage("Product Passport saved");
  }

  async function uploadPassportDocument() {
    if (!item || !documentFile) return;
    setBusy("document-upload");
    try {
      const data = new FormData();
      data.append("file", documentFile);
      data.append("type", documentType);
      data.append("itemId", item.id);
      await api("/api/documents/upload", { method: "POST", body: data });
      setDocumentFile(null);
      setDetailMessage(`${documentType.toLowerCase()} uploaded`);
      await load();
    } finally {
      setBusy("");
    }
  }

  async function addRepairLog() {
    if (!item || !repairDraft.problem.trim()) return;
    const updated = await api<Item>(`/api/items/${item.id}/repairs`, {
      method: "POST",
      body: JSON.stringify({
        date: repairDraft.date,
        problem: repairDraft.problem.trim(),
        resolution: repairDraft.resolution.trim() || null,
        cost: repairDraft.cost ? Number(repairDraft.cost) : null,
        status: repairDraft.status
      })
    });
    setItem(updated);
    setRepairDraft({
      date: new Date().toISOString().slice(0, 10),
      problem: "",
      resolution: "",
      cost: "",
      status: "OPEN"
    });
    setDetailMessage("Repair log added");
  }

  async function prepareSupportDraft() {
    if (!item) return;
    setBusy("support-draft");
    try {
      const draft = await api<SupportDraft>(`/api/items/${item.id}/support-draft`, { method: "POST" });
      setSupportDraft(draft);
      await load();
    } finally {
      setBusy("");
    }
  }

  async function addReminder() {
    if (!item || !reminderTitle) return;
    const due = new Date();
    due.setDate(due.getDate() + 7);
    await api<Loop>("/api/loops", {
      method: "POST",
      body: JSON.stringify({
        itemId: item.id,
        title: reminderTitle,
        description: `Open loop for ${item.name}`,
        sourceType: "DEVICE",
        priority: "MEDIUM",
        dueDate: due.toISOString(),
        reminderAt: due.toISOString(),
        xpReward: 25
      })
    });
    setReminderTitle("");
    await load();
  }

  async function completeProfile() {
    if (!item) return;
    setItem(
      await api<Item>(`/api/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ serialNumber: serialNumber || "SN-MVP-001" })
      })
    );
  }

  async function saveCommerceLinks() {
    if (!item) return;
    const updated = await api<Item>(`/api/items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        reorderUrl: reorderUrl || null,
        affiliateUrl: affiliateUrl || null,
        affiliateProvider: affiliateUrl ? "avareno-reorder" : null
      })
    });
    await api(`/api/structure/items/${item.id}/activity`, {
      method: "POST",
      body: JSON.stringify({ type: "COMMERCE", message: "Reorder and shop links updated." })
    });
    setItem(updated);
    setDetailMessage("Shop links saved");
  }

  async function smartCommand(deviceId: string, command: string) {
    setBusy(`${deviceId}-${command}`);
    try {
      await api(`/api/smart-home/devices/${deviceId}/commands`, {
        method: "POST",
        body: JSON.stringify({ command })
      });
      setDetailMessage(`Smart command: ${command.replace("_", " ")}`);
      await load();
    } finally {
      setBusy("");
    }
  }

  async function recordBambuEvent(deviceId: string, eventType: string) {
    if (!item) return;
    setBusy(`${deviceId}-event-${eventType}`);
    try {
      const result = await api<{ message: string }>("/api/smart-home/bambu/events", {
        method: "POST",
        body: JSON.stringify({
          deviceId,
          eventType,
          jobName: eventType === "FILAMENT_LOW" ? "Loaded spool" : `${item.name} print`,
          filamentRemaining: eventType === "FILAMENT_LOW" ? 8 : undefined,
          nozzleTemp: eventType === "STARTED" ? 218 : eventType === "FINISHED" ? 38 : undefined,
          bedTemp: eventType === "STARTED" ? 62 : eventType === "FINISHED" ? 31 : undefined
        })
      });
      setDetailMessage(result.message);
      await load();
    } finally {
      setBusy("");
    }
  }

  function trackShopClick(targetUrl: string) {
    if (!item) return;
    void api("/api/structure/affiliate/clicks", {
      method: "POST",
      body: JSON.stringify({
        itemId: item.id,
        partnerSlug: item.affiliateProvider ?? "avareno-reorder",
        targetUrl,
        source: "ITEM_DETAIL"
      })
    }).catch(() => undefined);
  }

  if (!item) return <div className="py-12 text-center text-sm font-semibold text-muted">Loading your item...</div>;

  const warranty = warrantyState(item.warrantyUntil);
  const documents = item.documents ?? [];
  const loops = item.loops ?? [];
  const repairLogs = item.repairLogs ?? [];
  const missing = item.missingFields ?? [];
  const identity = [item.manufacturer, item.model].filter(Boolean).join(" / ") || item.category;
  const shopUrl = item.affiliateUrl || item.reorderUrl;
  const hasManualDocument = hasDocumentType(documents, "MANUAL");
  const hasDriverDocument = hasDocumentType(documents, "DRIVER");
  const hasSoftwareDocument = hasDocumentType(documents, "SOFTWARE");
  const passportHelpers = [
    item.manualUrl || hasManualDocument,
    item.driverUrl || hasDriverDocument,
    item.softwareUrl || hasSoftwareDocument,
    item.supportUrl,
    item.supportContact
  ];
  const passportLinkCount = passportHelpers.filter(Boolean).length;
  const supportReadyScore = supportDraft ? Math.max(0, Math.min(100, supportDraft.readyScore)) : 0;

  return (
    <div className="object-page mx-auto max-w-7xl space-y-5">
      <section className="object-hero overflow-hidden rounded-lg">
        <div className="grid lg:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)]">
          <div className="object-stage">
            <div className="flex items-center justify-between gap-3">
              <Badge tone={warranty.tone}>{warranty.label}</Badge>
              <span className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-black text-muted ring-1 ring-white/80">{item.category}</span>
            </div>

            <div className="relative mt-5 min-h-[19rem] sm:min-h-[25rem]">
              <div className="object-shadow" />
              {item.imageUrl ? (
                <img className="relative z-10 mx-auto h-[18rem] w-full object-contain sm:h-[25rem] lg:h-[31rem]" src={item.imageUrl} alt={item.name} />
              ) : (
                <div className="relative z-10 grid min-h-[18rem] place-items-center rounded-lg bg-white/70 text-muted">
                  <div className="text-center">
                    <ImageOff className="mx-auto" size={34} />
                    <p className="mt-3 text-sm font-black uppercase">Looking for product photo</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/70 pt-4">
              <SmallFact icon={<Home size={16} />} label="Place" value={item.location ?? "Add room"} />
              <SmallFact icon={<Store size={16} />} label="Bought at" value={item.merchant ?? "Unknown"} />
              <SmallFact icon={<ReceiptText size={16} />} label="Papers" value={`${documents.length} saved`} />
            </div>
          </div>

          <div className="object-summary">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-muted">Saved thing</p>
                <h1 className="mt-3 max-w-xl break-words text-4xl font-black leading-[0.98] text-ink sm:text-5xl">{item.name}</h1>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink text-white">
                <Package size={22} />
              </span>
            </div>

            <p className="mt-4 text-base font-semibold leading-7 text-muted">{identity}</p>

            <div className="mt-7 rounded-lg border border-line bg-white p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-black uppercase text-muted">
                <span>Saved details</span>
                <span className="text-ink">{item.completenessScore}%</span>
              </div>
              <ProgressBar value={item.completenessScore} />
              <p className={`mt-3 text-sm font-bold ${missing.length ? "text-amber" : "text-moss"}`}>
                {missing.length ? `Still missing: ${missing.join(", ")}` : "Everything important is attached."}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <HeroFact label="Warranty until" value={isoDate(item.warrantyUntil)} icon={<ShieldCheck size={18} />} />
              <HeroFact label="Purchase" value={isoDate(item.purchaseDate)} icon={<CalendarClock size={18} />} />
              <HeroFact label="Price" value={`${item.price ?? 0} ${item.currency}`} icon={<CreditCard size={18} />} />
              <HeroFact label="Location" value={item.space?.name ?? item.location ?? "Unknown"} icon={<MapPin size={18} />} />
            </div>

            {imageSource ? <p className="mt-4 text-xs font-bold text-muted">Photo matched from {imageSource.sourceName}</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-5">
          <section className="object-panel rounded-lg p-4 md:p-5">
            <SectionTitle eyebrow="What you know" title="Ownership details" icon={<FileText size={19} />} />
            <div className="mt-5 divide-y divide-line/70 rounded-lg border border-line bg-white">
              <DetailRow icon={<Store size={18} />} label="Bought at" value={item.merchant ?? "Unknown"} />
              <DetailRow icon={<CalendarClock size={18} />} label="Bought on" value={isoDate(item.purchaseDate)} />
              <DetailRow icon={<CreditCard size={18} />} label="Paid" value={`${item.price ?? 0} ${item.currency}`} />
              <DetailRow icon={<ShieldCheck size={18} />} label="Warranty until" value={isoDate(item.warrantyUntil)} />
              <DetailRow icon={<Package size={18} />} label="Brand / model" value={identity} />
              <DetailRow icon={<ClipboardCheck size={18} />} label="Serial number" value={item.serialNumber ?? "Missing"} />
              <DetailRow icon={<ScanBarcode size={18} />} label="Barcode / GTIN" value={item.barcode ?? "Missing"} />
              <DetailRow icon={<MapPin size={18} />} label="Where it is" value={item.location ?? "Unknown"} />
              <DetailRow icon={<LifeBuoy size={18} />} label="Support" value={item.supportContact ?? item.supportUrl ?? "Missing"} />
            </div>
          </section>

          <section className="object-panel rounded-lg p-4 md:p-5">
            <SectionTitle eyebrow="Product Passport" title="Manuals, drivers, support" icon={<BookOpen size={19} />} />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <PassportLink icon={<BookOpen size={17} />} label="Manual" saved={hasManualDocument} url={item.manualUrl} />
              <PassportLink icon={<Cpu size={17} />} label="Drivers" saved={hasDriverDocument} url={item.driverUrl} />
              <PassportLink icon={<Package size={17} />} label="Software" saved={hasSoftwareDocument} url={item.softwareUrl} />
              <PassportLink icon={<LifeBuoy size={17} />} label="Support" url={item.supportUrl} />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <PassportField
                label="Manual URL"
                value={passportLinks.manualUrl}
                onChange={(value) => setPassportLinks((current) => ({ ...current, manualUrl: value }))}
                placeholder="https://brand.com/manual"
              />
              <PassportField
                label="Driver URL"
                value={passportLinks.driverUrl}
                onChange={(value) => setPassportLinks((current) => ({ ...current, driverUrl: value }))}
                placeholder="https://brand.com/drivers"
              />
              <PassportField
                label="Software URL"
                value={passportLinks.softwareUrl}
                onChange={(value) => setPassportLinks((current) => ({ ...current, softwareUrl: value }))}
                placeholder="https://brand.com/software"
              />
              <PassportField
                label="Support URL"
                value={passportLinks.supportUrl}
                onChange={(value) => setPassportLinks((current) => ({ ...current, supportUrl: value }))}
                placeholder="https://brand.com/support"
              />
              <div className="md:col-span-2">
                <PassportField
                  label="Support contact"
                  value={passportLinks.supportContact}
                  onChange={(value) => setPassportLinks((current) => ({ ...current, supportContact: value }))}
                  placeholder="LG Support, support@example.com, case portal"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-muted">{passportLinkCount}/5 passport helpers saved</p>
              <Button onClick={savePassportLinks} icon={<Save size={18} />}>
                Save passport
              </Button>
            </div>
          </section>

          <section className="object-panel rounded-lg p-4 md:p-5">
            <SectionTitle eyebrow="Proof" title="Receipts and documents" icon={<ReceiptText size={19} />} />
            <div className="mt-5 rounded-lg border border-line bg-white p-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_auto] md:items-end">
                <label className="block text-sm font-bold text-ink">
                  Add document
                  <span className="mt-2 flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-[#f8faf9] px-3 text-sm font-black text-muted transition hover:border-leaf hover:bg-leaf/5">
                    <UploadCloud className="shrink-0 text-leaf" size={18} />
                    <span className="min-w-0 truncate">{documentFile ? documentFile.name : "Choose file"}</span>
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*,.pdf,.txt,.doc,.docx"
                      onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                    />
                  </span>
                </label>
                <label className="block text-sm font-bold text-ink">
                  Type
                  <select
                    className="mt-2 h-12 w-full rounded-lg border border-line bg-[#f8faf9] px-3 text-sm font-black text-ink outline-none focus:border-leaf"
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value as (typeof documentTypes)[number])}
                  >
                    {documentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <Button onClick={uploadPassportDocument} disabled={!documentFile || busy === "document-upload"} icon={<UploadCloud size={18} />} type="button">
                  {busy === "document-upload" ? "Uploading..." : "Attach"}
                </Button>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {documents.length ? (
                documents.map((document) => (
                  <a
                    className="group flex items-center gap-3 rounded-lg border border-line bg-white p-3 text-sm font-bold text-ink transition hover:border-leaf hover:bg-leaf/5"
                    key={document.id}
                    href={document.filePath}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-[#eef2f0] text-leaf">
                      <ReceiptText size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{document.fileName}</span>
                      <span className="mt-1 block text-xs font-black uppercase text-muted">{document.type}</span>
                    </span>
                    <span className="text-xs font-black text-leaf opacity-0 transition group-hover:opacity-100">Open</span>
                  </a>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-line bg-white/70 p-5 text-sm font-bold text-muted">No receipt or manual attached yet.</div>
              )}
            </div>
          </section>

          <section className="object-panel rounded-lg p-4 md:p-5">
            <SectionTitle eyebrow="Repair Log" title="What happened to it" icon={<Hammer size={19} />} />
            <div className="mt-5 grid gap-3 rounded-lg border border-line bg-white p-3 md:grid-cols-[9rem_minmax(0,1fr)]">
              <label className="text-sm font-bold text-ink">
                Date
                <input
                  type="date"
                  value={repairDraft.date}
                  onChange={(event) => setRepairDraft((current) => ({ ...current, date: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                />
              </label>
              <label className="text-sm font-bold text-ink">
                Problem
                <input
                  value={repairDraft.problem}
                  onChange={(event) => setRepairDraft((current) => ({ ...current, problem: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                  placeholder="Display flickers, cable broken, filter changed"
                />
              </label>
              <label className="text-sm font-bold text-ink">
                Status
                <select
                  value={repairDraft.status}
                  onChange={(event) => setRepairDraft((current) => ({ ...current, status: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="WAITING">WAITING</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </label>
              <label className="text-sm font-bold text-ink">
                Notes
                <input
                  value={repairDraft.resolution}
                  onChange={(event) => setRepairDraft((current) => ({ ...current, resolution: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                  placeholder="What fixed it, who helped, what to remember"
                />
              </label>
              <label className="text-sm font-bold text-ink">
                Cost
                <input
                  inputMode="decimal"
                  value={repairDraft.cost}
                  onChange={(event) => setRepairDraft((current) => ({ ...current, cost: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                  placeholder="0.00"
                />
              </label>
              <div className="flex items-end">
                <Button className="w-full" onClick={addRepairLog} icon={<Plus size={18} />} disabled={!repairDraft.problem.trim()}>
                  Add repair
                </Button>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {repairLogs.length ? (
                repairLogs.map((repair) => <RepairLogCard key={repair.id} repair={repair} currency={item.currency} />)
              ) : (
                <div className="rounded-lg border border-dashed border-line bg-white/70 p-5 text-sm font-bold text-muted">No repair history yet.</div>
              )}
            </div>
          </section>

          <section className="object-panel rounded-lg p-4 md:p-5">
            <SectionTitle eyebrow="Memory" title="Timeline" icon={<CheckCircle2 size={19} />} />
            <div className="mt-5 grid gap-3">
              {item.activities?.length ? (
                item.activities.map((activity) => (
                  <div className="rounded-lg border border-line bg-white p-4" key={activity.id}>
                    <p className="text-xs font-black uppercase text-muted">{activity.type}</p>
                    <p className="mt-1 text-sm font-black text-ink">{activity.message}</p>
                    <p className="mt-2 text-xs font-semibold text-muted">{isoDate(activity.createdAt)}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-line bg-white/70 p-5 text-sm font-bold text-muted">No item history yet.</div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="object-panel rounded-lg p-4">
            <SectionTitle eyebrow="Smart thing" title="Object control" icon={<RadioTower size={19} />} />
            <div className="mt-5 grid gap-3">
              {item.smartHomeDevices?.length ? (
                item.smartHomeDevices.map((device) => (
                  <div className="smart-object-card" key={device.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase text-muted">{device.provider}</p>
                        <h3 className="mt-1 truncate text-lg font-black text-ink">{device.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-muted">{[device.roomName, device.status, device.powerState].filter(Boolean).join(" · ")}</p>
                      </div>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf/10 text-leaf">
                        <PlugZap size={17} />
                      </span>
                    </div>
                    {device.provider === "BAMBU_LAB" && device.deviceType === "3d_printer" ? (
                      <PrinterObjectControls busy={busy} device={device} onBambuEvent={recordBambuEvent} onCommand={smartCommand} />
                    ) : device.capabilities.some((capability) => ["switch", "audioVolume", "audioMute"].includes(capability)) ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button className="smart-mini-action" onClick={() => smartCommand(device.id, "power_on")} type="button">
                        <Power size={15} /> On
                      </button>
                      <button className="smart-mini-action smart-mini-action-light" onClick={() => smartCommand(device.id, "power_off")} type="button">
                        Off
                      </button>
                      <button className="smart-mini-action smart-mini-action-light" onClick={() => smartCommand(device.id, "volume_up")} type="button">
                        <Volume2 size={15} /> +
                      </button>
                      <button className="smart-mini-action smart-mini-action-light" onClick={() => smartCommand(device.id, "mute")} type="button">
                        Mute
                      </button>
                    </div>
                    ) : (
                      <div className="object-device-note">
                        <p>Local identity saved</p>
                        <strong>{device.rawJson?.host ? String(device.rawJson.host) : "No control channel yet"}</strong>
                        <div>
                          {device.capabilities.slice(0, 3).map((capability) => (
                            <span key={capability}>{capability}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-line bg-white/70 p-4 text-sm font-bold text-muted">
                  No smart provider linked yet.
                </div>
              )}
              <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white" to="/smart-home">
                <Link2 size={16} /> Match smart device
              </Link>
            </div>
          </section>

          <section className="object-panel rounded-lg p-4">
            <SectionTitle eyebrow="Reorder" title="Shop & family" icon={<Repeat2 size={19} />} />
            <div className="mt-5 grid gap-3">
              {shopUrl ? (
                <a
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white"
                  href={shopUrl}
                  onClick={() => trackShopClick(shopUrl)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open shop <ExternalLink size={16} />
                </a>
              ) : (
                <div className="rounded-lg border border-dashed border-line bg-white/70 p-4 text-sm font-bold text-muted">No reorder link attached.</div>
              )}
              <label className="block text-sm font-bold text-ink">
                Reorder link
                <input
                  value={reorderUrl}
                  onChange={(event) => setReorderUrl(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                  placeholder="https://shop.example/product"
                />
              </label>
              <label className="block text-sm font-bold text-ink">
                Affiliate link
                <input
                  value={affiliateUrl}
                  onChange={(event) => setAffiliateUrl(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                  placeholder="https://partner.example/product?tag=avareno"
                />
              </label>
              <Button onClick={saveCommerceLinks} icon={<Save size={18} />}>
                Save shop links
              </Button>
              {detailMessage ? <p className="rounded-full bg-leaf/10 px-3 py-2 text-xs font-black text-leaf">{detailMessage}</p> : null}
              <div className="grid gap-2 rounded-lg bg-white p-3 ring-1 ring-line">
                <SmallFact icon={<Users size={16} />} label="Visible" value={item.visibility ?? "HOUSEHOLD"} />
                <SmallFact icon={<Home size={16} />} label="Space" value={item.space?.name ?? item.location ?? "Unknown"} />
                <SmallFact icon={<Package size={16} />} label="Type" value={item.itemType ?? "THING"} />
              </div>
            </div>
          </section>

          <section className="object-panel rounded-lg p-4">
            <SectionTitle eyebrow="Next missing piece" title="Serial" icon={<Wrench size={19} />} />
            <label className="mt-5 block text-sm font-bold text-ink">
              Serial number
              <input
                value={serialNumber}
                onChange={(event) => setSerialNumber(event.target.value)}
                className="mt-2 w-full rounded-lg border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                placeholder="Scan or type serial number"
              />
            </label>
            <div className="mt-4 grid gap-2">
              <Button onClick={saveSerial} icon={<Save size={18} />}>
                Save serial
              </Button>
              <Button variant="secondary" onClick={completeProfile}>
                Fill example
              </Button>
            </div>
          </section>

          <section className="object-panel rounded-lg p-4">
            <SectionTitle eyebrow="Support-Autopilot" title="Draft request" icon={<LifeBuoy size={19} />} />
            <div className="mt-5 grid gap-3">
              <Button onClick={prepareSupportDraft} icon={<Send size={18} />} disabled={busy === "support-draft"}>
                {busy === "support-draft" ? "Preparing..." : "Prepare support"}
              </Button>
              {supportDraft ? (
                <div className="rounded-lg border border-line bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-muted">Support packet</p>
                      <p className="mt-1 text-2xl font-black text-ink">{supportReadyScore}% ready</p>
                    </div>
                    <span className={`rounded-full px-3 py-1.5 text-xs font-black ${supportDraft.missingInfo.length ? "bg-amber/10 text-amber" : "bg-leaf/10 text-leaf"}`}>
                      {supportDraft.missingInfo.length ? `${supportDraft.missingInfo.length} missing` : "Ready"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={supportReadyScore} />
                  </div>

                  <div className="mt-4 grid gap-3 rounded-lg bg-[#f8faf9] p-3">
                    <div>
                      <p className="text-xs font-black uppercase text-muted">To</p>
                      <p className="mt-1 break-words text-sm font-black text-ink">{supportDraft.to}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-muted">Issue</p>
                      <p className="mt-1 break-words text-sm font-black text-ink">{supportDraft.issueSummary}</p>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-muted">Subject</p>
                      <p className="mt-1 break-words text-sm font-black text-ink">{supportDraft.subject}</p>
                    </div>
                  </div>

                  {supportDraft.missingInfo.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {supportDraft.missingInfo.map((entry) => (
                        <span className="rounded-full bg-amber/10 px-3 py-1.5 text-xs font-black text-amber" key={entry.id}>
                          {entry.label}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-2">
                    {supportDraft.attachments.length ? (
                      supportDraft.attachments.map((attachment) => <SupportAttachmentLine attachment={attachment} key={attachment.id} />)
                    ) : (
                      <div className="rounded-lg border border-dashed border-line bg-white/70 p-3 text-xs font-black text-muted">No attachments prepared yet.</div>
                    )}
                  </div>

                  <textarea
                    className="mt-4 min-h-56 w-full resize-y rounded-lg border border-line bg-[#f8faf9] p-3 text-sm font-semibold leading-6 text-ink outline-none focus:border-leaf"
                    value={supportDraft.body}
                    onChange={(event) => setSupportDraft((current) => (current ? { ...current, body: event.target.value } : current))}
                  />
                  <div className="mt-3 grid gap-2">
                    {supportDraft.checklist.map((entry) => <SupportChecklistLine entry={entry} key={entry.label} />)}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-line bg-white/70 p-4 text-sm font-bold text-muted">
                  Uses passport data, warranty, serial number, and repair history.
                </div>
              )}
            </div>
          </section>

          <section className="object-panel rounded-lg p-4">
            <SectionTitle eyebrow="Care" title="Reminders" icon={<ShieldCheck size={19} />} />
            <div className="mt-4 flex gap-2">
              <input
                value={reminderTitle}
                onChange={(event) => setReminderTitle(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                placeholder="Add reminder"
              />
              <Button onClick={addReminder} icon={<Plus size={18} />}>
                Add
              </Button>
            </div>
            <div className="mt-4 grid gap-3">
              {loops.length ? loops.map((loop) => <LoopCard key={loop.id} loop={loop} />) : <div className="rounded-lg border border-dashed border-line bg-white/70 p-5 text-sm font-bold text-muted">No reminders for this item yet.</div>}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function hasDocumentType(documents: { type: string }[], type: string) {
  return documents.some((document) => document.type.toUpperCase() === type);
}

function PassportLink({ icon, label, saved = false, url }: { icon: ReactNode; label: string; saved?: boolean; url?: string | null }) {
  const isSaved = Boolean(url || saved);
  const content = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#eef2f0] text-leaf">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black uppercase text-muted">{label}</span>
        <span className="mt-1 block truncate text-sm font-black text-ink">{isSaved ? "Saved" : "Missing"}</span>
      </span>
      {url ? <ExternalLink className="shrink-0 text-leaf" size={16} /> : null}
    </>
  );

  if (!url) {
    return (
      <div className={`flex min-h-16 items-center gap-3 rounded-lg border p-3 ${isSaved ? "border-line bg-white" : "border-dashed border-line bg-white/70"}`}>
        {content}
      </div>
    );
  }

  return (
    <a className="flex min-h-16 items-center gap-3 rounded-lg border border-line bg-white p-3 transition hover:border-leaf hover:bg-leaf/5" href={url} target="_blank" rel="noreferrer">
      {content}
    </a>
  );
}

function PassportField({
  label,
  onChange,
  placeholder,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
        placeholder={placeholder}
      />
    </label>
  );
}

function SupportAttachmentLine({ attachment }: { attachment: { fileName: string; filePath?: string | null; type: string } }) {
  const content = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#eef2f0] text-leaf">
        <FileText size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-ink">{attachment.fileName}</span>
        <span className="mt-0.5 block text-[10px] font-black uppercase text-muted">{attachment.type}</span>
      </span>
      {attachment.filePath ? <ExternalLink className="shrink-0 text-leaf" size={15} /> : null}
    </>
  );

  if (!attachment.filePath) {
    return <div className="flex min-h-12 items-center gap-3 rounded-lg border border-line bg-white p-2">{content}</div>;
  }

  return (
    <a className="flex min-h-12 items-center gap-3 rounded-lg border border-line bg-white p-2 transition hover:border-leaf hover:bg-leaf/5" href={attachment.filePath}>
      {content}
    </a>
  );
}

function SupportChecklistLine({ entry }: { entry: { detail: string; label: string; status: string } }) {
  const ready = entry.status === "ready";
  return (
    <div className="grid gap-1 rounded-lg border border-line bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs font-black text-ink">
          {ready ? <ClipboardCheck className="shrink-0 text-leaf" size={15} /> : <FileText className="shrink-0 text-amber" size={15} />}
          <span className="truncate">{entry.label}</span>
        </span>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${ready ? "bg-leaf/10 text-leaf" : "bg-amber/10 text-amber"}`}>
          {ready ? "Ready" : "Missing"}
        </span>
      </div>
      <p className="break-words text-xs font-semibold leading-5 text-muted">{entry.detail}</p>
    </div>
  );
}

function RepairLogCard({ currency, repair }: { currency: string; repair: RepairLog }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase text-muted">{isoDate(repair.date)}</p>
          <h3 className="mt-1 break-words text-lg font-black text-ink">{repair.problem}</h3>
        </div>
        <span className="rounded-full bg-leaf/10 px-3 py-1.5 text-xs font-black text-leaf">{repair.status}</span>
      </div>
      {repair.resolution ? <p className="mt-3 text-sm font-semibold leading-6 text-muted">{repair.resolution}</p> : null}
      {repair.cost != null ? <p className="mt-3 text-xs font-black uppercase text-muted">{`${repair.cost} ${currency}`}</p> : null}
    </div>
  );
}

function PrinterObjectControls({
  busy,
  device,
  onBambuEvent,
  onCommand
}: {
  busy: string;
  device: SmartHomeDevice;
  onBambuEvent: (deviceId: string, eventType: string) => void;
  onCommand: (deviceId: string, command: string) => void;
}) {
  const metrics = printerMetrics(device);
  return (
    <div className="object-printer-control">
      <div className="object-printer-metrics">
        <PrinterObjectMetric label="Status" value={metrics.status} />
        <PrinterObjectMetric label="Filament" value={metrics.filament} />
        <PrinterObjectMetric label="Nozzle" value={metrics.nozzle} icon={<Thermometer size={14} />} />
        <PrinterObjectMetric label="Bed" value={metrics.bed} />
      </div>

      <div className="object-printer-actions">
        <button disabled={busy === `${device.id}-printer_pause`} onClick={() => onCommand(device.id, "printer_pause")} type="button">
          <Printer size={15} /> Pause
        </button>
        <button disabled={busy === `${device.id}-printer_resume`} onClick={() => onCommand(device.id, "printer_resume")} type="button">
          Resume
        </button>
      </div>

      <div className="object-printer-events">
        <button disabled={busy === `${device.id}-event-FINISHED`} onClick={() => onBambuEvent(device.id, "FINISHED")} type="button">
          <CheckCircle2 size={15} /> Done
        </button>
        <button disabled={busy === `${device.id}-event-PAUSED`} onClick={() => onBambuEvent(device.id, "PAUSED")} type="button">
          Paused
        </button>
        <button className="object-printer-event-alert" disabled={busy === `${device.id}-event-FAILED`} onClick={() => onBambuEvent(device.id, "FAILED")} type="button">
          Failed
        </button>
        <button disabled={busy === `${device.id}-event-FILAMENT_LOW`} onClick={() => onBambuEvent(device.id, "FILAMENT_LOW")} type="button">
          Filament low
        </button>
      </div>
    </div>
  );
}

function PrinterObjectMetric({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="object-printer-metric">
      <p>{label}</p>
      <strong>
        {icon}
        {value}
      </strong>
    </div>
  );
}

function printerMetrics(device: SmartHomeDevice) {
  const raw = device.rawJson ?? {};
  const temp = (value: unknown) => (typeof value === "number" ? `${value}C` : "n/a");
  return {
    status: String(raw.printStatus ?? device.powerState ?? device.status),
    filament: typeof raw.filamentRemaining === "number" ? `${raw.filamentRemaining}%` : "n/a",
    nozzle: temp(raw.nozzleTemp),
    bed: temp(raw.bedTemp)
  };
}

function SmallFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full bg-white/75 px-3 py-2 ring-1 ring-white/80">
      <span className="shrink-0 text-leaf">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase text-muted">{label}</span>
        <span className="block max-w-32 truncate text-xs font-black text-ink">{value}</span>
      </span>
    </div>
  );
}

function HeroFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-md bg-[#eef2f0] text-leaf">{icon}</div>
      <p className="text-[11px] font-black uppercase text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-ink">{value}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, icon }: { eyebrow: string; title: string; icon: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase text-muted">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black text-ink">{title}</h2>
      </div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-leaf/10 text-leaf">{icon}</span>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[2.5rem_11rem_1fr] sm:items-center">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-[#eef2f0] text-leaf">{icon}</span>
      <span className="text-xs font-black uppercase text-muted">{label}</span>
      <span className="min-w-0 break-words text-base font-black text-ink">{value}</span>
    </div>
  );
}

function warrantyState(value?: string | null): { label: string; tone: "green" | "amber" | "red" | "gray" } {
  if (!value) return { label: "No warranty", tone: "gray" };
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Warranty expired", tone: "red" };
  if (days < 60) return { label: `${days} days left`, tone: "amber" };
  return { label: "Protected", tone: "green" };
}
