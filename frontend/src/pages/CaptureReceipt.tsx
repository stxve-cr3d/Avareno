import { FormEvent, useEffect, useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/Button";
import { api } from "../lib/api";
import { betaFeatures } from "../lib/betaFeatures";
import { useLanguage } from "../lib/language";
import type { Document, Item } from "../lib/types";

const maxUploadBytes = 10 * 1024 * 1024;
const acceptedExtensions = [".pdf", ".png", ".jpg", ".jpeg"];

const documentTypes = [
  { value: "RECEIPT", de: "Rechnung oder Kassenbeleg", en: "Invoice or receipt" },
  { value: "WARRANTY", de: "Garantienachweis", en: "Warranty document" },
  { value: "MANUAL", de: "Bedienungsanleitung", en: "User manual" },
  { value: "OTHER", de: "Sonstiges Dokument", en: "Other document" }
] as const;

export function CaptureReceipt() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const requestedItemId = searchParams.get("itemId") ?? "";
  const activationOrigin = searchParams.get("from") === "first-product" ? "first-product" : undefined;
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState(requestedItemId);
  const [documentType, setDocumentType] = useState<(typeof documentTypes)[number]["value"]>("RECEIPT");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);
  const copy = language === "de" ? deCopy : enCopy;

  useEffect(() => {
    let cancelled = false;
    api<Item[]>("/api/items")
      .then((result) => {
        if (cancelled) return;
        setItems(result);
        if (!requestedItemId && result.length === 1) setSelectedItemId(result[0].id);
        if (requestedItemId && !result.some((item) => item.id === requestedItemId)) {
          setError(copy.productUnavailable);
        }
      })
      .catch(() => {
        if (!cancelled) setError(copy.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.loadError, copy.productUnavailable, requestedItemId]);

  function chooseFile(nextFile: File | null) {
    setError("");
    if (!nextFile) {
      setFile(null);
      return;
    }
    const extension = extensionOf(nextFile.name);
    if (!acceptedExtensions.includes(extension)) {
      setFile(null);
      setError(copy.unsupportedFile);
      return;
    }
    if (nextFile.size > maxUploadBytes) {
      setFile(null);
      setError(copy.fileTooLarge);
      return;
    }
    setFile(nextFile);
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!betaFeatures.documentUploads) {
      setError(copy.uploadDisabled);
      return;
    }
    if (!selectedItemId) {
      setError(copy.selectProduct);
      return;
    }
    if (!file) {
      setError(copy.selectFile);
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("type", documentType);
      data.append("itemId", selectedItemId);
      await api<Document>("/api/documents/upload", { method: "POST", body: data });
      navigate(`/app/dinge/${encodeURIComponent(selectedItemId)}`, {
        replace: true,
        state: { documentAdded: true, activationOrigin }
      });
    } catch (caught) {
      submittingRef.current = false;
      setError(friendlyUploadError(caught, language));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="activation-page">
        <section className="activation-panel activation-status-panel" aria-live="polite">
          <div className="activation-loading-dot" aria-hidden="true" />
          <p>{copy.loading}</p>
        </section>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="activation-page">
        <section className="activation-panel activation-empty">
          <div className="activation-heading">
            <p className="activation-eyebrow">{copy.eyebrow}</p>
            <h1>{copy.noProductTitle}</h1>
            <p>{copy.noProductIntro}</p>
          </div>
          <Link className="av-btn av-btn-primary min-h-11 text-sm" to="/app/capture/item">
            {copy.addProduct}
          </Link>
        </section>
      </main>
    );
  }

  const selectedItem = items.find((item) => item.id === selectedItemId);

  return (
    <main className="activation-page">
      <section className="activation-panel" aria-labelledby="document-upload-title">
        <div className="activation-heading">
          <p className="activation-eyebrow">{copy.eyebrow}</p>
          <h1 id="document-upload-title">{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>

        <form className="activation-form" onSubmit={uploadDocument} noValidate>
          {requestedItemId && selectedItem ? (
            <div className="activation-linked-product">
              <FileText size={20} aria-hidden="true" />
              <div>
                <span>{copy.linkedTo}</span>
                <strong>{selectedItem.name}</strong>
                <small>{selectedItem.category}</small>
              </div>
            </div>
          ) : (
            <label className="activation-field" htmlFor="document-product">
              <span>{copy.productLabel}</span>
              <select id="document-product" value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}>
                <option value="">{copy.productPlaceholder}</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}

          <label className="activation-field" htmlFor="document-type">
            <span>{copy.typeLabel}</span>
            <select id="document-type" value={documentType} onChange={(event) => setDocumentType(event.target.value as typeof documentType)}>
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>{language === "de" ? type.de : type.en}</option>
              ))}
            </select>
          </label>

          <label className="activation-file-drop" htmlFor="document-file">
            <UploadCloud size={25} aria-hidden="true" />
            <strong>{file ? file.name : copy.filePrompt}</strong>
            <span>{copy.fileHelp}</span>
            <input
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              id="document-file"
              type="file"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <div className="activation-privacy-note">
            <strong>{copy.privacyTitle}</strong>
            <p>{copy.privacyText}</p>
          </div>

          {error ? <div className="activation-error" role="alert">{error}</div> : null}

          <div className="activation-submit">
            <Button type="submit" disabled={busy || !betaFeatures.documentUploads}>
              {busy ? copy.uploading : copy.upload}
            </Button>
            <p>{copy.safeFailure}</p>
          </div>
        </form>
      </section>
    </main>
  );
}

