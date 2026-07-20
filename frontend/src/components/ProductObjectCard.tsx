import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Coffee,
  CookingPot,
  Drill,
  Laptop,
  Monitor,
  Package,
  Tv,
  WashingMachine,
  Wrench
} from "lucide-react";
import type { Item } from "../lib/types";

/* Product object v2 (Visual-Grammar pass §6): the real thing comes first.
   A large visual area (photo or a category-tinted composition), then name,
   manufacturer/model, one metadata line and exactly ONE overall status.
   The whole card is the link — no permanent footer action, no chip rows. */

type CategoryFamily = "kitchen" | "laundry" | "media" | "computer" | "tools" | "other";

function categoryFamily(item: Item): CategoryFamily {
  const text = `${item.category ?? ""} ${item.name ?? ""}`.toLowerCase();
  if (/kaffee|coffee|espresso|küche|kitchen|koch|ofen|herd/.test(text)) return "kitchen";
  if (/wasch|laundry|trockner/.test(text)) return "laundry";
  if (/fernseh|\btv\b|oled|beamer|audio|lautsprecher|kopfhörer/.test(text)) return "media";
  if (/laptop|notebook|computer|monitor|display|drucker|printer/.test(text) || item.itemType === "ELECTRONIC") return "computer";
  if (/bohr|drill|werkzeug|tool|werkstatt|säge|schrauber/.test(text)) return "tools";
  return "other";
}

export function categoryIcon(item: Item, size: number): ReactNode {
  const text = `${item.category ?? ""} ${item.name ?? ""}`.toLowerCase();
  if (/wasch|laundry/.test(text)) return <WashingMachine size={size} />;
  if (/kaffee|coffee|espresso/.test(text)) return <Coffee size={size} />;
  if (/küche|kitchen|koch|ofen|herd/.test(text)) return <CookingPot size={size} />;
  if (/fernseh|\btv\b|oled/.test(text)) return <Tv size={size} />;
  if (/laptop|notebook/.test(text)) return <Laptop size={size} />;
  if (/monitor|display|elektronik|electronics/.test(text) || item.itemType === "ELECTRONIC") return <Monitor size={size} />;
  if (/bohr|drill/.test(text)) return <Drill size={size} />;
  if (/werkzeug|tool/.test(text)) return <Wrench size={size} />;
  return <Package size={size} />;
}

/* Exactly one overall status per product — the most decision-relevant one. */
export function productStatus(item: Item): { text: string; tone: "positive" | "attention" | "muted" } {
  const missing = item.missingFields?.length ?? 0;
  const days = warrantyDaysLeft(item);
  if (days !== null && days >= 0 && days < 60) {
    return { text: `Garantie endet in ${days} ${days === 1 ? "Tag" : "Tagen"}`, tone: "attention" };
  }
  if (missing > 0) {
    return { text: missing === 1 ? "1 wichtige Angabe fehlt" : `${missing} wichtige Angaben fehlen`, tone: "attention" };
  }
  if (days !== null && days >= 0) {
    return { text: `Garantie bis ${formatDate(item.warrantyUntil)}`, tone: "positive" };
  }
  return { text: "Produktakte vollständig", tone: "positive" };
}

export function ProductObjectCard({ item, to, featured = false }: { item: Item; to: string; featured?: boolean }) {
  const location = item.location || item.space?.name || "Kein Ort angegeben";
  const documents = item.documents?.length ?? 0;
  const status = productStatus(item);
  const family = categoryFamily(item);
  const identity = manufacturerModel(item);

  return (
    <Link
      className={`mem-object-card${featured ? " is-featured" : ""}`}
      to={to}
      aria-label={`${item.name} öffnen — ${status.text}`}
    >
      <span className={`mem-object-visual is-${family}`} aria-hidden={!item.imageUrl}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={`Produktbild von ${item.name}`}
            loading="lazy"
            onError={(event) => event.currentTarget.remove()}
          />
        ) : (
          <span className="mem-object-illustration">{categoryIcon(item, featured ? 56 : 42)}</span>
        )}
      </span>
      <span className="mem-object-body">
        <strong className="mem-object-name">{item.name}</strong>
        <span className={`mem-object-identity${identity ? "" : " is-pending"}`}>
          {identity ?? "Hersteller und Modell fehlen noch"}
        </span>
        <span className="mem-object-meta">
          {location} · {documents === 0 ? "keine Dokumente" : documents === 1 ? "1 Dokument" : `${documents} Dokumente`}
        </span>
        <span className={`mem-object-status is-${status.tone}`}>{status.text}</span>
      </span>
    </Link>
  );
}

/* Honest, shared derivations from user-owned records. */

export function warrantyDaysLeft(item: Item): number | null {
  if (!item.warrantyUntil) return null;
  const value = new Date(item.warrantyUntil).getTime();
  if (Number.isNaN(value)) return null;
  return Math.ceil((value - Date.now()) / (1000 * 60 * 60 * 24));
}

export type WarrantyStatus = "active" | "soon" | "expired" | "unknown";

export function warrantyStatus(item: Item): WarrantyStatus {
  const days = warrantyDaysLeft(item);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days < 60) return "soon";
  return "active";
}

export function warrantyDescription(item: Item): { text: string; tone: "positive" | "attention" | "muted" } {
  const days = warrantyDaysLeft(item);
  if (days === null) return { text: "Garantie nicht angegeben", tone: "muted" };
  if (days < 0) return { text: `Garantie abgelaufen am ${formatDate(item.warrantyUntil)}`, tone: "muted" };
  if (days < 60) return { text: `Garantie endet in ${days} ${days === 1 ? "Tag" : "Tagen"}`, tone: "attention" };
  return { text: `Garantie aktiv bis ${formatDate(item.warrantyUntil)}`, tone: "positive" };
}

export function hasReceipt(item: Item): boolean {
  return (item.documents ?? []).some((document) => document.type.toUpperCase() === "RECEIPT");
}

export function manufacturerModel(item: Item): string | null {
  const parts = [item.manufacturer, item.model].map((value) => value?.trim()).filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function completenessLabel(missing: number) {
  if (missing === 0) return "Produktakte vollständig";
  if (missing === 1) return "Fast vollständig · 1 Angabe fehlt";
  return `${missing} Angaben fehlen`;
}

export function formatDate(value?: string | null) {
  if (!value) return "Datum unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Datum unbekannt";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function itemTypeLabel(value?: string | null) {
  const labels: Record<string, string> = {
    THING: "Produkt",
    ELECTRONIC: "Elektronik",
    FURNITURE: "Möbel",
    INFRASTRUCTURE: "Haus & Infrastruktur",
    VEHICLE: "Fahrzeug",
    COLLECTIBLE: "Sammlung"
  };
  return value ? labels[value] ?? value : "Produkt";
}
