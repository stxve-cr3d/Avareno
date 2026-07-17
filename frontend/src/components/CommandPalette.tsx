import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BellRing,
  Box,
  FileText,
  FolderLock,
  Home,
  LifeBuoy,
  ListChecks,
  Package,
  Plus,
  Router,
  ScanLine,
  Search as SearchIcon,
  UserRound
} from "lucide-react";
import { api } from "../lib/api";
import { betaFeatures } from "../lib/betaFeatures";
import type { SearchPayload, SearchResult } from "../lib/types";

const resultIcons = {
  ITEM: Box,
  LOOP: ListChecks,
  DOCUMENT: FileText,
  REMINDER: Bell
} as const;

const resultTypeLabels: Record<SearchResult["type"], string> = {
  ITEM: "Produkt",
  LOOP: "Erinnerung",
  DOCUMENT: "Dokument",
  REMINDER: "Erinnerung"
};

type Command = { label: string; hint: string; icon: ReactNode; to: string; keywords: string };

const NAV_COMMANDS: Command[] = [
  { label: "Übersicht", hint: "Start", icon: <Home size={16} />, to: "/app", keywords: "home start dashboard uebersicht" },
  { label: "Meine Produkte", hint: "Alle gespeicherten Produkte", icon: <Package size={16} />, to: "/app/dinge", keywords: "items produkte objekte geraete" },
  { label: "Erinnerungen", hint: "Garantien & Fristen", icon: <BellRing size={16} />, to: "/app/care", keywords: "reminders garantie fristen care" },
  { label: "Dokumente", hint: "Belege & Nachweise", icon: <FileText size={16} />, to: "/app/reports/home-binder", keywords: "documents belege nachweise rechnungen" },
  // Disabled for the focused Avareno beta. Kept for a later product phase.
  ...(betaFeatures.resolve
    ? [{ label: "Resolve", hint: "Offene Anfragen", icon: <LifeBuoy size={16} />, to: "/app/resolve", keywords: "support tickets hilfe" }]
    : []),
  ...(betaFeatures.smartHome
    ? [{ label: "Verbunden", hint: "Geräte & Quellen", icon: <Router size={16} />, to: "/app/smart-home", keywords: "smart home geraete quellen" }]
    : []),
  ...(betaFeatures.vault
    ? [{ label: "Private Vault", hint: "Sensible Dokumente mit PIN", icon: <FolderLock size={16} />, to: "/app/vault", keywords: "vault tresor pin sensibel dokumente" }]
    : []),
  { label: "Konto", hint: "Profil & Datenschutz", icon: <UserRound size={16} />, to: "/app/ich", keywords: "profil privacy konto einstellungen" }
];

const ACTION_COMMANDS: Command[] = [
  { label: "Produkt hinzufügen", hint: "Neues Produkt oder Gerät", icon: <Plus size={16} />, to: "/app/capture/item", keywords: "add product neu erfassen" },
  { label: "Beleg hochladen", hint: "Rechnung speichern", icon: <ScanLine size={16} />, to: "/app/capture/receipt", keywords: "receipt beleg rechnung" },
  { label: "Erinnerung anlegen", hint: "Frist oder Rückgabe", icon: <BellRing size={16} />, to: "/app/capture/loop", keywords: "reminder erinnerung care" }
];

type Row = { group: string; icon: ReactNode; title: string; sub: string; run: () => void };
type Status = "idle" | "loading" | "ready" | "error";

