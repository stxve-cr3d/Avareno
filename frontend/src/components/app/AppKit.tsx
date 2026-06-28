/**
 * Avareno App Design System ("AppKit")
 * -------------------------------------------------------------
 * Shared, token-driven building blocks for every authenticated
 * /app route. The /app home (SmartHome) is the visual source of
 * truth; these components reuse the same `av-*` classes so all
 * routes feel like one coherent product.
 *
 * Color discipline (see styles.css :root --av-* tokens):
 *   neutral surfaces by default · teal = primary/active/care/open
 *   amber = warranty/deadline · red = missing/incomplete
 *   no teal fog, no decorative glow.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";

export { EmptyState } from "../EmptyState";

/* ── Status vocabulary ──────────────────────────────────────── */

export type StatusTone = "neutral" | "teal" | "amber" | "red" | "green";

const toneClass: Record<StatusTone, string> = {
  neutral: "av-tone-neutral",
  teal: "av-tone-teal",
  amber: "av-tone-amber",
  red: "av-tone-red",
  green: "av-tone-green"
};

/* ── Layout ─────────────────────────────────────────────────── */

export function AppPage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`av-page ${className}`.trim()}>{children}</main>;
}

export function AppPageHeader({
  kicker,
  title,
  subtitle,
  actions
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="av-page-header">
      <div className="av-page-header-copy">
        {kicker ? <span className="av-page-kicker">{kicker}</span> : null}
        <h1 className="av-page-title">{title}</h1>
        {subtitle ? <p className="av-page-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="av-page-actions">{actions}</div> : null}
    </header>
  );
}

export function AppMainGrid({ children }: { children: ReactNode }) {
  return <div className="av-grid">{children}</div>;
}

export function AppMainColumn({ children }: { children: ReactNode }) {
  return <div className="av-main">{children}</div>;
}

export function AppSideColumn({ children }: { children: ReactNode }) {
  return <aside className="av-sidebar">{children}</aside>;
}

export function AppSection({
  title,
  link,
  slim,
  children
}: {
  title?: ReactNode;
  link?: { to: string; label: string };
  slim?: boolean;
  children: ReactNode;
}) {
  return (
    <article className={`av-section${slim ? " av-section-slim" : ""}`}>
      {title || link ? (
        <div className="av-section-head">
          {title ? <h2 className="av-section-title">{title}</h2> : <span />}
          {link ? (
            <Link className="av-section-link" to={link.to}>
              {link.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
    </article>
  );
}

export function AppPanel({ children, soft = false }: { children: ReactNode; soft?: boolean }) {
  return <div className={`av-panel-box${soft ? " is-soft" : ""}`}>{children}</div>;
}

export function Divider() {
  return <div className="av-divider" aria-hidden="true" />;
}

/* ── Primitives ─────────────────────────────────────────────── */

export function StatusChip({
  tone = "neutral",
  icon,
  children
}: {
  tone?: StatusTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className={`av-chip ${toneClass[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

export function IconTile({
  tone = "neutral",
  size = "md",
  children
}: {
  tone?: StatusTone;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  return <span className={`av-icon-tile av-tile-${size} ${toneClass[tone]}`}>{children}</span>;
}

export function ProgressLine({ value, tone = "teal" }: { value: number; tone?: StatusTone }) {
  return (
    <div className="av-line">
      <div className={`av-line-fill ${toneClass[tone]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function ActionButton({
  to,
  onClick,
  icon = <ArrowRight size={14} />,
  children,
  type = "button",
  disabled = false
}: {
  to?: string;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const inner = (
    <>
      {children}
      {icon}
    </>
  );
  if (to && !disabled) {
    return (
      <Link className="av-btn av-btn-primary" to={to}>
        {inner}
      </Link>
    );
  }
  return (
    <button className="av-btn av-btn-primary" onClick={onClick} type={type} disabled={disabled}>
      {inner}
    </button>
  );
}

export function SecondaryAction({
  to,
  onClick,
  icon,
  children,
  disabled = false
}: {
  to?: string;
  onClick?: () => void;
  icon?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}) {
  const inner = (
    <>
      {icon ? <span className="av-action-ic">{icon}</span> : null}
      <span>{children}</span>
    </>
  );
  if (to && !disabled) {
    return (
      <Link className="av-btn av-btn-secondary" to={to}>
        {inner}
      </Link>
    );
  }
  return (
    <button className="av-btn av-btn-secondary" onClick={onClick} type="button" disabled={disabled}>
      {inner}
    </button>
  );
}

export function MetadataRow({ label, value, tone = "neutral" }: { label: ReactNode; value: ReactNode; tone?: StatusTone }) {
  return (
    <div className="av-metarow">
      <dt>{label}</dt>
      <dd className={tone === "neutral" ? "" : toneClass[tone]}>{value}</dd>
    </div>
  );
}

/* ── Avareno-specific status chips ──────────────────────────── */

export function DocumentChip({ present }: { present: boolean }) {
  return (
    <StatusChip tone={present ? "green" : "red"}>{present ? "Beleg ✓" : "Beleg fehlt"}</StatusChip>
  );
}

export function WarrantyChip({ label, tone = "amber" }: { label: string; tone?: StatusTone }) {
  return <StatusChip tone={tone}>{label}</StatusChip>;
}

export function CareStatusChip({ open }: { open: number }) {
  return <StatusChip tone={open > 0 ? "teal" : "neutral"}>{open > 0 ? `${open} offen` : "Erledigt"}</StatusChip>;
}

/* ── Avareno-specific composites ────────────────────────────── */

export type AttentionTone = "warranty" | "invoice" | "care";

export function AttentionRow({
  to,
  tone,
  icon,
  label,
  title,
  detail,
  signal,
  action,
  primary = false,
  progress
}: {
  to: string;
  tone: AttentionTone;
  icon: ReactNode;
  label: string;
  title: string;
  detail: string;
  signal: string;
  action: string;
  primary?: boolean;
  progress?: number;
}) {
  return (
    <Link className={`av-attention-card av-att-${tone}${primary ? " av-att-primary" : ""}`} to={to}>
      <span className="av-att-icon">{icon}</span>
      <div className="av-att-copy">
        <small>{label}</small>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <div className="av-att-right">
        <span className={`av-tag av-tag-${tone}`}>{signal}</span>
        <em className="av-att-cta">{action}</em>
      </div>
      {primary && typeof progress === "number" ? (
        <div className="av-att-track">
          <div className="av-att-bar" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </Link>
  );
}

export function AppModuleCard({
  to,
  tone = "neutral",
  icon,
  label,
  sub,
  count
}: {
  to: string;
  tone?: "neutral" | "teal" | "warn";
  icon: ReactNode;
  label: string;
  sub: string;
  count: ReactNode;
}) {
  const cls = tone === "teal" ? "av-mod-teal" : tone === "warn" ? "av-mod-warn" : "";
  return (
    <Link className={`av-module-row ${cls}`.trim()} to={to}>
      <span className="av-module-icon">{icon}</span>
      <div className="av-module-copy">
        <strong>{label}</strong>
        <small>{sub}</small>
      </div>
      <em className="av-module-count">{count}</em>
      <ChevronRight size={13} />
    </Link>
  );
}

export function NextActionCard({
  to,
  icon,
  title,
  body
}: {
  to: string;
  icon: ReactNode;
  title: ReactNode;
  body: ReactNode;
}) {
  return (
    <Link className="av-next-row" to={to}>
      <span className="av-next-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{body}</small>
      </div>
      <ChevronRight size={14} />
    </Link>
  );
}

export function VaultSummary({
  stats
}: {
  stats: { value: ReactNode; label: string; warn?: boolean }[];
}) {
  return (
    <div className="av-mem-status">
      <span className="av-mem-label">Privater Speicher</span>
      <div className="av-mem-numbers">
        {stats.map((s, i) => (
          <div className={`av-mem-number${s.warn ? " is-warn" : ""}`} key={i}>
            <strong>{s.value}</strong>
            <small>{s.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ObjectMemoryCard — a stored real-world object profile.
 * Reuses the home's av-thing-* visual language (layered icon,
 * completeness bar, Beleg/Garantie/Offen memory layers).
 */
/* ── Graph-based visual language ────────────────────────────
 * Product-specific relationship graphs — NOT analytics charts.
 * Every graph answers a real Avareno question:
 *  - ObjectMemoryGraph: what does this object connect to?
 *  - WarrantyTimeline: how long until the warranty ends?
 *  - CareTimeline: where is this issue in its lifecycle?
 *  - OpenLoopRow: which product does this open loop belong to?
 * Calm, sparse, thin lines, muted surfaces.
 * ----------------------------------------------------------- */

export type GraphEdge = { tone?: StatusTone; label: string; sublabel?: string; icon?: ReactNode };

export function ObjectMemoryGraph({
  title,
  category,
  icon,
  edges
}: {
  title: string;
  category?: string;
  icon?: ReactNode;
  edges: GraphEdge[];
}) {
  return (
    <div className="av-graph">
      <div className="av-graph-root">
        {icon ? <span className="av-graph-root-ic">{icon}</span> : null}
        <div className="av-graph-root-copy">
          <strong>{title}</strong>
          {category ? <small>{category}</small> : null}
        </div>
      </div>
      <div className="av-graph-children">
        {edges.map((edge, i) => (
          <div className="av-graph-child" key={i}>
            <span className={`av-chip ${toneClass[edge.tone ?? "neutral"]}`}>
              {edge.icon}
              {edge.label}
            </span>
            {edge.sublabel ? <span className="av-graph-sub">{edge.sublabel}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WarrantyTimeline({
  purchaseLabel,
  endLabel,
  elapsedPct,
  daysLeft
}: {
  purchaseLabel?: string;
  endLabel?: string;
  elapsedPct: number;
  daysLeft?: number | null;
}) {
  const pct = Math.min(100, Math.max(0, elapsedPct));
  const expired = typeof daysLeft === "number" && daysLeft < 0;
  const urgent = typeof daysLeft === "number" && daysLeft >= 0 && daysLeft < 60;
  const zone = expired ? "is-expired" : urgent ? "is-urgent" : "is-ok";
  return (
    <div className={`av-wtl ${zone}`}>
      <div className="av-wtl-track">
        <div className="av-wtl-elapsed" style={{ width: `${pct}%` }} />
        <span className="av-wtl-now" style={{ left: `${pct}%` }} />
      </div>
      <div className="av-wtl-labels">
        <span>{purchaseLabel ?? "Kauf"}</span>
        <span className="av-wtl-mid">
          {expired ? "Abgelaufen" : typeof daysLeft === "number" ? `noch ${daysLeft} Tage` : "Garantie"}
        </span>
        <span>{endLabel ?? "Ende"}</span>
      </div>
    </div>
  );
}

export type CareStep = { title: string; detail?: string; state?: "done" | "active" | "todo"; tone?: StatusTone };

export function CareTimeline({ steps }: { steps: CareStep[] }) {
  return (
    <ol className="av-ctl">
      {steps.map((step, i) => (
        <li className={`av-ctl-step is-${step.state ?? "todo"}`} key={i}>
          <span className={`av-ctl-dot ${step.tone ? toneClass[step.tone] : ""}`} />
          <div className="av-ctl-copy">
            <strong>{step.title}</strong>
            {step.detail ? <small>{step.detail}</small> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function OpenLoopRow({
  to,
  tone = "neutral",
  icon,
  title,
  product,
  signal,
  action
}: {
  to: string;
  tone?: StatusTone;
  icon?: ReactNode;
  title: string;
  product: string;
  signal: string;
  action?: string;
}) {
  return (
    <Link className={`av-loop-row ${toneClass[tone]}`} to={to}>
      {icon ? <span className="av-loop-ic">{icon}</span> : null}
      <div className="av-loop-copy">
        <strong>{title}</strong>
        <small className="av-loop-rel">↳ {product}</small>
      </div>
      <span className={`av-chip ${toneClass[tone]}`}>{signal}</span>
      {action ? <em className="av-loop-cta">{action}</em> : null}
    </Link>
  );
}

export function ObjectMemoryCard({
  to,
  category,
  name,
  icon,
  completeness,
  invoicePresent,
  warranty,
  openPoints
}: {
  to: string;
  category: string;
  name: string;
  icon: ReactNode;
  completeness: number;
  invoicePresent: boolean;
  warranty: { text: string; urgent?: boolean };
  openPoints: number;
}) {
  return (
    <Link className="av-thing-card" to={to}>
      <div className="av-thing-head">
        <span className="av-thing-icon av-thing-stack">{icon}</span>
        <div className="av-thing-info">
          <span className="av-thing-cat">{category}</span>
          <span className="av-thing-name">{name}</span>
        </div>
        <span className="av-thing-pct">{completeness}%</span>
      </div>
      <div className="av-thing-bar">
        <div className="av-thing-fill" style={{ width: `${completeness}%` }} />
      </div>
      <div className="av-thing-layers">
        <div className="av-thing-layer">
          <span className="av-layer-label">Beleg</span>
          <span className={`av-layer-val ${invoicePresent ? "av-th-ok" : "av-th-warn"}`}>
            {invoicePresent ? "Gespeichert" : "Fehlt"}
          </span>
        </div>
        <div className="av-thing-layer">
          <span className="av-layer-label">Garantie</span>
          <span className={`av-layer-val ${warranty.urgent ? "av-th-amber" : ""}`}>{warranty.text}</span>
        </div>
        <div className="av-thing-layer">
          <span className="av-layer-label">Offen</span>
          <span className={`av-layer-val ${openPoints > 0 ? "av-th-amber" : "av-th-ok"}`}>
            {openPoints > 0 ? `${openPoints} Punkt${openPoints === 1 ? "" : "e"}` : "Keine"}
          </span>
        </div>
      </div>
    </Link>
  );
}
