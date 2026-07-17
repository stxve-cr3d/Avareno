import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Bell, Box, FileText, ListChecks, Search as SearchIcon } from "lucide-react";
import { api } from "../lib/api";
import type { SearchPayload, SearchResult } from "../lib/types";

const icons = {
  ITEM: Box,
  LOOP: ListChecks,
  DOCUMENT: FileText,
  REMINDER: Bell
} as const;

const typeLabels: Record<SearchResult["type"], string> = {
  ITEM: "Produkt",
  LOOP: "Erinnerung",
  DOCUMENT: "Dokument",
  REMINDER: "Erinnerung"
};

type SearchStatus = "idle" | "loading" | "ready" | "error";

export function Search() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const inApp = location.pathname.startsWith("/app");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [payload, setPayload] = useState<SearchPayload>({ query: "", results: [] });
  const [status, setStatus] = useState<SearchStatus>("idle");

  // Keep the input in sync with external navigation (deep links, back/forward)
  // without clobbering what the user is actively typing.
  useEffect(() => {
    const q = params.get("q") ?? "";
    setQuery((prev) => (prev.trim() === q ? prev : q));
  }, [params]);

  // Live typeahead: debounce the query, fetch results, and mirror it into the URL
  // (replace, so we don't spam history) for shareable / deep-linkable search.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setPayload({ query: "", results: [] });
      setStatus("idle");
      if (params.get("q")) setParams({}, { replace: true });
      return;
    }
    setStatus("loading");
    let active = true;
    const handle = window.setTimeout(() => {
      api<SearchPayload>(`/api/search?q=${encodeURIComponent(q)}`)
        .then((data) => {
          if (!active) return;
          setPayload(data);
          setStatus("ready");
        })
        .catch(() => {
          if (active) setStatus("error");
        });
      if (params.get("q") !== q) setParams({ q }, { replace: true });
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Results update live as you type; Enter just keeps focus / prevents reload.
  function submit(event: FormEvent) {
    event.preventDefault();
  }

  // Backend returns legacy routes (/items/:id, /loops/:id); keep the user in the app shell.
  const toAppRoute = (route: string) => (inApp && !route.startsWith("/app") ? `/app${route}` : route);

  return (
    <main className="av-console av-search-page">
      <section className="av-console-top">
        <div className="av-dashboard-header">
          <span className="av-console-kicker">Suche</span>
          <div className="av-dashboard-title-row">
            <div>
              <h1>Alles finden</h1>
              <p>Produkte, Dokumente und Erinnerungen an einem Ort.</p>
            </div>
          </div>
          <form className="av-search" onSubmit={submit}>
            <SearchIcon size={16} />
            <input
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Wonach suchst du? Name, Hersteller, Seriennummer, Raum…"
              type="search"
              value={query}
            />
          </form>
        </div>
      </section>

      <article className="av-console-section">
        <div className="av-console-section-head">
          <div>
            <span>Ergebnisse</span>
            <h2>
              {status === "ready" && payload.results.length
                ? `${payload.results.length} Treffer für „${payload.query}“`
                : "Deine Produktsuche"}
            </h2>
          </div>
        </div>

        {status === "loading" ? (
          <div className="av-empty">
            <p className="av-empty-title">Wird gesucht…</p>
          </div>
        ) : status === "error" ? (
          <div className="av-empty">
            <p className="av-empty-title">Suche gerade nicht erreichbar</p>
            <div className="av-empty-body">Versuch es gleich noch einmal.</div>
          </div>
        ) : payload.results.length ? (
          <div className="av-search-results">
            {payload.results.map((result) => (
              <ResultRow key={`${result.type}-${result.id}`} result={result} to={toAppRoute(result.route)} />
            ))}
          </div>
        ) : query.trim() ? (
          <div className="av-empty">
            <p className="av-empty-title">Nichts gefunden</p>
            <div className="av-empty-body">Probier einen anderen Namen, Kontakt oder Garantie-Hinweis.</div>
          </div>
        ) : (
          <div className="av-empty">
            <p className="av-empty-title">Tippe, um zu suchen</p>
            <div className="av-empty-body">Avareno durchsucht deine Produkte, Belege, Dokumente und Erinnerungen.</div>
          </div>
        )}
      </article>
    </main>
  );
}

function ResultRow({ result, to }: { result: SearchResult; to: string }) {
  const Icon = icons[result.type];
  return (
    <Link className="av-search-row" to={to}>
      <span className="av-search-row-icon">
        <Icon size={18} />
      </span>
      <span className="av-search-row-copy">
        <strong>{result.title}</strong>
        <small>{result.subtitle}</small>
      </span>
      <span className="av-search-row-type">{typeLabels[result.type]}</span>
    </Link>
  );
}
