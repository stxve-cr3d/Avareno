import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketingFooter, MarketingHeader } from "../components/MarketingShell";
import { Reveal } from "../components/MarketingReveal";
import { SpatialHero } from "../components/SpatialHero";
import {
  BetaPricing,
  DocumentsShowcase,
  FAQSection,
  FinalCTA,
  HowItWorks,
  ProblemScene,
  ProductArchiveTransformation,
  ProductRecordShowcase,
  TrustSection,
  UseCases,
  WarrantyShowcase
} from "../components/marketing/MarketingSections";
import { useAuth } from "../lib/authProvider";
import { betaFeatures } from "../lib/betaFeatures";
import { useLanguage } from "../lib/language";

const landingCopy = {
  de: {
    hero: {
      eyebrow: "Dein persönliches Produktarchiv",
      title: "Alles, was zu deinen Produkten gehört.",
      titleLine: "Endlich an einem Ort.",
      body: "Speichere Produkte, Rechnungen, Garantien, Seriennummern und Anleitungen und finde alles wieder, wenn du es brauchst.",
      primary: "Beta-Zugang erhalten",
      secondary: "So funktioniert Avareno",
      trust: "Geschlossene Beta · Keine Zahlungsdaten erforderlich"
    },
    problem: {
      eyebrow: "Das alltägliche Problem",
      title: "Deine Produktinformationen sind überall verteilt.",
      text: "Ein Kauf hinterlässt mehr als nur ein Produkt. Die wichtigen Details verschwinden jedoch in verschiedenen Orten und Konten.",
      closing: "Meistens brauchst du diese Informationen genau dann, wenn du sie nicht findest.",
      items: [
        "Rechnung im E-Mail-Postfach",
        "Garantieschein in einer Schublade",
        "Seriennummer direkt am Produkt",
        "Kaufdatum im Shopkonto",
        "Erinnerung im Kalender",
        "Anleitung auf der Herstellerseite"
      ]
    },
    transformation: {
      eyebrow: "Von verstreut zu vollständig",
      title: "Aus verstreuten Informationen wird eine vollständige Produktakte.",
      text: "Avareno verbindet das reale Produkt mit den Informationen, die später wichtig werden — nachvollziehbar und an einem ruhigen Ort.",
      steps: ["Produkt erfassen", "Dokumente zuordnen", "Informationen ergänzen", "Produktakte vervollständigen"],
      recordLabel: "Digitale Produktakte",
      product: "Espressomaschine",
      complete: "Vollständig",
      rows: ["Rechnung gespeichert", "Seriennummer hinterlegt", "Garantie bis März 2028", "Anleitung zugeordnet"]
    },
    how: {
      eyebrow: "So funktioniert Avareno",
      title: "Drei klare Schritte. Kein eigenes Ablagesystem.",
      text: "Du erfasst nur, was zu deinem Produkt gehört. Avareno hält die Verbindung für dich fest.",
      steps: [
        { title: "Produkt hinzufügen", text: "Erfasse ein Produkt manuell oder per Barcode. Der Produktname genügt für den Anfang." },
        { title: "Dokumente zuordnen", text: "Speichere Rechnung, Garantie, Anleitung und weitere Unterlagen direkt beim Produkt." },
        { title: "Alles wiederfinden", text: "Suche später nach Produkt, Modell, Seriennummer oder dem zugeordneten Dokument." }
      ]
    },
    productRecord: {
      eyebrow: "Die Produktakte",
      title: "Alles, was zu deinem Produkt gehört.",
      text: "Die echte Avareno-Struktur bringt Kaufdaten, Garantie, Dokumente und offene Angaben in einer verständlichen Ansicht zusammen.",
      example: "Beispielansicht",
      product: "Espressomaschine",
      makerModel: "Aroma Uno · EM-200",
      fields: [
        { label: "Hersteller", value: "Aroma Uno" },
        { label: "Modell", value: "EM-200" },
        { label: "Seriennummer", value: "SN-2026-0148" },
        { label: "Kaufdatum", value: "12. März 2026" },
        { label: "Garantieende", value: "12. März 2028" },
        { label: "Kaufpreis", value: "Fehlt noch", tone: "warning" as const }
      ],
      documents: "Dokumente",
      reminders: "Erinnerungen",
      missing: "1 Angabe fehlt",
      documentNames: ["rechnung.pdf", "garantienachweis.pdf", "bedienungsanleitung.pdf"]
    },
    documents: {
      eyebrow: "Dokumente am richtigen Ort",
      title: "Rechnung, Garantie und Anleitung direkt beim Produkt.",
      text: "Unterlagen werden nicht zu einem anonymen Dateistapel. Ihre Zuordnung zum Produkt bleibt sichtbar.",
      labels: ["Rechnung", "Garantienachweis", "Anleitung", "Weiteres Dokument"],
      privateNote: "Privater Zugriff über dein persönliches Konto"
    },
    warranty: {
      eyebrow: "Garantie & Erinnerung",
      title: "Wichtige Fristen bleiben im Blick.",
      text: "Avareno zeigt vorhandene und fehlende Garantiedaten ruhig nebeneinander — ohne eine rechtliche Garantieentscheidung vorzugeben.",
      statuses: [
        { label: "Aktive Garantie", value: "bis 12. März 2028", tone: "good" as const },
        { label: "Endet bald", value: "noch 42 Tage", tone: "warning" as const },
        { label: "Garantie unbekannt", value: "Zeitraum ergänzen", tone: "neutral" as const },
        { label: "Eigene Erinnerung", value: "60 Tage vorher", tone: "info" as const }
      ],
      note: "Kaufdatum und Garantiezeitraum können jederzeit ergänzt oder korrigiert werden."
    },
    useCases: {
      eyebrow: "Wenn es darauf ankommt",
      title: "Für echte Situationen im Alltag.",
      text: "Avareno ist kein Dashboard für Zahlen. Es hilft in den Momenten, in denen konkrete Produktinformationen fehlen.",
      items: [
        { title: "Reparatur", text: "Rechnung, Seriennummer und Garantie sind sofort griffbereit." },
        { title: "Umzug", text: "Wichtige Geräte und Dokumente bleiben übersichtlich gesammelt." },
        { title: "Versicherung", text: "Produktinformationen und vorhandene Nachweise sind leichter auffindbar." },
        { title: "Alltag", text: "Anleitungen und Kaufdaten nicht mehr in E-Mails und Ordnern suchen." }
      ]
    },
    trust: {
      eyebrow: "Vertrauen",
      title: "Persönliche Dokumente verdienen einen privaten Ort.",
      text: "Avareno kommuniziert nur, was technisch bereits bestätigt ist. Keine Cyber-Versprechen, keine öffentlichen Profile.",
      items: [
        { title: "Nicht öffentlich", text: "Produkte und Dokumente sind nicht öffentlich zugänglich." },
        { title: "Kontogebundener Zugriff", text: "Der Zugriff auf private Inhalte ist an das persönliche Konto gebunden." },
        { title: "Export und Löschung", text: "Daten können in der Beta exportiert und das Konto kann gelöscht werden; Provider- und Backup-Retention bleiben transparent offen." },
        { title: "Keine automatische Analyse", text: "Receipt Extraction und automatische Dokumentverarbeitung sind in der geschlossenen Beta deaktiviert." }
      ]
    },
    beta: {
      eyebrow: "Preise & Beta",
      title: "Starte kostenlos in der geschlossenen Beta.",
      text: "Während der Beta kannst du Avareno ohne Zahlungsdaten testen. Tarife und Preise werden erst vor einem späteren Paid Launch verbindlich.",
      note: "Kostenlos · invite-only · keine Zahlungsdaten",
      cta: "Beta-Zugang erhalten"
    },
    faq: {
      eyebrow: "FAQ",
      title: "Klare Antworten vor deinem ersten Produkt.",
      text: "Die wichtigsten Fragen zur geschlossenen Beta, zu Dokumenten und zu deinem Zugriff.",
      items: [
        { title: "Was ist Avareno?", text: "Avareno ist ein persönliches Archiv für reale Produkte und die dazugehörigen Rechnungen, Garantien, Seriennummern, Anleitungen und Erinnerungen." },
        { title: "Welche Produkte kann ich speichern?", text: "Du kannst Alltagsprodukte und Geräte manuell oder per Barcode erfassen und ihre Angaben später ergänzen." },
        { title: "Kann ich Rechnungen und Garantien hochladen?", text: "Ja. Dokumentuploads sind in der Beta aktiv und Unterlagen können direkt einem Produkt zugeordnet werden." },
        { title: "Sind meine Dokumente öffentlich?", text: "Nein. Produkte und Dokumente sind nicht öffentlich zugänglich; der Zugriff ist an dein persönliches Konto gebunden." },
        { title: "Funktioniert Avareno auch auf dem Smartphone?", text: "Ja. Die Webanwendung ist responsiv aufgebaut und kann auf Smartphone, Tablet und Desktop verwendet werden." },
        { title: "Kostet die Beta etwas?", text: "Nein. Die geschlossene Beta kann ohne Zahlungsdaten getestet werden." },
        { title: "Kann ich meine Daten exportieren oder löschen?", text: "Ja. Ein lokaler JSON-/ZIP-Export und die aktive Kontolöschung sind implementiert. Produktions-Backups und Provider-Retention bleiben vor Launch gesondert zu klären." },
        { title: "Werden Dokumente automatisch analysiert?", text: "Nein. Receipt Extraction und automatische Dokumentverarbeitung sind in der geschlossenen Beta deaktiviert." },
        { title: "Wie erhalte ich Zugang zur Beta?", text: "Avareno ist invite-only. Neue Konten werden für die geschlossene Beta gezielt bereitgestellt; mit einem vorhandenen Zugang kannst du dich direkt einloggen." }
      ]
    },
    final: {
      eyebrow: "Deine erste Produktakte",
      title: "Deine nächste Rechnung landet nicht mehr irgendwo.",
      text: "Erstelle deine erste digitale Produktakte mit Avareno.",
      cta: "Beta-Zugang erhalten"
    }
  },
  en: {
    hero: {
      eyebrow: "Your personal product archive",
      title: "Everything that belongs to your products.",
      titleLine: "Finally in one place.",
      body: "Save products, receipts, warranties, serial numbers and manuals — and find everything again when you need it.",
      primary: "Get beta access",
      secondary: "How Avareno works",
      trust: "Closed beta · No payment details required"
    },
    problem: {
      eyebrow: "The everyday problem",
      title: "Your product information is scattered everywhere.",
      text: "A purchase leaves behind more than a product. The important details disappear across different places and accounts.",
      closing: "Usually you need this information exactly when you cannot find it.",
      items: ["Receipt in your inbox", "Warranty slip in a drawer", "Serial number on the product", "Purchase date in a shop account", "Reminder in a calendar", "Manual on a manufacturer website"]
    },
    transformation: {
      eyebrow: "From scattered to complete",
      title: "Scattered information becomes one complete product dossier.",
      text: "Avareno connects the physical product with the information that matters later — clearly and in one calm place.",
      steps: ["Add the product", "Attach documents", "Complete the information", "Finish the product dossier"],
      recordLabel: "Digital product dossier",
      product: "Espresso machine",
      complete: "Complete",
      rows: ["Receipt saved", "Serial number stored", "Warranty until March 2028", "Manual attached"]
    },
    how: {
      eyebrow: "How Avareno works",
      title: "Three clear steps. No filing system.",
      text: "You capture only what belongs to the product. Avareno keeps the connection in place.",
      steps: [
        { title: "Add a product", text: "Create a product manually or by barcode. Its name is enough to begin." },
        { title: "Attach documents", text: "Save the receipt, warranty, manual and other files directly with the product." },
        { title: "Find everything again", text: "Search later by product, model, serial number or its attached document." }
      ]
    },
    productRecord: {
      eyebrow: "The product dossier",
      title: "Everything that belongs to your product.",
      text: "Avareno's real structure brings purchase data, warranty, documents and missing details into one understandable view.",
      example: "Example view",
      product: "Espresso machine",
      makerModel: "Aroma Uno · EM-200",
      fields: [
        { label: "Manufacturer", value: "Aroma Uno" },
        { label: "Model", value: "EM-200" },
        { label: "Serial number", value: "SN-2026-0148" },
        { label: "Purchase date", value: "March 12, 2026" },
        { label: "Warranty end", value: "March 12, 2028" },
        { label: "Purchase price", value: "Still missing", tone: "warning" as const }
      ],
      documents: "Documents",
      reminders: "Reminders",
      missing: "1 detail missing",
      documentNames: ["receipt.pdf", "warranty-proof.pdf", "manual.pdf"]
    },
    documents: {
      eyebrow: "Documents in the right place",
      title: "Receipt, warranty and manual directly with the product.",
      text: "Files do not become an anonymous pile. Their connection to the product stays visible.",
      labels: ["Receipt", "Warranty proof", "Manual", "Other document"],
      privateNote: "Private access through your personal account"
    },
    warranty: {
      eyebrow: "Warranty & reminders",
      title: "Important dates stay in view.",
      text: "Avareno shows known and missing warranty details side by side — without making a legal warranty decision.",
      statuses: [
        { label: "Active warranty", value: "until March 12, 2028", tone: "good" as const },
        { label: "Ending soon", value: "42 days left", tone: "warning" as const },
        { label: "Warranty unknown", value: "Add a period", tone: "neutral" as const },
        { label: "Personal reminder", value: "60 days before", tone: "info" as const }
      ],
      note: "Purchase date and warranty period can be added or corrected at any time."
    },
    useCases: {
      eyebrow: "When it matters",
      title: "For real everyday situations.",
      text: "Avareno is not a dashboard for numbers. It helps in the moments when specific product information is missing.",
      items: [
        { title: "Repair", text: "Receipt, serial number and warranty are ready immediately." },
        { title: "Moving", text: "Important devices and documents stay clearly collected." },
        { title: "Insurance", text: "Product information and existing proof are easier to locate." },
        { title: "Everyday life", text: "Stop searching emails and folders for manuals and purchase details." }
      ]
    },
    trust: {
      eyebrow: "Trust",
      title: "Personal documents deserve a private place.",
      text: "Avareno communicates only what is technically confirmed. No cyber promises and no public profiles.",
      items: [
        { title: "Not public", text: "Products and documents are not publicly accessible." },
        { title: "Account-bound access", text: "Access to private content is tied to the personal account." },
        { title: "Export and deletion", text: "Beta data can be exported and the account can be deleted; provider and backup retention remain transparently open." },
        { title: "No automatic analysis", text: "Receipt Extraction and automatic document processing are disabled in the closed beta." }
      ]
    },
    beta: {
      eyebrow: "Pricing & beta",
      title: "Start free in the closed beta.",
      text: "You can test Avareno without payment details during the beta. Plans and prices will only become binding before a later paid launch.",
      note: "Free · invite-only · no payment details",
      cta: "Get beta access"
    },
    faq: {
      eyebrow: "FAQ",
      title: "Clear answers before your first product.",
      text: "The most important questions about the closed beta, documents and your access.",
      items: [
        { title: "What is Avareno?", text: "Avareno is a personal archive for physical products and their receipts, warranties, serial numbers, manuals and reminders." },
        { title: "Which products can I save?", text: "You can add everyday products and devices manually or by barcode, then complete their details later." },
        { title: "Can I upload receipts and warranties?", text: "Yes. Document uploads are active in the beta and files can be attached directly to a product." },
        { title: "Are my documents public?", text: "No. Products and documents are not publicly accessible; access is tied to your personal account." },
        { title: "Does Avareno work on a smartphone?", text: "Yes. The web app is responsive and works on phones, tablets and desktop computers." },
        { title: "Does the beta cost anything?", text: "No. The closed beta can be tested without payment details." },
        { title: "Can I export or delete my data?", text: "Yes. Local JSON/ZIP export and active account deletion are implemented. Production backups and provider retention still require separate launch review." },
        { title: "Are documents analysed automatically?", text: "No. Receipt Extraction and automatic document processing are disabled in the closed beta." },
        { title: "How do I get beta access?", text: "Avareno is invite-only. Accounts are provisioned selectively for the closed beta; with an existing account you can log in directly." }
      ]
    },
    final: {
      eyebrow: "Your first product dossier",
      title: "Your next receipt will not end up just anywhere.",
      text: "Create your first digital product dossier with Avareno.",
      cta: "Get beta access"
    }
  }
} as const;

