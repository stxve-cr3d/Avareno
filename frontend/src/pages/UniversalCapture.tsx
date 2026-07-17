import { useEffect, useState } from "react";
import { ArrowRight, Camera, CheckCircle2, FileText, PackagePlus, ScanLine, Sparkles, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { missingFieldLabel } from "../lib/uiText";
import type { Item, ProductStructure, UniversalCaptureDraft } from "../lib/types";

const examples = [
  "Kaffeemaschine in der Küche, gekauft bei MediaMarkt",
  "Sofa im Wohnzimmer ohne Rechnung",
  "Bosch Waschmaschine im Keller mit Garantie",
  "E-Bike in der Garage, Seriennummer fehlt"
];

export function UniversalCapture() {
  const navigate = useNavigate();
  const [structure, setStructure] = useState<ProductStructure | null>(null);
  const [text, setText] = useState("");
  // Photo capture is planned; until it exists, text is the only real input mode.
  const inputType = "TEXT";
  const [spaceId, setSpaceId] = useState("");
  const [draft, setDraft] = useState<UniversalCaptureDraft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<ProductStructure>("/api/structure").then(setStructure).catch(console.error);
  }, []);

  async function generateDraft() {
    setBusy(true);
    try {
      const result = await api<UniversalCaptureDraft>("/api/capture/universal", {
        method: "POST",
        body: JSON.stringify({ inputType, text, spaceId: spaceId || null })
      });
      setDraft(result);
    } finally {
      setBusy(false);
    }
  }

  async function createItem() {
    if (!draft) return;
    const item = await api<Item>("/api/items", {
      method: "POST",
      body: JSON.stringify(draft.draftItem)
    });
    navigate(`/app/dinge/${item.id}`, { state: { justCreated: true } });
  }

  return (
    <div className="capture-studio mx-auto max-w-7xl space-y-5">
      <section className="capture-studio-hero rounded-lg">
        <div>
          <p className="text-xs font-black uppercase text-leaf">Smart erfassen</p>
          <h1 className="mt-3 max-w-4xl text-[clamp(3rem,7vw,7rem)] font-black leading-[0.9] text-white">
            Ein Eingang für alles
          </h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/62">
            Beschreib in einem Satz, was da ist. Avareno merkt es sich als Objektprofil — mit allem, was dazugehört.
          </p>
        </div>
        <div className="capture-mode-grid">
          <ModeButton active icon={<FileText size={17} />} label="Text" onClick={() => {}} />
          <ModeButton active={false} icon={<ScanLine size={17} />} label="Beleg hochladen" onClick={() => navigate("/app/capture/receipt")} />
          <ModeButton active={false} disabled icon={<Camera size={17} />} label="Foto (geplant)" onClick={() => {}} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="capture-panel rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted">Eingabe</p>
              <h2 className="mt-1 text-3xl font-black text-ink">Sag Avareno was da ist.</h2>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-leaf/10 text-leaf">
              <Wand2 size={18} />
            </span>
          </div>

          <textarea
            className="capture-textarea"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Beschreibe ein Produkt, z. B. „Kaffeemaschine in der Küche, gekauft bei MediaMarkt“ — oder wähle unten ein Beispiel."
          />

          <select className="capture-select" value={spaceId} onChange={(event) => setSpaceId(event.target.value)}>
            <option value="">Raum automatisch erkennen</option>
            {(structure?.spaces ?? [])
              .filter((space) => space.type !== "HOME")
              .map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
          </select>

          <div className="mt-4 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button className="capture-example" key={example} onClick={() => setText(example)} type="button">
                {example}
              </button>
            ))}
          </div>

          <button className="capture-primary" disabled={!text || busy} onClick={generateDraft} type="button">
            {busy ? "Entwurf wird erstellt…" : "Entwurf erstellen"}
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="capture-panel rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted">Entwurf</p>
              <h2 className="mt-1 text-3xl font-black text-ink">{draft?.draftItem.name ?? "Noch kein Vorschlag"}</h2>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-leaf/10 text-leaf">
              <Sparkles size={18} />
            </span>
          </div>

          {draft ? (
            <div className="mt-5 grid gap-4">
              <div className="capture-draft-card">
                {draft.draftItem.imageUrl ? <img src={draft.draftItem.imageUrl} alt="" /> : <PackagePlus size={42} />}
                <div>
                  <p className="text-xs font-black uppercase text-muted">Sicherheit {Math.round(draft.confidence * 100)}%</p>
                  <p className="mt-1 text-xl font-black text-ink">{draft.draftItem.category}</p>
                  <p className="text-sm font-semibold text-muted">
                    {[draft.draftItem.manufacturer, draft.draftItem.model, draft.draftItem.location].filter(Boolean).join(" / ") || draft.draftItem.itemType}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {draft.suggestedActions.map((action) => (
                  <div className="capture-action" key={action}>
                    <CheckCircle2 size={16} />
                    {action}
                  </div>
                ))}
              </div>

              <p className="text-sm font-semibold text-muted">Fehlt als Nächstes: {draft.missing.map(missingFieldLabel).join(", ")}</p>

              <button className="capture-primary" onClick={createItem} type="button">
                Objektprofil erstellen <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-line av-surface p-6 text-sm font-bold text-muted">
              Der Entwurf erscheint hier, sobald Avareno deine Eingabe gelesen hat.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ModeButton({ active, disabled = false, icon, label, onClick }: { active: boolean; disabled?: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`capture-mode-button ${active ? "capture-mode-button-active" : ""}`} disabled={disabled} onClick={onClick} type="button">
      {icon}
      {label}
    </button>
  );
}
