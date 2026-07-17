import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Archive,
  BellRing,
  BookOpenText,
  Check,
  Coffee,
  FileLock2,
  FolderLock,
  Globe,
  House,
  Mail,
  ReceiptText,
  ScanBarcode,
  ShieldCheck,
  Store,
  Truck,
  Wrench
} from "lucide-react";
import { MarketingFooter, MarketingHeader } from "../components/MarketingShell";
import { Reveal, RevealGroup } from "../components/MarketingReveal";
import { SpatialHero } from "../components/SpatialHero";
import { useLanguage } from "../lib/language";
import { formatPrice, getYearlySavings, publicPricingPlans, type BillingPeriod } from "../lib/pricing";
import { useAuth } from "../lib/authProvider";

/* Landing page for the focused beta. Structure and copy follow the
   "Digital Product Archive" direction (docs/design/spatial-product-world.md):
   hero → problem → transformation → three steps → product dossier →
   use cases → trust → pricing → FAQ → closing CTA. */

function getHomeContent(language: "de" | "en") {
  if (language === "en") {
    return {
      hero: {
        eyebrow: "Avareno",
        title: "Receipts, warranties and product data.",
        titleLine: "Finally in one place.",
        body: "Save your products, receipts, serial numbers and manuals — and find everything again when you need it.",
        primary: "Start for free",
        secondary: "How Avareno works",
        actionsAria: "Primary actions",
        trust: "Private by default · Export anytime · No ads"
      },
      problem: {
        eyebrow: "The problem",
        title: "Your product information is scattered everywhere.",
        closing: "Usually you need this information exactly when you can't find it.",
        items: [
          { icon: <Mail size={17} />, place: "Receipt", detail: "buried in your email inbox" },
          { icon: <Archive size={17} />, place: "Warranty card", detail: "somewhere in a drawer" },
          { icon: <ScanBarcode size={17} />, place: "Serial number", detail: "on a sticker on the device" },
          { icon: <Globe size={17} />, place: "Manual", detail: "on the manufacturer's website" },
          { icon: <Store size={17} />, place: "Purchase date", detail: "in some shop account" }
        ]
      },
      transform: {
        eyebrow: "The transformation",
        title: "Scattered documents become one complete product dossier.",
        text: "Avareno assigns every receipt, warranty and manual to the product it belongs to. The result is one place that has the answers.",
        chips: ["Receipt", "Warranty card", "Serial number", "Manual", "Reminder"],
        akteKicker: "Product dossier",
        akteTitle: "Espresso machine",
        akteRows: ["Receipt saved", "Warranty until 03/2028", "Serial number stored"],
        akteBadge: "Complete"
      },
      stepsHeader: {
        eyebrow: "How it works",
        title: "Three steps. No filing system.",
        text: "Capture what you have — Avareno keeps it attached to the right product."
      },
      steps: [
        ["Add a product", "Scan the barcode or create it manually. Only the name is required."],
        ["Attach documents", "Upload the receipt, warranty or manual — they stay with the product."],
        ["Find everything again", "Search by name, manufacturer or serial number whenever you need it."]
      ],
      dossier: {
        eyebrow: "The product dossier",
        title: "Everything about one product, on one page.",
        text: "This is what a stored product looks like in Avareno — purchase data, warranty, documents and reminders together.",
        badge: "Example view",
        product: { name: "Espresso machine", makerModel: "Aroma Uno · EM-200" },
        meta: [
          { label: "Serial number", value: "SN-2026-0148" },
          { label: "Purchase date", value: "March 12, 2026" },
          { label: "Warranty until", value: "March 12, 2028" },
          { label: "Retailer", value: "Electronics store" }
        ],
        docsLabel: "Stored documents",
        docs: [
          { icon: <ReceiptText size={15} />, name: "invoice.pdf", type: "Receipt" },
          { icon: <ShieldCheck size={15} />, name: "warranty-card.pdf", type: "Warranty" },
          { icon: <BookOpenText size={15} />, name: "manual.pdf", type: "Manual" }
        ],
        reminderLabel: "Reminder",
        reminder: "60 days before the warranty ends"
      },
      useCases: {
        eyebrow: "Use cases",
        title: "Built for the moments when you actually need it.",
        text: "Avareno is useful the day something breaks, moves or has to be returned.",
        items: [
          { icon: <Coffee size={18} />, title: "Everyday", text: "Find a manual or receipt in seconds instead of searching drawers and inboxes." },
          { icon: <Wrench size={18} />, title: "Warranty & repair", text: "Purchase date, warranty end and proof of purchase are ready when support asks for them." },
          { icon: <Truck size={18} />, title: "Moving & insurance", text: "A clear list of your products with receipts and values, in one place." },
          { icon: <House size={18} />, title: "Home & household", text: "Document the household's devices centrally — from the router to the washing machine." }
        ]
      },
      trustHeader: {
        eyebrow: "Trust",
        title: "Your documents stay your documents.",
        text: "Receipts and product data are personal. Avareno stores them for you — private by default, without ads and without selling data."
      },
      securityTrust: [
        { icon: <FileLock2 size={18} />, title: "Private by default", text: "Your products and documents belong to your account and are not publicly visible. There are no public profiles." },
        { icon: <ShieldCheck size={18} />, title: "Honest status", text: "Avareno shows what is stored and what is missing — it never invents data." },
        { icon: <FolderLock size={18} />, title: "Documents stay attached", text: "Receipts and manuals stay tied to the product they belong to, not scattered across folders." }
      ],
      pricingHeader: {
        eyebrow: "Pricing",
        title: "Choose the plan that fits your household",
        text: "Start free, then upgrade when your archive of products, receipts and documents grows.",
        betaNote: "Beta note: these prices are a draft. The beta can be used without payment details; final pricing will be set before launch."
      },
      faqHeader: {
        eyebrow: "FAQ",
        title: "Clear answers for a calmer product.",
        text: "Avareno is designed to reduce real-life uncertainty, so the website should be just as direct."
      },
      faqs: [
        { title: "Is Avareno a notes app?", text: "No. Avareno is structured around real products: receipts, warranties, serial numbers, manuals and reminders." },
        { title: "What happens after I add a product?", text: "Avareno creates a product dossier and keeps receipts, warranty dates, documents and reminders attached to it." },
        { title: "Is the pricing final?", text: "Not yet. The current pricing is a public beta draft. Real billing needs a separate provider, tax, invoice, cancellation and privacy review before launch." },
        { title: "Can I export important information?", text: "Yes. You can already export your data in the beta — as a JSON summary or a ZIP bundle including your documents, from the privacy section of your profile." }
      ],
      finalCta: {
        eyebrow: "Start",
        title: "Your next receipt won't end up just anywhere.",
        text: "Add your first product — with its receipt, warranty and serial number in one place.",
        primary: "Add your first product",
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
      popularBadge: "Recommended"
    };
  }

  return {
    hero: {
      eyebrow: "Avareno",
      title: "Rechnungen, Garantien und Produktdaten.",
      titleLine: "Endlich an einem Ort.",
      body: "Speichere deine Produkte, Belege, Seriennummern und Anleitungen — und finde alles wieder, wenn du es brauchst.",
      primary: "Kostenlos starten",
      secondary: "So funktioniert Avareno",
      actionsAria: "Wichtigste Aktionen",
      trust: "Privat als Standard · Export jederzeit · keine Werbung"
    },
    problem: {
      eyebrow: "Das Problem",
      title: "Deine Produktinformationen sind überall verteilt.",
      closing: "Meistens brauchst du diese Informationen genau dann, wenn du sie nicht findest.",
      items: [
        { icon: <Mail size={17} />, place: "Rechnung", detail: "liegt im E-Mail-Postfach" },
        { icon: <Archive size={17} />, place: "Garantieschein", detail: "liegt in einer Schublade" },
        { icon: <ScanBarcode size={17} />, place: "Seriennummer", detail: "klebt am Gerät" },
        { icon: <Globe size={17} />, place: "Anleitung", detail: "liegt auf der Herstellerseite" },
        { icon: <Store size={17} />, place: "Kaufdatum", detail: "steht im Shopkonto" }
      ]
    },
    transform: {
      eyebrow: "Die Transformation",
      title: "Aus einzelnen Dokumenten wird eine vollständige Produktakte.",
      text: "Avareno ordnet jede Rechnung, Garantie und Anleitung dem Produkt zu, zu dem sie gehört. Das Ergebnis: ein Ort, der die Antworten hat.",
      chips: ["Rechnung", "Garantiekarte", "Seriennummer", "Anleitung", "Erinnerung"],
      akteKicker: "Produktakte",
      akteTitle: "Espressomaschine",
      akteRows: ["Rechnung gespeichert", "Garantie bis 03/2028", "Seriennummer hinterlegt"],
      akteBadge: "Vollständig"
    },
    stepsHeader: {
      eyebrow: "So funktioniert es",
      title: "Drei Schritte. Kein Ablagesystem.",
      text: "Erfasse, was du hast — Avareno hält es beim richtigen Produkt fest."
    },
    steps: [
      ["Produkt erfassen", "Scanne den Barcode oder lege das Produkt manuell an. Nur der Name ist Pflicht."],
      ["Dokumente zuordnen", "Lade Rechnung, Garantie oder Anleitung hoch — sie bleiben beim Produkt."],
      ["Alles wiederfinden", "Suche nach Name, Hersteller oder Seriennummer, wenn du es brauchst."]
    ],
    dossier: {
      eyebrow: "Die Produktakte",
      title: "Alles zu einem Produkt, auf einer Seite.",
      text: "So sieht ein gespeichertes Produkt in Avareno aus — Kaufdaten, Garantie, Dokumente und Erinnerung zusammen.",
      badge: "Beispielansicht",
      product: { name: "Espressomaschine", makerModel: "Aroma Uno · EM-200" },
      meta: [
        { label: "Seriennummer", value: "SN-2026-0148" },
        { label: "Kaufdatum", value: "12. März 2026" },
        { label: "Garantie bis", value: "12. März 2028" },
        { label: "Händler", value: "Elektrofachmarkt" }
      ],
      docsLabel: "Gespeicherte Dokumente",
      docs: [
        { icon: <ReceiptText size={15} />, name: "rechnung.pdf", type: "Beleg" },
        { icon: <ShieldCheck size={15} />, name: "garantiekarte.pdf", type: "Garantie" },
        { icon: <BookOpenText size={15} />, name: "bedienungsanleitung.pdf", type: "Anleitung" }
      ],
      reminderLabel: "Erinnerung",
      reminder: "60 Tage vor Garantieende"
    },
    useCases: {
      eyebrow: "Anwendungsfälle",
      title: "Für die Momente, in denen du es wirklich brauchst.",
      text: "Avareno ist an dem Tag nützlich, an dem etwas kaputtgeht, umzieht oder zurück muss.",
      items: [
        { icon: <Coffee size={18} />, title: "Alltag", text: "Anleitung oder Rechnung in Sekunden finden, statt Schubladen und Postfächer zu durchsuchen." },
        { icon: <Wrench size={18} />, title: "Garantie & Reparatur", text: "Kaufdatum, Garantieende und Kaufnachweis liegen bereit, wenn der Support danach fragt." },
        { icon: <Truck size={18} />, title: "Umzug & Versicherung", text: "Eine klare Liste deiner Produkte mit Belegen und Werten, an einem Ort." },
        { icon: <House size={18} />, title: "Zuhause & Haushalt", text: "Die Geräte des Haushalts zentral dokumentiert — vom Router bis zur Waschmaschine." }
      ]
    },
    trustHeader: {
      eyebrow: "Vertrauen",
      title: "Deine Dokumente bleiben deine Dokumente.",
      text: "Belege und Produktdaten sind persönlich. Avareno speichert sie für dich — privat als Standard, ohne Werbung und ohne Datenverkauf."
    },
    securityTrust: [
      { icon: <FileLock2 size={18} />, title: "Privat als Standard", text: "Deine Produkte und Dokumente gehören zu deinem Konto und sind nicht öffentlich einsehbar. Es gibt keine öffentlichen Profile." },
      { icon: <ShieldCheck size={18} />, title: "Ehrlicher Status", text: "Avareno zeigt, was gespeichert ist und was fehlt — es erfindet keine Daten." },
      { icon: <FolderLock size={18} />, title: "Dokumente bleiben zugeordnet", text: "Belege und Anleitungen bleiben mit dem Produkt verbunden, statt in Ordnern zu verschwinden." }
    ],
    pricingHeader: {
      eyebrow: "Preise",
      title: "Wähle den Plan, der zu deinem Haushalt passt",
      text: "Starte kostenlos und erweitere Avareno, wenn dein Archiv aus Produkten, Belegen und Dokumenten wächst.",
      betaNote: "Beta-Hinweis: Diese Preise sind ein Entwurf. Die Beta ist ohne Zahlungsdaten nutzbar; die endgültige Preisgestaltung wird vor dem Launch festgelegt."
    },
    faqHeader: {
      eyebrow: "FAQ",
      title: "Klare Antworten für ein ruhigeres Produkt.",
      text: "Avareno soll Unsicherheit im Alltag reduzieren. Genau so direkt sollte auch die Website sein."
    },
    faqs: [
      { title: "Ist Avareno eine Notiz-App?", text: "Nein. Avareno ist um echte Produkte herum strukturiert: Rechnungen, Garantien, Seriennummern, Anleitungen und Erinnerungen." },
      { title: "Was passiert nach dem Erfassen?", text: "Avareno legt eine Produktakte an und hält Belege, Garantiedaten, Dokumente und Erinnerungen daran fest." },
      { title: "Sind die Preise final?", text: "Noch nicht. Die aktuellen Preise sind ein öffentlicher Beta-Entwurf. Echte Abrechnung braucht vorher eine eigene Prüfung für Zahlungsanbieter, Steuern, Rechnungen, Kündigung und Datenschutz." },
      { title: "Kann ich wichtige Informationen exportieren?", text: "Ja. Du kannst deine Daten schon in der Beta exportieren — als JSON-Übersicht oder ZIP-Paket inklusive deiner Dokumente, im Privatsphäre-Bereich deines Profils." }
    ],
    finalCta: {
      eyebrow: "Start",
      title: "Deine nächste Rechnung landet nicht mehr irgendwo.",
      text: "Füge dein erstes Produkt hinzu — mit Rechnung, Garantie und Seriennummer an einem Ort.",
      primary: "Erstes Produkt hinzufügen",
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
    popularBadge: "Empfohlen"
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
  const isAuthenticated = auth.status === "authenticated";

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
        {/* 1. Hero */}
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
                <Link className="site-primary-button" to={isAuthenticated ? "/app" : "/signup"}>
                  {copy.hero.primary} <ArrowRight size={16} />
                </Link>
                <a className="site-secondary-button" href="#how-it-works">
                  {copy.hero.secondary}
                </a>
              </Reveal>
              <Reveal as="p" className="site-hero-trust" delay={380}>
                <ShieldCheck size={14} /> {copy.hero.trust}
              </Reveal>
            </div>

            {/* Spatial-product-world hero (see docs/design/spatial-product-world.md). */}
            <Reveal className="site-hero-preview site-hero-preview-spatial" delay={260}>
              <SpatialHero language={language} />
            </Reveal>
          </div>
        </section>

        {/* 2. The problem */}
        <section className="site-section site-problem-section" id="problem" aria-labelledby="problem-title">
          <Reveal>
            <SectionHeader eyebrow={copy.problem.eyebrow} title={copy.problem.title} titleId="problem-title" />
          </Reveal>
          <RevealGroup className="site-problem-grid" stagger={80}>
            {copy.problem.items.map((item) => (
              <article className="site-problem-card" key={item.place}>
                <span className="site-problem-icon">{item.icon}</span>
                <strong>{item.place}</strong>
                <p>{item.detail}</p>
              </article>
            ))}
          </RevealGroup>
          <Reveal as="p" className="site-problem-closing">{copy.problem.closing}</Reveal>
        </section>

        {/* 3. The transformation */}
        <section className="site-section site-transform-section" id="transformation" aria-labelledby="transform-title">
          <Reveal>
            <SectionHeader eyebrow={copy.transform.eyebrow} title={copy.transform.title} text={copy.transform.text} titleId="transform-title" />
          </Reveal>
          <Reveal className="site-transform" aria-hidden="true">
            <div className="site-transform-chips">
              {copy.transform.chips.map((chip, index) => (
                <span className="site-transform-chip" key={chip} style={{ "--i": index } as React.CSSProperties}>
                  {chip}
                </span>
              ))}
            </div>
            <span className="site-transform-arrow">
              <ArrowRight size={20} />
            </span>
            <div className="avdoc-card is-compact">
              <div className="avdoc-head">
                <span className="avdoc-icon"><Coffee size={17} /></span>
                <span>
                  <small>{copy.transform.akteKicker}</small>
                  <strong>{copy.transform.akteTitle}</strong>
                </span>
                <em>{copy.transform.akteBadge}</em>
              </div>
              <ul className="avdoc-rows">
                {copy.transform.akteRows.map((row) => (
                  <li key={row}><Check size={13} /> {row}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* 4. Three steps */}
        <section className="site-section site-steps-section" id="how-it-works" aria-labelledby="steps-title">
          <Reveal>
            <SectionHeader eyebrow={copy.stepsHeader.eyebrow} title={copy.stepsHeader.title} text={copy.stepsHeader.text} titleId="steps-title" />
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

        {/* 5. The product dossier (example view, clearly labelled) */}
        <section className="site-section site-dossier-section" id="produktakte" aria-labelledby="dossier-title">
          <Reveal>
            <SectionHeader eyebrow={copy.dossier.eyebrow} title={copy.dossier.title} text={copy.dossier.text} titleId="dossier-title" />
          </Reveal>
          <Reveal className="avdoc-card is-detail" role="img" aria-label={`${copy.dossier.badge}: ${copy.dossier.product.name}`}>
            <div className="avdoc-head">
              <span className="avdoc-icon"><Coffee size={19} /></span>
              <span>
                <small>{copy.dossier.product.makerModel}</small>
                <strong>{copy.dossier.product.name}</strong>
              </span>
              <em>{copy.dossier.badge}</em>
            </div>
            <dl className="avdoc-meta">
              {copy.dossier.meta.map((entry) => (
                <div key={entry.label}>
                  <dt>{entry.label}</dt>
                  <dd>{entry.value}</dd>
                </div>
              ))}
            </dl>
            <div className="avdoc-docs">
              <small>{copy.dossier.docsLabel}</small>
              <ul>
                {copy.dossier.docs.map((doc) => (
                  <li key={doc.name}>
                    <span className="avdoc-doc-icon">{doc.icon}</span>
                    <strong>{doc.name}</strong>
                    <em>{doc.type}</em>
                  </li>
                ))}
              </ul>
            </div>
            <div className="avdoc-reminder">
              <BellRing size={15} />
              <small>{copy.dossier.reminderLabel}</small>
              <span>{copy.dossier.reminder}</span>
            </div>
          </Reveal>
        </section>

        {/* 6. Use cases */}
        <section className="site-section site-usecase-section" id="use-cases" aria-labelledby="usecase-title">
          <Reveal>
            <SectionHeader eyebrow={copy.useCases.eyebrow} title={copy.useCases.title} text={copy.useCases.text} titleId="usecase-title" />
          </Reveal>
          <RevealGroup className="site-feature-grid site-usecase-grid" stagger={85}>
            {copy.useCases.items.map((item) => (
              <article className="site-feature-card" key={item.title}>
                <span className="site-feature-icon">{item.icon}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </RevealGroup>
        </section>

        {/* 7. Trust */}
        <Reveal as="section" className="site-security-section" id="security" aria-labelledby="security-title">
          <SectionHeader eyebrow={copy.trustHeader.eyebrow} title={copy.trustHeader.title} text={copy.trustHeader.text} titleId="security-title" />
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

        {/* Pricing (public beta draft) */}
        <section className="site-section site-pricing-section" id="pricing" aria-labelledby="pricing-title">
          <Reveal>
            <SectionHeader eyebrow={copy.pricingHeader.eyebrow} title={copy.pricingHeader.title} text={copy.pricingHeader.text} titleId="pricing-title" />
          </Reveal>

          <Reveal as="p" className="site-pricing-beta-note">{copy.pricingHeader.betaNote}</Reveal>

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

        {/* FAQ */}
        <section className="site-section site-faq-section" aria-labelledby="faq-title">
          <Reveal>
            <SectionHeader eyebrow={copy.faqHeader.eyebrow} title={copy.faqHeader.title} text={copy.faqHeader.text} titleId="faq-title" />
          </Reveal>
          <RevealGroup className="site-faq-list" stagger={80}>
            {copy.faqs.map((item, index) => (
              <FaqItem key={item.title} item={item} open={index === 0} />
            ))}
          </RevealGroup>
        </section>

        {/* 8. Closing */}
        <Reveal as="section" className="site-final-cta" aria-labelledby="final-title">
          <p className="site-eyebrow">{copy.finalCta.eyebrow}</p>
          <h2 id="final-title">{copy.finalCta.title}</h2>
          <p>{copy.finalCta.text}</p>
          <div className="site-hero-actions">
            <Link className="site-primary-button" to={isAuthenticated ? "/app/capture/item" : "/signup"}>
              {copy.finalCta.primary} <ArrowRight size={16} />
            </Link>
            <Link className="site-secondary-button" to={isAuthenticated ? "/app" : "/login"}>
              {copy.finalCta.secondary}
            </Link>
          </div>
        </Reveal>
      </main>

      <MarketingFooter />
    </div>
  );
}

function SectionHeader({ eyebrow, title, text, titleId }: { eyebrow: string; title: string; text?: string; titleId?: string }) {
  return (
    <div className="site-section-header">
      <p className="site-eyebrow">{eyebrow}</p>
      <h2 id={titleId}>{title}</h2>
      {text ? <p>{text}</p> : null}
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
