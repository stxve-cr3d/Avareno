import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  BookOpenText,
  Box,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  FileCheck2,
  FileLock2,
  FileText,
  FolderArchive,
  Mail,
  MapPinHouse,
  PackageCheck,
  ReceiptText,
  ScanBarcode,
  Search,
  ShieldCheck,
  Store,
  Wrench
} from "lucide-react";
import { Reveal, RevealGroup } from "../MarketingReveal";

export type ProblemCopy = {
  eyebrow: string;
  title: string;
  text: string;
  closing: string;
  items: ReadonlyArray<string>;
};

export type TransformationCopy = {
  eyebrow: string;
  title: string;
  text: string;
  steps: ReadonlyArray<string>;
  recordLabel: string;
  product: string;
  complete: string;
  rows: ReadonlyArray<string>;
};

export type HowCopy = {
  eyebrow: string;
  title: string;
  text: string;
  steps: ReadonlyArray<{ title: string; text: string }>;
};

export type ProductRecordCopy = {
  eyebrow: string;
  title: string;
  text: string;
  example: string;
  product: string;
  makerModel: string;
  fields: ReadonlyArray<{ label: string; value: string; tone?: "warning" }>;
  documents: string;
  reminders: string;
  missing: string;
  documentNames: ReadonlyArray<string>;
};

export type DocumentsCopy = {
  eyebrow: string;
  title: string;
  text: string;
  labels: ReadonlyArray<string>;
  privateNote: string;
};

export type WarrantyCopy = {
  eyebrow: string;
  title: string;
  text: string;
  statuses: ReadonlyArray<{ label: string; value: string; tone: "good" | "warning" | "neutral" | "info" }>;
  note: string;
};

export type UseCasesCopy = {
  eyebrow: string;
  title: string;
  text: string;
  items: ReadonlyArray<{ title: string; text: string }>;
};

export type TrustCopy = {
  eyebrow: string;
  title: string;
  text: string;
  items: ReadonlyArray<{ title: string; text: string }>;
};

export type BetaCopy = {
  eyebrow: string;
  title: string;
  text: string;
  note: string;
  cta: string;
};

export type FaqCopy = {
  eyebrow: string;
  title: string;
  text: string;
  items: ReadonlyArray<{ title: string; text: string }>;
};

export type FinalCopy = {
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
};

const problemIcons = [Mail, FolderArchive, ScanBarcode, Store, CalendarDays, BookOpenText];
const useCaseIcons = [Wrench, MapPinHouse, ShieldCheck, Box];
const trustIcons = [FileLock2, ShieldCheck, FolderArchive, FileCheck2];

export function ProblemScene({ copy }: { copy: ProblemCopy }) {
  return (
    <section className="ma-section ma-problem" id="problem" aria-labelledby="ma-problem-title">
      <Reveal><SectionHeader {...copy} titleId="ma-problem-title" /></Reveal>
      <RevealGroup className="ma-problem-scene" stagger={70}>
        {copy.items.map((item, index) => {
          const Icon = problemIcons[index] ?? FileText;
          return (
            <article className="ma-paper-fragment" key={item}>
              <span aria-hidden="true"><Icon size={18} /></span>
              <p>{item}</p>
            </article>
          );
        })}
      </RevealGroup>
      <Reveal as="p" className="ma-problem-closing">{copy.closing}</Reveal>
    </section>
  );
}

export function ProductArchiveTransformation({ copy }: { copy: TransformationCopy }) {
  return (
    <section className="ma-section ma-transformation" id="transformation" aria-labelledby="ma-transform-title">
      <Reveal><SectionHeader {...copy} titleId="ma-transform-title" /></Reveal>
      <div className="ma-transform-layout">
        <RevealGroup as="ol" className="ma-transform-steps" stagger={90}>
          {copy.steps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
              <Check size={16} aria-hidden="true" />
            </li>
          ))}
        </RevealGroup>
        <Reveal className="ma-record-card ma-record-card-compact" aria-label={`${copy.recordLabel}: ${copy.product}`} role="img">
          <div className="ma-record-head">
            <span aria-hidden="true"><PackageCheck size={20} /></span>
            <div><small>{copy.recordLabel}</small><strong>{copy.product}</strong></div>
            <em>{copy.complete}</em>
          </div>
          <ul>
            {copy.rows.map((row) => <li key={row}><CheckCircle2 size={16} aria-hidden="true" />{row}</li>)}
          </ul>
          <div className="ma-record-progress" aria-hidden="true"><span /></div>
        </Reveal>
      </div>
    </section>
  );
}

