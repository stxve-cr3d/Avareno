import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ReceiptText, UploadCloud, Wand2 } from "lucide-react";
import { api, dateInputValue } from "../lib/api";
import type { Document, ExtractedReceipt, Item } from "../lib/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";

export function CaptureReceipt() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [document, setDocument] = useState<Document | null>(null);
  const [manualText, setManualText] = useState("");
  const [extracted, setExtracted] = useState<ExtractedReceipt | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return null;
    const data = new FormData();
    data.append("file", file);
    data.append("type", "RECEIPT");
    const created = await api<Document>("/api/documents/upload", { method: "POST", body: data });
    setDocument(created);
    return created;
  }

  async function extract() {
    setBusy(true);
    try {
      const doc = document ?? (await upload());
      const result = await api<ExtractedReceipt>("/api/extract/receipt", {
        method: "POST",
        body: JSON.stringify({ documentId: doc?.id, fileName: file?.name, text: manualText })
      });
      setExtracted(result);
    } finally {
      setBusy(false);
    }
  }

  async function createItem() {
    if (!extracted) return;
    const item = await api<Item>("/api/items", {
      method: "POST",
      body: JSON.stringify({
        name: extracted.itemName,
        category: extracted.category,
        manufacturer: extracted.manufacturer,
        model: extracted.model,
        purchaseDate: extracted.purchaseDate,
        merchant: extracted.merchant,
        price: Number(extracted.price),
        currency: extracted.currency,
        warrantyUntil: extracted.warrantyUntil,
        documentId: document?.id
      })
    });
    navigate(`/app/items/${item.id}`);
  }

  function updateField(field: keyof ExtractedReceipt, value: string) {
    if (!extracted) return;
    setExtracted({
      ...extracted,
      [field]: field === "price" ? Number(value) : field.includes("Date") || field === "warrantyUntil" ? new Date(value).toISOString() : value
    });
  }

  return (
    <div className="capture-receipt-page space-y-5">
      <div className="rounded-3xl border border-white/80 av-surface p-5 ring-1 ring-line/60">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-leaf/10 text-leaf">
            <ReceiptText size={22} />
          </div>
          <div>
            <p className="text-sm font-black text-leaf">Beleg reinlegen</p>
            <h1 className="mt-1 text-3xl font-black text-ink">Beleg erfassen</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">Mach aus einem Kaufnachweis eine Objektkarte mit Garantie-Gedächtnis.</p>
          </div>
        </div>
      </div>

      <Card>
        <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-line av-surface p-5 text-center transition hover:border-leaf hover:bg-leaf/5">
          <UploadCloud className="text-leaf" />
          <span className="mt-3 text-sm font-black text-ink">{file ? file.name : "Belegbild oder PDF auswählen"}</span>
          <span className="mt-1 text-xs font-semibold text-muted">Bild oder PDF</span>
          <input className="hidden" type="file" accept="image/*,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <textarea
          value={manualText}
          onChange={(event) => setManualText(event.target.value)}
          className="mt-4 min-h-28 w-full rounded-2xl border border-line av-surface p-4 text-sm font-semibold leading-6 outline-none focus:border-leaf"
          placeholder="Optionaler Text für die Vorschau-Extraktion"
        />
        <Button className="mt-4 w-full" onClick={extract} disabled={busy || (!file && !manualText.trim())} icon={<Wand2 size={18} />}>
          {busy ? "Wird ausgelesen..." : "Informationen auslesen"}
        </Button>
      </Card>

      {extracted ? (
        <Card>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-leaf" size={20} />
            <h2 className="text-xl font-black text-ink">Objektgedächtnis prüfen</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["itemName", "Name des Objekts"],
              ["merchant", "Händler"],
              ["manufacturer", "Hersteller"],
              ["model", "Modell"],
              ["category", "Kategorie"],
              ["currency", "Währung"]
            ].map(([field, label]) => (
              <label key={field} className="text-sm font-bold text-ink">
                {label}
                <input
                  className="mt-1 w-full rounded-2xl border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                  value={String(extracted[field as keyof ExtractedReceipt])}
                  onChange={(event) => updateField(field as keyof ExtractedReceipt, event.target.value)}
                />
              </label>
            ))}
            <label className="text-sm font-bold text-ink">
              Preis
              <input
                type="number"
                className="mt-1 w-full rounded-2xl border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                value={extracted.price}
                onChange={(event) => updateField("price", event.target.value)}
              />
            </label>
            <label className="text-sm font-bold text-ink">
              Kaufdatum
              <input
                type="date"
                className="mt-1 w-full rounded-2xl border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                value={dateInputValue(extracted.purchaseDate)}
                onChange={(event) => updateField("purchaseDate", event.target.value)}
              />
            </label>
            <label className="text-sm font-bold text-ink">
              Garantie bis
              <input
                type="date"
                className="mt-1 w-full rounded-2xl border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
                value={dateInputValue(extracted.warrantyUntil)}
                onChange={(event) => updateField("warrantyUntil", event.target.value)}
              />
            </label>
          </div>
          <Button className="mt-5 w-full" onClick={createItem}>
            Objekt erstellen
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
