import { useEffect, useState, type MouseEvent } from "react";
import type { ReactNode } from "react";
import { Github, Instagram, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import avarenoMark from "../assets/avareno-mark.svg";
import { LanguageSwitch } from "./LanguageSwitch";
import { useLanguage } from "../lib/language";

type FooterInternalLink = {
  label: string;
  to: string;
};

type FooterExternalLink = {
  href: string;
  icon: ReactNode;
  label: string;
};

type FooterColumn = {
  links: Array<FooterInternalLink | FooterExternalLink>;
  title: string;
};

const marketingCopy = {
  de: {
    app: "App",
    brandAria: "Avareno Startseite",
    closeNav: "Website-Navigation schließen",
    cta: "Starten",
    footerAria: "Footer-Navigation",
    footerDescription: "Ein privates Gedächtnis für Produkte, Belege, Garantien und die nächsten Schritte, die das echte Leben nachfragt.",
    homepageAria: "Avareno Startseite",
    navAria: "Website-Bereiche",
    openNav: "Website-Navigation öffnen",
    siteAria: "Avareno Website-Navigation",
    navLinks: [
      { to: "/#product", label: "Produkt" },
      { to: "/#memory-gallery", label: "Beispiele" },
      { to: "/#dinge", label: "Dinge" },
      { to: "/#how-it-works", label: "Ablauf" },
      { to: "/datenschutz", label: "Sicherheit" },
      { to: "/#pricing", label: "Preise" }
    ],
    footerColumns: [
      {
        title: "Produkt",
        links: [
          { to: "/#dinge", label: "Dinge" },
          { to: "/#dinge", label: "Resolve" },
          { to: "/#dinge", label: "Care" },
          { to: "/datenschutz", label: "Privater Vault" }
        ]
      },
      {
        title: "Ressourcen",
        links: [
          { to: "/#how-it-works", label: "Ablauf" },
          { to: "/cookies", label: "Cookies" },
          { to: "/datenschutz", label: "Datenschutz" },
          { to: "/pricing", label: "Preise" }
        ]
      },
      {
        title: "Social",
        links: [
          { href: "https://discord.gg/7Z4nnc6q54", icon: <DiscordIcon />, label: "Discord" },
          { href: "https://www.instagram.com/avarenoapp/", icon: <Instagram size={16} />, label: "Instagram" },
          { href: "https://github.com/Avareno-ORG", icon: <Github size={16} />, label: "GitHub" },
          { href: "https://www.patreon.com/c/Avareno", icon: <PatreonIcon />, label: "Patreon" }
        ]
      },
      {
        title: "Unternehmen",
        links: [
          { to: "/impressum", label: "Impressum" },
          { to: "/datenschutz", label: "Datenschutz" },
          { to: "/cookies", label: "Cookies" },
          { to: "/login", label: "App öffnen" }
        ]
      }
    ] satisfies FooterColumn[]
  },
  en: {
    app: "App",
    brandAria: "Avareno homepage",
    closeNav: "Close website navigation",
    cta: "Get started",
    footerAria: "Footer navigation",
    footerDescription: "A private memory for products, receipts, warranties and the next actions real life keeps asking for.",
    homepageAria: "Avareno homepage",
    navAria: "Website sections",
    openNav: "Open website navigation",
    siteAria: "Avareno website navigation",
    navLinks: [
      { to: "/#product", label: "Product" },
      { to: "/#memory-gallery", label: "Memory" },
      { to: "/#dinge", label: "Dinge" },
      { to: "/#how-it-works", label: "How it works" },
      { to: "/datenschutz", label: "Security" },
      { to: "/#pricing", label: "Pricing" }
    ],
    footerColumns: [
      {
        title: "Product",
        links: [
          { to: "/#dinge", label: "Dinge" },
          { to: "/#dinge", label: "Resolve" },
          { to: "/#dinge", label: "Care" },
          { to: "/datenschutz", label: "Private Vault" }
        ]
      },
      {
        title: "Resources",
        links: [
          { to: "/#how-it-works", label: "How it works" },
          { to: "/cookies", label: "Cookies" },
          { to: "/datenschutz", label: "Privacy" },
          { to: "/pricing", label: "Pricing" }
        ]
      },
      {
        title: "Social",
        links: [
          { href: "https://discord.gg/7Z4nnc6q54", icon: <DiscordIcon />, label: "Discord" },
          { href: "https://www.instagram.com/avarenoapp/", icon: <Instagram size={16} />, label: "Instagram" },
          { href: "https://github.com/Avareno-ORG", icon: <Github size={16} />, label: "GitHub" },
          { href: "https://www.patreon.com/c/Avareno", icon: <PatreonIcon />, label: "Patreon" }
        ]
      },
      {
        title: "Company",
        links: [
          { to: "/impressum", label: "Imprint" },
          { to: "/datenschutz", label: "Privacy" },
          { to: "/cookies", label: "Cookies" },
          { to: "/login", label: "Open app" }
        ]
      }
    ] satisfies FooterColumn[]
  }
};

function getHashTarget(to: string) {
  if (!to.startsWith("/#")) return null;
  return decodeURIComponent(to.slice(2));
}

function scrollToMarketingSection(sectionId: string) {
  const target = document.getElementById(sectionId);
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

function useMarketingHashNavigation(onNavigate?: () => void) {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;

    const sectionId = decodeURIComponent(location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => scrollToMarketingSection(sectionId));
    const retry = window.setTimeout(() => scrollToMarketingSection(sectionId), 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retry);
    };
  }, [location.hash, location.pathname]);

  return (event: MouseEvent<HTMLAnchorElement>, to: string) => {
    onNavigate?.();

    const sectionId = getHashTarget(to);
    if (!sectionId || location.pathname !== "/") return;

    if (scrollToMarketingSection(sectionId)) {
      event.preventDefault();
      const nextHash = `#${sectionId}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, "", nextHash);
      }
    }
  };
}

export function MarketingHeader() {
  const location = useLocation();
  const { language } = useLanguage();
  const copy = marketingCopy[language];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const handleNavClick = useMarketingHashNavigation(() => setIsMenuOpen(false));

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.hash, location.pathname]);

  return (
    <header className={isMenuOpen ? "site-nav is-open" : "site-nav"} aria-label={copy.siteAria}>
      <Link className="site-brand-lockup" to="/" aria-label={copy.brandAria} onClick={() => setIsMenuOpen(false)}>
        <span className="site-brand-symbol" aria-hidden="true">
          <img src={avarenoMark} alt="" />
        </span>
        <span className="site-brand-text">avareno</span>
      </Link>

      <button
        className="site-menu-toggle"
        type="button"
        aria-controls="site-nav-menu"
        aria-expanded={isMenuOpen}
        aria-label={isMenuOpen ? copy.closeNav : copy.openNav}
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        {isMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>

      <nav className="site-nav-links" id="site-nav-menu" aria-label={copy.navAria}>
        {copy.navLinks.map((link) => (
          <Link to={link.to} key={link.to} onClick={(event) => handleNavClick(event, link.to)}>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="site-nav-actions">
        <LanguageSwitch className="site-language-switch" onSwitch={() => setIsMenuOpen(false)} />
        <Link className="site-nav-login" to="/login" onClick={() => setIsMenuOpen(false)}>
          {copy.app}
        </Link>
        <Link className="site-nav-cta" to="/signup" onClick={() => setIsMenuOpen(false)}>
          {copy.cta}
        </Link>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const { language } = useLanguage();
  const copy = marketingCopy[language];
  const handleNavClick = useMarketingHashNavigation();

  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <Link className="site-footer-logo" to="/" aria-label={copy.homepageAria}>
          <span className="site-brand-symbol" aria-hidden="true">
            <img src={avarenoMark} alt="" />
          </span>
          <span>avareno</span>
        </Link>
        <p>{copy.footerDescription}</p>
      </div>

      <nav className="site-footer-links" aria-label={copy.footerAria}>
        {copy.footerColumns.map((column) => (
          <div key={column.title}>
            <h2>{column.title}</h2>
            {column.links.map((link) =>
              "href" in link ? (
                <a className="site-footer-social-link" href={link.href} key={`${column.title}-${link.label}`} rel="noreferrer" target="_blank">
                  <span aria-hidden="true">{link.icon}</span>
                  <span>{link.label}</span>
                </a>
              ) : (
                <Link to={link.to} key={`${column.title}-${link.label}`} onClick={(event) => handleNavClick(event, link.to)}>
                  {link.label}
                </Link>
              )
            )}
          </div>
        ))}
      </nav>
    </footer>
  );
}

function DiscordIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.6 8.75c2.25-.7 4.55-.7 6.8 0M9.15 15.15c1.9.65 3.8.65 5.7 0M8.75 11.85h.02M15.25 11.85h.02"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M7.7 5.45c2.85-1.15 5.75-1.15 8.6 0 1.75 2.35 2.45 5.15 2.1 8.35-1.55 1.2-3.05 1.95-4.5 2.25l-.85-1.45M10.95 14.6l-.85 1.45c-1.45-.3-2.95-1.05-4.5-2.25-.35-3.2.35-6 2.1-8.35Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PatreonIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.2 5.2v13.6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M14.4 14.25a4.55 4.55 0 1 0 0-9.1 4.55 4.55 0 0 0 0 9.1Z" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}
