import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
      <div>
        <h1 className="text-3xl font-black text-ink">Manual Loop</h1>
        <p className="mt-2 text-sm text-ink/60">Capture a loose task before it disappears.</p>
      </div>
      <Card>
        <label className="text-sm font-bold text-ink">
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf" />
        </label>
        <label className="mt-4 block text-sm font-bold text-ink">
          Description
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf" />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-ink">
            Priority
            <select value={priority} onChange={(event) => setPriority(event.target.value as Loop["priority"])} className="mt-1 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf">
              <option>LOW</option>
              <option>MEDIUM</option>
              <option>HIGH</option>
              <option>BOSS</option>
            </select>
          </label>
          <label className="text-sm font-bold text-ink">
            Due date
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf" />
          </label>
        </div>
        <Button className="mt-5 w-full" disabled={!title} onClick={createLoop}>Create loop</Button>
      </Card>
    </div>
  );
}
