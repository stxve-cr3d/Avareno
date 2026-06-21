import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Item } from "../lib/types";
import { ItemCard } from "../components/ItemCard";
import { EmptyState } from "../components/EmptyState";

const filters = ["All", "Warranty soon", "Incomplete", "Missing receipt", "Missing serial number"] as const;

export function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  useEffect(() => {
    api<Item[]>("/api/items").then(setItems).catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter === "All") return true;
      if (filter === "Warranty soon") return item.warrantyUntil && new Date(item.warrantyUntil).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 60;
      if (filter === "Incomplete") return item.completenessScore < 100;
      if (filter === "Missing receipt") return item.missingFields?.includes("receipt");
      if (filter === "Missing serial number") return item.missingFields?.includes("serial number");
      return true;
    });
  }, [filter, items]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-ink">Items</h1>
        <p className="mt-2 text-sm text-ink/60">Smart item cards from receipts, warranties, documents, and missing details.</p>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-auto">
        {filters.map((item) => (
          <button
            key={item}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${filter === item ? "bg-coal text-white" : "bg-white text-ink ring-1 ring-line"}`}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.length ? filtered.map((item) => <ItemCard key={item.id} item={item} />) : <EmptyState title="No items match this filter" />}
      </div>
    </div>
  );
}
