import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Cookie, FileText, LockKeyhole, Mail, MapPin, Scale, Server, Settings, ShieldCheck } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "../components/MarketingShell";

const lastUpdated = "24. Juni 2026";

const pricingPlans = [
  {
    name: "Free",
    price: "0 EUR",
    note: "Zum Ausprobieren und fuer die ersten Dinge.",
    features: ["20 Dinge", "Basis-Dokumente", "Manuelle Erinnerungen", "Lokale Demo-Nutzung"],
    cta: "Kostenlos starten",
    highlighted: false
  },
  {
    name: "Home",
    price: "6 EUR",
    note: "Fuer Haushalte, Belege, Garantien und gemeinsame Verantwortung.",
    features: ["Unbegrenzte Dinge", "Garantie- und Care-Loops", "Haushaltsmitglieder", "Export fuer Support-Faelle"],
    cta: "Home waehlen",
    highlighted: true
  },
  {
    name: "Family",
    price: "12 EUR",
    note: "Fuer Familien, mehrere Orte und spaetere Rollen/Rechte.",
    features: ["Mehrere Haushalte", "Rollen und Freigaben", "Priorisierte Erinnerungen", "Erweiterte Objekt-Historie"],
    cta: "Family vormerken",
    highlighted: false
  }
];

const pricingFaq = [
  {
    title: "Ist das Pricing schon final?",
    text: "Nein. Die Seite ist als Produkt- und Website-Struktur vorbereitet. Preise und Limits koennen spaeter an das echte Geschaeftsmodell angepasst werden."
  },
  {
    title: "Gibt es eine mobile App?",
    text: "Das Layout ist mobile-first vorbereitet. Die Web-App bleibt aktuell die Produktbasis, kann aber spaeter als mobile App oder PWA weitergefuehrt werden."
  },
  {
    title: "Kann ich meine Daten exportieren?",
    text: "Der Produktgedanke sieht Exporte fuer Support, Garantie und eigene Sicherungen vor. Die technische Umsetzung sollte vor Launch final definiert werden."
  }
];

const privacySections = [
  {
    icon: <ShieldCheck size={19} />,
    title: "Verantwortlicher",
    text: "Verantwortlich fuer diese Website und App ist der unten im Impressum genannte Anbieter. Bitte Namen, Anschrift und Kontaktadresse vor einem echten Launch ergaenzen."
  },
  {
    icon: <Server size={19} />,
    title: "Hosting und Server-Logs",
    text: "Beim Aufruf der Website koennen technisch notwendige Server-Logdaten verarbeitet werden, etwa IP-Adresse, Zeitpunkt, angefragte URL, Browserinformationen und Statuscodes."
  },
  {
    icon: <FileText size={19} />,
    title: "App-Inhalte",
    text: "Avareno kann Dinge, Dokumente, Garantien, Erinnerungen, Raeume und Notizen speichern. Vor Produktivbetrieb muss festgelegt werden, wo diese Daten liegen und wie lange sie gespeichert bleiben."
  },
  {
    icon: <LockKeyhole size={19} />,
    title: "Rechte der Nutzer",
    text: "Nutzer koennen je nach Rechtslage Auskunft, Berichtigung, Loeschung, Einschraenkung, Datenuebertragbarkeit und Widerspruch verlangen. Kontaktweg und Identitaetspruefung muessen final definiert werden."
  }
];

const cookieRows = [
  {
    name: "Technisch notwendige Speicherung",
    purpose: "Betrieb, Navigation, Sicherheit und spaetere Login-Sessions.",
    status: "Vorbereitet"
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
        <strong>Entwurf fuer den Launch</strong>
        <p>Die Inhalte sind strukturiert vorbereitet, aber keine Rechtsberatung. Vor Veroeffentlichung bitte echte Anbieter-, Hosting- und Verarbeitungsdaten eintragen und rechtlich pruefen lassen.</p>
      </div>
    </aside>
  );
}

