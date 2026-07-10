import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { missingFieldLabel } from "../lib/uiText";
import type { Item } from "../lib/types";
import { AttentionRow, ConsoleSkeleton, StatusSummaryCard } from "../components/app/AppKit";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  LifeBuoy,
  LockKeyhole,
  MessageSquareText,
  PackageCheck,
  Radar,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Wrench
} from "lucide-react";
import {
  getHelper,
  getProduct,
  resolveMetrics,
  resolveProducts,
  resolveTickets as seedTickets,
  ticketModeLabel
} from "../lib/resolveData";
import type { HelperProfile, ResolveTicket, ResolveTicketMode, ResolveTicketStatus, SolutionProposal } from "../lib/resolveData";

const filterOptions: { id: "ALL" | ResolveTicketMode; label: string }[] = [
  { id: "ALL", label: "Alle" },
  { id: "OWN", label: "Meine Tickets" },
  { id: "HELP", label: "Kann helfen" },
  { id: "SOLVED", label: "Gelöst" }
];

const createSteps = [
  "Produkt",
  "Problem",
  "Kontext",
  "Zusammenfassung",
  "Freigeben"
];

const statusLabels: Record<ResolveTicketStatus, string> = {
  OPEN: "offen",
  MATCHING: "passt",
  ANSWERED: "beantwortet",
  SOLVED: "gelöst"
};

const priorityLabels: Record<ResolveTicket["priority"], string> = {
  LOW: "ruhig",
  MEDIUM: "normal",
  HIGH: "wichtig",
  URGENT: "dringend"
};

const riskLabels: Record<SolutionProposal["risk"], string> = {
  LOW: "gering",
  MEDIUM: "mittel",
  HIGH: "hoch"
};

const ownershipLabels: Record<"VERIFIED" | "IMPORTED" | "MANUAL", string> = {
  VERIFIED: "bestätigt",
  IMPORTED: "importiert",
  MANUAL: "manuell"
};

