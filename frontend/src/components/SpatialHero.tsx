import { useEffect, useRef, useState } from "react";
import { BellRing, BookOpenText, CheckCircle2, Coffee, Pause, Play, ReceiptText, ScanBarcode, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

/**
 * SpatialHero — isolated marketing prototype for the "spatial product world"
 * direction (see docs/design/spatial-product-world.md).
 *
 * Concept: scattered pieces of product information (receipt, warranty card,
 * serial number, manual, reminder) float in a shallow 3D space and converge
 * into one complete Avareno product dossier as the visitor scrolls.
 *
 * Constraints honoured here:
 * - CSS transforms only, no WebGL and no new dependencies.
 * - Scroll listener runs only while the hero is in the viewport.
 * - prefers-reduced-motion disables all movement (static composition).
 * - A pause button freezes float + convergence.
 * - Mobile (<860px) renders a static simplified layout via CSS.
 */

type ChipSpec = {
  id: string;
  icon: ReactNode;
  /* resting offset in the 3D stage (converges to 0 as --p approaches 1) */
  x: string;
  y: string;
  z: string;
  rx: string;
  ry: string;
  /* per-chip fade threshold on the 0..1 scroll progress */
  t: number;
  /* idle float phase delay */
  delay: string;
};

/* Resting offsets keep every chip clear of the central dossier
   (~24.5rem wide, ~21rem tall) and of the product illustration in the
   upper-left corner, so no text is ever covered. */
const chipSpecs: ChipSpec[] = [
  { id: "receipt", icon: <ReceiptText size={15} />, x: "-16rem", y: "4rem", z: "5rem", rx: "6deg", ry: "-14deg", t: 0.15, delay: "0s" },
  { id: "warranty", icon: <ShieldCheck size={15} />, x: "15.5rem", y: "-12.5rem", z: "3.4rem", rx: "5deg", ry: "12deg", t: 0.3, delay: "-2.1s" },
  { id: "serial", icon: <ScanBarcode size={15} />, x: "-13.5rem", y: "12.5rem", z: "2.6rem", rx: "-6deg", ry: "-10deg", t: 0.45, delay: "-3.4s" },
  { id: "manual", icon: <BookOpenText size={15} />, x: "15rem", y: "13rem", z: "4.2rem", rx: "-5deg", ry: "13deg", t: 0.6, delay: "-1.2s" },
  { id: "reminder", icon: <BellRing size={15} />, x: "6rem", y: "-13.5rem", z: "6rem", rx: "8deg", ry: "0deg", t: 0.75, delay: "-4.6s" }
];

/* Stylized espresso machine — own vector art (no external assets, no
   brand references). Matte anthracite body, single green status light.
   This is the PHYSICAL product; the dossier card next to it is its
   digital record — the scene keeps the two visually distinct. */
function ProductIllustration() {
  return (
    <svg className="spatial-product-svg" viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="avspm-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b302e" />
          <stop offset="0.55" stopColor="#202423" />
          <stop offset="1" stopColor="#181b1a" />
        </linearGradient>
        <linearGradient id="avspm-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {/* soft ground shadow */}
      <ellipse cx="60" cy="132" rx="42" ry="5" fill="rgba(0,0,0,0.4)" />
      {/* base / drip tray */}
      <rect x="24" y="118" width="72" height="10" rx="3" fill="#15100e" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <rect x="40" y="120.5" width="40" height="2.5" rx="1.25" fill="rgba(255,255,255,0.12)" />
      {/* body */}
      <rect x="28" y="34" width="64" height="86" rx="7" fill="url(#avspm-body)" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
      {/* top light sheen */}
      <rect x="30" y="36" width="60" height="14" rx="5" fill="url(#avspm-sheen)" />
      {/* top plate + cup warmer */}
      <rect x="34" y="26" width="52" height="10" rx="3.5" fill="#242826" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* group head */}
      <rect x="44" y="66" width="32" height="12" rx="3" fill="#151817" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {/* portafilter handle */}
      <rect x="57" y="76" width="6" height="16" rx="3" fill="#101312" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* cup */}
      <path d="M50 100 h20 a2 2 0 0 1 2 2 v8 a6 6 0 0 1 -6 6 h-12 a6 6 0 0 1 -6 -6 v-8 a2 2 0 0 1 2 -2 z" fill="#cfd6d2" />
      <path d="M72 103 h4 a4 4 0 0 1 0 9 h-4 v-3 h3.4 a1.6 1.6 0 0 0 0 -3.2 H72 z" fill="#b9c1bd" />
      {/* control dial */}
      <circle cx="82" cy="52" r="5" fill="#1a1e1c" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
      <rect x="81.2" y="48.5" width="1.6" height="4" rx="0.8" fill="rgba(255,255,255,0.4)" />
      {/* status light — single green accent */}
      <circle cx="40" cy="52" r="4.4" fill="rgba(62,207,142,0.16)" />
      <circle cx="40" cy="52" r="2.2" fill="#3ECF8E" />
    </svg>
  );
}

type SpatialHeroCopy = {
  aria: string;
  srSummary: string;
  productKicker: string;
  productName: string;
  dossierBadge: string;
  completeness: string;
  pause: string;
  resume: string;
  chips: Record<string, string>;
  rows: { id: string; label: string }[];
};