export function PricingPage() {
  usePageTitle("Preise");

  return (
    <MarketingPageFrame>
      <StandardHero
        eyebrow="Pricing"
        title="Ein klares Modell fuer dein Zuhause."
        text="Avareno startet einfach und kann spaeter mit Haushalten, Rollen, Familien und mehr Orten wachsen."
      >
        <div className="avareno-price-signal">
          <span>Beta</span>
          <strong>Preise als MVP-Entwurf</strong>
        </div>
      </StandardHero>

      <section className="avareno-pricing-grid" aria-label="Avareno Preisplaene">
        {pricingPlans.map((plan) => (
          <article className={plan.highlighted ? "avareno-pricing-card is-highlighted" : "avareno-pricing-card"} key={plan.name}>
            <p>{plan.name}</p>
            <h2>{plan.price}<span>/Monat</span></h2>
            <small>{plan.note}</small>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={16} />
                  {feature}
                </li>
              ))}
            </ul>
            <Link className={plan.highlighted ? "avareno-primary-cta" : "avareno-secondary-cta"} to="/app">
              {plan.cta} <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </section>

      <section className="avareno-standard-panel">
        <div className="avareno-standard-copy">
          <p>FAQ</p>
          <h2>Was vor dem Launch noch festgelegt wird.</h2>
        </div>
        <div className="avareno-faq-list">
          {pricingFaq.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
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
        text="Diese Seite ist als saubere Struktur vorbereitet. Die konkreten Angaben muessen vor dem oeffentlichen Launch ergaenzt werden."
      >
        <DraftNotice />
      </StandardHero>

      <section className="avareno-legal-grid">
        <article className="avareno-legal-card">
          <MapPin size={21} />
          <h2>Angaben gemaess Anbieterkennzeichnung</h2>
          <dl>
            <div>
              <dt>Anbieter</dt>
              <dd>Avareno / [Name oder Firma ergaenzen]</dd>
            </div>
            <div>
              <dt>Anschrift</dt>
              <dd>[Strasse und Hausnummer], [PLZ Ort], [Land]</dd>
            </div>
            <div>
              <dt>Vertreten durch</dt>
              <dd>[Vertretungsberechtigte Person ergaenzen]</dd>
            </div>
          </dl>
        </article>

        <article className="avareno-legal-card">
          <Mail size={21} />
          <h2>Kontakt</h2>
          <dl>
            <div>
              <dt>E-Mail</dt>
              <dd>hello@avareno.app</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd>[optional ergaenzen]</dd>
            </div>
            <div>
              <dt>Register / USt-ID</dt>
              <dd>[falls vorhanden ergaenzen]</dd>
            </div>
          </dl>
        </article>

        <article className="avareno-legal-card avareno-legal-card-wide">
          <Scale size={21} />
          <h2>Verantwortung fuer Inhalte</h2>
          <p>
            Die Inhalte dieser Website werden mit Sorgfalt erstellt. Fuer Vollstaendigkeit, Richtigkeit und Aktualitaet kann in diesem Entwurfsstand keine Gewaehr uebernommen werden.
          </p>
          <p>
            Sobald Avareno oeffentlich betrieben wird, sollten Haftung, Streitbeilegung, redaktionelle Verantwortung und externe Links passend zur Betreiberstruktur final formuliert werden.
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
        text="Avareno arbeitet mit Dingen, Dokumenten und Erinnerungen. Genau deshalb muss die Datenschutzerklaerung vor dem Launch konkret und verstaendlich sein."
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
            Je nach Funktion kommen Vertragserfuellung, berechtigte Interessen, Einwilligung oder gesetzliche Pflichten als Rechtsgrundlage in Betracht. Die konkrete Zuordnung muss mit der finalen Produktarchitektur abgeglichen werden.
          </p>
        </article>
        <article className="avareno-legal-card">
          <h2>Empfaenger und Dienste</h2>
          <p>
            Aktuell sind im Frontend keine Analyse-, Marketing- oder Cookie-Dienste verdrahtet. Hosting, Datenbank, E-Mail, KI- oder Speicheranbieter muessen vor Launch konkret benannt werden.
          </p>
        </article>
        <article className="avareno-legal-card">
          <h2>Speicherdauer</h2>
          <p>
            Daten sollten nur so lange gespeichert werden, wie sie fuer Konto, Produktgedaechtnis, Garantie, Support oder gesetzliche Pflichten notwendig sind. Loesch- und Exportflows sollten technisch vorgesehen werden.
          </p>
        </article>
        <article className="avareno-legal-card">
          <h2>Kontakt fuer Datenschutz</h2>
          <p>
            Datenschutzanfragen koennen spaeter ueber eine dedizierte Adresse wie privacy@avareno.app laufen. Die Adresse muss erreichbar und organisatorisch betreut sein.
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
          <span>Keine Analyse- oder Marketing-Cookies im aktuellen Frontend gefunden</span>
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
          <p>Consent</p>
          <h2>Cookie-Banner erst einbauen, wenn er wirklich gebraucht wird.</h2>
        </div>
        <div className="avareno-cookie-settings">
          <Settings size={24} />
          <p>
            Technisch notwendige Speicherung darf separat behandelt werden. Sobald Analyse, Marketing, externe Medien oder aehnliche Dienste hinzukommen, sollte ein Consent-Flow mit echten Kategorien und Widerruf eingebaut werden.
          </p>
        </div>
      </section>
    </MarketingPageFrame>
  );
}
