import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Bell, Box, FileText, ListChecks, Search as SearchIcon } from "lucide-react";
import { api } from "../lib/api";
import type { SearchPayload, SearchResult } from "../lib/types";

const icons = {
  ITEM: Box,
  LOOP: ListChecks,
  DOCUMENT: FileText,
  REMINDER: Bell
};

export function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [payload, setPayload] = useState<SearchPayload>({ query: "", results: [] });

  useEffect(() => {
    const q = params.get("q") ?? "";
    setQuery(q);
    if (!q.trim()) {
      setPayload({ query: "", results: [] });
      return;
    }
    api<SearchPayload>(`/api/search?q=${encodeURIComponent(q)}`).then(setPayload).catch(console.error);
  }, [params]);

  function submit(event: FormEvent) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
      <form onSubmit={submit} className="rounded-[1.75rem] bg-white p-4 shadow-soft md:p-5">
        <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-paper px-4">
          <SearchIcon size={21} className="text-ink/45" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-lg font-black outline-none placeholder:text-ink/28"
            placeholder="Wonach suchst du?"
            autoFocus
          />
        </label>
      </form>

      <div className="mt-6">
        <h1 className="text-3xl font-black">Suche</h1>
        <p className="mt-2 text-sm font-bold text-ink/52">
          {payload.results.length ? `${payload.results.length} Treffer fuer "${payload.query}"` : "Dinge, Loops, Dokumente und Erinnerungen an einem Ort."}
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {payload.results.map((result) => (
          <ResultRow key={`${result.type}-${result.id}`} result={result} />
        ))}
        {query && !payload.results.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-line bg-white p-8 text-center">
            <p className="text-lg font-black">Nichts gefunden</p>
            <p className="mt-2 text-sm font-bold text-ink/50">Probier einen anderen Namen, Kontakt oder Garantie-Hinweis.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: SearchResult }) {
  const Icon = icons[result.type];
  return (
    <Link to={result.route} className="flex items-center gap-4 rounded-[1.4rem] bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint text-moss">
        <Icon size={21} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-black">{result.title}</span>
        <span className="mt-1 block truncate text-sm font-bold text-ink/50">{result.subtitle}</span>
      </span>
      <span className="hidden rounded-full bg-paper px-3 py-1 text-xs font-black text-ink/48 sm:block">{result.type}</span>
    </Link>
  );
}