export function Resolve() {
  const { ticketId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<ResolveTicket[]>(seedTickets);
  const [filter, setFilter] = useState<"ALL" | ResolveTicketMode>("ALL");
  const [query, setQuery] = useState("");
  const [createStep, setCreateStep] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState(resolveProducts[1].id);
  const [problemDraft, setProblemDraft] = useState("OLED TV verliert das HDMI-Signal beim Wechsel in HDR-Spiele");
  const [contextDraft, setContextDraft] = useState("Firmware 1622.5, HDMI 2.1 Port 4, Konsole direkt an der One Connect Box");
  const [published, setPublished] = useState(false);

  const isCreate = location.pathname.endsWith("/create");
  const isTicketList = location.pathname.endsWith("/tickets");
  const isTicketDetail = Boolean(ticketId);
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const product = getProduct(ticket.productId);
      const matchesFilter = filter === "ALL" || ticket.mode === filter || (filter === "SOLVED" && ticket.status === "SOLVED");
      const haystack = `${product.name} ${product.model} ${product.category} ${ticket.problemTitle} ${ticket.summary}`.toLowerCase();
      return matchesFilter && haystack.includes(query.toLowerCase());
    });
  }, [filter, query, tickets]);
  const selectedTicket = useMemo(() => {
    if (ticketId) return tickets.find((ticket) => ticket.id === ticketId) ?? tickets[0];
    return filteredTickets[0] ?? tickets[0];
  }, [filteredTickets, ticketId, tickets]);

  function acceptSolution(ticket: ResolveTicket, proposal: SolutionProposal) {
    setTickets((current) =>
      current.map((entry) =>
        entry.id === ticket.id
          ? {
              ...entry,
              status: "SOLVED",
              mode: "SOLVED",
              solutions: entry.solutions.map((solution) => ({ ...solution, accepted: solution.id === proposal.id ? true : solution.accepted }))
            }
          : entry
      )
    );
  }

  function markSolutionHelpful(ticket: ResolveTicket, proposal: SolutionProposal) {
    setTickets((current) =>
      current.map((entry) =>
        entry.id === ticket.id
          ? {
              ...entry,
              status: entry.status === "OPEN" ? "ANSWERED" : entry.status,
              solutions: entry.solutions.map((solution) =>
                solution.id === proposal.id ? { ...solution, helpedCount: solution.helpedCount + 1 } : solution
              )
            }
          : entry
      )
    );
  }

  if (isCreate) {
    return (
      <ResolveShell
        title="Ein Problem sauber erfassen."
        subtitle="Du beschreibst das Problem in wenigen Schritten. Avareno zeigt es nur passenden Helfern."
      >
        <CreateTicketFlow
          contextDraft={contextDraft}
          createStep={createStep}
          problemDraft={problemDraft}
          published={published}
          selectedProductId={selectedProductId}
          setContextDraft={setContextDraft}
          setCreateStep={setCreateStep}
          setProblemDraft={setProblemDraft}
          setPublished={setPublished}
          setSelectedProductId={setSelectedProductId}
        />
      </ResolveShell>
    );
  }

  if (isTicketDetail) {
    return (
      <ResolveShell
        title="Ticket ansehen"
        subtitle="Produktkontext, Erfahrungstreffer und Lösungsvorschläge liegen hier, nicht auf dem Dashboard."
      >
        <div className="resolve-page-actions">
          <Link className="resolve-secondary-action" to="/app/resolve/tickets">
            <ArrowRight className="rotate-180" size={16} />
            Zurück zur Liste
          </Link>
        </div>
        <TicketDetailPanel onAcceptSolution={acceptSolution} onMarkHelpful={markSolutionHelpful} ticket={selectedTicket} />
      </ResolveShell>
    );
  }

  if (isTicketList) {
    return (
      <ResolveShell
        title="Erst wählen, dann lesen."
        subtitle="Die Liste zeigt nur genug Kontext für die Entscheidung. Details öffnen sich erst nach einem Klick."
      >
        <section className="resolve-list-page">
          <div className="resolve-ticket-column">
            <TicketToolbar filter={filter} query={query} setFilter={setFilter} setQuery={setQuery} />
            {filteredTickets.length ? (
              <div className="resolve-ticket-list">
                {filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    onClick={() => navigate(`/app/resolve/tickets/${ticket.id}`)}
                    ticket={ticket}
                  />
                ))}
              </div>
            ) : (
              <ResolveEmptyState title="Keine passenden Tickets" body="Resolve blendet Anfragen aus, bis Produkt und Erfahrung wirklich zusammenpassen." />
            )}
          </div>
        </section>
      </ResolveShell>
    );
  }

  return (
    <ResolveShell
      title="Offene Punkte"
      subtitle="Alles, was Aufmerksamkeit braucht: Garantie, Beleg, Service, Verbindung oder ein ungelöstes Produktproblem."
    >
      <OpenLoopsHome />
    </ResolveShell>
  );
}

/* ── Open-loops center: derived from real object data (/api/items).
     Same signals the dashboard uses, grouped and complete. ── */

type OpenLoop = {
  key: string;
  group: "URGENT" | "DOCUMENTS" | "MISSING" | "CARE";
  tone: "warranty" | "invoice" | "care";
  icon: ReactNode;
  label: string;
  title: string;
  detail: string;
  signal: string;
  action: string;
  to: string;
  progress: number;
  sortValue: number;
};

const loopGroups: { id: OpenLoop["group"]; title: string; kicker: string; emptyText: string }[] = [
  { id: "URGENT", title: "Garantie & Fristen", kicker: "Dringend", emptyText: "Keine Garantie-Risiken brauchen gerade Aufmerksamkeit." },
  { id: "DOCUMENTS", title: "Belege & Dokumente", kicker: "Nachweise", emptyText: "Jedes Objekt hat einen Nachweis. Fehlende Belege erscheinen hier." },
  { id: "MISSING", title: "Fehlende Informationen", kicker: "Objektprofil", emptyText: "Alle Objektprofile sind vollständig genug." },
  { id: "CARE", title: "Service & offene Punkte", kicker: "Care", emptyText: "Keine offenen Service- oder Reparaturpunkte." }
];

