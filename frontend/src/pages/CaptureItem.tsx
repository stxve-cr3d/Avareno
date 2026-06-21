import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Item } from "../lib/types";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

export function CaptureItem() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");

  async function createItem() {
    const item = await api<Item>("/api/items", {
      method: "POST",
      body: JSON.stringify({ name, category, manufacturer, model, currency: "EUR" })
    });
    navigate(`/items/${item.id}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-ink">Add Item Manually</h1>
        <p className="mt-2 text-sm text-ink/60">Start a smart item card even when the receipt is missing.</p>
      </div>
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-ink">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf" />
          </label>
          <label className="text-sm font-bold text-ink">
            Category
            <input value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf" />
          </label>
          <label className="text-sm font-bold text-ink">
            Manufacturer
            <input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} className="mt-1 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf" />
          </label>
          <label className="text-sm font-bold text-ink">
            Model
            <input value={model} onChange={(event) => setModel(event.target.value)} className="mt-1 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf" />
          </label>
        </div>
        <Button className="mt-5 w-full" disabled={!name} onClick={createItem}>Create item</Button>
      </Card>
    </div>
  );
}
