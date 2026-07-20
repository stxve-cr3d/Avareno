import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, ListChecks, MessageSquareText, Package, ReceiptText, Sparkles, UploadCloud } from "lucide-react";
import { api } from "../lib/api";
import type { CaptureDropResult, CaptureKind } from "../lib/types";

const kinds: { value: CaptureKind; label: string; helper: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { value: "AUTO", label: "Auto", helper: "avareno sortiert", icon: Sparkles },
  { value: "RECEIPT", label: "Beleg", helper: "Kauf & Garantie", icon: ReceiptText },
  { value: "MESSAGE", label: "Nachricht", helper: "Antwort merken", icon: MessageSquareText },
  { value: "DOCUMENT", label: "Dokument", helper: "Sicher ablegen", icon: FileText },
  { value: "ITEM", label: "Objekt", helper: "Karte starten", icon: Package },
  { value: "LOOP", label: "Loop", helper: "Gedanke parken", icon: ListChecks }
];

const examples = [
  "Miesa am Freitag antworten",
  "MediaMarkt LG OLED 1499 EUR Garantie",
  "Vertrag Stromanbieter bis nächsten Monat prüfen"
];

export function Capture() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialKind = (searchParams.get("kind") || "AUTO").toUpperCase() as CaptureKind;
  const [kind, setKind] = useState<CaptureKind>(kinds.some((item) => item.value === initialKind) ? initialKind : "AUTO");
  const [text, setText] = useState("");
  const [contactName, setContactName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CaptureDropResult | null>(null);

  const active = useMemo(() => kinds.find((item) => item.value === kind) ?? kinds[0], [kind]);
  const ActiveIcon = active.icon;

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const created = await api<CaptureDropResult>("/api/capture/drop", {
        method: "POST",
        body: JSON.stringify({ text, kind, contactName: contactName || undefined })
      });
      setResult(created);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 md:px-8 md:py-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_315px]">
        <section className="rounded-[2rem] av-surface p-5 shadow-[0_24px_80px_rgba(17,21,19,0.11)] md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-moss">Universal-Einwurf</p>
              <h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight md:text-5xl">Wirf es rein. avareno macht daraus Erinnerung.</h1>
            </div>
            <span className="hidden h-16 w-16 place-items-center rounded-full bg-leaf text-[color:var(--av-primary-foreground)] shadow-lift md:grid">
              <UploadCloud size={28} />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 md:mt-7 md:grid-cols-6">
            {kinds.map((item) => {
              const Icon = item.icon;
              const selected = item.value === kind;
              return (
                <button
                  key={item.value}
                  className={`rounded-2xl border p-3 text-left transition ${
                    selected ? "border-leaf av-accent-soft text-moss" : "border-line av-surface text-ink hover:border-leaf"
                  }`}
                  onClick={() => setKind(item.value)}
                >
                  <Icon size={19} />
                  <span className="mt-3 block text-sm font-black">{item.label}</span>
                  <span className="mt-1 hidden text-xs font-bold opacity-55 md:block">{item.helper}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-dashed border-ink/15 bg-canvas p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-ink/58">
              <ActiveIcon size={17} />
              {active.label}
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="min-h-32 w-full resize-none bg-transparent text-lg font-bold leading-8 outline-none placeholder:text-ink/25 md:min-h-48 md:text-xl"
              placeholder="Zum Beispiel: Miesa Freitag antworten, MediaMarkt LG OLED 1499 EUR, Vertrag nächsten Monat prüfen ..."
            />
          </div>

          {kind === "MESSAGE" ? (
            <label className="mt-4 block text-sm font-black text-ink">
              Kontakt optional
              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-line av-surface px-4 text-sm font-bold outline-none focus:border-leaf"
                placeholder="Miesa"
              />
            </label>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-leaf px-6 text-sm font-black text-[color:var(--av-primary-foreground)] shadow-lift disabled:cursor-not-allowed disabled:opacity-50"
              onClick={submit}
              disabled={!text.trim() || busy}
            >
              {busy ? "avareno sortiert..." : "Einwurf sichern"}
              <ArrowRight size={17} />
            </button>
            <Link to="/capture/receipt" className="text-sm font-black text-moss">
              Datei oder Foto hochladen
            </Link>
          </div>

          {result ? (
            <div className="soft-pop mt-6 rounded-[1.5rem] border border-emerald-200 av-accent-soft p-4 text-moss">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={22} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">{result.kind} gesichert</p>
                  <p className="mt-1 text-xl font-black text-ink">{result.title}</p>
                  <p className="mt-1 text-sm font-bold text-ink/58">{result.summary}</p>
                  <button className="mt-4 rounded-full bg-leaf px-4 py-2 text-sm font-black text-[color:var(--av-primary-foreground)]" onClick={() => navigate(result.route)}>
                    Öffnen
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="mt-20 space-y-4 lg:mt-0">
          <div className="rounded-[1.5rem] bg-[#fffaf2] p-5">
            <h2 className="font-serif text-3xl italic leading-tight">Ein Satz reicht.</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-ink/58">
              avareno erkennt erstmal lokal und regelbasiert, was du meinst. Später hängt hier echte AI dran.
            </p>
          </div>

          <div className="rounded-[1.5rem] av-surface p-4">
            <h2 className="text-lg font-black">Beispiele</h2>
            <div className="mt-3 grid gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  className="rounded-2xl border border-line av-surface p-3 text-left text-sm font-bold text-ink/68 hover:border-leaf"
                  onClick={() => setText(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
