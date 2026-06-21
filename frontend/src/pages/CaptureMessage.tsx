import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquareText } from "lucide-react";
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
      <div>
        <p className="text-sm font-bold text-leaf">Safe message memory</p>
        <h1 className="mt-1 text-3xl font-black text-ink">Message reminder</h1>
        <p className="mt-2 text-sm text-ink/60">Later this can open the WhatsApp chat, but the MVP only creates a safe reminder.</p>
      </div>
      <Card>
        <label className="text-sm font-bold text-ink">
          Contact
          <input
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf"
          />
        </label>
        <label className="mt-4 block text-sm font-bold text-ink">
          Pasted message
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="mt-1 min-h-36 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-leaf"
          />
        </label>
        <Button className="mt-4 w-full" onClick={createReminder} icon={<MessageSquareText size={18} />}>
          Create reminder
        </Button>
        {preview ? <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm font-bold text-moss">{preview}</p> : null}
      </Card>
    </div>
  );
}
