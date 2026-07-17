import { FormEvent, useCallback, useRef, useState } from "react";
import { ChevronDown, ScanBarcode } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BarcodeScannerDialog } from "../components/BarcodeScannerDialog";
import { Button } from "../components/Button";
import { api } from "../lib/api";
import { useLanguage } from "../lib/language";
import type { BarcodeLookup, Item } from "../lib/types";

type ProductForm = {
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  barcode: string;
  barcodeFormat: string;
  purchaseDate: string;
  merchant: string;
  price: string;
  warrantyUntil: string;
  location: string;
  notes: string;
};

type RequiredFieldErrors = Partial<Record<"name" | "category", string>>;

const initialForm: ProductForm = {
  name: "",
  category: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  barcode: "",
  barcodeFormat: "",
  purchaseDate: "",
  merchant: "",
  price: "",
  warrantyUntil: "",
  location: "",
  notes: ""
};

const categories = [
  { value: "Elektronik", de: "Elektronik", en: "Electronics", itemType: "ELECTRONIC" },
  { value: "Haushalt & Küche", de: "Haushalt & Küche", en: "Home & kitchen", itemType: "THING" },
  { value: "Möbel", de: "Möbel", en: "Furniture", itemType: "FURNITURE" },
  { value: "Werkzeug & Garten", de: "Werkzeug & Garten", en: "Tools & garden", itemType: "THING" },
  { value: "Fahrzeug", de: "Fahrzeug", en: "Vehicle", itemType: "VEHICLE" },
  { value: "Sonstiges", de: "Sonstiges", en: "Other", itemType: "THING" }
] as const;

