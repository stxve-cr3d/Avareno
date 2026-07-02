import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
  const metrics = useMemo(() => resolveMetrics(tickets), [tickets]);
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
      title="Resolve"
      subtitle="Kein Forum. Keine Zufallsantworten. Nur Tickets, bei denen Besitz und Erfahrung wirklich passen."
    >
      <ResolveHome metrics={metrics} tickets={tickets} />
    </ResolveShell>
  );
}

function ResolveHome({ metrics, tickets }: { metrics: ReturnType<typeof resolveMetrics>; tickets: ResolveTicket[] }) {
  const ownTicket = tickets.find((ticket) => ticket.mode === "OWN" && ticket.status !== "SOLVED") ?? tickets[0];
  const helpTicket = tickets.find((ticket) => ticket.mode === "HELP") ?? tickets[1];
  const nextTicket = ownTicket ?? helpTicket;
  const nextProduct = getProduct(nextTicket.productId);

  return (
    <section className="resolve-home-layout">
      <article className="resolve-next-card">
        <div>
          <span>Nächster Schritt</span>
          <h2>{nextTicket.problemTitle}</h2>
          <p>{nextTicket.permissionReason}</p>
        </div>
        <div className="resolve-next-meta">
          <small>{nextProduct.name}</small>
          <StatusPill status={nextTicket.status} />
          <span>{nextTicket.matchScore}% passend</span>
        </div>
        <Link className="resolve-primary-action" to={`/app/resolve/tickets/${nextTicket.id}`}>
          Ticket ansehen
          <ArrowRight size={16} />
        </Link>
      </article>

      <aside className="resolve-home-menu" aria-label="Resolve Bereiche">
        <div className="resolve-home-menu-head">
          <h2>Bereiche</h2>
          <Link to="/app/resolve/create">
            Neues Ticket
            <ArrowRight size={16} />
          </Link>
        </div>
        <HomeChoice
          label="Meine Tickets"
          body="Eigene offene Probleme"
          to="/app/resolve/tickets"
          value={metrics.openOwn.toString()}
        />
        <HomeChoice
          label="Helfen"
          body="Anfragen mit echter Erfahrung"
          to={`/app/resolve/tickets/${helpTicket.id}`}
          value={metrics.qualified.toString()}
        />
        <HomeChoice
          label="Gelöst"
          body="Abgeschlossene Tickets"
          to="/app/resolve/tickets"
          value={metrics.solved.toString()}
        />
      </aside>
    </section>
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
        <StatusPill status={ticket.status} />
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

function ResolveEmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="resolve-empty-state">
      <LifeBuoy size={28} />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
