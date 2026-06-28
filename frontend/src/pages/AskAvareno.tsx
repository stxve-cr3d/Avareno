import { useState } from "react";
import { ArrowRight, Bot, MessageCircleQuestion, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { AssistantAnswer } from "../lib/types";

const prompts = [
  "Welche Garantien laufen bald ab?",
  "Wo ist die Rechnung vom LG TV?",
  "Was fehlt noch?",
  "Was ist im Wohnzimmer?",
  "Was ist mein Hausrat wert?",
  "Was kann ich nachkaufen?"
];

export function AskAvareno() {
  const [question, setQuestion] = useState(prompts[0]);
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(nextQuestion = question) {
    if (!nextQuestion.trim()) return;
    setQuestion(nextQuestion);
    setBusy(true);
    try {
      const result = await api<AssistantAnswer>("/api/assistant/ask", {
        method: "POST",
        body: JSON.stringify({ question: nextQuestion })
      });
      setAnswer(result);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ask-page mx-auto max-w-7xl space-y-5">
      <section className="ask-hero rounded-lg">
        <div>
          <p className="text-xs font-black uppercase text-leaf">Ask Avareno</p>
          <h1 className="mt-3 max-w-4xl text-[clamp(3rem,7vw,7rem)] font-black leading-[0.9] text-white">
            frag deine dinge
          </h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/62">
            Kein normaler Chat. Avareno antwortet aus deinen Objekten, Belegen, Räumen, Garantien und fehlenden Daten.
          </p>
        </div>
        <div className="ask-signal">
          <Bot size={28} />
          <p>Object assistant</p>
          <strong>{answer ? `${Math.round(answer.confidence * 100)}% confidence` : "ready"}</strong>
        </div>
      </section>

      <section className="ask-panel rounded-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-muted">Question</p>
            <h2 className="mt-1 text-3xl font-black text-ink">Was willst du wissen?</h2>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white">
            <MessageCircleQuestion size={18} />
          </span>
        </div>

        <div className="ask-input-row">
          <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Frag nach Rechnung, Garantie, Raum, Wert..." />
          <button onClick={() => ask()} disabled={busy} type="button">
            {busy ? "..." : "Ask"} <ArrowRight size={16} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button className="ask-prompt" key={prompt} onClick={() => ask(prompt)} type="button">
              {prompt}
            </button>
          ))}
        </div>
      </section>

      {answer ? (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="ask-panel rounded-lg">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-leaf/10 text-leaf">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="text-xs font-black uppercase text-muted">{answer.intent}</p>
                <h2 className="mt-1 text-3xl font-black leading-tight text-ink">{answer.answer}</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {answer.actions.map((action) => (
                <div className="ask-action" key={action}>
                  <ShieldCheck size={16} />
                  {action}
                </div>
              ))}
            </div>
          </div>

          <div className="ask-panel rounded-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-muted">Matches</p>
                <h2 className="text-3xl font-black text-ink">{answer.cards.length} results</h2>
              </div>
              <Search className="text-leaf" size={22} />
            </div>
            <div className="mt-5 grid gap-3">
              {answer.cards.map((card) => (
                <Link className="ask-result" to={card.href} key={`${card.href}-${card.meta}`}>
                  <span className="ask-result-media">
                    {card.imageUrl ? <img src={card.imageUrl} alt="" /> : <Bot size={20} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-black text-ink">{card.title}</span>
                    <span className="block truncate text-sm font-semibold text-muted">{card.subtitle}</span>
                  </span>
                  <span className="ask-result-meta">{card.meta}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
