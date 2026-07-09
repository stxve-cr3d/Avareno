import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Baby,
  Bell,
  Bike,
  BookOpenText,
  CalendarClock,
  Check,
  Coffee,
  FileLock2,
  FileText,
  FolderLock,
  Link2,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  WashingMachine
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "../components/MarketingShell";
import { Reveal, RevealGroup } from "../components/MarketingReveal";
import { useLanguage } from "../lib/language";
import { formatPrice, getYearlySavings, publicPricingPlans, type BillingPeriod } from "../lib/pricing";
import { useAuth } from "../lib/authProvider";

function getHomeContent(language: "de" | "en") {
  if (language === "en") {
    return {
      hero: {
        eyebrow: "Avareno",
        title: "Everything about your things.",
        titleLine: "In one place.",
        body: "Save products, receipts, warranties, documents and reminders so you can actually find them again later.",
        primary: "Start for free",
        secondary: "See an example",
        actionsAria: "Primary actions",
        trust: "Private by default · Export anytime · No ads"
      },
      gallery: {
        eyebrow: "Examples",
        title: "Built for the things you forget later.",
        aria: "Real-life memory examples"
      },
      featuresHeader: {
        eyebrow: "What Avareno does",
        title: "Avareno is your private memory for things that matter later.",
        text: "Save products, receipts, warranties, documents and reminders in one place. Avareno automatically connects everything to the right object and shows you what is missing, expiring or needs to be done."
      },
      stepsHeader: {
        eyebrow: "How it works",
        title: "Capture once. Let the structure form around it.",
        text: "Add what you have. Avareno connects the context and tells you when something needs attention."
      },
      pricingHeader: {
        eyebrow: "Pricing",
        title: "Choose the memory that fits your life",
        text: "Start free, then upgrade when Avareno becomes your private memory for products, receipts, warranties and open loops."
      },
      trustHeader: {
        eyebrow: "Privacy",
        title: "Built for the private details you only need when something goes wrong.",
        text: "Receipts, documents and reminders are personal. Avareno treats them that way: private by default, calm and structured."
      },
      faqHeader: {
        eyebrow: "FAQ",
        title: "Clear answers for a calmer product.",
        text: "Avareno is designed to reduce real-life uncertainty, so the website should be just as direct."
      },
      finalCta: {
        eyebrow: "Start",
        title: "Start with your first real thing.",
        text: "One product, one receipt or one screenshot is enough. Avareno builds the first useful context around it.",
        primary: "Start for free",
        secondary: "Open app"
      },
      month: "/month",
      year: "/year",
      billingSwitch: {
        aria: "Billing period",
        monthly: "Monthly",
        yearly: "Yearly",
        yearlyBadge: "Save yearly"
      },
      features: [
        { icon: <ScanLine size={20} />, title: "Capture your things", text: "Add products, receipts, screenshots or documents." },
        { icon: <Link2 size={20} />, title: "Avareno connects", text: "Avareno recognizes what belongs together and creates a clear object profile." },
        { icon: <Bell size={20} />, title: "Get reminded in time", text: "You see what is missing, expiring or needs to be done." }
      ],
      steps: [
        ["Capture", "Scan a product, receipt, screenshot or document."],
        ["Understand", "Avareno identifies what it is and what belongs together."],
        ["Remember", "An object profile forms with receipts, warranty, documents and reminders."],
        ["Act", "You see what needs attention before it becomes a problem."]
      ],
      exampleItems: [
        { icon: <Bike size={18} />, title: "E-bike", meta: "Receipt, warranty, service" },
        { icon: <Coffee size={18} />, title: "Espresso machine", meta: "Manual, maintenance, spare parts" },
        { icon: <Baby size={18} />, title: "Stroller", meta: "Invoice, warranty, accessories" },
        { icon: <WashingMachine size={18} />, title: "Washing machine", meta: "Documents, service, reminder" }
      ],
      popularBadge: "Recommended",
      faqs: [
        { title: "Is Avareno a notes app?", text: "No. Avareno is structured around real-life things: products, receipts, warranties, documents, reminders and service points." },
        { title: "What happens after I capture something?", text: "Avareno turns the capture into an object profile and connects the useful context around it, such as proof, warranty dates, documents and next steps." },
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
      eyebrow: "Avareno",
      title: "Alles zu deinen Dingen.",
      titleLine: "An einem Ort.",
      body: "Speichere Produkte, Belege, Garantien, Dokumente und Erinnerungen so, dass du sie später wirklich wiederfindest.",
      primary: "Kostenlos starten",
      secondary: "Beispiel ansehen",
      actionsAria: "Wichtigste Aktionen",
      trust: "Privat als Standard · Export jederzeit · keine Werbung"
    },
    gallery: {
      eyebrow: "Beispiele",
      title: "Für alles, was man später nicht suchen möchte.",
      aria: "Beispiele für echtes Alltagsgedächtnis"
    },
    featuresHeader: {
      eyebrow: "Was Avareno macht",
      title: "Avareno ist dein privates Gedächtnis für Dinge, die später wichtig werden.",
      text: "Speichere Produkte, Belege, Garantien, Dokumente und Erinnerungen an einem Ort. Avareno verbindet alles automatisch mit dem passenden Objekt und zeigt dir, was fehlt, abläuft oder erledigt werden muss."
    },
    stepsHeader: {
      eyebrow: "So funktioniert es",
      title: "Einmal erfassen. Die Struktur entsteht darum herum.",
      text: "Du fügst hinzu, was du hast. Avareno verbindet den Kontext und meldet sich, wenn etwas Aufmerksamkeit braucht."
    },
    pricingHeader: {
      eyebrow: "Preise",
      title: "Wähle den Speicher, der zu deinem Alltag passt",
      text: "Starte kostenlos und erweitere Avareno, wenn dein privater Speicher für Objekte, Belege, Garantien und offene Punkte wächst."
    },
    trustHeader: {
      eyebrow: "Privatsphäre",
      title: "Für private Details gestaltet, die man erst braucht, wenn etwas schiefgeht.",
      text: "Belege, Dokumente und Erinnerungen sind persönlich. Avareno behandelt sie genau so: privat als Standard, ruhig und strukturiert."
    },
    faqHeader: {
      eyebrow: "FAQ",
      title: "Klare Antworten für ein ruhigeres Produkt.",
      text: "Avareno soll Unsicherheit im Alltag reduzieren. Genau so direkt sollte auch die Website sein."
    },
    finalCta: {
      eyebrow: "Start",
      title: "Starte mit dem ersten echten Objekt.",
      text: "Ein Produkt, ein Beleg oder ein Screenshot reicht. Avareno baut daraus den ersten brauchbaren Kontext.",
      primary: "Kostenlos starten",
      secondary: "App öffnen"
    },
    month: "/Monat",
    year: "/Jahr",
    billingSwitch: {
      aria: "Abrechnungszeitraum",
      monthly: "Monatlich",
      yearly: "Jährlich",
      yearlyBadge: "Jährlich günstiger"
    },
    features: [
      { icon: <ScanLine size={20} />, title: "Dinge erfassen", text: "Füge Produkte, Belege, Screenshots oder Dokumente hinzu." },
      { icon: <Link2 size={20} />, title: "Avareno verbindet", text: "Avareno erkennt, was zusammengehört, und erstellt ein klares Objektprofil." },
      { icon: <Bell size={20} />, title: "Rechtzeitig erinnert werden", text: "Du siehst, was fehlt, abläuft oder erledigt werden muss." }
    ],
    steps: [
      ["Erfassen", "Scanne ein Produkt, einen Beleg, Screenshot oder ein Dokument."],
      ["Verstehen", "Avareno erkennt, was es ist und was zusammengehört."],
      ["Merken", "Es entsteht ein Objektprofil mit Belegen, Garantie, Dokumenten und Erinnerungen."],
      ["Handeln", "Du siehst, was Aufmerksamkeit braucht, bevor es zum Problem wird."]
    ],
    exampleItems: [
      { icon: <Bike size={18} />, title: "E-Bike", meta: "Kaufbeleg, Garantie, Service" },
      { icon: <Coffee size={18} />, title: "Espressomaschine", meta: "Anleitung, Wartung, Ersatzteile" },
      { icon: <Baby size={18} />, title: "Kinderwagen", meta: "Rechnung, Garantie, Zubehör" },
      { icon: <WashingMachine size={18} />, title: "Waschmaschine", meta: "Dokumente, Service, Erinnerung" }
    ],
    popularBadge: "Empfohlen",
    faqs: [
      { title: "Ist Avareno eine Notiz-App?", text: "Nein. Avareno ist um echte Objekte herum strukturiert: Produkte, Belege, Garantien, Dokumente, Erinnerungen und Service-Punkte." },
      { title: "Was passiert nach dem Erfassen?", text: "Avareno macht daraus ein Objektprofil und verbindet hilfreichen Kontext wie Nachweise, Garantiedaten, Dokumente und nächste Schritte." },
      { title: "Sind die Preise final?", text: "Noch nicht. Die aktuellen Preise sind ein öffentlicher Beta-Entwurf. Echte Abrechnung braucht vorher eine eigene Prüfung für Zahlungsanbieter, Steuern, Rechnungen, Kündigung und Datenschutz." },
      { title: "Kann ich wichtige Informationen exportieren?", text: "Die Produktausrichtung sieht Exporte für Support, Versicherung, Garantien und dein eigenes Archiv vor, damit das Gedächtnis auch außerhalb der App nützlich bleibt." }
    ],
    securityTrust: [
      { icon: <FileLock2 size={18} />, title: "Privat als Standard", text: "Avareno dreht sich um persönliche Produkte, Belege und Dokumente. Privater Kontext ist deshalb produktkritisch." },
      { icon: <ShieldCheck size={18} />, title: "Verständliche Kontrolle", text: "Wichtige Erinnerungen, Garantiefenster und gespeicherte Nachweise bleiben sichtbar, ohne die Website in ein lautes Dashboard zu verwandeln." },
      { icon: <FolderLock size={18} />, title: "Dokumentengedächtnis", text: "Belege, Anleitungen und Supportmaterial bleiben mit dem echten Objekt verbunden, statt in Ordnern zu verschwinden." }
    ]
  };
}

export function Home() {
  const { language } = useLanguage();
  const auth = useAuth();
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
                <Link className="site-primary-button" to={auth.status === "authenticated" ? "/app" : "/signup"}>
                  {copy.hero.primary} <ArrowRight size={16} />
                </Link>
                <a className="site-secondary-button" href="#memory-gallery">
                  {copy.hero.secondary}
                </a>
              </Reveal>
              <Reveal as="p" className="site-hero-trust" delay={380}>
                <ShieldCheck size={14} /> {copy.hero.trust}
              </Reveal>
            </div>

            <HeroExample language={language} />
          </div>
        </section>

        <Reveal as="section" className="site-gallery-section" id="memory-gallery" aria-labelledby="gallery-title">
          <div className="site-gallery-head">
            <p className="site-eyebrow">{copy.gallery.eyebrow}</p>
            <h2 id="gallery-title">{copy.gallery.title}</h2>
          </div>
          <RevealGroup className="memory-example-grid" stagger={85} aria-label={copy.gallery.aria}>
            {copy.exampleItems.map((item) => (
              <article className="memory-gallery-card" key={item.title}>
                <span>{item.icon}</span>
                <strong>{item.title}</strong>
                <p>{item.meta}</p>
              </article>
            ))}
          </RevealGroup>
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
              <article className="site-feature-card" key={feature.title}>
                <span className="site-feature-icon">{feature.icon}</span>
                <div>
                  <h3>{feature.title}</h3>
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
                  {plan.isPopular ? <span>{copy.popularBadge}</span> : null}
                </div>
                <h3>{formatPrice(plan.prices[billingPeriod].amount, plan.currency, locale)}<span>{priceSuffix}</span></h3>
                {billingPeriod === "yearly" && getYearlySavings(plan.id) > 0 ? (
                  <p className="site-pricing-saving">
                    {language === "de" ? "Spare " : "Save "}
                    {formatPrice(getYearlySavings(plan.id), plan.currency, locale)}
                    {language === "de" ? " pro Jahr" : " per year"}
                  </p>
                ) : null}
                <p>{plan.description[language]}</p>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature.id}>
                      <Check size={15} />
                      {feature.label[language]}
                    </li>
                  ))}
                </ul>
                {plan.id === "free" ? (
                  <Link className="site-secondary-button" to={plan.ctaHref}>
                    {plan.ctaLabel[language]} <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link className={plan.isPopular ? "site-primary-button" : "site-secondary-button"} to={`/checkout/${plan.id}?interval=${billingPeriod}`}>
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
            <Link className="site-primary-button" to={auth.status === "authenticated" ? "/app" : "/signup"}>
              {copy.finalCta.primary} <ArrowRight size={16} />
            </Link>
            <Link className="site-secondary-button" to={auth.status === "authenticated" ? "/app" : "/login"}>
              {copy.finalCta.secondary}
            </Link>
          </div>
        </Reveal>
      </main>

      <MarketingFooter />
    </div>
  );
}

