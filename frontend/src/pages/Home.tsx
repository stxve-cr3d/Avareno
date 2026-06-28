import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BookOpenText,
  Check,
  ClipboardCheck,
  FileLock2,
  FileText,
  FolderLock,
  Hammer,
  LifeBuoy,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Wrench
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "../components/MarketingShell";
import { Reveal, RevealGroup } from "../components/MarketingReveal";

const features = [
  {
    icon: <Package size={18} />,
    title: "Object Memory",
    line: "Every thing gets a profile.",
    text: "Store the product, receipt, warranty, manual and open points in one place.",
    visual: "object"
  },
  {
    icon: <ReceiptText size={18} />,
    title: "Receipt & Warranty",
    line: "Never lose the proof.",
    text: "Avareno links receipts to products and helps you see what expires next.",
    visual: "receipt"
  },
  {
    icon: <ClipboardCheck size={18} />,
    title: "Resolve",
    line: "Open loops become clear.",
    text: "Missing documents, warranty risks and unfinished care points become actionable.",
    visual: "resolve"
  },
  {
    icon: <Wrench size={18} />,
    title: "Care",
    line: "Repairs and reminders stay connected.",
    text: "Keep support, maintenance and reminders tied to the object they belong to.",
    visual: "care"
  },
  {
    icon: <FolderLock size={18} />,
    title: "Private Vault",
    line: "Your real-life memory stays private.",
    text: "Organize sensitive documents and product information in a calm private workspace.",
    visual: "vault"
  },
  {
    icon: <Sparkles size={18} />,
    title: "Memory Build",
    line: "From messy capture to complete profile.",
    text: "Capture something once. Avareno builds the structure around it.",
    visual: "build"
  }
];

const steps = [
  ["Capture", "Scan a product, receipt, screenshot or document."],
  ["Understand", "Avareno identifies what it is and what belongs together."],
  ["Remember", "It creates an object memory with receipt, warranty, documents and reminders."],
  ["Act", "You see what needs attention before it becomes a problem."]
];

const memoryRailItems = [
  {
    icon: <Package size={18} />,
    title: "Product",
    text: "LG OLED C3",
    meta: "Model, room, serial"
  },
  {
    icon: <ReceiptText size={18} />,
    title: "Receipt",
    text: "Proof saved",
    meta: "MediaMarkt · 2024"
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Warranty",
    text: "45 days left",
    meta: "Action window"
  },
  {
    icon: <BookOpenText size={18} />,
    title: "Manual",
    text: "Connected",
    meta: "PDF and support link"
  },
  {
    icon: <Hammer size={18} />,
    title: "Repair",
    text: "Panel issue",
    meta: "History attached"
  },
  {
    icon: <Bell size={18} />,
    title: "Reminder",
    text: "Ready",
    meta: "Before warranty ends"
  },
  {
    icon: <FileLock2 size={18} />,
    title: "Private Vault",
    text: "Documents safe",
    meta: "Personal context"
  }
];

const pricingPlans = [
  {
    name: "Free",
    price: "0 EUR",
    note: "For trying Avareno with your first real-life things.",
    features: ["20 things", "Basic documents", "Manual reminders", "Local demo use"],
    cta: "Start free",
    highlighted: false
  },
  {
    name: "Home",
    price: "6 EUR",
    note: "For products, receipts, warranties and care loops at home.",
    features: ["Unlimited things", "Warranty and care loops", "Household members", "Support-ready exports"],
    cta: "Choose Home",
    badge: "Recommended",
    highlighted: true
  },
  {
    name: "Family",
    price: "12 EUR",
    note: "For families, shared places and more responsibility.",
    features: ["Multiple households", "Roles and sharing", "Prioritized reminders", "Extended object history"],
    cta: "Reserve Family",
    highlighted: false
  }
];

