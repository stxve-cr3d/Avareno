import { Link } from "react-router-dom";
import { Package, ShieldCheck } from "lucide-react";
import { Badge } from "./Badge";
import { ProgressBar } from "./ProgressBar";
import type { Item } from "../lib/types";
import { isoDate } from "../lib/api";

export function ItemCard({ item }: { item: Item }) {
  const warrantySoon = item.warrantyUntil && new Date(item.warrantyUntil).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 60;

  return (
    <Link to={`/items/${item.id}`} className="block rounded-lg border border-line bg-paper p-4 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:border-leaf hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-50 text-leaf">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-base font-black leading-snug text-ink">{item.name}</p>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              {item.category} {item.model ? `- ${item.model}` : ""}
            </p>
          </div>
        </div>
        <Badge tone={warrantySoon ? "amber" : "green"}>{item.completenessScore}%</Badge>
      </div>
      <div className="mt-4">
        <ProgressBar value={item.completenessScore} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-black text-ink/45">
        <span>{item.merchant ?? "No merchant"}</span>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck size={14} />
          {isoDate(item.warrantyUntil)}
        </span>
      </div>
      {item.missingFields?.length ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber">Noch offen: {item.missingFields.slice(0, 2).join(", ")}</p>
      ) : null}
    </Link>
  );
}