export function CaptureItem() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<RequiredFieldErrors>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const submittingRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const copy = language === "de" ? deCopy : enCopy;

  function updateField(field: keyof ProductForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "name" || field === "category") {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const nextErrors: RequiredFieldErrors = {};
    if (!form.name.trim()) nextErrors.name = copy.nameRequired;
    if (!form.category) nextErrors.category = copy.categoryRequired;
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      if (nextErrors.name) nameInputRef.current?.focus();
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const category = categories.find((entry) => entry.value === form.category);
      const item = await api<Item>("/api/items", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          itemType: category?.itemType ?? "THING",
          manufacturer: nullable(form.manufacturer),
          model: nullable(form.model),
          serialNumber: nullable(form.serialNumber),
          barcode: nullable(form.barcode),
          barcodeFormat: nullable(form.barcodeFormat),
          purchaseDate: nullable(form.purchaseDate),
          merchant: nullable(form.merchant),
          price: form.price ? Number(form.price) : null,
          currency: "EUR",
          warrantyUntil: nullable(form.warrantyUntil),
          location: nullable(form.location),
          notes: nullable(form.notes),
          visibility: "PRIVATE"
        })
      });
      navigate(`/app/capture/item/success/${item.id}`, {
        replace: true,
        state: { onboarding: searchParams.get("onboarding") === "1" }
      });
    } catch (caught) {
      submittingRef.current = false;
      setError(friendlySaveError(caught, language));
    } finally {
      setBusy(false);
    }
  }

  async function lookupBarcode() {
    const code = form.barcode.trim();
    if (code.length < 4 || lookupBusy) {
      setLookupMessage(copy.barcodeTooShort);
      return;
    }

    setLookupBusy(true);
    setLookupMessage("");
    try {
      const result = await api<BarcodeLookup>(`/api/items/lookup/barcode?code=${encodeURIComponent(code)}`);
      const source = result.item ?? result.product;
      if (!source) {
        setLookupMessage(copy.barcodeNotFound);
        return;
      }
      setForm((current) => ({
        ...current,
        name: current.name || source.name || "",
        category: current.category,
        manufacturer: current.manufacturer || source.manufacturer || "",
        model: current.model || source.model || "",
        barcode: result.barcode || current.barcode,
        barcodeFormat: result.barcodeFormat || current.barcodeFormat
      }));
      setLookupMessage(copy.barcodeFound);
    } catch {
      setLookupMessage(copy.barcodeLookupFailed);
    } finally {
      setLookupBusy(false);
    }
  }

  const handleDetected = useCallback((value: string) => {
    setForm((current) => ({ ...current, barcode: value }));
    setLookupMessage("");
    setScannerOpen(false);
  }, []);

  return (
    <main className="activation-page">
      <section className="activation-panel" aria-labelledby="capture-item-title">
        <div className="activation-heading">
          <p className="activation-eyebrow">{copy.eyebrow}</p>
          <h1 id="capture-item-title">{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>

        <form className="activation-form" onSubmit={createItem} noValidate>
          <label className="activation-field" htmlFor="product-name">
            <span>{copy.nameLabel}</span>
            <input
              ref={nameInputRef}
              autoComplete="off"
              autoFocus
              id="product-name"
              maxLength={160}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "product-name-error" : undefined}
              placeholder={copy.namePlaceholder}
            />
            {fieldErrors.name ? <small className="activation-field-error" id="product-name-error">{fieldErrors.name}</small> : null}
          </label>

          <label className="activation-field" htmlFor="product-category">
            <span>{copy.categoryLabel}</span>
            <select
              id="product-category"
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              aria-invalid={Boolean(fieldErrors.category)}
              aria-describedby={fieldErrors.category ? "product-category-error" : undefined}
            >
              <option value="">{copy.categoryPlaceholder}</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {language === "de" ? category.de : category.en}
                </option>
              ))}
            </select>
            {fieldErrors.category ? <small className="activation-field-error" id="product-category-error">{fieldErrors.category}</small> : null}
          </label>

          <details className="activation-optional">
            <summary>
              <span>{copy.optionalTitle}</span>
              <ChevronDown aria-hidden="true" size={18} />
            </summary>
            <p>{copy.optionalIntro}</p>

            <div className="activation-optional-grid">
              <OptionalField label={copy.manufacturerLabel}>
                <input value={form.manufacturer} onChange={(event) => updateField("manufacturer", event.target.value)} autoComplete="organization" />
              </OptionalField>
              <OptionalField label={copy.modelLabel}>
                <input value={form.model} onChange={(event) => updateField("model", event.target.value)} />
              </OptionalField>
              <OptionalField label={copy.serialLabel}>
                <input value={form.serialNumber} onChange={(event) => updateField("serialNumber", event.target.value)} />
              </OptionalField>
              <OptionalField label={copy.purchaseDateLabel}>
                <input type="date" value={form.purchaseDate} onChange={(event) => updateField("purchaseDate", event.target.value)} />
              </OptionalField>
              <OptionalField label={copy.merchantLabel}>
                <input value={form.merchant} onChange={(event) => updateField("merchant", event.target.value)} />
              </OptionalField>
              <OptionalField label={copy.priceLabel}>
                <input min="0" inputMode="decimal" step="0.01" type="number" value={form.price} onChange={(event) => updateField("price", event.target.value)} />
              </OptionalField>
              <OptionalField label={copy.warrantyLabel}>
                <input type="date" value={form.warrantyUntil} onChange={(event) => updateField("warrantyUntil", event.target.value)} />
              </OptionalField>
              <OptionalField label={copy.locationLabel}>
                <input value={form.location} onChange={(event) => updateField("location", event.target.value)} />
              </OptionalField>
            </div>

            <div className="activation-barcode">
              <OptionalField label={copy.barcodeLabel}>
                <input
                  inputMode="numeric"
                  value={form.barcode}
                  onChange={(event) => {
                    updateField("barcode", event.target.value);
                    setLookupMessage("");
                  }}
                />
              </OptionalField>
              <div className="activation-barcode-actions">
                <Button type="button" variant="secondary" onClick={() => setScannerOpen(true)} icon={<ScanBarcode size={17} />}>
                  {copy.scanBarcode}
                </Button>
                <Button type="button" variant="ghost" onClick={lookupBarcode} disabled={lookupBusy}>
                  {lookupBusy ? copy.lookupBusy : copy.lookupBarcode}
                </Button>
              </div>
              <small>{copy.barcodePrivacy}</small>
              {lookupMessage ? <p className="activation-inline-message" role="status">{lookupMessage}</p> : null}
            </div>

            <OptionalField label={copy.notesLabel}>
              <textarea rows={4} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
            </OptionalField>
          </details>

          {error ? <div className="activation-error" role="alert">{error}</div> : null}

          <div className="activation-submit">
            <Button type="submit" disabled={busy}>
              {busy ? copy.saving : copy.save}
            </Button>
            <p>{copy.laterHint}</p>
          </div>
        </form>
      </section>

      <BarcodeScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleDetected} />
    </main>
  );
}