function extensionOf(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

function friendlyUploadError(caught: unknown, language: "de" | "en") {
  const detail = caught instanceof Error ? caught.message.toLowerCase() : "";
  if (detail.includes("limit") || detail.includes("speicher")) {
    return language === "de"
      ? "Der verfügbare Speicher reicht für diese Datei nicht aus."
      : "There is not enough storage available for this file.";
  }
  if (caught instanceof TypeError) {
    return language === "de"
      ? "Die Verbindung ist fehlgeschlagen. Prüfe deine Internetverbindung und versuche es erneut."
      : "The connection failed. Check your internet connection and try again.";
  }
  return language === "de"
    ? "Das Dokument konnte nicht gespeichert werden. Dein Produkt bleibt unverändert – versuche es bitte erneut."
    : "The document could not be saved. Your product remains unchanged—please try again.";
}

const deCopy = {
  eyebrow: "Dokument zuordnen",
  title: "Dokument zum Produkt hinzufügen",
  intro: "Wähle eine Datei aus und ordne sie einer bestehenden Produktakte zu. Es findet keine automatische Analyse statt.",
  linkedTo: "Wird zugeordnet zu",
  productLabel: "Produkt",
  productPlaceholder: "Produkt auswählen",
  typeLabel: "Dokumentart",
  filePrompt: "Datei auswählen",
  fileHelp: "PDF, PNG oder JPG · maximal 10 MB",
  privacyTitle: "Privater Upload",
  privacyText: "Die Datei wird nur für deine ausgewählte Produktakte gespeichert. Avareno sendet sie in diesem Schritt nicht an einen KI-Anbieter.",
  upload: "Dokument speichern",
  uploading: "Dokument wird gespeichert …",
  safeFailure: "Wenn der Upload fehlschlägt, bleibt deine Produktakte erhalten.",
  loading: "Produkte werden geladen …",
  noProductTitle: "Lege zuerst ein Produkt an.",
  noProductIntro: "Dokumente werden in Avareno immer einer Produktakte zugeordnet.",
  addProduct: "Produkt hinzufügen",
  productUnavailable: "Die ausgewählte Produktakte ist nicht mehr verfügbar.",
  loadError: "Die Produktakten konnten gerade nicht geladen werden.",
  unsupportedFile: "Dieses Dateiformat wird nicht unterstützt.",
  fileTooLarge: "Die Datei ist größer als 10 MB.",
  selectProduct: "Bitte wähle ein Produkt aus.",
  selectFile: "Bitte wähle eine Datei aus.",
  uploadDisabled: "Dokument-Uploads sind vorübergehend deaktiviert."
};

const enCopy: typeof deCopy = {
  eyebrow: "Link a document",
  title: "Add a document to the product",
  intro: "Choose a file and link it to an existing product record. No automatic analysis takes place.",
  linkedTo: "Will be linked to",
  productLabel: "Product",
  productPlaceholder: "Select a product",
  typeLabel: "Document type",
  filePrompt: "Choose a file",
  fileHelp: "PDF, PNG or JPG · up to 10 MB",
  privacyTitle: "Private upload",
  privacyText: "The file is stored only for your selected product record. Avareno does not send it to an AI provider in this step.",
  upload: "Save document",
  uploading: "Saving document …",
  safeFailure: "If the upload fails, your product record remains intact.",
  loading: "Loading products …",
  noProductTitle: "Create a product first.",
  noProductIntro: "Documents in Avareno are always linked to a product record.",
  addProduct: "Add product",
  productUnavailable: "The selected product record is no longer available.",
  loadError: "Product records could not be loaded right now.",
  unsupportedFile: "This file format is not supported.",
  fileTooLarge: "The file is larger than 10 MB.",
  selectProduct: "Select a product.",
  selectFile: "Choose a file.",
  uploadDisabled: "Document uploads are temporarily disabled."
};
