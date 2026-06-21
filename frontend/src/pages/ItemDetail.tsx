import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Save } from "lucide-react";
import { api, isoDate } from "../lib/api";
import type { Item, Loop } from "../lib/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { ProgressBar } from "../components/ProgressBar";
import { Badge } from "../components/Badge";
import { LoopCard } from "../components/LoopCard";

export function ItemDetail() {
  const { id } = useParams();
  const [item, setItem] = useState<Item | null>(null);
  const [serialNumber, setSerialNumber] = useState("");
  const [reminderTitle, setReminderTitle] = useState("");

  async function load() {
    if (!id) return;
    const result = await api<Item>(`/api/items/${id}`);
    setItem(result);
    setSerialNumber(result.serialNumber ?? "");
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function saveSerial() {
    if (!item) return;
    setItem(await api<Item>(`/api/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ serialNumber }) }));
  }

  async function addReminder() {
    if (!item || !reminderTitle) return;
    const due = new Date();
    due.setDate(due.getDate() + 7);
    await api<Loop>("/api/loops", {
      method: "POST",
      body: JSON.stringify({
        itemId: item.id,
        title: reminderTitle,
        description: `Open loop for ${item.name}`,
        sourceType: "DEVICE",
        priority: "MEDIUM",
        dueDate: due.toISOString(),
        reminderAt: due.toISOString(),
        xpReward: 25
      })
    });
    setReminderTitle("");
    await load();
  }

  async function completeProfile() {
    if (!item) return;
    setItem(
      await api<Item>(`/api/items/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ serialNumber: serialNumber || "SN-MVP-001" })
      })
    );
  }

  if (!item) return <div className="py-12 text-center text-sm font-semibold text-ink/55">Loading item...</div>;

  return (
    <div className="space-y-5">
      <Card className="!bg-coal text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white/55">{item.category}</p>
            <h1 className="mt-1 text-3xl font-black">{item.name}</h1>
          </div>
          <Badge tone={item.completenessScore === 100 ? "green" : "amber"}>{item.completenessScore}%</Badge>
        </div>
        <div className="mt-5">
          <ProgressBar value={item.completenessScore} />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">Purchase memory</h2>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Merchant" value={item.merchant ?? "Unknown"} />
          <Info label="Purchase date" value={isoDate(item.purchaseDate)} />
          <Info label="Price" value={`${item.price ?? 0} ${item.currency}`} />
          <Info label="Warranty end" value={isoDate(item.warrantyUntil)} />
          <Info label="Manufacturer" value={item.manufacturer ?? "Unknown"} />
          <Info label="Model" value={item.model ?? "Unknown"} />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">Missing details</h2>
        <label className="mt-4 block text-sm font-bold text-ink">
          Serial number
          <input
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf"
            placeholder="Scan or type serial number"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={saveSerial} icon={<Save size={18} />}>
            Add serial number
          </Button>
          <Button variant="secondary" onClick={completeProfile}>
            Mark as complete
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">Documents</h2>
        <div className="mt-3 grid gap-2">
          {item.documents?.map((document) => (
            <a className="rounded-lg border border-line p-3 text-sm font-bold text-ink hover:border-leaf" key={document.id} href={document.filePath}>
              {document.fileName}
            </a>
          ))}
        </div>
        <p className="mt-3 text-sm text-ink/55">Upload another document is wired through the backend endpoint and can be expanded into a dedicated form.</p>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">Open loops</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={reminderTitle}
            onChange={(event) => setReminderTitle(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf"
            placeholder="Add reminder"
          />
          <Button onClick={addReminder} icon={<Plus size={18} />}>
            Add
          </Button>
        </div>
        <div className="mt-4 grid gap-3">
          {item.loops?.map((loop) => <LoopCard key={loop.id} loop={loop} />)}
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-mist p-3">
      <p className="text-xs font-bold text-ink/45">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  );
}
