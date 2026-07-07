import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Cookie, FileText, LockKeyhole, Mail, MapPin, Scale, Server, Settings, ShieldCheck } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "../components/MarketingShell";
import { Reveal, RevealGroup } from "../components/MarketingReveal";
import { formatPrice, getYearlySavings, publicPricingPlans, type BillingPeriod } from "../lib/pricing";

const lastUpdated = "7. Juli 2026";

const legalOperator = {
  productName: "Avareno",
  businessName: "SelaPrinting Studio",
  ownerName: "Stefan Weiss",
  street: "Poyßlstraße 1",
  postalCode: "93480",
  city: "Hohenwarth",
  country: "Deutschland",
  email: "hello@avareno.app",
  privacyEmail: "privacy@avareno.app",
  taxNumber: "211/286/61007",
  taxNote: "Kleinunternehmer gemäß § 19 UStG. Es wird keine Umsatzsteuer ausgewiesen."
};

const pricingFaq = [
  {
    title: "Sind die Preise schon final?",
    text: "Die Struktur Free, Personal, Pro und Family ist als Premium-Setup vorbereitet. Vor echter Abrechnung müssen Zahlungsanbieter, Steuern, Rechnungen, Widerruf, Kündigung, Datenverarbeitung und Auftragsverarbeitung final geprüft werden."
  },
  {
    title: "Warum gibt es kein sehr großes Gratis-Kontingent?",
    text: "Avareno speichert private Dokumente und soll langfristig zuverlässig betrieben werden. Ein begrenztes Free-Kontingent hält die Kosten transparent und vermeidet ein Modell, das auf Tracking oder Datenverwertung angewiesen ist."
  },
  {
    title: "Kann ich meine Daten exportieren?",
    text: "Export ist Teil der Produktausrichtung und vor Launch relevant für Vertrauen und DSGVO/GDPR. Die konkrete Umsetzung muss fertig sein, bevor Avareno produktiv wichtige Nutzerdaten verarbeitet."
  },
  {
    title: "Ist Billing schon aktiv?",
    text: "Die technische Grundlage ist für Stripe-Subscriptions vorbereitet. Ohne serverseitige Stripe Checkout Sessions, Price-Auflösung und Webhooks startet Avareno keinen Zahlungslauf."
  }
];

const privacySections = [
  {
    icon: <ShieldCheck size={19} />,
    title: "Verantwortlicher",
    text: `${legalOperator.productName} ist ein Angebot von ${legalOperator.businessName}, ${legalOperator.ownerName}. Die vollständigen Anbieter- und Kontaktdaten stehen im Impressum.`
  },
  {
    icon: <Server size={19} />,
    title: "Hosting und Server-Logs",
    text: "Beim Aufruf der Website können technisch notwendige Server-Logdaten verarbeitet werden, etwa IP-Adresse, Zeitpunkt, angefragte URL, Browserinformationen und Statuscodes."
  },
  {
    icon: <FileText size={19} />,
    title: "App-Inhalte",
    text: "Avareno kann Objekte, Dokumente, Garantien, Erinnerungen, Räume und Notizen speichern. Vor Produktivbetrieb muss festgelegt werden, wo diese Daten liegen und wie lange sie gespeichert bleiben."
  },
  {
    icon: <LockKeyhole size={19} />,
    title: "Rechte der Nutzer",
    text: "Nutzer können je nach Rechtslage Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch verlangen. Kontaktweg und Identitätsprüfung müssen final definiert werden."
  }
];