export function Home() {
  const { language } = useLanguage();
  const auth = useAuth();
  const copy = landingCopy[language];
  const isAuthenticated = auth.status === "authenticated";
  const ctaTo = isAuthenticated ? "/app" : betaFeatures.inviteOnly ? "/login" : "/signup";
  const showBetaTrust = betaFeatures.inviteOnly && !betaFeatures.billing;

  return (
    <div className="ma-page">
      <MarketingHeader />
      <main className="ma-main">
        <section className="ma-hero" id="product" aria-labelledby="ma-hero-title">
          <div className="ma-hero-inner">
            <div className="ma-hero-copy">
              <Reveal as="p" className="ma-eyebrow" delay={60}>{copy.hero.eyebrow}</Reveal>
              <Reveal as="h1" id="ma-hero-title" delay={130}>{copy.hero.title}<span>{copy.hero.titleLine}</span></Reveal>
              <Reveal as="p" delay={210}>{copy.hero.body}</Reveal>
              <Reveal className="ma-hero-actions" delay={280} aria-label={language === "de" ? "Wichtigste Aktionen" : "Primary actions"}>
                <Link className="ma-primary-button" to={ctaTo}>{copy.hero.primary}<ArrowRight size={17} aria-hidden="true" /></Link>
                <a className="ma-secondary-button" href="#how-it-works">{copy.hero.secondary}</a>
              </Reveal>
              {showBetaTrust ? <Reveal as="p" className="ma-hero-trust" delay={340}><ShieldCheck size={16} aria-hidden="true" />{copy.hero.trust}</Reveal> : null}
            </div>
            <Reveal className="ma-hero-world" delay={180}><SpatialHero language={language} /></Reveal>
          </div>
        </section>

        <ProblemScene copy={copy.problem} />
        <ProductArchiveTransformation copy={copy.transformation} />
        <HowItWorks copy={copy.how} />
        <ProductRecordShowcase copy={copy.productRecord} />
        <DocumentsShowcase copy={copy.documents} />
        <WarrantyShowcase copy={copy.warranty} />
        <UseCases copy={copy.useCases} />
        <TrustSection copy={copy.trust} />
        <BetaPricing copy={copy.beta} ctaTo={ctaTo} />
        <FAQSection copy={copy.faq} />
        <FinalCTA copy={copy.final} ctaTo={ctaTo} />
      </main>
      <MarketingFooter />
    </div>
  );
}
