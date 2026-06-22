import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquareText, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import type { Loop } from "../lib/types";

export function CaptureMessage() {
  const navigate = useNavigate();
  const [text, setText] = useState("du kimmst am freida oda?");
  const [contactName, setContactName] = useState("Miesa");
  const [preview, setPreview] = useState("");

  async function createReminder() {
    const result = await api<{ loop: Loop; parsed: { title: string; reminderAt: string } }>("/api/capture/message", {
      method: "POST",
      body: JSON.stringify({ text, contactName })
    });
    setPreview(`Created: ${result.parsed.title}`);
    setTimeout(() => navigate(`/loops/${result.loop.id}`), 600);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/80 bg-paper p-5 shadow-soft ring-1 ring-line/60">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky">
            <MessageSquareText size={22} />
          </div>
          <div>
            <p className="text-sm font-black text-leaf">Safe message memory</p>
            <h1 className="mt-1 text-3xl font-black text-ink">Message reminder</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">Capture a promise without sending or scraping messages.</p>
          </div>
        </div>
      </div>
      <Card>
        <label className="text-sm font-bold text-ink">
          Contact
          <input
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-line p-3 text-sm font-semibold outline-none focus:border-leaf"
          />
        </label>
        <label className="mt-4 block text-sm font-bold text-ink">
          Pasted message
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="mt-1 min-h-40 w-full rounded-2xl border border-line p-4 text-sm font-semibold leading-6 outline-none focus:border-leaf"
          />
        </label>
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-leaf/10 p-3 text-sm font-semibold leading-6 text-moss">
          <ShieldCheck className="mt-0.5 shrink-0" size={18} />
          Later this can open the WhatsApp chat, but the MVP only creates a safe reminder.
        </div>
        <Button className="mt-4 w-full" onClick={createReminder} icon={<MessageSquareText size={18} />}>
          Create reminder
        </Button>
        {preview ? <p className="mt-3 rounded-2xl bg-leaf/10 p-3 text-sm font-black text-moss">{preview}</p> : null}
      </Card>
    </div>
  );
}
