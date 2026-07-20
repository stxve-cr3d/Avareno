import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, CheckCircle2, ChevronRight, FileText, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import type { Loop } from "../lib/types";

const priorityOptions: { label: string; value: Loop["priority"] }[] = [
  { label: "Niedrig", value: "LOW" },
  { label: "Normal", value: "MEDIUM" },
  { label: "Wichtig", value: "HIGH" },
  { label: "Kritisch", value: "BOSS" }
];

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
    navigate(`/app/care/${loop.id}`);
  }

  return (
    <main className="care-page">
      <section className="care-hero">
        <div>
          <h1>Care</h1>
          <p>Alles, was nicht vergessen werden darf: Garantien, Rückgaben, Reparaturen und offene Zusagen.</p>
        </div>
      </section>

      <section className="care-focus">
        <div>
          <span>Neue Erinnerung</span>
          <h2>Eine Erinnerung genügt.</h2>
          <p>Halte nur fest, was wirklich wieder auftauchen muss. Details kannst du später ergänzen.</p>
        </div>
        <button className="care-primary-action" disabled={!title.trim()} onClick={createLoop} type="button">
          Erinnerung anlegen
          <ChevronRight size={16} />
        </button>
      </section>

      <section className="care-form-panel">
        <label>
          Titel
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="z.B. Garantie für Fernseher prüfen" />
        </label>
        <label>
          Notiz
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Was soll Avareno später wieder hochholen?" />
        </label>
        <div className="care-form-grid">
          <label>
            Wichtigkeit
            <select value={priority} onChange={(event) => setPriority(event.target.value as Loop["priority"])}>
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fällig am
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="care-preview-list" aria-label="Care Beispiele">
        <CarePreview icon={<ShieldCheck size={18} />} label="Garantie" body="Ablaufdatum, Beleg und Produkt bleiben verbunden." />
        <CarePreview icon={<CalendarClock size={18} />} label="Rückgabe" body="Fristen und fehlende Nachweise werden sichtbar." />
        <CarePreview icon={<FileText size={18} />} label="Reparatur" body="Service, Kosten und Ergebnis landen im Produktpass." />
      </section>
    </main>
  );
}

function CarePreview({ body, icon, label }: { body: string; icon: ReactNode; label: string }) {
  return (
    <div className="care-preview-row">
      <span>{icon}</span>
      <div>
        <strong>{label}</strong>
        <small>{body}</small>
      </div>
      <CheckCircle2 size={17} />
    </div>
  );
}
