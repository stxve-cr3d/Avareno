import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BellRing, BookOpenText, CheckCircle2, Pause, Play, ReceiptText, ScanBarcode, ShieldCheck } from "lucide-react";

type ChipSpec = {
  id: string;
  icon: ReactNode;
  x: string;
  y: string;
  z: string;
  rotate: string;
  threshold: number;
  delay: string;
};

const chipSpecs: ReadonlyArray<ChipSpec> = [
  { id: "receipt", icon: <ReceiptText size={16} />, x: "-15rem", y: "-9.5rem", z: "4rem", rotate: "-5deg", threshold: 0.16, delay: "-1.4s" },
  { id: "warranty", icon: <ShieldCheck size={16} />, x: "15rem", y: "-10.5rem", z: "3rem", rotate: "4deg", threshold: 0.3, delay: "-3.2s" },
  { id: "serial", icon: <ScanBarcode size={16} />, x: "-17.5rem", y: "12.5rem", z: "2rem", rotate: "3deg", threshold: 0.44, delay: "-4.6s" },
  { id: "manual", icon: <BookOpenText size={16} />, x: "15rem", y: "14rem", z: "4.5rem", rotate: "-4deg", threshold: 0.58, delay: "-2.3s" },
  { id: "reminder", icon: <BellRing size={16} />, x: "2rem", y: "-14rem", z: "6rem", rotate: "2deg", threshold: 0.72, delay: "-5.1s" }
];

const copy = {
  de: {
    summary: "Eine markenfreie Espressomaschine und ihre digitale Produktakte. Rechnung, Garantie, Seriennummer, Anleitung und Erinnerung werden sichtbar zugeordnet.",
    product: "Espressomaschine",
    productLabel: "Reales Produkt",
    record: "Digitale Produktakte",
    complete: "Vollständig",
    completeness: "Vollständigkeit",
    pause: "Animation pausieren",
    resume: "Animation fortsetzen",
    chips: { receipt: "Rechnung", warranty: "Garantie", serial: "Seriennummer", manual: "Anleitung", reminder: "Erinnerung" },
    rows: ["Rechnung gespeichert", "Garantie bis 03/2028", "Seriennummer hinterlegt", "Anleitung zugeordnet"]
  },
  en: {
    summary: "A neutral espresso machine and its digital product dossier. Receipt, warranty, serial number, manual and reminder are visibly connected.",
    product: "Espresso machine",
    productLabel: "Physical product",
    record: "Digital product dossier",
    complete: "Complete",
    completeness: "Completeness",
    pause: "Pause animation",
    resume: "Resume animation",
    chips: { receipt: "Receipt", warranty: "Warranty", serial: "Serial number", manual: "Manual", reminder: "Reminder" },
    rows: ["Receipt saved", "Warranty until 03/2028", "Serial number stored", "Manual attached"]
  }
} as const;

function ProductIllustration() {
  return (
    <svg className="ma-product-svg" viewBox="0 0 180 210" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="ma-machine-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#404744" /><stop offset="0.55" stopColor="#262c29" /><stop offset="1" stopColor="#171b19" />
        </linearGradient>
        <linearGradient id="ma-machine-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7f4e8" /><stop offset="1" stopColor="#c9c9bf" />
        </linearGradient>
        <filter id="ma-product-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#1f2421" floodOpacity=".2" />
        </filter>
      </defs>
      <ellipse cx="90" cy="190" rx="58" ry="10" fill="#1f2421" opacity=".12" />
      <g filter="url(#ma-product-shadow)">
        <path d="M51 38c0-8 6-14 14-14h50c8 0 14 6 14 14v124H51V38Z" fill="url(#ma-machine-body)" stroke="#151916" strokeWidth="2" />
        <path d="M57 43h66v23H57z" fill="#4d5551" opacity=".5" />
        <rect x="45" y="156" width="90" height="24" rx="7" fill="#202522" />
        <rect x="55" y="161" width="70" height="8" rx="4" fill="#59615d" opacity=".45" />
        <rect x="65" y="76" width="50" height="18" rx="7" fill="#151916" stroke="#5d6661" />
        <rect x="84" y="92" width="12" height="30" rx="6" fill="#111512" />
        <circle cx="112" cy="54" r="9" fill="#171b19" stroke="#6b746f" />
        <path d="M112 48v7" stroke="#d9dbd4" strokeWidth="2" strokeLinecap="round" />
        <circle cx="70" cy="54" r="7" fill="#59c749" opacity=".2" />
        <circle cx="70" cy="54" r="3" fill="#59c749" />
        <path d="M75 123h30v20c0 8-6 14-14 14h-2c-8 0-14-6-14-14v-20Z" fill="url(#ma-machine-metal)" />
        <path d="M105 128h7c7 0 10 5 10 11s-4 10-11 10h-6" fill="none" stroke="#c9c9bf" strokeWidth="6" />
      </g>
    </svg>
  );
}

