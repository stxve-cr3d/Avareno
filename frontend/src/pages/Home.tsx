import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  FolderLock,
  Hammer,
  Home as HomeIcon,
  LifeBuoy,
  Link2,
  ListChecks,
  Package,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Wrench
} from "lucide-react";
import { api } from "../lib/api";
import type { Dashboard, Item, Loop, Planner } from "../lib/types";
import { MarketingFooter, MarketingHeader } from "../components/MarketingShell";
import { ProgressBar } from "../components/ProgressBar";
import homeMemoryCube from "../assets/generated/avareno-home-memory-cube-dark.png";

const proofPoints = ["Dinge", "Belege", "Garantien", "Offene Aufgaben"];

const memoryNodes = [
  { icon: <Package size={19} />, label: "Product", text: "LG TV" },
  { icon: <ReceiptText size={19} />, label: "Invoice", text: "Proof saved" },
  { icon: <ShieldCheck size={19} />, label: "Warranty", text: "Still protected" },
  { icon: <Wrench size={19} />, label: "Repair history", text: "What changed" },
  { icon: <LifeBuoy size={19} />, label: "Support case", text: "Ready packet" },
  { icon: <Clock3 size={19} />, label: "Reminder", text: "Before it matters" },
  { icon: <UsersRound size={19} />, label: "Family member", text: "Shared context" }
];

const modules = [
  {
    icon: <Package size={20} />,
    title: "Product Memory",
    text: "Model, serial number, purchase context, location and ownership details stay attached to the thing itself."
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "Warranty Timeline",
    text: "Know what is protected, what proof is missing and what expires before the deadline gets quiet."
  },
  {
    icon: <FolderLock size={20} />,
    title: "Document Vault",
    text: "Invoices, manuals, drivers, software links and insurance documents sit where you actually need them."
  },
  {
    icon: <Hammer size={20} />,
    title: "Repair Log",
    text: "Track what broke, who fixed it, what it cost and which part was replaced last time."
  },
  {
    icon: <UsersRound size={20} />,
    title: "Family Vault",
    text: "Household knowledge becomes shared memory for family, roommates or anyone responsible for the same things."
  },
  {
    icon: <LifeBuoy size={20} />,
    title: "Support Autopilot",
    text: "Avareno prepares the support story with product details, proof, history and attachments already in order."
  },
  {
    icon: <ListChecks size={20} />,
    title: "Open Loop Reminders",
    text: "Returns, promises, missing documents and warranty checks stay visible until they are actually done."
  },
  {
    icon: <UserRound size={20} />,
    title: "Personal Profile Vault",
    text: "Important identity, household and ownership details become a calm profile for real-life administration."
  }
];

const workflow = [
  {
    title: "Capture anything",
    text: "Start with a receipt, product photo, message, PDF or loose commitment."
  },
  {
    title: "Avareno understands it",
    text: "The important facts are extracted into product, document, warranty and loop context."
  },
  {
    title: "It connects to your life",
    text: "Related proof, people, rooms, repairs and support cases live around the same object."
  },
  {
    title: "It reminds you before it matters",
    text: "Deadlines, missing details and unresolved promises surface while they can still be handled."
  }
];

const useCases = [
  "Where is the invoice for the TV?",
  "Is this still under warranty?",
  "What model is our router?",
  "Who promised to send me that document?",
  "What did the repair shop replace last time?"
];

