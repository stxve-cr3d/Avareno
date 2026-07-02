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
  FolderLock,
  Hammer,
  LifeBuoy,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Wrench
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "../components/MarketingShell";
import { Reveal, RevealGroup } from "../components/MarketingReveal";
import { useLanguage } from "../lib/language";
import { formatPrice, publicPricingPlans, type BillingPeriod } from "../lib/pricing";

function getHomeContent(language: "de" | "en") {
  if (language === "en") {
    return {
      hero: {
        eyebrow: "Avareno Memory Layer",
        title: "Your private memory",
        titleLine: "for real life",
        body: "Capture a product, receipt, screenshot or document. Avareno assembles the context into one organized memory profile.",
        primary: "Start your memory",
        secondary: "See memory examples",
        actionsAria: "Primary actions"
      },
      gallery: {
        eyebrow: "Memory examples",
        title: "Built for the things you forget later.",
        aria: "Real-life memory examples"
      },
      featuresHeader: {
        eyebrow: "Product",
        title: "A private structure for the things people actually need later.",
        text: "Avareno is not a notes app or another task list. It builds memory around objects, proof, documents and the next action."
      },
      stepsHeader: {
        eyebrow: "How it works",
        title: "Capture once. Let the structure form around it.",
        text: "The workflow stays simple: add what you have, let Avareno connect the context, then return when something needs attention."
      },
      pricingHeader: {
        eyebrow: "Pricing",
        title: "Choose the memory that fits your life",
        text: "Start free, then upgrade when Avareno becomes your private memory for products, receipts, warranties and open loops."
      },
      trustHeader: {
        eyebrow: "Trust",
        title: "Designed for the private details people only need when something goes wrong.",
        text: "The public site should feel like the product: calm, structured and trustworthy with no decorative noise."
      },
      faqHeader: {
        eyebrow: "FAQ",
        title: "Clear answers for a calmer product.",
        text: "Avareno is designed to reduce real-life uncertainty, so the website should be just as direct."
      },
      finalCta: {
        eyebrow: "Start",
        title: "Start building your private memory",
        text: "Capture your first thing and let Avareno organize the context around it.",
        primary: "Get started",
        secondary: "Open app"
      },
      month: "/month",
      year: "/year",
      billingSwitch: {
        aria: "Billing period",
        monthly: "Monthly",
        yearly: "Yearly",
        yearlyBadge: "Save 2 months"
      },
      features: [
        { icon: <Package size={18} />, title: "Object Memory", line: "Every thing gets a profile.", text: "Store the product, receipt, warranty, manual and open points in one place.", visual: "object" },
        { icon: <ReceiptText size={18} />, title: "Receipt & Warranty", line: "Never lose the proof.", text: "Avareno links receipts to products and helps you see what expires next.", visual: "receipt" },
        { icon: <ClipboardCheck size={18} />, title: "Resolve", line: "Open loops become clear.", text: "Missing documents, warranty risks and unfinished care points become actionable.", visual: "resolve" },
        { icon: <Wrench size={18} />, title: "Care", line: "Repairs and reminders stay connected.", text: "Keep support, maintenance and reminders tied to the object they belong to.", visual: "care" },
        { icon: <FolderLock size={18} />, title: "Private Vault", line: "Your real-life memory stays private.", text: "Organize sensitive documents and product information in a calm private workspace.", visual: "vault" },
        { icon: <Sparkles size={18} />, title: "Memory Build", line: "From messy capture to complete profile.", text: "Capture something once. Avareno builds the structure around it.", visual: "build" }
      ],
      steps: [
        ["Capture", "Scan a product, receipt, screenshot or document."],
        ["Understand", "Avareno identifies what it is and what belongs together."],
        ["Remember", "It creates an object memory with receipt, warranty, documents and reminders."],
        ["Act", "You see what needs attention before it becomes a problem."]
      ],
      memoryRailItems: [
        { icon: <Package size={18} />, title: "Product", text: "LG OLED C3", meta: "Model, room, serial" },
        { icon: <ReceiptText size={18} />, title: "Receipt", text: "Proof saved", meta: "MediaMarkt · 2024" },
        { icon: <ShieldCheck size={18} />, title: "Warranty", text: "45 days left", meta: "Action window" },
        { icon: <BookOpenText size={18} />, title: "Manual", text: "Connected", meta: "PDF and support link" },
        { icon: <Hammer size={18} />, title: "Repair", text: "Panel issue", meta: "History attached" },
        { icon: <Bell size={18} />, title: "Reminder", text: "Ready", meta: "Before warranty ends" },
        { icon: <FileLock2 size={18} />, title: "Private Vault", text: "Documents safe", meta: "Personal context" }
      ],
      popularBadge: "Recommended",
      faqs: [
        { title: "Is Avareno a notes app?", text: "No. Avareno is structured around real-life things: products, receipts, warranties, documents, reminders and care actions." },
        { title: "What happens after I capture something?", text: "Avareno turns the capture into an object memory and connects the useful context around it, such as proof, warranty dates, documents and next steps." },
        { title: "Is the pricing final?", text: "Not yet. The current pricing is a public beta draft. Real billing needs a separate provider, tax, invoice, cancellation and privacy review before launch." },
        { title: "Can I export important information?", text: "The product direction includes export for support, insurance, warranties and your own archive, so the memory stays useful outside the app." }
      ],
      securityTrust: [
        { icon: <FileLock2 size={18} />, title: "Private by default", text: "Avareno is built around personal products, receipts and documents, so private context is treated as product-critical." },
        { icon: <ShieldCheck size={18} />, title: "Readable controls", text: "Important reminders, warranty windows and stored proof stay visible without turning the site into a noisy dashboard." },
        { icon: <FolderLock size={18} />, title: "Document memory", text: "Receipts, manuals and support material stay tied to the real thing they belong to, not scattered across folders." }
      ]
    };
  }

    return {
      hero: {
      eyebrow: "Avareno Memory Layer",
      title: "Dein privates Gedächtnis",
      titleLine: "für das echte Leben",
      body: "Erfasse ein Produkt, einen Beleg, einen Screenshot oder ein Dokument. Avareno sortiert den Kontext so, dass du ihn später wirklich nutzen kannst.",
      primary: "Erfassen starten",
      secondary: "Beispiele ansehen",
      actionsAria: "Wichtigste Aktionen"
    },
    gallery: {
      eyebrow: "Gedächtnis-Beispiele",
      title: "Für alles, was man später nicht suchen möchte.",
      aria: "Beispiele für echtes Alltagsgedächtnis"
    },
    featuresHeader: {
      eyebrow: "Produkt",
      title: "Eine private Struktur für Dinge, die später zählen.",
      text: "Avareno ist keine Notiz-App und keine weitere Aufgabenliste. Es hält Produkte, Nachweise, Dokumente und nächste Schritte ruhig zusammen."
    },
    stepsHeader: {
      eyebrow: "So funktioniert es",
      title: "Einmal erfassen. Die Struktur entsteht darum herum.",
      text: "Du fügst hinzu, was du hast. Avareno verbindet den Kontext und meldet sich, wenn etwas Aufmerksamkeit braucht."
    },
    pricingHeader: {
      eyebrow: "Preise",
      title: "Wähle den Speicher, der zu deinem Alltag passt",
      text: "Starte kostenlos und erweitere Avareno, wenn dein privater Speicher für Dinge, Belege, Garantien und offene Punkte wächst."
    },
    trustHeader: {
      eyebrow: "Vertrauen",
      title: "Für private Details gestaltet, die man erst braucht, wenn etwas schiefgeht.",
      text: "Die öffentliche Website soll sich wie das Produkt anfühlen: ruhig, strukturiert und vertrauenswürdig, ohne dekorativen Lärm."
    },
    faqHeader: {
      eyebrow: "FAQ",
      title: "Klare Antworten für ein ruhigeres Produkt.",
      text: "Avareno soll Unsicherheit im Alltag reduzieren. Genau so direkt sollte auch die Website sein."
    },
    finalCta: {
      eyebrow: "Start",
      title: "Starte mit dem ersten echten Ding.",
      text: "Ein Produkt, ein Beleg oder ein Screenshot reicht. Avareno baut daraus den ersten brauchbaren Kontext.",
      primary: "Jetzt starten",
      secondary: "App öffnen"
    },
    month: "/Monat",
    year: "/Jahr",
    billingSwitch: {
      aria: "Abrechnungszeitraum",
      monthly: "Monatlich",
      yearly: "Jährlich",
      yearlyBadge: "2 Monate sparen"
    },
    features: [
      { icon: <Package size={18} />, title: "Objektgedächtnis", line: "Jedes Ding bekommt ein Profil.", text: "Produkt, Beleg, Garantie, Anleitung und offene Punkte bleiben an einem Ort.", visual: "object" },
      { icon: <ReceiptText size={18} />, title: "Beleg & Garantie", line: "Der Nachweis bleibt auffindbar.", text: "Avareno verbindet Belege mit Produkten und zeigt, was als Nächstes abläuft.", visual: "receipt" },
      { icon: <ClipboardCheck size={18} />, title: "Resolve", line: "Offene Punkte werden klar.", text: "Fehlende Dokumente, Garantierisiken und unerledigte Care-Punkte werden handhabbar.", visual: "resolve" },
      { icon: <Wrench size={18} />, title: "Care", line: "Reparaturen und Erinnerungen bleiben verbunden.", text: "Support, Wartung und Erinnerungen bleiben beim passenden Objekt, nicht irgendwo im Kopf.", visual: "care" },
      { icon: <FolderLock size={18} />, title: "Privater Vault", line: "Dein Alltagsgedächtnis bleibt privat.", text: "Ordne sensible Dokumente und Produktinformationen in einem ruhigen privaten Bereich.", visual: "vault" },
      { icon: <Sparkles size={18} />, title: "Memory Build", line: "Aus losem Erfassen wird ein klares Profil.", text: "Erfasse etwas einmal. Avareno baut die passende Struktur darum herum.", visual: "build" }
    ],
    steps: [
      ["Erfassen", "Scanne ein Produkt, einen Beleg, Screenshot oder ein Dokument."],
      ["Verstehen", "Avareno erkennt, was es ist und was zusammengehört."],
      ["Merken", "Es entsteht ein Objektgedächtnis mit Beleg, Garantie, Dokumenten und Erinnerungen."],
      ["Handeln", "Du siehst, was Aufmerksamkeit braucht, bevor es zum Problem wird."]
    ],
    memoryRailItems: [
      { icon: <Package size={18} />, title: "Produkt", text: "LG OLED C3", meta: "Modell, Raum, Seriennummer" },
      { icon: <ReceiptText size={18} />, title: "Beleg", text: "Nachweis gespeichert", meta: "MediaMarkt · 2024" },
      { icon: <ShieldCheck size={18} />, title: "Garantie", text: "45 Tage übrig", meta: "Handlungsfenster" },
      { icon: <BookOpenText size={18} />, title: "Anleitung", text: "Verbunden", meta: "PDF und Support-Link" },
      { icon: <Hammer size={18} />, title: "Reparatur", text: "Panel-Problem", meta: "Historie angehängt" },
      { icon: <Bell size={18} />, title: "Erinnerung", text: "Bereit", meta: "Vor Garantieende" },
      { icon: <FileLock2 size={18} />, title: "Privater Vault", text: "Dokumente geschützt", meta: "Persönlicher Kontext" }
    ],
    popularBadge: "Empfohlen",
    faqs: [
      { title: "Ist Avareno eine Notiz-App?", text: "Nein. Avareno ist um echte Dinge herum strukturiert: Produkte, Belege, Garantien, Dokumente, Erinnerungen und Care-Aktionen." },
      { title: "Was passiert nach dem Erfassen?", text: "Avareno macht daraus ein Objektgedächtnis und verbindet hilfreichen Kontext wie Nachweise, Garantiedaten, Dokumente und nächste Schritte." },
      { title: "Sind die Preise final?", text: "Noch nicht. Die aktuellen Preise sind ein öffentlicher Beta-Entwurf. Echte Abrechnung braucht vorher eine eigene Prüfung für Zahlungsanbieter, Steuern, Rechnungen, Kündigung und Datenschutz." },
      { title: "Kann ich wichtige Informationen exportieren?", text: "Die Produktausrichtung sieht Exporte für Support, Versicherung, Garantien und dein eigenes Archiv vor, damit das Gedächtnis auch außerhalb der App nützlich bleibt." }
    ],
    securityTrust: [
      { icon: <FileLock2 size={18} />, title: "Privat als Standard", text: "Avareno dreht sich um persönliche Produkte, Belege und Dokumente. Privater Kontext ist deshalb produktkritisch." },
      { icon: <ShieldCheck size={18} />, title: "Verständliche Kontrolle", text: "Wichtige Erinnerungen, Garantiefenster und gespeicherte Nachweise bleiben sichtbar, ohne die Website in ein lautes Dashboard zu verwandeln." },
      { icon: <FolderLock size={18} />, title: "Dokumentengedächtnis", text: "Belege, Anleitungen und Supportmaterial bleiben mit dem echten Ding verbunden, statt in Ordnern zu verschwinden." }
    ]
  };
}