/* Global command palette (Cmd/Ctrl+K): jump to any section, run quick actions,
   and live-search objects — from anywhere in /app. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rowsRef = useRef<Row[]>([]);
  const activeRef = useRef(0);
  activeRef.current = active;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setStatus("idle");
    setActive(0);
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query, results.length]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    let alive = true;
    const handle = window.setTimeout(() => {
      api<SearchPayload>(`/api/search?q=${encodeURIComponent(q)}`)
        .then((data) => {
          if (!alive) return;
          setResults(data.results);
          setStatus("ready");
        })
        .catch(() => {
          if (alive) setStatus("error");
        });
    }, 200);
    return () => {
      alive = false;
      window.clearTimeout(handle);
    };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      const rows = rowsRef.current;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((index) => (rows.length ? Math.min(index + 1, rows.length - 1) : 0));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((index) => Math.max(index - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        rows[activeRef.current]?.run();
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  function goTo(to: string) {
    onClose();
    navigate(to.startsWith("/app") ? to : `/app${to}`);
  }

  const q = query.trim().toLowerCase();
  const matches = (command: Command) =>
    !q || command.label.toLowerCase().includes(q) || command.keywords.includes(q);

  const rows: Row[] = [
    ...NAV_COMMANDS.filter(matches).map((command) => ({
      group: "Springe zu",
      icon: command.icon,
      title: command.label,
      sub: command.hint,
      run: () => goTo(command.to)
    })),
    ...ACTION_COMMANDS.filter(matches).map((command) => ({
      group: "Aktionen",
      icon: command.icon,
      title: command.label,
      sub: command.hint,
      run: () => goTo(command.to)
    })),
    ...results.map((result) => {
      const Icon = resultIcons[result.type];
      return {
        group: "Ergebnisse",
        icon: <Icon size={16} />,
        title: result.title,
        sub: result.subtitle,
        run: () => goTo(result.route)
      };
    })
  ];
  rowsRef.current = rows;

  let lastGroup = "";

  return (
    <div className="av-cmdk-overlay" onMouseDown={onClose}>
      <div className="av-cmdk" role="dialog" aria-modal="true" aria-label="Befehle und Suche" onMouseDown={(event) => event.stopPropagation()}>
        <div className="av-cmdk-input">
          <SearchIcon size={17} />
          <input
            ref={inputRef}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Springe zu, Aktion oder suche Produkte, Belege, Dokumente…"
            type="text"
            value={query}
            aria-label="Befehl oder Suchbegriff"
          />
          <kbd>Esc</kbd>
        </div>

        <div className="av-cmdk-body">
          {rows.length ? (
            <ul className="av-cmdk-list" role="listbox">
              {rows.map((row, index) => {
                const showGroup = row.group !== lastGroup;
                lastGroup = row.group;
                return (
                  <li key={`${row.group}-${row.title}-${index}`} role="option" aria-selected={index === active}>
                    {showGroup ? <p className="av-cmdk-group">{row.group}</p> : null}
                    <button
                      className={index === active ? "av-cmdk-item is-active" : "av-cmdk-item"}
                      onClick={row.run}
                      onMouseEnter={() => setActive(index)}
                      type="button"
                    >
                      <span className="av-cmdk-item-icon">{row.icon}</span>
                      <span className="av-cmdk-item-copy">
                        <strong>{row.title}</strong>
                        <small>{row.sub}</small>
                      </span>
                      {row.group === "Ergebnisse" ? (
                        <span className="av-cmdk-item-type">{resultTypeLabelFor(row.title, results)}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : status === "loading" ? (
            <p className="av-cmdk-hint">Wird gesucht…</p>
          ) : status === "error" ? (
            <p className="av-cmdk-hint">Suche gerade nicht erreichbar.</p>
          ) : (
            <p className="av-cmdk-hint">Nichts gefunden für „{query.trim()}".</p>
          )}
        </div>

        <div className="av-cmdk-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigieren
          </span>
          <span>
            <kbd>↵</kbd> öffnen
          </span>
          {query.trim() ? (
            <button
              className="av-cmdk-all"
              onClick={() => {
                onClose();
                navigate(`/app/search?q=${encodeURIComponent(query.trim())}`);
              }}
              type="button"
            >
              Alle Ergebnisse <ArrowRight size={13} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function resultTypeLabelFor(title: string, results: SearchResult[]) {
  const match = results.find((result) => result.title === title);
  return match ? resultTypeLabels[match.type] : "";
}
