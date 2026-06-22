import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api, dateInputValue, isoDate } from "../lib/api";
import type { Loop } from "../lib/types";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";

export function LoopDetail() {
  const { id } = useParams();
  const [loop, setLoop] = useState<Loop | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    if (!id) return;
    const result = await api<Loop>(`/api/loops/${id}`);
    setLoop(result);
    setDueDate(dateInputValue(result.dueDate));
    setReminderAt(dateInputValue(result.reminderAt));
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function saveDates() {
    if (!loop) return;
    setLoop(
      await api<Loop>(`/api/loops/${loop.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined
        })
      })
    );
    setMessage("Dates updated");
  }

  async function snooze() {
    if (!loop) return;
    const next = new Date();
    next.setDate(next.getDate() + 2);
    setLoop(await api<Loop>(`/api/loops/${loop.id}/snooze`, { method: "POST", body: JSON.stringify({ reminderAt: next.toISOString() }) }));
    setMessage("Snoozed for two days");
  }

  async function complete() {
    if (!loop) return;
    const result = await api<{ loop: Loop; message: string }>(`/api/loops/${loop.id}/complete`, { method: "POST" });
    setLoop(result.loop);
    setMessage(result.message);
  }

  if (!loop) return <div className="py-12 text-center text-sm font-semibold text-ink/55">Loading loop...</div>;

  return (
    <div className="space-y-5">
      <Card className="!rounded-3xl !bg-coal text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white/55">{loop.sourceType}</p>
            <h1 className="mt-1 text-3xl font-black">{loop.title}</h1>
          </div>
          <Badge tone={loop.status === "DONE" ? "green" : "amber"}>{loop.status}</Badge>
        </div>
        <p className="mt-4 text-sm font-semibold leading-6 text-white/65">{loop.description}</p>
        <p className="mt-4 text-sm font-bold text-leaf">Reward: +{loop.xpReward} XP</p>
      </Card>

      {message ? <div className="rounded-2xl bg-leaf/10 p-3 text-sm font-black text-moss ring-1 ring-leaf/20">{message}</div> : null}

      <Card>
        <h2 className="text-xl font-black text-ink">Reminder timing</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-muted">Due {isoDate(loop.dueDate)}. Reminder {isoDate(loop.reminderAt)}.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-ink">
            Due date
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="mt-1 w-full rounded-2xl border border-line p-3 text-sm font-semibold outline-none focus:border-leaf" />
          </label>
          <label className="text-sm font-bold text-ink">
            Reminder date
            <input type="date" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} className="mt-1 w-full rounded-2xl border border-line p-3 text-sm font-semibold outline-none focus:border-leaf" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={saveDates}>Save dates</Button>
          <Button variant="secondary" onClick={snooze}>Snooze</Button>
          <Button onClick={complete} icon={<CheckCircle2 size={18} />} disabled={loop.status === "DONE"}>
            Close loop
          </Button>
        </div>
      </Card>
    </div>
  );
}