export function HowItWorks({ copy }: { copy: HowCopy }) {
  const icons = [ScanBarcode, ReceiptText, Search];
  return (
    <section className="ma-section ma-how" id="how-it-works" aria-labelledby="ma-how-title">
      <Reveal><SectionHeader {...copy} titleId="ma-how-title" /></Reveal>
      <RevealGroup className="ma-how-grid" stagger={100}>
        {copy.steps.map((step, index) => {
          const Icon = icons[index] ?? Check;
          return (
            <article className={`ma-step-scene ma-step-scene-${index + 1}`} key={step.title}>
              <div className="ma-step-visual" aria-hidden="true">
                <span className="ma-step-number">0{index + 1}</span>
                <Icon size={24} />
                <i /><i /><i />
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          );
        })}
      </RevealGroup>
    </section>
  );
}

export function ProductRecordShowcase({ copy }: { copy: ProductRecordCopy }) {
  return (
    <section className="ma-section ma-product-record" id="produktakte" aria-labelledby="ma-record-title">
      <Reveal><SectionHeader {...copy} titleId="ma-record-title" /></Reveal>
      <Reveal className="ma-app-window">
        <div className="ma-window-bar" aria-hidden="true"><span /><span /><span /><small>avareno / dinge / produktakte</small></div>
        <div className="ma-window-body">
          <aside aria-hidden="true">
            <span className="is-active"><Box size={16} />{copy.product}</span>
            <span><ReceiptText size={16} />{copy.documents}</span>
            <span><BellRing size={16} />{copy.reminders}</span>
          </aside>
          <div className="ma-product-sheet">
            <div className="ma-product-sheet-head">
              <div className="ma-product-thumbnail" aria-hidden="true"><PackageCheck size={36} /></div>
              <div><small>{copy.example}</small><h3>{copy.product}</h3><p>{copy.makerModel}</p></div>
              <span>{copy.missing}</span>
            </div>
            <dl>
              {copy.fields.map((field) => (
                <div className={field.tone === "warning" ? "is-warning" : ""} key={field.label}>
                  <dt>{field.label}</dt><dd>{field.value}</dd>
                </div>
              ))}
            </dl>
            <div className="ma-product-documents">
              <div><strong>{copy.documents}</strong><small>{copy.documentNames.length}</small></div>
              <ul>{copy.documentNames.map((name, index) => <li key={name}>{index === 0 ? <ReceiptText size={16} /> : index === 1 ? <ShieldCheck size={16} /> : <BookOpenText size={16} />}<span>{name}</span><Check size={15} /></li>)}</ul>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function DocumentsShowcase({ copy }: { copy: DocumentsCopy }) {
  const icons = [ReceiptText, ShieldCheck, BookOpenText, FileText];
  return (
    <section className="ma-section ma-documents" id="documents" aria-labelledby="ma-documents-title">
      <Reveal><SectionHeader {...copy} titleId="ma-documents-title" /></Reveal>
      <div className="ma-documents-layout">
        <Reveal className="ma-document-stack" aria-label={copy.labels.join(", ")} role="img">
          {copy.labels.map((label, index) => {
            const Icon = icons[index] ?? FileText;
            return <article key={label} style={{ "--doc-index": index } as CSSProperties}><Icon size={20} /><small>PDF</small><strong>{label}</strong><span /><span /></article>;
          })}
        </Reveal>
        <Reveal className="ma-documents-link">
          <div aria-hidden="true"><PackageCheck size={27} /></div>
          <span aria-hidden="true"><ArrowRight size={19} /></span>
          <p><FileLock2 size={18} aria-hidden="true" />{copy.privateNote}</p>
        </Reveal>
      </div>
    </section>
  );
}

export function WarrantyShowcase({ copy }: { copy: WarrantyCopy }) {
  return (
    <section className="ma-section ma-warranty" id="warranty" aria-labelledby="ma-warranty-title">
      <Reveal><SectionHeader {...copy} titleId="ma-warranty-title" /></Reveal>
      <RevealGroup className="ma-warranty-list" stagger={75}>
        {copy.statuses.map((status) => (
          <article className={`is-${status.tone}`} key={status.label}>
            <span aria-hidden="true"><CalendarClock size={19} /></span>
            <div><small>{status.label}</small><strong>{status.value}</strong></div>
            <i aria-hidden="true" />
          </article>
        ))}
      </RevealGroup>
      <Reveal as="p" className="ma-honest-note"><CheckCircle2 size={17} aria-hidden="true" />{copy.note}</Reveal>
    </section>
  );
}

export function UseCases({ copy }: { copy: UseCasesCopy }) {
  return (
    <section className="ma-section ma-usecases" id="use-cases" aria-labelledby="ma-usecases-title">
      <Reveal><SectionHeader {...copy} titleId="ma-usecases-title" /></Reveal>
      <RevealGroup className="ma-usecase-list" stagger={75}>
        {copy.items.map((item, index) => {
          const Icon = useCaseIcons[index] ?? Box;
          return <article key={item.title}><span aria-hidden="true"><Icon size={20} /></span><div><h3>{item.title}</h3><p>{item.text}</p></div><ArrowRight size={17} aria-hidden="true" /></article>;
        })}
      </RevealGroup>
    </section>
  );
}

export function TrustSection({ copy }: { copy: TrustCopy }) {
  return (
    <section className="ma-section ma-trust" id="security" aria-labelledby="ma-trust-title">
      <Reveal><SectionHeader {...copy} titleId="ma-trust-title" /></Reveal>
      <RevealGroup className="ma-trust-list" stagger={80}>
        {copy.items.map((item, index) => {
          const Icon = trustIcons[index] ?? ShieldCheck;
          return <article key={item.title}><span aria-hidden="true"><Icon size={20} /></span><div><h3>{item.title}</h3><p>{item.text}</p></div></article>;
        })}
      </RevealGroup>
    </section>
  );
}

export function BetaPricing({ copy, ctaTo }: { copy: BetaCopy; ctaTo: string }) {
  return (
    <section className="ma-section ma-beta" id="pricing" aria-labelledby="ma-beta-title">
      <Reveal><SectionHeader {...copy} titleId="ma-beta-title" /></Reveal>
      <Reveal className="ma-beta-card">
        <div><span><CheckCircle2 size={18} aria-hidden="true" />{copy.note}</span><p>{copy.text}</p></div>
        <Link className="ma-primary-button" to={ctaTo}>{copy.cta}<ArrowRight size={17} aria-hidden="true" /></Link>
      </Reveal>
    </section>
  );
}

export function FAQSection({ copy }: { copy: FaqCopy }) {
  return (
    <section className="ma-section ma-faq" id="faq" aria-labelledby="ma-faq-title">
      <Reveal><SectionHeader {...copy} titleId="ma-faq-title" /></Reveal>
      <RevealGroup className="ma-faq-list" stagger={55}>
        {copy.items.map((item, index) => <FaqItem item={item} key={item.title} open={index === 0} />)}
      </RevealGroup>
    </section>
  );
}

export function FinalCTA({ copy, ctaTo }: { copy: FinalCopy; ctaTo: string }) {
  return (
    <Reveal as="section" className="ma-final" aria-labelledby="ma-final-title">
      <div className="ma-final-record" aria-hidden="true"><ReceiptText size={20} /><span /><CheckCircle2 size={18} /></div>
      <p className="ma-eyebrow">{copy.eyebrow}</p>
      <h2 id="ma-final-title">{copy.title}</h2>
      <p>{copy.text}</p>
      <Link className="ma-primary-button" to={ctaTo}>{copy.cta}<ArrowRight size={17} aria-hidden="true" /></Link>
    </Reveal>
  );
}

function SectionHeader({ eyebrow, title, text, titleId }: { eyebrow: string; title: string; text: string; titleId: string }) {
  return <header className="ma-section-header"><p className="ma-eyebrow">{eyebrow}</p><h2 id={titleId}>{title}</h2><p>{text}</p></header>;
}

function FaqItem({ item, open }: { item: { title: string; text: string }; open: boolean }) {
  const [isOpen, setIsOpen] = useState(open);
  const contentId = useId();
  return (
    <article className={isOpen ? "ma-faq-item is-open" : "ma-faq-item"}>
      <button aria-controls={contentId} aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)} type="button">
        <span>{item.title}</span><i aria-hidden="true" />
      </button>
      <div id={contentId} aria-hidden={!isOpen}><p>{item.text}</p></div>
    </article>
  );
}

export function InlineFact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <span>{icon}{children}</span>;
}