export function Home() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [planner, setPlanner] = useState<Planner | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [dashboardResult, plannerResult] = await Promise.all([api<Dashboard>("/api/dashboard"), api<Planner>("/api/planner")]);
        setDashboard(dashboardResult);
        setPlanner(plannerResult);
      } catch {
        setDashboard(null);
        setPlanner(null);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    if (!window.location.hash) return;
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;
    window.requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const previewItem = dashboard?.incompleteItems[0] ?? null;
  const nextLoop = planner?.nextBest ?? dashboard?.openLoops[0] ?? null;
  const openLoops = dashboard?.stats.openLoopCount ?? 7;
  const remindersSoon = dashboard?.stats.remindersSoonCount ?? 3;

  return (
    <div className="avareno-page">
      <MarketingHeader />

      <main>
        <section className="avareno-hero" id="product" aria-labelledby="avareno-title">
          <div className="avareno-hero-content">
            <h1 id="avareno-title">Dein zweites Gedächtnis für Zuhause.</h1>
            <p>
              Dinge, Belege, Garantien und offene Aufgaben bleiben verbunden. Avareno macht aus deinem Zuhause eine ruhige, durchsuchbare Erinnerung.
            </p>
            <div className="avareno-hero-actions" aria-label="Primary actions">
              <Link className="avareno-primary-cta" to="/app">
                Jetzt starten <ArrowRight size={17} />
              </Link>
              <a className="avareno-secondary-cta" href="#memory-graph">
                Mehr erfahren
              </a>
            </div>
            <div className="avareno-proof-line" aria-label="Key benefits">
              {proofPoints.map((point) => (
                <span key={point}>
                  <Check size={15} />
                  {point}
                </span>
              ))}
            </div>
          </div>

          <ProductPassportPreview item={previewItem} loop={nextLoop} openLoops={openLoops} remindersSoon={remindersSoon} />
        </section>

        <section className="avareno-memory-section" id="memory-graph" aria-labelledby="memory-graph-title">
          <div className="avareno-section-intro">
            <h2 id="memory-graph-title">Everything important, connected around the thing.</h2>
            <p>
              Avareno is not another to-do list. It turns the objects, documents, promises and people in your real life into one calm memory network.
            </p>
          </div>
          <div className="avareno-network-canvas" aria-label="Avareno memory graph">
            {memoryNodes.map((node, index) => (
              <div className="avareno-network-node" key={node.label}>
                <span className="avareno-node-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="avareno-node-icon">{node.icon}</span>
                <strong>{node.label}</strong>
                <small>{node.text}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="avareno-modules-section" id="modules" aria-labelledby="modules-title">
          <div className="avareno-modules-copy">
            <h2 id="modules-title">Intelligent modules, not random folders.</h2>
            <p>
              Each module has one job: make the practical details of ownership easier to find, share and act on when life gets messy.
            </p>
            <Link className="avareno-text-link" to="/app/items">
              Open product memory <ArrowRight size={16} />
            </Link>
          </div>
          <div className="avareno-module-list">
            {modules.map((module, index) => (
              <ModuleRow key={module.title} index={index + 1} {...module} />
            ))}
          </div>
        </section>

        <section className="avareno-workflow-section" id="how-it-works" aria-labelledby="workflow-title">
          <div className="avareno-section-intro">
            <h2 id="workflow-title">How Avareno works.</h2>
            <p>Capture once. Let Avareno structure the details. Come back when real life asks for an answer.</p>
          </div>
          <div className="avareno-workflow-rail">
            {workflow.map((step, index) => (
              <article className="avareno-workflow-step" key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="avareno-usecase-section" aria-labelledby="usecase-title">
          <div>
            <h2 id="usecase-title">The questions real life keeps asking.</h2>
            <p>Avareno keeps the answer close, even when the drawer, chat thread or memory does not.</p>
          </div>
          <div className="avareno-question-list">
            {useCases.map((question) => (
              <div className="avareno-question" key={question}>
                <Search size={18} />
                <span>{question}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="avareno-final-panel" aria-labelledby="final-title">
          <div>
            <h2 id="final-title">Stop trying to remember everything.</h2>
            <p>Let Avareno hold the details.</p>
          </div>
          <Link className="avareno-primary-cta" to="/app/capture">
            Start organizing <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}

function ProductPassportPreview({ item, loop, openLoops, remindersSoon }: { item: Item | null; loop: Loop | null; openLoops: number; remindersSoon: number }) {
  const itemName = item?.name ?? "LG OLED C3";
  const completeness = item?.completenessScore ?? 72;
  const documentCount = item?.documents?.length ?? 18;
  const loopTitle = loop?.title ?? "Garantie läuft bald ab";

  return (
    <aside className="avareno-product-canvas" aria-label="Avareno mobile app preview">
      <div className="avareno-phone-showcase">
        <div className="avareno-phone avareno-phone-primary">
          <div className="avareno-phone-status">
            <span>9:41</span>
            <span>100</span>
          </div>
          <div className="avareno-phone-head">
            <div>
              <h2>Zuhause</h2>
              <p><span /> Online</p>
            </div>
            <div>
              <BellIcon />
              <Plus size={20} />
            </div>
          </div>
          <div className="avareno-mobile-stage">
            <MobileStat className="stat-docs" icon={<FileText size={18} />} label="Dokumente" value={documentCount} />
            <MobileStat className="stat-loops" icon={<ListChecks size={18} />} label="Offene Loops" value={openLoops} />
            <MobileStat className="stat-warranty" icon={<ShieldCheck size={18} />} label="Garantien" value={4} />
            <MobileStat className="stat-rooms" icon={<HomeIcon size={18} />} label="Räume" value={6} />
            <img src={homeMemoryCube} alt="" />
          </div>
          <div className="avareno-phone-section-row">
            <h3>Heute wichtig</h3>
            <span>Alle anzeigen</span>
          </div>
          <div className="avareno-reminder-card">
            <span><ShieldCheck size={21} /></span>
            <div>
              <strong>{loopTitle}</strong>
              <p>{itemName} · endet in 45 Tagen</p>
              <ProgressBar value={completeness} />
            </div>
            <em>{completeness}%</em>
          </div>
          <div className="avareno-match-card">
            <span><Package size={22} /></span>
            <div>
              <strong>{itemName}</strong>
              <p>94% Match · {documentCount} Dokumente</p>
            </div>
          </div>
          <div className="avareno-mobile-tile-row">
            <PreviewTile icon={<FolderLock size={17} />} label="Dokumente" value={`${documentCount} Dateien`} />
            <PreviewTile icon={<PlugIcon />} label="Geräte" value="7 online" />
            <PreviewTile icon={<Wrench size={17} />} label="Reparaturen" value="2 Historien" />
          </div>
        </div>

        <div className="avareno-phone avareno-phone-secondary">
          <div className="avareno-phone-status">
            <span>9:41</span>
            <span>100</span>
          </div>
          <h3>Dokumente</h3>
          {["MediaMarkt Rechnung", "Garantie LG OLED C3", "Versicherung Hausrat", "Bedienungsanleitung"].map((entry) => (
            <div className="avareno-doc-row" key={entry}>
              <FileText size={18} />
              <span>{entry}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function MobileStat({ className, icon, label, value }: { className: string; icon: ReactNode; label: string; value: number }) {
  return (
    <div className={`avareno-mobile-stat ${className}`}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BellIcon() {
  return <span className="avareno-mini-bell" aria-hidden="true" />;
}

function PlugIcon() {
  return <Sparkles size={17} />;
}

function PreviewNav({ active = false, icon, label }: { active?: boolean; icon: ReactNode; label: string }) {
  return (
    <div className={active ? "avareno-preview-nav is-active" : "avareno-preview-nav"}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function PreviewTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="avareno-preview-tile">
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function TimelinePoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="avareno-timeline-point">
      <span />
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ModuleRow({ icon, title, text, index }: { icon: ReactNode; title: string; text: string; index: number }) {
  return (
    <article className="avareno-module-row">
      <span className="avareno-module-number">{String(index).padStart(2, "0")}</span>
      <span className="avareno-module-icon">{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <Link2 size={17} aria-hidden="true" />
    </article>
  );
}