function getCopy(language: "de" | "en"): SpatialHeroCopy {
  if (language === "en") {
    return {
      aria: "Illustration: scattered product information becomes one complete product dossier",
      srSummary: "An espresso machine next to its digital product dossier: receipt, warranty, serial number, manual and reminder come together in one Avareno dossier.",
      productKicker: "Product dossier",
      productName: "Espresso machine",
      dossierBadge: "Complete",
      completeness: "Dossier completeness",
      pause: "Pause animation",
      resume: "Resume animation",
      chips: { receipt: "Receipt", warranty: "Warranty card", serial: "Serial number", manual: "Manual", reminder: "Reminder" },
      rows: [
        { id: "receipt", label: "Receipt saved" },
        { id: "warranty", label: "Warranty until 08/2028" },
        { id: "serial", label: "Serial number stored" },
        { id: "manual", label: "Manual attached" },
        { id: "reminder", label: "Reminder before warranty end" }
      ]
    };
  }
  return {
    aria: "Illustration: Verstreute Produktinformationen werden zu einer vollständigen Produktakte",
    srSummary: "Eine Espressomaschine neben ihrer digitalen Produktakte: Rechnung, Garantie, Seriennummer, Anleitung und Erinnerung finden in der Akte zusammen.",
    productKicker: "Produktakte",
    productName: "Espressomaschine",
    dossierBadge: "Vollständig",
    completeness: "Vollständigkeit der Akte",
    pause: "Animation pausieren",
    resume: "Animation fortsetzen",
    chips: { receipt: "Rechnung", warranty: "Garantiekarte", serial: "Seriennummer", manual: "Anleitung", reminder: "Erinnerung" },
    rows: [
      { id: "receipt", label: "Rechnung gespeichert" },
      { id: "warranty", label: "Garantie bis 08/2028" },
      { id: "serial", label: "Seriennummer hinterlegt" },
      { id: "manual", label: "Anleitung verbunden" },
      { id: "reminder", label: "Erinnerung vor Garantieende" }
    ]
  };
}

export function SpatialHero({ language }: { language: "de" | "en" }) {
  const copy = getCopy(language);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  pausedRef.current = paused;

  /* Scroll-driven convergence: sets --p (0..1) on the stage. Listener is only
     attached while the hero intersects the viewport; disabled entirely when
     the visitor prefers reduced motion. */
  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      if (pausedRef.current) return;
      /* Progress is tied to the stage itself so the whole convergence is
         visible on screen: 0 while the stage top sits at 78% of the
         viewport height, 1 by the time it reaches 22%. */
      const rect = stage.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const progress = Math.min(Math.max((vh * 0.78 - rect.top) / (vh * 0.56), 0), 1);
      stage.style.setProperty("--p", progress.toFixed(3));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        root.classList.remove("is-offscreen");
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      } else {
        root.classList.add("is-offscreen");
        window.removeEventListener("scroll", onScroll);
      }
    });

    const stopMotion = () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      stage.style.setProperty("--p", "0");
    };
    const startMotion = () => {
      /* Listen immediately so the effect works even if IntersectionObserver
         never fires (embedded webviews); the observer only pauses work and
         the float animation while the hero is off screen. */
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      observer.observe(root);
    };

    /* Respect the OS setting, including changes while the page is open. */
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPreference = () => {
      if (reducedMotion.matches) stopMotion();
      else startMotion();
    };
    applyPreference();
    reducedMotion.addEventListener("change", applyPreference);

    return () => {
      reducedMotion.removeEventListener("change", applyPreference);
      stopMotion();
    };
  }, []);

  return (
    <div className={paused ? "spatial-hero is-paused" : "spatial-hero"} ref={rootRef}>
      <p className="sr-only">{copy.srSummary}</p>

      <div className="spatial-stage" ref={stageRef} aria-hidden="true">
        <div className="spatial-glow" />

        {/* the physical product: stays put while its documents converge
            into the digital dossier next to it */}
        <div className="spatial-product">
          <ProductIllustration />
          <span className="spatial-product-label">{copy.productName}</span>
        </div>

        {chipSpecs.map((chip) => (
          <div
            className="spatial-chip"
            key={chip.id}
            style={{
              "--cx": chip.x,
              "--cy": chip.y,
              "--cz": chip.z,
              "--crx": chip.rx,
              "--cry": chip.ry,
              "--ct": String(chip.t),
              "--cd": chip.delay
            } as React.CSSProperties}
          >
            <span className="spatial-chip-inner">
              {chip.icon}
              {copy.chips[chip.id]}
            </span>
          </div>
        ))}

        <div className="spatial-dossier">
          <div className="spatial-dossier-head">
            <span className="spatial-dossier-icon">
              <Coffee size={19} />
            </span>
            <span>
              <small>{copy.productKicker}</small>
              <strong>{copy.productName}</strong>
            </span>
            <em>{copy.dossierBadge}</em>
          </div>
          <ul className="spatial-dossier-rows">
            {copy.rows.map((row) => (
              <li key={row.id}>
                <CheckCircle2 size={14} />
                {row.label}
              </li>
            ))}
          </ul>
          <div className="spatial-dossier-progress" role="presentation">
            <span className="spatial-dossier-progress-label">{copy.completeness}</span>
            <span className="spatial-dossier-progress-track">
              <span className="spatial-dossier-progress-bar" />
            </span>
          </div>
        </div>
      </div>

      <button
        aria-pressed={paused}
        className="spatial-pause"
        onClick={() => setPaused((value) => !value)}
        type="button"
      >
        {paused ? <Play size={13} /> : <Pause size={13} />}
        {paused ? copy.resume : copy.pause}
      </button>
    </div>
  );
}
