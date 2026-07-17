import { useEffect, useState } from "react";
import { Check, FilePlus2, Package, Plus } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useLanguage } from "../lib/language";
import type { Item } from "../lib/types";

export function ProductCreated() {
  const { id = "" } = useParams();
  const { language } = useLanguage();
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState("");
  const copy = language === "de" ? deCopy : enCopy;

  useEffect(() => {
    let cancelled = false;
    setError("");
    api<Item>(`/api/items/${encodeURIComponent(id)}`)
      .then((result) => {
        if (!cancelled) setItem(result);
      })
      .catch(() => {
        if (!cancelled) setError(copy.loadError);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.loadError, id]);

  if (error) {
    return (
      <main className="activation-page">
        <section className="activation-panel activation-status-panel" role="alert">
          <h1>{copy.loadErrorTitle}</h1>
          <p>{error}</p>
          <button className="av-btn av-btn-primary min-h-11 text-sm" type="button" onClick={() => window.location.reload()}>
            {copy.retry}
          </button>
        </section>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="activation-page">
        <section className="activation-panel activation-status-panel" aria-live="polite">
          <div className="activation-loading-dot" aria-hidden="true" />
          <p>{copy.loading}</p>
        </section>
      </main>
    );
  }

  const description = [item.manufacturer, item.model].filter(Boolean).join(" · ");

  return (
    <main className="activation-page">
      <section className="activation-panel activation-success" aria-labelledby="product-created-title">
        <div className="activation-success-mark" aria-hidden="true">
          <Check size={24} strokeWidth={2.4} />
        </div>
        <div className="activation-heading">
          <p className="activation-eyebrow">{copy.eyebrow}</p>
          <h1 id="product-created-title">{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>

        <div className="activation-product-preview">
          <div className="activation-product-image">
            {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <Package size={34} aria-hidden="true" />}
          </div>
          <div>
            <strong>{item.name}</strong>
            <span>{description || item.category}</span>
            {description ? <small>{item.category}</small> : null}
          </div>
        </div>

        <div className="activation-success-actions">
          <Link className="av-btn av-btn-primary min-h-11 text-sm" to={`/app/capture/receipt?itemId=${encodeURIComponent(item.id)}&from=first-product`}>
            <FilePlus2 size={18} aria-hidden="true" />
            {copy.addDocument}
          </Link>
          <Link
            className="av-btn av-btn-secondary min-h-11 text-sm"
            to={`/app/dinge/${encodeURIComponent(item.id)}`}
            state={{ activationOrigin: "first-product" }}
          >
            {copy.openRecord}
          </Link>
          <Link className="activation-tertiary-link" to="/app/capture/item">
            <Plus size={16} aria-hidden="true" />
            {copy.addAnother}
          </Link>
        </div>

        <p className="activation-success-note">{copy.note}</p>
      </section>
    </main>
  );
}

const deCopy = {
  eyebrow: "Produktakte erstellt",
  title: "Dein Produkt ist gespeichert.",
  intro: "Avareno hat eine echte Produktakte angelegt. Als Nächstes kannst du einen Beleg oder ein anderes Dokument sicher zuordnen.",
  addDocument: "Rechnung oder Dokument hinzufügen",
  openRecord: "Produktakte öffnen",
  addAnother: "Weiteres Produkt hinzufügen",
  note: "Fehlende Angaben kannst du jederzeit in der Produktakte ergänzen.",
  loading: "Produktakte wird geladen …",
  loadErrorTitle: "Produktakte nicht verfügbar",
  loadError: "Die gespeicherte Produktakte konnte gerade nicht geladen werden.",
  retry: "Erneut versuchen"
};

const enCopy: typeof deCopy = {
  eyebrow: "Product record created",
  title: "Your product is saved.",
  intro: "Avareno created a real product record. Next, you can safely link a receipt or another document to it.",
  addDocument: "Add receipt or document",
  openRecord: "Open product record",
  addAnother: "Add another product",
  note: "You can add missing details to the product record at any time.",
  loading: "Loading product record …",
  loadErrorTitle: "Product record unavailable",
  loadError: "The saved product record could not be loaded right now.",
  retry: "Try again"
};
