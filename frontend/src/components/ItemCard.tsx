import { Link } from "react-router-dom";
import { ImageOff, MapPin, ReceiptText, Repeat2, ShieldCheck } from "lucide-react";
import type { Item } from "../lib/types";
import { isoDate } from "../lib/api";
import { StatusChip } from "./app/AppKit";
import type { StatusTone } from "./app/AppKit";

export function ItemCard({ item }: { item: Item }) {
  const warranty = warrantyState(item.warrantyUntil);
  const missing = item.missingFields ?? [];
  const completeness = typeof item.completenessScore === "number" ? item.completenessScore : 0;

  return (
    <Link to={`/app/items/${item.id}`} className="av-item-card group">
      <div className="av-item-image">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} />
        ) : (
          <div className="av-item-image-empty">
            <ImageOff size={22} />
          </div>
        )}
      </div>

      <div className="av-item-body">
        <div className="av-item-toprow">
          <div className="av-item-titles">
            <p className="av-item-name">{item.name}</p>
            <p className="av-item-sub">
              {[item.manufacturer, item.model].filter(Boolean).join(" / ") || item.category}
            </p>
          </div>
          <StatusChip tone={warranty.tone}>{warranty.label}</StatusChip>
        </div>

        {completeness > 0 ? (
          <div className="av-item-progress">
            <div className="av-line">
              <div className="av-line-fill av-tone-teal" style={{ width: `${completeness}%` }} />
            </div>
            <small>{completeness}%</small>
          </div>
        ) : null}

        <div className="av-item-meta">
          <Meta icon={<MapPin size={13} />} label={item.space?.name ?? item.location ?? "Kein Raum"} />
          <Meta icon={<ReceiptText size={13} />} label={item.merchant ?? "Kein Beleg"} />
          <Meta icon={<ShieldCheck size={13} />} label={isoDate(item.warrantyUntil)} />
        </div>

        <div className="av-item-chips">
          <span className="av-chip av-tone-neutral">{item.itemType ?? "DING"}</span>
          {item.reorderUrl || item.affiliateUrl ? (
            <span className="av-chip av-tone-teal">
              <Repeat2 size={12} />
              Nachkauf
            </span>
          ) : null}
          {missing.length ? (
            <span className="av-chip av-tone-red">Fehlt: {missing.slice(0, 2).join(", ")}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function Meta({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="av-item-meta-tile">
      <span className="av-item-meta-ic">{icon}</span>
      <span className="av-item-meta-label">{label}</span>
    </div>
  );
}

function warrantyState(value?: string | null): { label: string; tone: StatusTone } {
  if (!value) return { label: "Keine Garantie", tone: "neutral" };
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Abgelaufen", tone: "red" };
  if (days < 60) return { label: `${days} Tage`, tone: "amber" };
  return { label: "Geschützt", tone: "green" };
}