const faqs = [
  {
    title: "Is Avareno a notes app?",
    text: "No. Avareno is structured around real-life things: products, receipts, warranties, documents, reminders and care actions."
  },
  {
    title: "What happens after I capture something?",
    text: "Avareno turns the capture into an object memory and connects the useful context around it, such as proof, warranty dates, documents and next steps."
  },
  {
    title: "Is the pricing final?",
    text: "Not yet. The current pricing communicates the intended product shape and can be adjusted before launch."
  },
  {
    title: "Can I export important information?",
    text: "The product direction includes export for support, insurance, warranties and your own archive, so the memory stays useful outside the app."
  }
];

const securityTrust = [
  {
    icon: <FileLock2 size={18} />,
    title: "Private by default",
    text: "Avareno is built around personal products, receipts and documents, so private context is treated as product-critical."
  },
  {
    icon: <ShieldCheck size={18} />,
    title: "Readable controls",
    text: "Important reminders, warranty windows and stored proof stay visible without turning the site into a noisy dashboard."
  },
  {
    icon: <FolderLock size={18} />,
    title: "Document memory",
    text: "Receipts, manuals and support material stay tied to the real thing they belong to, not scattered across folders."
  }
];

export function Home() {
  useEffect(() => {
    if (!window.location.hash) return;
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;
    window.requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  return (
    <div className="avareno-page site-page">
      <MarketingHeader />

      <main className="site-main">
        <section className="site-hero" id="product" aria-labelledby="site-title">
          <div className="site-hero-inner">
            <div className="site-hero-copy">
              <Reveal as="p" className="site-eyebrow" delay={80}>Avareno Memory Layer</Reveal>
              <Reveal as="h1" id="site-title" delay={150}>
                Your private memory
                <span>for real life</span>
              </Reveal>
              <Reveal as="p" delay={230}>
                Capture a product, receipt, screenshot or document. Avareno assembles the context into one organized memory profile.
              </Reveal>
              <Reveal className="site-hero-actions" delay={320} aria-label="Primary actions">
                <Link className="site-primary-button" to="/app">
                  Start your memory <ArrowRight size={16} />
                </Link>
                <a className="site-secondary-button" href="#memory-gallery">
                  See memory examples
                </a>
              </Reveal>
            </div>

            <HeroMemoryBuild />
          </div>
        </section>

        <Reveal as="section" className="site-gallery-section" id="memory-gallery" aria-labelledby="gallery-title">
          <div className="site-gallery-head">
            <p className="site-eyebrow">Memory examples</p>
            <h2 id="gallery-title">Built for the things you forget later.</h2>
          </div>
          <MemoryGalleryRail />
        </Reveal>

        <section className="site-section" id="dinge" aria-labelledby="features-title">
          <Reveal>
            <SectionHeader
              eyebrow="Product"
              title="A private structure for the things people actually need later."
              text="Avareno is not a notes app or another task list. It builds memory around objects, proof, documents and the next action."
            />
          </Reveal>

          <RevealGroup className="site-feature-grid" stagger={85}>
            {features.map((feature) => (
              <article className={`site-feature-card site-feature-${feature.visual}`} key={feature.title}>
                <div className="site-card-topline">
                  <span>{feature.icon}</span>
                  <small>{feature.title}</small>
                </div>
                <FeatureVisual type={feature.visual} />
                <div>
                  <h3>{feature.line}</h3>
                  <p>{feature.text}</p>
                </div>
              </article>
            ))}
          </RevealGroup>
        </section>

        <section className="site-section site-steps-section" id="how-it-works" aria-labelledby="steps-title">
          <Reveal>
            <SectionHeader
              eyebrow="How it works"
              title="Capture once. Let the structure form around it."
              text="The workflow stays simple: add what you have, let Avareno connect the context, then return when something needs attention."
            />
          </Reveal>

          <RevealGroup className="site-step-grid" stagger={95}>
            {steps.map(([title, text], index) => (
              <article className="site-step-card" key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </RevealGroup>
        </section>

        <section className="site-section site-pricing-section" id="pricing" aria-labelledby="pricing-title">
          <Reveal>
            <SectionHeader
              eyebrow="Pricing"
              title="Simple plans for building a private real-life memory."
              text="Start small, then grow into household and family memory when more people and places need the same source of truth."
            />
          </Reveal>

          <RevealGroup className="site-pricing-grid" stagger={90}>
            {pricingPlans.map((plan) => (
              <article className={plan.highlighted ? "site-pricing-card is-highlighted" : "site-pricing-card"} key={plan.name}>
                <div className="site-pricing-card-head">
                  <p>{plan.name}</p>
                  {"badge" in plan ? <span>{plan.badge}</span> : null}
                </div>
                <h3>{plan.price}<span>/month</span></h3>
                <p>{plan.note}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check size={15} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link className={plan.highlighted ? "site-primary-button" : "site-secondary-button"} to="/app">
                  {plan.cta} <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </RevealGroup>
        </section>

        <Reveal as="section" className="site-security-section" id="security" aria-labelledby="security-title">
          <SectionHeader
            eyebrow="Trust"
            title="Designed for the private details people only need when something goes wrong."
            text="The public site should feel like the product: calm, structured and trustworthy with no decorative noise."
          />
          <div className="site-security-list">
            {securityTrust.map((item) => (
              <article key={item.title}>
                <span>{item.icon}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </Reveal>

        <section className="site-section site-faq-section" aria-labelledby="faq-title">
          <Reveal>
            <SectionHeader
              eyebrow="FAQ"
              title="Clear answers for a calmer product."
              text="Avareno is designed to reduce real-life uncertainty, so the website should be just as direct."
            />
          </Reveal>
          <RevealGroup className="site-faq-list" stagger={80}>
            {faqs.map((item, index) => (
              <FaqItem key={item.title} item={item} open={index === 0} />
            ))}
          </RevealGroup>
        </section>

        <Reveal as="section" className="site-final-cta" aria-labelledby="final-title">
          <p className="site-eyebrow">Start</p>
          <h2 id="final-title">Start building your private memory</h2>
          <p>Capture your first thing and let Avareno organize the context around it.</p>
          <div className="site-hero-actions">
            <Link className="site-primary-button" to="/app">
              Get started <ArrowRight size={16} />
            </Link>
            <Link className="site-secondary-button" to="/app">
              Open app
            </Link>
          </div>
        </Reveal>
      </main>

      <MarketingFooter />
    </div>
  );
}

function HeroMemoryBuild() {
  return (
    <Reveal className="hero-memory-build" id="memory-build" delay={260} aria-label="Memory Build assembly">
      <div className="hero-memory-build-grid" aria-hidden="true" />
      <div className="hero-build-card hero-build-product">
        <span><Package size={20} /></span>
        <div>
          <small>Product</small>
          <strong>LG OLED C3</strong>
        </div>
      </div>
      <svg className="hero-build-lines" viewBox="0 0 720 300" aria-hidden="true">
        <path className="line-one" d="M 230 150 C 300 92 374 82 455 104" />
        <path className="line-two" d="M 230 150 C 320 144 384 150 475 150" />
        <path className="line-three" d="M 230 150 C 306 210 388 224 462 201" />
        <path className="line-four" d="M 230 150 C 366 262 508 266 612 221" />
      </svg>
      <HeroBuildChip className="chip-receipt" icon={<ReceiptText size={16} />} label="Receipt saved" meta="Proof connected" />
      <HeroBuildChip className="chip-warranty" icon={<ShieldCheck size={16} />} label="Warranty 45 days" meta="Deadline found" />
      <HeroBuildChip className="chip-reminder" icon={<Bell size={16} />} label="Reminder ready" meta="Before it matters" />
      <HeroBuildChip className="chip-care" icon={<LifeBuoy size={16} />} label="Care point" meta="Next action clear" />
      <div className="hero-build-status">
        <Sparkles size={15} />
        Memory profile complete
      </div>
    </Reveal>
  );
}

function HeroBuildChip({ className, icon, label, meta }: { className: string; icon: ReactNode; label: string; meta: string }) {
  return (
    <div className={`hero-build-chip ${className}`}>
      <span>{icon}</span>
      <div>
        <strong>{label}</strong>
        <small>{meta}</small>
      </div>
    </div>
  );
}

function MemoryGalleryRail() {
  const items = [...memoryRailItems, ...memoryRailItems];

  return (
    <div className="memory-gallery-rail" aria-label="Real-life memory examples">
      <div className="memory-gallery-track">
        {items.map((item, index) => (
          <article className="memory-gallery-card" key={`${item.title}-${index}`}>
            <span>{item.icon}</span>
            <small>{item.title}</small>
            <strong>{item.text}</strong>
            <p>{item.meta}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="site-section-header">
      <p className="site-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

function FeatureVisual({ type }: { type: string }) {
  if (type === "object") {
    return (
      <div className="site-visual site-object-visual" aria-hidden="true">
        <span><Package size={20} /></span>
        <div>
          <strong>LG OLED C3</strong>
          <small>Object profile</small>
        </div>
        <i />
        <i />
      </div>
    );
  }

  if (type === "receipt") {
    return (
      <div className="site-visual site-receipt-visual" aria-hidden="true">
        <ReceiptText size={22} />
        <div />
        <div />
        <span>Warranty 45 days</span>
      </div>
    );
  }

  if (type === "resolve") {
    return (
      <div className="site-visual site-list-visual" aria-hidden="true">
        <span>Missing receipt</span>
        <span>Warranty risk</span>
        <span>Open care point</span>
      </div>
    );
  }

  if (type === "care") {
    return (
      <div className="site-visual site-timeline-visual" aria-hidden="true">
        <TimelineDot label="Repair" value="Saved" />
        <TimelineDot label="Service" value="Ready" />
        <TimelineDot label="Reminder" value="Aug 12" />
      </div>
    );
  }

  if (type === "vault") {
    return (
      <div className="site-visual site-vault-visual" aria-hidden="true">
        <FileLock2 size={23} />
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className="site-visual site-build-visual" aria-hidden="true">
      {["Product", "Receipt", "Warranty", "Reminder", "Care"].map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

function TimelineDot({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span />
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function MemoryBuildConsole() {
  return (
    <article className="site-memory-console">
      <div className="site-console-head">
        <div>
          <span>Memory Build Console</span>
          <strong>LG OLED C3</strong>
        </div>
        <em>Active</em>
      </div>

      <div className="site-console-body">
        <div className="site-console-core">
          <div className="site-product-token">
            <Package size={22} />
            <div>
              <strong>LG OLED C3</strong>
              <small>Living room · OLED65C37LA</small>
            </div>
          </div>

          <div className="site-memory-flow" aria-hidden="true">
            <MemoryChip icon={<Package size={15} />} label="Product" />
            <MemoryChip icon={<ReceiptText size={15} />} label="Receipt saved" />
            <MemoryChip icon={<ShieldCheck size={15} />} label="Warranty 45 days" />
            <MemoryChip icon={<Bell size={15} />} label="Reminder ready" />
            <MemoryChip icon={<LifeBuoy size={15} />} label="1 care point" />
          </div>
        </div>

        <div className="site-console-side" aria-label="Open memory points">
          <StatusRow icon={<FileText size={16} />} label="Receipt" value="Saved" />
          <StatusRow icon={<TimerReset size={16} />} label="Warranty" value="45 days" warning />
          <StatusRow icon={<Hammer size={16} />} label="Care point" value="Open" />
        </div>
      </div>
    </article>
  );
}

function MemoryChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span>
      {icon}
      {label}
    </span>
  );
}

function StatusRow({ icon, label, value, warning = false }: { icon: ReactNode; label: string; value: string; warning?: boolean }) {
  return (
    <div className={warning ? "site-status-row is-warning" : "site-status-row"}>
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function FaqItem({ item, open = false }: { item: { title: string; text: string }; open?: boolean }) {
  const [isOpen, setIsOpen] = useState(open);

  return (
    <article className={isOpen ? "site-faq-item is-open" : "site-faq-item"}>
      <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}>
        <h3>{item.title}</h3>
        <span aria-hidden="true" />
      </button>
      <div>
        <p>{item.text}</p>
      </div>
    </article>
  );
}