function HeroExample({ language }: { language: "de" | "en" }) {
  const copy = language === "de"
    ? {
      aria: "Beispiel: Objektprofil für ein E-Bike",
      productLabel: "Objekt",
      productName: "E-Bike",
      productDetail: "Kauf, Garantie, Service und Dokumente verbunden.",
      profileBadge: "Objektprofil",
      rows: [
        { icon: <ReceiptText size={17} />, text: "Kaufbeleg gespeichert", state: "ok" as const },
        { icon: <ShieldCheck size={17} />, text: "Garantie bis 12. August 2027", state: "ok" as const },
        { icon: <CalendarClock size={17} />, text: "Service in 32 Tagen", state: "warn" as const },
        { icon: <FileText size={17} />, text: "Versicherungsdokument verknüpft", state: "ok" as const },
        { icon: <BookOpenText size={17} />, text: "Anleitung gefunden", state: "ok" as const }
      ]
    }
    : {
      aria: "Example: object profile for an e-bike",
      productLabel: "Object",
      productName: "E-bike",
      productDetail: "Purchase, warranty, service and documents connected.",
      profileBadge: "Object profile",
      rows: [
        { icon: <ReceiptText size={17} />, text: "Purchase receipt saved", state: "ok" as const },
        { icon: <ShieldCheck size={17} />, text: "Warranty until August 12, 2027", state: "ok" as const },
        { icon: <CalendarClock size={17} />, text: "Service due in 32 days", state: "warn" as const },
        { icon: <FileText size={17} />, text: "Insurance document linked", state: "ok" as const },
        { icon: <BookOpenText size={17} />, text: "Manual found", state: "ok" as const }
      ]
    };

  return (
    <Reveal className="hero-example" delay={260} aria-label={copy.aria}>
      <div className="hero-example-head">
        <span className="hero-example-icon"><Bike size={20} /></span>
        <div>
          <small>{copy.productLabel}</small>
          <strong>{copy.productName}</strong>
          <p>{copy.productDetail}</p>
        </div>
        <em>{copy.profileBadge}</em>
      </div>
      <ul className="hero-example-rows">
        {copy.rows.map((row) => (
          <li className={row.state === "warn" ? "hero-example-row is-warning" : "hero-example-row"} key={row.text}>
            <span>{row.icon}</span>
            <p>{row.text}</p>
            <Check size={15} aria-hidden="true" />
          </li>
        ))}
      </ul>
    </Reveal>
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