export function SpatialHero({ language }: { language: "de" | "en" }) {
  const labels = copy[language];
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  pausedRef.current = paused;

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    let frame = 0;
    let intersecting = false;
    const update = () => {
      frame = 0;
      if (pausedRef.current || document.hidden) return;
      const hero = root.closest<HTMLElement>(".ma-hero");
      const rect = (hero ?? root).getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const travel = Math.max(rect.height - viewport * 0.82, viewport * 0.45);
      const progress = Math.min(Math.max(-rect.top / travel, 0), 1);
      stage.style.setProperty("--p", progress.toFixed(3));
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const attach = () => {
      window.addEventListener("scroll", requestUpdate, { passive: true });
      window.addEventListener("resize", requestUpdate, { passive: true });
      requestUpdate();
    };
    const detach = () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      root.classList.toggle("is-offscreen", !intersecting);
      if (intersecting) attach(); else detach();
    }, { rootMargin: "12% 0px" });
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotionPreference = () => {
      detach();
      observer.disconnect();
      stage.style.setProperty("--p", "0");
      if (!reducedMotion.matches) observer.observe(root);
    };
    const onVisibilityChange = () => {
      root.classList.toggle("is-tab-hidden", document.hidden);
      if (!document.hidden && intersecting) requestUpdate();
    };

    applyMotionPreference();
    reducedMotion.addEventListener("change", applyMotionPreference);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      reducedMotion.removeEventListener("change", applyMotionPreference);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      observer.disconnect();
      detach();
    };
  }, []);

  return (
    <div className={paused ? "ma-world is-paused" : "ma-world"} ref={rootRef}>
      <p className="sr-only">{labels.summary}</p>
      <div className="ma-world-stage" ref={stageRef} aria-hidden="true">
        <div className="ma-world-light" />
        <div className="ma-world-product">
          <ProductIllustration />
          <span><small>{labels.productLabel}</small><strong>{labels.product}</strong></span>
        </div>
        <svg className="ma-world-links" viewBox="0 0 640 500" preserveAspectRatio="none">
          <path d="M128 128 C230 156 268 218 334 250" /><path d="M518 120 C444 155 416 202 370 246" /><path d="M116 376 C220 346 266 300 334 264" /><path d="M526 382 C446 340 420 300 372 266" />
        </svg>
        {chipSpecs.map((chip, index) => (
          <div
            className="ma-world-chip"
            key={chip.id}
            style={{ "--chip-x": chip.x, "--chip-y": chip.y, "--chip-z": chip.z, "--chip-r": chip.rotate, "--chip-t": chip.threshold, "--chip-delay": chip.delay, "--intro-delay": `${260 + index * 90}ms` } as CSSProperties}
          >
            <span>{chip.icon}{labels.chips[chip.id as keyof typeof labels.chips]}</span>
          </div>
        ))}
        <div className="ma-world-record">
          <div className="ma-world-record-head">
            <span><CheckCircle2 size={20} /></span>
            <div><small>{labels.record}</small><strong>{labels.product}</strong></div>
            <em>{labels.complete}</em>
          </div>
          <ul>{labels.rows.map((row) => <li key={row}><CheckCircle2 size={15} />{row}</li>)}</ul>
          <div className="ma-world-progress"><small>{labels.completeness}</small><span><i /></span></div>
        </div>
      </div>
      <button className="ma-world-pause" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
        {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}{paused ? labels.resume : labels.pause}
      </button>
    </div>
  );
}