const cookieRows = [
  {
    name: "Technisch notwendige Speicherung",
    purpose: "Betrieb, Navigation, Sicherheit und Login-Sessions.",
    status: "Aktiv, notwendig"
  },
  {
    name: "Supabase Auth Session",
    purpose: "Supabase speichert die Session im Browser, damit Nutzer eingeloggt bleiben.",
    status: "Aktiv, notwendig"
  },
  {
    name: "Cloudflare Turnstile",
    purpose: "Bot-Schutz für Login und Registrierung. Das Challenge-Token wird an Supabase Auth weitergegeben.",
    status: "Aktiv, Sicherheit"
  },
  {
    name: "Spracheinstellung",
    purpose: "Merkt lokal, ob die Oberfläche auf Deutsch oder Englisch angezeigt werden soll.",
    status: "Aktiv, Komfort"
  },
  {
    name: "Analyse",
    purpose: "Produktverbesserung durch aggregierte Nutzungsdaten.",
    status: "Nicht aktiv"
  },
  {
    name: "Marketing",
    purpose: "Kampagnen, Retargeting oder externe Werbeprofile.",
    status: "Nicht aktiv"
  }
];

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Avareno`;
  }, [title]);
}

function MarketingPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="avareno-page">
      <MarketingHeader />
      <main className="avareno-standard-page">{children}</main>
      <MarketingFooter />
    </div>
  );
}

function StandardHero({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children?: ReactNode }) {
  return (
    <section className="avareno-standard-hero">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{text}</span>
      </div>
      {children}
    </section>
  );
}

function DraftNotice() {
  return (
    <aside className="avareno-draft-notice">
      <Scale size={20} />
      <div>
        <strong>Rechtlicher Hinweis</strong>
        <p>Diese Angaben bilden den aktuellen Betreiberstand ab, ersetzen aber keine Rechtsberatung. Vor Paid Launch bitte Impressum, Datenschutz, AGB, Widerruf, Steuern und Rechnungsangaben fachlich prüfen lassen.</p>
      </div>
    </aside>
  );
}

function BillingPeriodSwitch({ value, onChange }: { value: BillingPeriod; onChange: (value: BillingPeriod) => void }) {
  return (
    <div className="avareno-billing-switch" aria-label="Abrechnungszeitraum">
      <button aria-pressed={value === "monthly"} className={value === "monthly" ? "is-active" : ""} onClick={() => onChange("monthly")} type="button">
        Monatlich
      </button>
      <button aria-pressed={value === "yearly"} className={value === "yearly" ? "is-active" : ""} onClick={() => onChange("yearly")} type="button">
        Jährlich <span>jährlich günstiger</span>
      </button>
    </div>
  );
}

function PricingFaqItem({ item, open = false }: { item: { title: string; text: string }; open?: boolean }) {
  const [isOpen, setIsOpen] = useState(open);

  return (
    <article className={isOpen ? "avareno-faq-item is-open" : "avareno-faq-item"}>
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

export function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  usePageTitle("Preise");
  const periodLabel = billingPeriod === "yearly" ? "/Jahr" : "/Monat";
  const pricingPlans = publicPricingPlans();

  return (
    <MarketingPageFrame>
      <Reveal>
        <StandardHero
          eyebrow="Preise"
          title="Wähle den Speicher, der zu deinem Alltag passt"
          text="Starte kostenlos und erweitere Avareno, wenn dein privater Speicher für Objekte, Belege, Garantien und offene Punkte wächst."
        >
          <div className="avareno-price-signal">
            <span>Stripe-ready</span>
            <strong>Lookup Keys statt Live Price IDs in der UI</strong>
          </div>
        </StandardHero>
      </Reveal>

      <Reveal>
        <BillingPeriodSwitch value={billingPeriod} onChange={setBillingPeriod} />
      </Reveal>

      <RevealGroup as="section" className="avareno-pricing-grid" aria-label="Avareno Preispläne" stagger={90}>
        {pricingPlans.map((plan) => (
          <article className={plan.isPopular ? "avareno-pricing-card is-highlighted" : "avareno-pricing-card"} key={plan.id}>
            <div className="avareno-pricing-card-head">
              <p>{plan.name}</p>
              {plan.isPopular ? <span>Empfohlen</span> : null}
            </div>
            <h2>{formatPrice(plan.prices[billingPeriod].amount, plan.currency, "de-DE")}<span>{periodLabel}</span></h2>
            {billingPeriod === "yearly" && getYearlySavings(plan.id) > 0 ? (
              <p className="avareno-pricing-saving">Spare {formatPrice(getYearlySavings(plan.id), plan.currency, "de-DE")} pro Jahr</p>
            ) : null}
            <small>{plan.description.de}</small>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature.id}>
                  <Check size={16} />
                  {feature.label.de}
                </li>
              ))}
            </ul>
            {plan.id === "free" ? (
              <Link className="avareno-secondary-cta" to={plan.ctaHref}>
                {plan.ctaLabel.de} <ArrowRight size={16} />
              </Link>
            ) : (
              <Link className={plan.isPopular ? "avareno-primary-cta" : "avareno-secondary-cta"} to={`/checkout/${plan.id}?interval=${billingPeriod}`}>
                {plan.ctaLabel.de} <ArrowRight size={16} />
              </Link>
            )}
          </article>
        ))}
      </RevealGroup>

      <Reveal as="section" className="avareno-standard-panel">
        <div className="avareno-standard-copy">
          <p>FAQ</p>
          <h2>Was vor dem Launch noch festgelegt wird.</h2>
        </div>
        <div className="avareno-faq-list">
          {pricingFaq.map((item, index) => (
            <PricingFaqItem key={item.title} item={item} open={index === 0} />
          ))}
        </div>
      </Reveal>
    </MarketingPageFrame>
  );
}

export function ImpressumPage() {
  usePageTitle("Impressum");

  return (
    <MarketingPageFrame>
      <StandardHero
        eyebrow="Impressum"
        title="Anbieterkennzeichnung."
        text={`${legalOperator.productName} ist ein Angebot von ${legalOperator.businessName}, ${legalOperator.ownerName}.`}
      >
        <DraftNotice />
      </StandardHero>

      <section className="avareno-legal-grid">
        <article className="avareno-legal-card">
          <MapPin size={21} />
          <h2>Angaben gemäß Anbieterkennzeichnung</h2>
          <dl>
            <div>
              <dt>Anbieter</dt>
              <dd>
                {legalOperator.businessName}<br />
                {legalOperator.ownerName}<br />
                {legalOperator.productName} ist ein Angebot von {legalOperator.businessName}.
              </dd>
            </div>
            <div>
              <dt>Anschrift</dt>
              <dd>
                {legalOperator.street}<br />
                {legalOperator.postalCode} {legalOperator.city}<br />
                {legalOperator.country}
              </dd>
            </div>
            <div>
              <dt>Inhaber</dt>
              <dd>{legalOperator.ownerName}</dd>
            </div>
          </dl>
        </article>

        <article className="avareno-legal-card">
          <Mail size={21} />
          <h2>Kontakt und Steuer</h2>
          <dl>
            <div>
              <dt>E-Mail</dt>
              <dd><a href={`mailto:${legalOperator.email}`}>{legalOperator.email}</a></dd>
            </div>
            <div>
              <dt>Datenschutz</dt>
              <dd><a href={`mailto:${legalOperator.privacyEmail}`}>{legalOperator.privacyEmail}</a></dd>
            </div>
            <div>
              <dt>Steuer</dt>
              <dd>
                Steuernummer: {legalOperator.taxNumber}<br />
                {legalOperator.taxNote}
              </dd>
            </div>
          </dl>
        </article>

        <article className="avareno-legal-card avareno-legal-card-wide">
          <Scale size={21} />
          <h2>Verantwortung für Inhalte</h2>
          <p>
            Die Inhalte dieser Website werden mit Sorgfalt erstellt. Für Vollständigkeit, Richtigkeit und Aktualität kann keine Gewähr übernommen werden.
          </p>
          <p>
            Vor dem öffentlichen Paid Launch sollten Haftung, Streitbeilegung, Widerruf, Kündigung, AGB und externe Links passend zur Betreiberstruktur final geprüft werden.
          </p>
        </article>
      </section>
    </MarketingPageFrame>
  );
}

export function DatenschutzPage() {
  usePageTitle("Datenschutz");

  return (
    <MarketingPageFrame>
      <StandardHero
        eyebrow="Datenschutz"
        title="Datenschutz transparent vorbereiten."
        text="Avareno arbeitet mit Objekten, Dokumenten und Erinnerungen. Genau deshalb muss die Datenschutzerklärung vor dem Launch konkret und verständlich sein."
      >
        <DraftNotice />
      </StandardHero>

      <section className="avareno-standard-panel">
        <div className="avareno-standard-copy">
          <p>Stand</p>
          <h2>{lastUpdated}</h2>
        </div>
        <div className="avareno-privacy-list">
          {privacySections.map((section) => (
            <article key={section.title}>
              <span>{section.icon}</span>
              <div>
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="avareno-legal-grid">
        <article className="avareno-legal-card">
          <h2>Rechtsgrundlagen</h2>
          <p>
            Je nach Funktion kommen Vertragserfüllung, berechtigte Interessen, Einwilligung oder gesetzliche Pflichten als Rechtsgrundlage in Betracht. Die konkrete Zuordnung muss mit der finalen Produktarchitektur abgeglichen werden.
          </p>
        </article>
        <article className="avareno-legal-card">
          <h2>Empfänger und Dienste</h2>
          <p>
            Aktuell sind Supabase Auth für Login-Sessions und Cloudflare Turnstile für Bot-Schutz eingebunden. Stripe verarbeitet Zahlungs- und Rechnungsdaten erst, wenn Nutzer einen kostenpflichtigen Plan über Checkout abschließen. Analyse-, Marketing-, KI- oder weitere Speicheranbieter müssen vor Launch konkret benannt werden.
          </p>
        </article>
        <article className="avareno-legal-card">
          <h2>Speicherdauer</h2>
          <p>
            Daten sollten nur so lange gespeichert werden, wie sie für Konto, Produktgedächtnis, Garantie, Support oder gesetzliche Pflichten notwendig sind. Lösch- und Exportflows sollten technisch vorgesehen werden.
          </p>
        </article>
        <article className="avareno-legal-card">
          <h2>Kontakt für Datenschutz</h2>
          <p>
            Datenschutzanfragen können an <a href={`mailto:${legalOperator.privacyEmail}`}>{legalOperator.privacyEmail}</a> gerichtet werden. Verantwortlich ist {legalOperator.ownerName}, {legalOperator.businessName}, {legalOperator.street}, {legalOperator.postalCode} {legalOperator.city}.
          </p>
        </article>
      </section>
    </MarketingPageFrame>
  );
}

export function CookiesPage() {
  usePageTitle("Cookies");

  return (
    <MarketingPageFrame>
      <StandardHero
        eyebrow="Cookies"
        title="Weniger Tracking, mehr Klarheit."
        text="Diese Seite dokumentiert, welche Speicherung Avareno vorbereitet und was aktuell nicht aktiv ist."
      >
        <div className="avareno-cookie-badge">
          <Cookie size={22} />
          <span>Keine Analyse- oder Marketing-Cookies im aktuellen Frontend aktiv</span>
        </div>
      </StandardHero>

      <section className="avareno-cookie-table" aria-label="Cookie Kategorien">
        {cookieRows.map((row) => (
          <article key={row.name}>
            <div>
              <h2>{row.name}</h2>
              <p>{row.purpose}</p>
            </div>
            <span>{row.status}</span>
          </article>
        ))}
      </section>

      <section className="avareno-standard-panel">
        <div className="avareno-standard-copy">
          <p>Einwilligung</p>
          <h2>Cookie-Banner erst einbauen, wenn er wirklich gebraucht wird.</h2>
        </div>
        <div className="avareno-cookie-settings">
          <Settings size={24} />
          <p>
            Technisch notwendige Speicherung für Login und Sicherheit braucht keinen Marketing-Consent, muss aber transparent erklärt werden. Sobald Analyse, Marketing, externe Medien oder ähnliche Dienste hinzukommen, sollte ein Consent-Flow mit echten Kategorien und Widerruf eingebaut werden.
          </p>
        </div>
      </section>
    </MarketingPageFrame>
  );
}