function warrantyDaysLeft(item: Item): number | null {
  if (!item.warrantyUntil) return null;
  return Math.ceil((new Date(item.warrantyUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function buildOpenLoops(items: Item[]): OpenLoop[] {
  const loops: OpenLoop[] = [];

  for (const item of items) {
    const to = `/app/dinge/${item.id}`;
    const progress = item.completenessScore ?? 0;
    const days = warrantyDaysLeft(item);

    if (days !== null && days < 0) {
      loops.push({
        key: `${item.id}-warranty-expired`, group: "URGENT", tone: "warranty", icon: <ShieldCheck size={16} />,
        label: "Garantie abgelaufen", title: item.name,
        detail: "Die Garantie ist abgelaufen — prüfe, ob Service oder Ersatz nötig ist.",
        signal: "Abgelaufen", action: "Objekt öffnen", to, progress, sortValue: days
      });
    } else if (days !== null && days < 60) {
      loops.push({
        key: `${item.id}-warranty-soon`, group: "URGENT", tone: "warranty", icon: <ShieldCheck size={16} />,
        label: "Garantie endet bald", title: item.name,
        detail: `Garantie läuft in ${days} Tagen ab — jetzt ist der beste Zeitpunkt für Prüfung oder Reklamation.`,
        signal: `${days} Tage`, action: "Objekt öffnen", to, progress, sortValue: days
      });
    }

    if ((item.documents?.length ?? 0) === 0) {
      loops.push({
        key: `${item.id}-receipt`, group: "DOCUMENTS", tone: "invoice", icon: <FileText size={16} />,
        label: "Beleg fehlt", title: item.name,
        detail: "Ohne Kaufnachweis wird Garantie oder Rückgabe später schwierig.",
        signal: "Kein Nachweis", action: "Beleg hinzufügen", to, progress, sortValue: progress
      });
    }

    const missing = (item.missingFields ?? []).filter((field) => field !== "receipt");
    if (missing.length) {
      loops.push({
        key: `${item.id}-missing`, group: "MISSING", tone: "care", icon: <PackageCheck size={16} />,
        label: "Profil unvollständig", title: item.name,
        detail: `Fehlt noch: ${missing.map(missingFieldLabel).join(", ")}`,
        signal: `${missing.length} ${missing.length === 1 ? "Feld" : "Felder"}`, action: "Ergänzen", to, progress, sortValue: -missing.length
      });
    }

    const openLoops = (item.loops ?? []).filter((loop) => loop.status === "OPEN");
    const openRepairs = (item.repairLogs ?? []).filter((repair) => repair.status !== "RESOLVED");
    if (openLoops.length + openRepairs.length > 0) {
      const count = openLoops.length + openRepairs.length;
      loops.push({
        key: `${item.id}-care`, group: "CARE", tone: "care", icon: <Wrench size={16} />,
        label: openRepairs.length ? "Reparatur offen" : "Offener Punkt", title: item.name,
        detail: openLoops[0]?.title ?? openRepairs[0]?.problem ?? "Offener Care-Punkt",
        signal: count === 1 ? "1 offen" : `${count} offen`, action: "Ansehen", to, progress, sortValue: -count
      });
    }
  }

  return loops;
}

function OpenLoopsHome() {
  const [items, setItems] = useState<Item[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  async function load() {
    setLoadState("loading");
    try {
      setItems(await api<Item[]>("/api/items"));
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const loops = useMemo(() => buildOpenLoops(items), [items]);

  if (loadState === "loading") return <ConsoleSkeleton label="Offene Punkte werden geprüft…" />;
  if (loadState === "error") {
    return (
      <ResolveEmptyState title="Offene Punkte konnten nicht geladen werden" body="Die Verbindung ist gerade nicht erreichbar. Deine Daten sind sicher — versuch es gleich noch einmal.">
        <button className="resolve-secondary-action" onClick={() => void load()} type="button">Erneut versuchen</button>
      </ResolveEmptyState>
    );
  }

  const urgentCount = loops.filter((loop) => loop.group === "URGENT").length;
  const documentCount = loops.filter((loop) => loop.group === "DOCUMENTS").length;
  const infoCount = loops.filter((loop) => loop.group === "MISSING").length;

  return (
    <div className="space-y-5">
      <div className="av-status-grid av-status-grid-4" aria-label="Zusammenfassung offener Punkte">
        <StatusSummaryCard label="Offene Punkte" value={loops.length} tone={loops.length > 0 ? "warning" : "success"} />
        <StatusSummaryCard label="Dringend" value={urgentCount} tone={urgentCount > 0 ? "warning" : "neutral"} />
        <StatusSummaryCard label="Belege" value={documentCount} />
        <StatusSummaryCard label="Fehlende Infos" value={infoCount} />
      </div>

      {loops.length === 0 ? (
        <ResolveEmptyState title="Alles erledigt." body="Nichts braucht gerade Aufmerksamkeit. Wenn ein Beleg fehlt, eine Garantie abläuft oder ein Punkt offen ist, erscheint es hier." />
      ) : (
        loopGroups.map((group) => {
          const entries = loops.filter((loop) => loop.group === group.id).sort((a, b) => a.sortValue - b.sortValue);
          return (
            <section className="av-console-section" key={group.id}>
              <div className="av-console-section-head">
                <div>
                  <span>{group.kicker}</span>
                  <h2>{group.title}</h2>
                </div>
              </div>
              {entries.length ? (
                <div className="av-attention-list">
                  {entries.map((loop, index) => (
                    <AttentionRow
                      key={loop.key}
                      to={loop.to}
                      tone={loop.tone}
                      icon={loop.icon}
                      label={loop.label}
                      title={loop.title}
                      detail={loop.detail}
                      signal={loop.signal}
                      action={loop.action}
                      progress={loop.progress}
                      primary={group.id === "URGENT" && index === 0}
                    />
                  ))}
                </div>
              ) : (
                <div className="av-empty">
                  <div className="av-empty-body">{group.emptyText}</div>
                </div>
              )}
            </section>
          );
        })
      )}

      <HomeChoice
        label="Resolve Tickets · Vorschau"
        body="Produktprobleme gemeinsam mit passenden Besitzern lösen — Demo-Bereich, noch nicht mit echten Nutzern verbunden."
        to="/app/resolve/tickets"
        value="Ansehen"
      />
    </div>
  );
}

function HomeChoice({ body, label, to, value }: { body: string; label: string; to: string; value: string }) {
  return (
    <Link className="resolve-home-choice" to={to}>
      <strong>{label}</strong>
      <p>{body}</p>
      <em>{value}</em>
    </Link>
  );
}

function ResolveShell({ children, subtitle, title }: { children: ReactNode; subtitle: string; title: string }) {
  return (
    <div className="resolve-page">
      <header className="resolve-hero is-simple">
        <div>
          <h1>{title}</h1>
          <span>{subtitle}</span>
        </div>
      </header>
      {children}
    </div>
  );
}

function TicketToolbar({
  filter,
  query,
  setFilter,
  setQuery
}: {
  filter: "ALL" | ResolveTicketMode;
  query: string;
  setFilter: (value: "ALL" | ResolveTicketMode) => void;
  setQuery: (value: string) => void;
}) {
  return (
    <div className="resolve-ticket-toolbar">
      <div className="resolve-search">
        <Search size={16} />
        <input onChange={(event) => setQuery(event.target.value)} placeholder="Produkt, Modell oder Problem suchen" value={query} />
      </div>
      <div className="resolve-filter no-scrollbar">
        <SlidersHorizontal size={15} />
        {filterOptions.map((option) => (
          <button className={filter === option.id ? "is-active" : ""} key={option.id} onClick={() => setFilter(option.id)} type="button">
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TicketCard({ onClick, ticket }: { onClick: () => void; ticket: ResolveTicket }) {
  const product = getProduct(ticket.productId);
  return (
    <button className="resolve-ticket-card" onClick={onClick} type="button">
      <div className="resolve-ticket-topline">
        <span>{product.name}</span>
        <span className="resolve-card-status">
          <PriorityPill priority={ticket.priority} />
          <StatusPill status={ticket.status} />
        </span>
      </div>
      <h3>{ticket.problemTitle}</h3>
      <div className="resolve-product-line">
        <PackageCheck size={15} />
        <span>{product.model}</span>
        <small>{product.category}</small>
      </div>
      <div className="resolve-ticket-meta">
        <MatchScore value={ticket.matchScore} compact />
        <span>{ticket.permissionReason}</span>
      </div>
      <div className="resolve-ticket-footer">
        <small>
          <Clock3 size={14} />
          {ticket.createdAgo}
        </small>
        <span>Details ansehen</span>
      </div>
    </button>
  );
}

function TicketDetailPanel({
  onAcceptSolution,
  onMarkHelpful,
  ticket
}: {
  onAcceptSolution: (ticket: ResolveTicket, proposal: SolutionProposal) => void;
  onMarkHelpful: (ticket: ResolveTicket, proposal: SolutionProposal) => void;
  ticket: ResolveTicket;
}) {
  const product = getProduct(ticket.productId);
  const helpers = ticket.helperIds.map(getHelper);
  return (
    <article className="resolve-detail-panel">
      <div className="resolve-detail-head">
        <div>
          <span>{ticketModeLabel(ticket.mode)}</span>
          <h2>{ticket.problemTitle}</h2>
          <p>{ticket.description}</p>
        </div>
        <MatchScore value={ticket.matchScore} />
      </div>

      <div className="resolve-context-grid">
        <ContextBlock icon={<PackageCheck size={17} />} label="Produkt" value={`${product.name} / ${product.model}`} />
        <ContextBlock icon={<FileText size={17} />} label="Kategorie" value={product.category} />
        <ContextBlock icon={<ShieldCheck size={17} />} label="Firmware" value={ticket.firmware ?? product.firmware ?? "Unbekannt"} />
        <ContextBlock icon={<Wrench size={17} />} label="Zubehör" value={ticket.accessories.join(", ") || "Keins"} />
      </div>

      <section className="resolve-detail-section">
        <SectionHeading icon={<Sparkles size={17} />} title="KI-Zusammenfassung" />
        <p className="resolve-ai-summary">{ticket.aiSummary}</p>
      </section>

      <section className="resolve-detail-section">
        <SectionHeading icon={<LockKeyhole size={17} />} title="Warum du dieses Ticket beantworten kannst" />
        <div className="resolve-factor-list">
          {ticket.matchFactors.map((factor) => (
            <MatchFactorRow factor={factor} key={factor.label} />
          ))}
        </div>
      </section>

      <section className="resolve-detail-section">
        <SectionHeading icon={<UserCheck size={17} />} title="Passende Helfer" />
        <div className="resolve-helper-grid">
          {helpers.map((helper) => (
            <HelperCard helper={helper} key={helper.id} />
          ))}
        </div>
      </section>

      <section className="resolve-detail-section">
        <SectionHeading icon={<MessageSquareText size={17} />} title="Lösungsvorschläge" />
        <div className="resolve-solution-list">
          {ticket.solutions.map((proposal) => (
            <SolutionProposalCard
              helper={getHelper(proposal.helperId)}
              key={proposal.id}
              onAccept={() => onAcceptSolution(ticket, proposal)}
              onHelpful={() => onMarkHelpful(ticket, proposal)}
              proposal={proposal}
              ticketSolved={ticket.status === "SOLVED"}
            />
          ))}
        </div>
      </section>
    </article>
  );
}

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="resolve-section-heading">
      <span>{icon}</span>
      <h3>{title}</h3>
    </div>
  );
}

function ContextBlock({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="resolve-context-block">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function MatchFactorRow({ factor }: { factor: { label: string; score: number; detail: string } }) {
  return (
    <div className="resolve-factor-row">
      <span>+{factor.score}</span>
      <div>
        <strong>{factor.label}</strong>
        <small>{factor.detail}</small>
      </div>
      <div className="resolve-factor-bar" aria-hidden="true">
        <i style={{ width: `${Math.min(100, Math.max(0, factor.score * 2))}%` }} />
      </div>
    </div>
  );
}

function HelperCard({ helper }: { helper: HelperProfile }) {
  return (
    <article className="resolve-helper-card">
      <div className="resolve-helper-head">
        <span>{helper.initials}</span>
        <div>
          <strong>{helper.name}</strong>
          <small>{helper.verifiedOwnership ? "Besitz bestätigt" : "Profil importiert"}</small>
        </div>
        <BadgeCheck size={17} />
      </div>
      <div className="resolve-helper-stats">
        <span>
          <strong>{helper.productsOwned}</strong>
          Objekte
        </span>
        <span>
          <strong>{helper.solvedTickets}</strong>
          gelöst
        </span>
        <span>
          <strong>{helper.reliabilityScore}%</strong>
          verlässlich
        </span>
      </div>
      <div className="resolve-tags">
        {helper.tags.map((tag) => (
          <small key={tag}>{tag}</small>
        ))}
      </div>
    </article>
  );
}

function SolutionProposalCard({
  helper,
  onAccept,
  onHelpful,
  proposal,
  ticketSolved
}: {
  helper: HelperProfile;
  onAccept: () => void;
  onHelpful: () => void;
  proposal: SolutionProposal;
  ticketSolved: boolean;
}) {
  const [helped, setHelped] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [questionDraft, setQuestionDraft] = useState("");
  const [questionSent, setQuestionSent] = useState("");

  function handleHelpful() {
    if (helped) return;
    setHelped(true);
    onHelpful();
  }

  function sendQuestion() {
    if (!questionDraft.trim()) return;
    setQuestionSent(questionDraft.trim());
    setQuestionDraft("");
    setQuestionOpen(false);
  }

  return (
    <article className={proposal.accepted ? "resolve-solution-card is-accepted" : "resolve-solution-card"}>
      <div className="resolve-solution-head">
        <div>
          <small>Vorschlag von {helper.name}</small>
          <h4>{proposal.title}</h4>
        </div>
        {proposal.accepted ? <span className="resolve-accepted"><CheckCircle2 size={15} /> Akzeptiert</span> : null}
      </div>
      <p>{proposal.explanation}</p>
      <div className="resolve-solution-meta">
        <span>Risiko: {riskLabels[proposal.risk]}</span>
        <span>{proposal.timeEstimate}</span>
        <span>{proposal.helpedCount} geholfen</span>
      </div>
      <div className="resolve-tool-row">
        {proposal.tools.map((tool) => (
          <small key={tool}>{tool}</small>
        ))}
      </div>
      <div className="resolve-solution-actions">
        <button className={helped ? "is-confirmed" : ""} disabled={helped} onClick={handleHelpful} type="button">
          {helped ? "Markiert" : "Hat geholfen"}
        </button>
        <button onClick={() => setQuestionOpen((open) => !open)} type="button">
          {questionOpen ? "Schließen" : "Nachfrage"}
        </button>
        <button disabled={proposal.accepted || ticketSolved} onClick={onAccept} type="button">
          Lösung annehmen
        </button>
      </div>
      {questionOpen ? (
        <div className="resolve-question-box">
          <label>
            Nachfrage an {helper.name}
            <textarea onChange={(event) => setQuestionDraft(event.target.value)} placeholder="Was ist noch unklar?" value={questionDraft} />
          </label>
          <button disabled={!questionDraft.trim()} onClick={sendQuestion} type="button">
            Frage speichern
          </button>
        </div>
      ) : null}
      {questionSent ? <p className="resolve-feedback-note">Nachfrage gespeichert: {questionSent}</p> : null}
    </article>
  );
}

function CreateTicketFlow({
  contextDraft,
  createStep,
  problemDraft,
  published,
  selectedProductId,
  setContextDraft,
  setCreateStep,
  setProblemDraft,
  setPublished,
  setSelectedProductId
}: {
  contextDraft: string;
  createStep: number;
  problemDraft: string;
  published: boolean;
  selectedProductId: string;
  setContextDraft: (value: string) => void;
  setCreateStep: (value: number) => void;
  setProblemDraft: (value: string) => void;
  setPublished: (value: boolean) => void;
  setSelectedProductId: (value: string) => void;
}) {
  const product = getProduct(selectedProductId);
  const matchPreview = [
    { label: "Besitzer gleicher Produkte", value: 18 },
    { label: "Passende Modell-Helfer", value: 7 },
    { label: "Ähnlich gelöst", value: 4 }
  ];

  return (
    <section className="resolve-create-flow">
      <div className="resolve-stepper">
        {createSteps.map((step, index) => (
          <button className={index === createStep ? "is-active" : index < createStep ? "is-done" : ""} key={step} onClick={() => setCreateStep(index)} type="button">
            <span>{index < createStep ? <Check size={14} /> : index + 1}</span>
            {step}
          </button>
        ))}
      </div>

      <div className="resolve-create-body">
        {createStep === 0 ? (
          <div className="resolve-product-picker">
            {resolveProducts.map((entry) => (
              <button className={entry.id === selectedProductId ? "is-selected" : ""} key={entry.id} onClick={() => setSelectedProductId(entry.id)} type="button">
                <span>{entry.category}</span>
                <strong>{entry.name}</strong>
                <small>{entry.model} / {ownershipLabels[entry.ownership]}</small>
              </button>
            ))}
          </div>
        ) : null}

        {createStep === 1 ? (
          <label className="resolve-form-field">
            Problembeschreibung
            <textarea onChange={(event) => setProblemDraft(event.target.value)} value={problemDraft} />
          </label>
        ) : null}

        {createStep === 2 ? (
          <div className="resolve-form-grid">
            <label className="resolve-form-field">
              Technischer Kontext
              <textarea onChange={(event) => setContextDraft(event.target.value)} value={contextDraft} />
            </label>
            <div className="resolve-technical-memory">
              <ContextBlock icon={<ShieldCheck size={17} />} label="Firmware" value={product.firmware ?? "Unbekannt"} />
              <ContextBlock icon={<Wrench size={17} />} label="Zubehör" value={product.accessories.join(", ")} />
              <ContextBlock icon={<Clock3 size={17} />} label="Historie" value={product.usageHistory} />
            </div>
          </div>
        ) : null}

        {createStep === 3 ? (
          <div className="resolve-ai-review">
            <SectionHeading icon={<Sparkles size={17} />} title="KI-Zusammenfassung und Kategorie" />
            <p>
              Avareno veröffentlicht daraus ein strukturiertes HDMI- und Firmware-Ticket für bestätigte {product.name} Besitzer und Helfer mit passenden Lösungen.
            </p>
            <div>
              {matchPreview.map((entry) => (
                <span key={entry.label}>
                  <strong>{entry.value}</strong>
                  {entry.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {createStep === 4 ? (
          <div className="resolve-publish-state">
            {published ? (
              <>
                <CheckCircle2 size={38} />
                <h2>Ticket wurde freigegeben.</h2>
                <p>Unpassende Nutzer sehen diese Anfrage nicht. Die erste Antwortphase ist für bestätigte Besitzer offen.</p>
                <Link to="/app/resolve">Zurück zur Übersicht</Link>
              </>
            ) : (
              <>
                <Radar size={38} />
                <h2>Bereit für passende Helfer.</h2>
                <p>{problemDraft}</p>
                <button onClick={() => setPublished(true)} type="button">
                  Ticket freigeben
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="resolve-create-actions">
        <button disabled={createStep === 0} onClick={() => setCreateStep(Math.max(0, createStep - 1))} type="button">
          Zurück
        </button>
        <button disabled={createStep === createSteps.length - 1} onClick={() => setCreateStep(Math.min(createSteps.length - 1, createStep + 1))} type="button">
          Weiter
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}

function MatchScore({ compact, value }: { compact?: boolean; value: number }) {
  return (
    <div className={compact ? "resolve-match-score is-compact" : "resolve-match-score"}>
      <svg viewBox="0 0 42 42" aria-hidden="true">
        <circle cx="21" cy="21" r="17" />
        <circle cx="21" cy="21" r="17" style={{ strokeDasharray: `${value} 100` }} />
      </svg>
      <span>{value}%</span>
    </div>
  );
}

function StatusPill({ status }: { status: ResolveTicketStatus }) {
  return <span className={`resolve-status-pill is-${status.toLowerCase()}`}>{statusLabels[status]}</span>;
}

function PriorityPill({ priority }: { priority: ResolveTicket["priority"] }) {
  return <span className={`resolve-priority-pill is-${priority.toLowerCase()}`}>{priorityLabels[priority]}</span>;
}

function ResolveEmptyState({ body, children, title }: { body: string; children?: ReactNode; title: string }) {
  return (
    <div className="resolve-empty-state">
      <LifeBuoy size={28} />
      <h3>{title}</h3>
      <p>{body}</p>
      {children}
    </div>
  );
}
