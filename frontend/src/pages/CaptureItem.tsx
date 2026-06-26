import { FormEvent, useCallback, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Camera, LifeBuoy, PackagePlus, ReceiptText, ScanBarcode, ShieldCheck, Tag } from "lucide-react";
import { api } from "../lib/api";
import type { BarcodeLookup, Item } from "../lib/types";
import { BarcodeScannerDialog } from "../components/BarcodeScannerDialog";
import { Button } from "../components/Button";

type PassportForm = {
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  barcode: string;
  barcodeFormat: string;
  imageUrl: string;
  purchaseDate: string;
  merchant: string;
  price: string;
  warrantyUntil: string;
  location: string;
  manualUrl: string;
  driverUrl: string;
  softwareUrl: string;
  supportUrl: string;
  supportContact: string;
};

const initialForm: PassportForm = {
  name: "",
  category: "Other",
  manufacturer: "",
  model: "",
  serialNumber: "",
  barcode: "",
  barcodeFormat: "",
  imageUrl: "",
  purchaseDate: "",
  merchant: "",
  price: "",
  warrantyUntil: "",
  location: "",
  manualUrl: "",
  driverUrl: "",
  softwareUrl: "",
  supportUrl: "",
  supportContact: ""
};

export function CaptureItem() {
  const navigate = useNavigate();
  const [form, setForm] = useState<PassportForm>(initialForm);
  const [busy, setBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupResult, setLookupResult] = useState<BarcodeLookup | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof PassportForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createItem(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const item = await api<Item>("/api/items", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category.trim() || "Other",
          manufacturer: nullable(form.manufacturer),
          model: nullable(form.model),
          serialNumber: nullable(form.serialNumber),
          barcode: nullable(form.barcode),
          barcodeFormat: nullable(form.barcodeFormat),
          purchaseDate: nullable(form.purchaseDate),
          merchant: nullable(form.merchant),
          price: form.price ? Number(form.price) : null,
          warrantyUntil: nullable(form.warrantyUntil),
          imageUrl: nullable(form.imageUrl),
          location: nullable(form.location),
          manualUrl: nullable(form.manualUrl),
          driverUrl: nullable(form.driverUrl),
          softwareUrl: nullable(form.softwareUrl),
          supportUrl: nullable(form.supportUrl),
          supportContact: nullable(form.supportContact),
          itemType: "THING",
          currency: "EUR",
          visibility: "HOUSEHOLD"
        })
      });
      navigate(`/items/${item.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create passport");
    } finally {
      setBusy(false);
    }
  }

  const lookupBarcode = useCallback(async (barcodeValue = form.barcode) => {
    const value = barcodeValue.trim();
    if (!value) return;
    setLookupBusy(true);
    setLookupResult(null);
    setError("");
    try {
      const result = await api<BarcodeLookup>(`/api/items/lookup/barcode?code=${encodeURIComponent(value)}`);
      setLookupResult(result);
      if (result.item) {
        setForm((current) => ({ ...current, barcode: result.barcode, barcodeFormat: result.barcodeFormat }));
        return;
      }
      if (result.product) {
        setForm((current) => ({
          ...current,
          barcode: result.barcode,
          barcodeFormat: result.barcodeFormat,
          name: result.product?.name || current.name,
          category: result.product?.category || current.category,
          manufacturer: result.product?.manufacturer || current.manufacturer,
          model: result.product?.model || current.model,
          imageUrl: result.product?.imageUrl || current.imageUrl
        }));
      } else {
        setForm((current) => ({ ...current, barcode: result.barcode, barcodeFormat: result.barcodeFormat }));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Barcode lookup failed");
    } finally {
      setLookupBusy(false);
    }
  }, [form.barcode]);

  const handleBarcodeDetected = useCallback(
    (value: string) => {
      setScannerOpen(false);
      setForm((current) => ({ ...current, barcode: value }));
      void lookupBarcode(value);
    },
    [lookupBarcode]
  );

  return (
    <form className="mx-auto max-w-6xl space-y-5" onSubmit={createItem}>
      <BarcodeScannerDialog onClose={() => setScannerOpen(false)} onDetected={handleBarcodeDetected} open={scannerOpen} />

      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
        <div className="grid gap-5 bg-[#101111] p-5 text-white md:grid-cols-[minmax(0,1fr)_18rem] md:p-7">
          <div>
            <p className="text-xs font-bold uppercase text-white/50">Product Passport</p>
            <h1 className="mt-3 max-w-3xl text-[clamp(2.6rem,7vw,5.8rem)] font-semibold leading-[0.94]">Create a memory for a real thing</h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-7 text-white/62">
              Start with what you know now. Scan or paste a barcode, then complete anything missing later.
            </p>
          </div>
          <div className="grid content-end gap-3">
            <PassportSignal icon={<Tag size={17} />} label="Identity" value={form.name || "Unnamed"} />
            <PassportSignal icon={<ScanBarcode size={17} />} label="Barcode" value={form.barcode || "Optional"} />
            <PassportSignal icon={<ShieldCheck size={17} />} label="Warranty" value={form.warrantyUntil || "Later"} />
            <PassportSignal icon={<LifeBuoy size={17} />} label="Support" value={form.supportContact || form.supportUrl || "Later"} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <PassportSection icon={<PackagePlus size={19} />} eyebrow="Step 1" title="Identity">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <Field label="Barcode / GTIN" value={form.barcode} onChange={(value) => updateField("barcode", value)} placeholder="EAN, UPC or GTIN" inputMode="numeric" />
                  <button
                    className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-ink transition hover:border-leaf hover:text-leaf"
                    data-testid="barcode-scan-open"
                    onClick={() => setScannerOpen(true)}
                    type="button"
                  >
                    <Camera size={17} />
                    Scan
                  </button>
                  <button
                    className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="barcode-lookup"
                    disabled={!form.barcode.trim() || lookupBusy}
                    onClick={() => void lookupBarcode()}
                    type="button"
                  >
                    <ScanBarcode size={17} />
                    {lookupBusy ? "Looking up..." : "Lookup"}
                  </button>
                </div>
                {lookupResult ? (
                  <div className="mt-2 rounded-lg border border-line bg-[#f8faf9] p-3 text-sm font-semibold text-muted">
                    {lookupResult.item ? (
                      <span>
                        Already saved as <strong className="text-ink">{lookupResult.item.name}</strong>.
                        <button className="ml-2 font-black text-leaf" onClick={() => navigate(`/items/${lookupResult.item?.id}`)} type="button">
                          Open
                        </button>
                      </span>
                    ) : lookupResult.product ? (
                      <span>
                        Found via <strong className="text-ink">{lookupResult.product.sourceName}</strong>. Fields were prefilled.
                      </span>
                    ) : (
                      <span>No public product match yet. The barcode will still be saved locally.</span>
                    )}
                  </div>
                ) : null}
              </div>
              <Field label="Name" value={form.name} onChange={(value) => updateField("name", value)} placeholder="LG OLED C3 Wohnzimmer" required />
              <Field label="Category" value={form.category} onChange={(value) => updateField("category", value)} placeholder="TV, Airfryer, Router" />
              <Field label="Manufacturer" value={form.manufacturer} onChange={(value) => updateField("manufacturer", value)} placeholder="LG" />
              <Field label="Model" value={form.model} onChange={(value) => updateField("model", value)} placeholder="OLED65C3" />
              <Field label="Serial number" value={form.serialNumber} onChange={(value) => updateField("serialNumber", value)} placeholder="SN-..." />
              <Field label="Location" value={form.location} onChange={(value) => updateField("location", value)} placeholder="Wohnzimmer, Keller, Buero" />
            </div>
          </PassportSection>

          <PassportSection icon={<ReceiptText size={19} />} eyebrow="Step 2" title="Receipt and warranty">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Merchant" value={form.merchant} onChange={(value) => updateField("merchant", value)} placeholder="MediaMarkt" />
              <Field label="Price" value={form.price} onChange={(value) => updateField("price", value)} placeholder="1499" inputMode="decimal" />
              <DateField label="Purchase date" value={form.purchaseDate} onChange={(value) => updateField("purchaseDate", value)} />
              <DateField label="Warranty until" value={form.warrantyUntil} onChange={(value) => updateField("warrantyUntil", value)} />
            </div>
          </PassportSection>

          <PassportSection icon={<BookOpen size={19} />} eyebrow="Step 3" title="Manuals and support">
            <div className="grid gap-3">
              <Field label="Manual URL" value={form.manualUrl} onChange={(value) => updateField("manualUrl", value)} placeholder="https://brand.com/manual" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Driver URL" value={form.driverUrl} onChange={(value) => updateField("driverUrl", value)} placeholder="https://brand.com/drivers" />
                <Field label="Software URL" value={form.softwareUrl} onChange={(value) => updateField("softwareUrl", value)} placeholder="https://brand.com/software" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Support URL" value={form.supportUrl} onChange={(value) => updateField("supportUrl", value)} placeholder="https://brand.com/support" />
                <Field label="Support contact" value={form.supportContact} onChange={(value) => updateField("supportContact", value)} placeholder="LG Support" />
              </div>
            </div>
          </PassportSection>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-muted">Ready to save</p>
                <h2 className="mt-1 text-2xl font-black text-ink">{form.name || "New Product Passport"}</h2>
              </div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-leaf/10 text-leaf">
                <ShieldCheck size={19} />
              </span>
            </div>
            <div className="mt-5 grid gap-2">
              <PreviewLine label="Identity" ready={Boolean(form.name.trim())} />
              <PreviewLine label="Barcode" ready={Boolean(form.barcode.trim())} />
              <PreviewLine label="Warranty" ready={Boolean(form.warrantyUntil)} />
              <PreviewLine label="Serial" ready={Boolean(form.serialNumber.trim())} />
              <PreviewLine label="Manual" ready={Boolean(form.manualUrl.trim())} />
              <PreviewLine label="Support" ready={Boolean(form.supportUrl.trim() || form.supportContact.trim())} />
            </div>
            {error ? <p className="mt-4 rounded-lg bg-ember/10 p-3 text-sm font-black text-ember">{error}</p> : null}
            <Button className="mt-5 w-full" disabled={!form.name.trim() || busy} icon={<ArrowRight size={18} />} type="submit">
              {busy ? "Creating..." : "Create Product Passport"}
            </Button>
          </section>
        </aside>
      </section>
    </form>
  );
}

function nullable(value: string) {
  return value.trim() || null;
}

function PassportSection({ children, eyebrow, icon, title }: { children: ReactNode; eyebrow: string; icon: ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft md:p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-black text-ink">{title}</h2>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-leaf/10 text-leaf">{icon}</span>
      </div>
      {children}
    </section>
  );
}

function Field({
  inputMode,
  label,
  onChange,
  placeholder,
  required,
  value
}: {
  inputMode?: "decimal" | "numeric" | "text";
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <input
        className="mt-2 w-full rounded-lg border border-line bg-[#f8faf9] p-3 text-sm font-semibold outline-none focus:border-leaf"
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        onInput={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        required={required}
        value={value}
      />
    </label>
  );
}

function DateField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block text-sm font-bold text-ink">
      {label}
      <input
        className="mt-2 w-full rounded-lg border border-line bg-[#f8faf9] p-3 text-sm font-semibold outline-none focus:border-leaf"
        onChange={(event) => onChange(event.target.value)}
        onInput={(event) => onChange(event.currentTarget.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

function PassportSignal({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-lg border border-white/10 bg-white/10 p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-ink">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-black uppercase text-white/50">{label}</span>
        <span className="mt-1 block truncate text-sm font-black text-white">{value}</span>
      </span>
    </div>
  );
}

function PreviewLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-[#f8faf9] px-3 py-2">
      <span className="text-sm font-black text-ink">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${ready ? "bg-leaf/10 text-leaf" : "bg-amber/10 text-amber"}`}>
        {ready ? "saved" : "later"}
      </span>
    </div>
  );
}
