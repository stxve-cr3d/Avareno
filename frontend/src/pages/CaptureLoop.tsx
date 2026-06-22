import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListChecks } from "lucide-react";
import { api } from "../lib/api";
import type { Loop } from "../lib/types";
import { Card } from "../components/Card";
import { Button } from "../components/Button";

export function CaptureLoop() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Loop["priority"]>("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  async function createLoop() {
    const loop = await api<Loop>("/api/loops", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        priority,
        sourceType: "MANUAL",
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        reminderAt: dueDate ? new Date(dueDate).toISOString() : undefined,
        xpReward: priority === "BOSS" ? 100 : priority === "HIGH" ? 50 : priority === "LOW" ? 10 : 25
      })
    });
    navigate(`/loops/${loop.id}`);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/80 bg-paper p-5 shadow-soft ring-1 ring-line/60">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-50 text-coral">
            <ListChecks size={22} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-ink">Park a loop</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">Name the thing, choose the weight, and let it stop floating around.</p>
          </div>
        </div>
      </div>
      <Card>
        <label className="text-sm font-bold text-ink">
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-2xl border border-line p-3 text-sm font-semibold outline-none focus:border-leaf" />
        </label>
        <label className="mt-4 block text-sm font-bold text-ink">
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-28 w-full rounded-2xl border border-line p-4 text-sm font-semibold leading-6 outline-none focus:border-leaf" />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-ink">
            Priority
            <select value={priority} onChange={(event) => setPriority(event.target.value as Loop["priority"])} className="mt-1 w-full rounded-2xl border border-line p-3 text-sm font-semibold outline-none focus:border-leaf">
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
              <option>BOSS</option>
            </select>
          </label>
          <label className="text-sm font-bold text-ink">
            Due date
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 w-full rounded-2xl border border-line p-3 text-sm font-semibold outline-none focus:border-leaf" />
          </label>
        </div>
        <Button className="mt-5 w-full" disabled={!title} onClick={createLoop}>Park loop</Button>
      </Card>
    </div>
  );
}