function OptionalField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="activation-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function friendlySaveError(caught: unknown, language: "de" | "en") {
  if (caught instanceof TypeError) {
    return language === "de"
      ? "Die Verbindung ist fehlgeschlagen. Prüfe deine Internetverbindung und versuche es erneut."
      : "The connection failed. Check your internet connection and try again.";
  }
  return language === "de"
    ? "Das Produkt konnte nicht gespeichert werden. Deine Eingaben bleiben erhalten – versuche es bitte erneut."
    : "The product could not be saved. Your entries are still here—please try again.";
}

const deCopy = {
  eyebrow: "Erstes Produkt",
  title: "Lege deine erste Produktakte an.",
  intro: "Für den Start reichen Name und Kategorie. Rechnung, Garantie und weitere Angaben kannst du danach ergänzen.",
  nameLabel: "Produktname",
  namePlaceholder: "z. B. Bosch Akkuschrauber",
  categoryLabel: "Kategorie",
  categoryPlaceholder: "Kategorie auswählen",
  nameRequired: "Bitte gib einen Produktnamen ein.",
  categoryRequired: "Bitte wähle eine Kategorie aus.",
  optionalTitle: "Weitere Angaben hinzufügen",
  optionalIntro: "Alle folgenden Angaben sind freiwillig und können später geändert werden.",
  manufacturerLabel: "Hersteller",
  modelLabel: "Modell",
  serialLabel: "Seriennummer",
  purchaseDateLabel: "Kaufdatum",
  merchantLabel: "Händler",
  priceLabel: "Preis in EUR",
  warrantyLabel: "Garantie bis",
  locationLabel: "Aufbewahrungsort",
  barcodeLabel: "Barcode / GTIN",
  notesLabel: "Notiz",
  scanBarcode: "Barcode scannen",
  lookupBarcode: "Produktdaten suchen",
  lookupBusy: "Suche läuft …",
  barcodePrivacy: "Nur wenn du „Produktdaten suchen“ wählst, kann der Code an einen Produktkatalog gesendet werden.",
  barcodeTooShort: "Gib mindestens vier Zeichen ein.",
  barcodeNotFound: "Keine Produktdaten gefunden. Der Barcode bleibt trotzdem gespeichert.",
  barcodeFound: "Verfügbare Produktdaten wurden ergänzt. Bitte prüfe sie.",
  barcodeLookupFailed: "Die Suche ist gerade nicht verfügbar. Du kannst das Produkt trotzdem speichern.",
  save: "Produkt speichern",
  saving: "Produkt wird gespeichert …",
  laterHint: "Du kannst fehlende Angaben später ergänzen."
};

const enCopy: typeof deCopy = {
  eyebrow: "First product",
  title: "Create your first product record.",
  intro: "A name and category are enough to start. You can add receipts, warranty details and more afterwards.",
  nameLabel: "Product name",
  namePlaceholder: "e.g. Bosch cordless drill",
  categoryLabel: "Category",
  categoryPlaceholder: "Select a category",
  nameRequired: "Enter a product name.",
  categoryRequired: "Select a category.",
  optionalTitle: "Add more details",
  optionalIntro: "Everything below is optional and can be changed later.",
  manufacturerLabel: "Manufacturer",
  modelLabel: "Model",
  serialLabel: "Serial number",
  purchaseDateLabel: "Purchase date",
  merchantLabel: "Merchant",
  priceLabel: "Price in EUR",
  warrantyLabel: "Warranty until",
  locationLabel: "Storage location",
  barcodeLabel: "Barcode / GTIN",
  notesLabel: "Note",
  scanBarcode: "Scan barcode",
  lookupBarcode: "Look up product data",
  lookupBusy: "Looking up …",
  barcodePrivacy: "Only when you choose “Look up product data” may the code be sent to a product catalogue.",
  barcodeTooShort: "Enter at least four characters.",
  barcodeNotFound: "No product data found. The barcode can still be saved.",
  barcodeFound: "Available product data was added. Please review it.",
  barcodeLookupFailed: "Lookup is unavailable right now. You can still save the product.",
  save: "Save product",
  saving: "Saving product …",
  laterHint: "You can add missing details later."
};
