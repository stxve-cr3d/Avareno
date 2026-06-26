import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { ImageOff, MapPin, ReceiptText, Repeat2, ShieldCheck } from "lucide-react";
import { Badge } from "./Badge";
import type { Item } from "../lib/types";
import { isoDate } from "../lib/api";

export function ItemCard({ item }: { item: Item }) {
  const warranty = warrantyState(item.warrantyUntil);
  const missing = item.missingFields ?? [];

  return (
    <Link to={`/app/items/${item.id}`} className="object-card group">
      <div className="object-card-image">
        {item.imageUrl ? (
          <img className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-[1.03]" src={item.imageUrl} alt={item.name} />
        ) : (
          <div className="grid h-full place-items-center text-muted">
            <ImageOff size={24} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-lg font-black leading-tight text-ink">{item.name}</p>
            <p className="mt-1 truncate text-sm font-semibold text-muted">
              {[item.manufacturer, item.model].filter(Boolean).join(" / ") || item.category}
            </p>
          </div>
          <Badge tone={warranty.tone}>{warranty.label}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Meta icon={<MapPin size={14} />} label={item.space?.name ?? item.location ?? "Kein Raum"} />
          <Meta icon={<ReceiptText size={14} />} label={item.merchant ?? "Kein Beleg"} />
          <Meta icon={<ShieldCheck size={14} />} label={isoDate(item.warrantyUntil)} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-ink/5 px-2.5 py-1 text-[11px] font-black uppercase text-muted">{item.itemType ?? "DING"}</span>
          {item.reorderUrl || item.affiliateUrl ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-[11px] font-black uppercase text-leaf">
              <Repeat2 size={12} />
              Nachkauf
            </span>
          ) : null}
        </div>

        {missing.length ? <p className="mt-3 text-xs font-black text-amber">Fehlt: {missing.slice(0, 2).join(", ")}</p> : null}
      </div>
    </Link>
  );
}

function Meta({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="min-w-0 rounded-md bg-wash px-2.5 py-2">
      <span className="mb-1 block text-leaf">{icon}</span>
      <span className="block truncate text-[11px] font-black text-muted">{label}</span>
    </div>
  );
}

function warrantyState(value?: string | null): { label: string; tone: "green" | "amber" | "red" | "gray" } {
  if (!value) return { label: "Keine Garantie", tone: "gray" };
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Abgelaufen", tone: "red" };
  if (days < 60) return { label: `${days} Tage`, tone: "amber" };
  return { label: "Geschützt", tone: "green" };
}