export function Home() {
  const { language } = useLanguage();
  const copy = getHomeContent(language);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const priceSuffix = billingPeriod === "yearly" ? copy.year : copy.month;
  const pricingPlans = publicPricingPlans();
  const locale = language === "de" ? "de-DE" : "en-US";

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
              <Reveal as="p" className="site-eyebrow" delay={80}>{copy.hero.eyebrow}</Reveal>
              <Reveal as="h1" id="site-title" delay={150}>
                {copy.hero.title}{" "}
                <span>{copy.hero.titleLine}</span>
              </Reveal>
              <Reveal as="p" delay={230}>
                {copy.hero.body}
              </Reveal>
              <Reveal className="site-hero-actions" delay={320} aria-label={copy.hero.actionsAria}>
                <Link className="site-primary-button" to="/app">
                  {copy.hero.primary} <ArrowRight size={16} />
                </Link>
                <a className="site-secondary-button" href="#memory-gallery">
                  {copy.hero.secondary}
                </a>
              </Reveal>
            </div>

            <HeroMemoryBuild language={language} />
          </div>
        </section>

        <Reveal as="section" className="site-gallery-section" id="memory-gallery" aria-labelledby="gallery-title">
          <div className="site-gallery-head">
            <p className="site-eyebrow">{copy.gallery.eyebrow}</p>
            <h2 id="gallery-title">{copy.gallery.title}</h2>
          </div>
          <MemoryGalleryRail ariaLabel={copy.gallery.aria} items={copy.memoryRailItems} />
        </Reveal>

        <section className="site-section" id="dinge" aria-labelledby="features-title">
          <Reveal>
            <SectionHeader
              eyebrow={copy.featuresHeader.eyebrow}
              title={copy.featuresHeader.title}
              text={copy.featuresHeader.text}
            />
          </Reveal>

          <RevealGroup className="site-feature-grid" stagger={85}>
            {copy.features.map((feature) => (
              <article className={`site-feature-card site-feature-${feature.visual}`} key={feature.title}>
                <div className="site-card-topline">
                  <span>{feature.icon}</span>
                  <small>{feature.title}</small>
                </div>
                <FeatureVisual language={language} type={feature.visual} />
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
              eyebrow={copy.stepsHeader.eyebrow}
              title={copy.stepsHeader.title}
              text={copy.stepsHeader.text}
            />
          </Reveal>

          <RevealGroup className="site-step-grid" stagger={95}>
            {copy.steps.map(([title, text], index) => (
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
              eyebrow={copy.pricingHeader.eyebrow}
              title={copy.pricingHeader.title}
              text={copy.pricingHeader.text}
            />
          </Reveal>

          <Reveal>
            <SiteBillingPeriodSwitch
              copy={copy.billingSwitch}
              value={billingPeriod}
              onChange={setBillingPeriod}
            />
          </Reveal>

          <RevealGroup className="site-pricing-grid" stagger={90}>
            {pricingPlans.map((plan) => (
              <article className={plan.isPopular ? "site-pricing-card is-highlighted" : "site-pricing-card"} key={plan.id}>
                <div className="site-pricing-card-head">
                  <p>{plan.name}</p>
                  {plan.isPopular ? <span>{copy.popularBadge}</span> : plan.unavailableLabel ? <span>{plan.unavailableLabel[language]}</span> : null}
                </div>
                <h3>{formatPrice(plan, billingPeriod, locale)}<span>{priceSuffix}</span></h3>
                {billingPeriod === "yearly" && plan.yearlyNote ? <p className="site-pricing-saving">{plan.yearlyNote[language]}</p> : null}
                <p>{plan.description[language]}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature.id}>
                      <Check size={15} />
                      {feature.label[language]}
                    </li>
                  ))}
                </ul>
                {!plan.isAvailable ? (
                  <button className="site-secondary-button" disabled type="button">
                    {plan.ctaLabel[language]}
                  </button>
                ) : (
                  <Link className={plan.isPopular ? "site-primary-button" : "site-secondary-button"} to={plan.ctaHref}>
                    {plan.ctaLabel[language]} <ArrowRight size={16} />
                  </Link>
                )}
              </article>
            ))}
          </RevealGroup>
        </section>

        <Reveal as="section" className="site-security-section" id="security" aria-labelledby="security-title">
          <SectionHeader
            eyebrow={copy.trustHeader.eyebrow}
            title={copy.trustHeader.title}
            text={copy.trustHeader.text}
          />
          <div className="site-security-list">
            {copy.securityTrust.map((item) => (
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
              eyebrow={copy.faqHeader.eyebrow}
              title={copy.faqHeader.title}
              text={copy.faqHeader.text}
            />
          </Reveal>
          <RevealGroup className="site-faq-list" stagger={80}>
            {copy.faqs.map((item, index) => (
              <FaqItem key={item.title} item={item} open={index === 0} />
            ))}
          </RevealGroup>
        </section>

        <Reveal as="section" className="site-final-cta" aria-labelledby="final-title">
          <p className="site-eyebrow">{copy.finalCta.eyebrow}</p>
          <h2 id="final-title">{copy.finalCta.title}</h2>
          <p>{copy.finalCta.text}</p>
          <div className="site-hero-actions">
            <Link className="site-primary-button" to="/app">
              {copy.finalCta.primary} <ArrowRight size={16} />
            </Link>
            <Link className="site-secondary-button" to="/app">
              {copy.finalCta.secondary}
            </Link>
          </div>
        </Reveal>
      </main>

      <MarketingFooter />
    </div>
  );
}

function HeroMemoryBuild({ language }: { language: "de" | "en" }) {
  const copy = language === "de"
    ? {
      aria: "Memory-Build-Zusammenstellung",
      product: "Produkt",
      receiptLabel: "Beleg gespeichert",
      receiptMeta: "Nachweis verbunden",
      warrantyLabel: "Garantie 45 Tage",
      warrantyMeta: "Frist erkannt",
      reminderLabel: "Erinnerung bereit",
      reminderMeta: "Bevor es wichtig wird",
      careLabel: "Care-Punkt",
      careMeta: "Nächste Aktion klar",
      status: "Gedächtnisprofil vollständig"
    }
    : {
      aria: "Memory Build assembly",
      product: "Product",
      receiptLabel: "Receipt saved",
      receiptMeta: "Proof connected",
      warrantyLabel: "Warranty 45 days",
      warrantyMeta: "Deadline found",
      reminderLabel: "Reminder ready",
      reminderMeta: "Before it matters",
      careLabel: "Care point",
      careMeta: "Next action clear",
      status: "Memory profile complete"
    };

  return (
    <Reveal className="hero-memory-build" id="memory-build" delay={260} aria-label={copy.aria}>
      <div className="hero-memory-build-grid" aria-hidden="true" />
      <div className="hero-build-card hero-build-product">
        <span><Package size={20} /></span>
        <div>
          <small>{copy.product}</small>
          <strong>LG OLED C3</strong>
        </div>
      </div>
      <svg className="hero-build-lines" viewBox="0 0 720 300" aria-hidden="true">
        <path className="line-one" d="M 230 150 C 300 92 374 82 455 104" />
        <path className="line-two" d="M 230 150 C 320 144 384 150 475 150" />
        <path className="line-three" d="M 230 150 C 306 210 388 224 462 201" />
        <path className="line-four" d="M 230 150 C 366 262 508 266 612 221" />
      </svg>
      <HeroBuildChip className="chip-receipt" icon={<ReceiptText size={16} />} label={copy.receiptLabel} meta={copy.receiptMeta} />
      <HeroBuildChip className="chip-warranty" icon={<ShieldCheck size={16} />} label={copy.warrantyLabel} meta={copy.warrantyMeta} />
      <HeroBuildChip className="chip-reminder" icon={<Bell size={16} />} label={copy.reminderLabel} meta={copy.reminderMeta} />
      <HeroBuildChip className="chip-care" icon={<LifeBuoy size={16} />} label={copy.careLabel} meta={copy.careMeta} />
      <div className="hero-build-status">
        <Sparkles size={15} />
        {copy.status}
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

function MemoryGalleryRail({ ariaLabel, items }: { ariaLabel: string; items: Array<{ icon: ReactNode; title: string; text: string; meta: string }> }) {
  const railItems = [...items, ...items];

  return (
    <div className="memory-gallery-rail" aria-label={ariaLabel}>
      <div className="memory-gallery-track">
        {railItems.map((item, index) => (
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

function SiteBillingPeriodSwitch({
  copy,
  value,
  onChange
}: {
  copy: { aria: string; monthly: string; yearly: string; yearlyBadge: string };
  value: BillingPeriod;
  onChange: (value: BillingPeriod) => void;
}) {
  return (
    <div className="site-billing-switch" aria-label={copy.aria}>
      <button aria-pressed={value === "monthly"} className={value === "monthly" ? "is-active" : ""} onClick={() => onChange("monthly")} type="button">
        {copy.monthly}
      </button>
      <button aria-pressed={value === "yearly"} className={value === "yearly" ? "is-active" : ""} onClick={() => onChange("yearly")} type="button">
        {copy.yearly} <span>{copy.yearlyBadge}</span>
      </button>
    </div>
  );
}

function FeatureVisual({ language, type }: { language: "de" | "en"; type: string }) {
  const copy = language === "de"
    ? {
      objectProfile: "Objektprofil",
      warrantyDays: "Garantie 45 Tage",
      resolve: ["Beleg fehlt", "Garantierisiko", "Offener Care-Punkt"],
      timeline: [
        ["Reparatur", "Gespeichert"],
        ["Service", "Bereit"],
        ["Erinnerung", "12. Aug."]
      ],
      build: ["Produkt", "Beleg", "Garantie", "Erinnerung", "Care"]
    }
    : {
      objectProfile: "Object profile",
      warrantyDays: "Warranty 45 days",
      resolve: ["Missing receipt", "Warranty risk", "Open care point"],
      timeline: [
        ["Repair", "Saved"],
        ["Service", "Ready"],
        ["Reminder", "Aug 12"]
      ],
      build: ["Product", "Receipt", "Warranty", "Reminder", "Care"]
    };

  if (type === "object") {
    return (
      <div className="site-visual site-object-visual" aria-hidden="true">
        <span><Package size={20} /></span>
        <div>
          <strong>LG OLED C3</strong>
          <small>{copy.objectProfile}</small>
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
        <span>{copy.warrantyDays}</span>
      </div>
    );
  }

  if (type === "resolve") {
    return (
      <div className="site-visual site-list-visual" aria-hidden="true">
        {copy.resolve.map((label) => <span key={label}>{label}</span>)}
      </div>
    );
  }

  if (type === "care") {
    return (
      <div className="site-visual site-timeline-visual" aria-hidden="true">
        {copy.timeline.map(([label, value]) => <TimelineDot key={label} label={label} value={value} />)}
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
      {copy.build.map((label) => (
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
