import { useEffect, useState, type MouseEvent } from "react";
import { Menu, UserRound, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import avarenoMark from "../assets/avareno-test-logo.png";
import { useAuth } from "../lib/authProvider";
import { betaFeatures } from "../lib/betaFeatures";
import { useLanguage } from "../lib/language";
import { LanguageSwitch } from "./LanguageSwitch";

type InternalLink = { label: string; to: string };
type ExternalLink = { href: string; label: string };
type FooterColumn = { title: string; links: ReadonlyArray<InternalLink | ExternalLink> };

const marketingCopy = {
  de: {
    app: "Login",
    account: "Account",
    brandAria: "Avareno Startseite",
    closeNav: "Website-Navigation schließen",
    cta: "Beta-Zugang erhalten",
    footerAria: "Footer-Navigation",
    footerDescription: "Dein persönliches Archiv für Produkte, Rechnungen, Garantien und Anleitungen.",
    navAria: "Website-Bereiche",
    openNav: "Website-Navigation öffnen",
    siteAria: "Avareno Website-Navigation",
    navLinks: [
      { to: "/#product", label: "Produkt" },
      { to: "/#how-it-works", label: "So funktioniert es" },
      { to: "/#produktakte", label: "Produktakte" },
      { to: "/#security", label: "Sicherheit" },
      { to: "/#pricing", label: "Preise" },
      { to: "/#faq", label: "FAQ" }
    ],
    footerColumns: [
      {
        title: "Produkt",
        links: [
          { to: "/#product", label: "Funktionen" },
          { to: "/#how-it-works", label: "So funktioniert es" },
          { to: "/#produktakte", label: "Produktakte" },
          { to: "/#security", label: "Sicherheit" },
          { to: "/#pricing", label: "Preise" },
          { to: "/#faq", label: "FAQ" }
        ]
      },
      {
        title: "Zugang",
        links: [
          { to: "/login", label: "Login" },
          { to: betaFeatures.inviteOnly ? "/login" : "/signup", label: "Beta-Zugang" },
          { href: "mailto:support@avareno.de", label: "Kontakt" }
        ]
      },
      {
        title: "Rechtliches",
        links: [
          { to: "/datenschutz", label: "Datenschutz" },
          { to: "/impressum", label: "Impressum" },
          { to: "/nutzungsbedingungen", label: "Nutzungsbedingungen" },
          { to: "/cookies", label: "Cookies" }
        ]
      }
    ] satisfies ReadonlyArray<FooterColumn>
  },
  en: {
    app: "Login",
    account: "Account",
    brandAria: "Avareno homepage",
    closeNav: "Close website navigation",
    cta: "Get beta access",
    footerAria: "Footer navigation",
    footerDescription: "Your personal archive for products, receipts, warranties and manuals.",
    navAria: "Website sections",
    openNav: "Open website navigation",
    siteAria: "Avareno website navigation",
    navLinks: [
      { to: "/#product", label: "Product" },
      { to: "/#how-it-works", label: "How it works" },
      { to: "/#produktakte", label: "Product dossier" },
      { to: "/#security", label: "Security" },
      { to: "/#pricing", label: "Pricing" },
      { to: "/#faq", label: "FAQ" }
    ],
    footerColumns: [
      {
        title: "Product",
        links: [
          { to: "/#product", label: "Features" },
          { to: "/#how-it-works", label: "How it works" },
          { to: "/#produktakte", label: "Product dossier" },
          { to: "/#security", label: "Security" },
          { to: "/#pricing", label: "Pricing" },
          { to: "/#faq", label: "FAQ" }
        ]
      },
      {
        title: "Access",
        links: [
          { to: "/login", label: "Login" },
          { to: betaFeatures.inviteOnly ? "/login" : "/signup", label: "Beta access" },
          { href: "mailto:support@avareno.de", label: "Contact" }
        ]
      },
      {
        title: "Legal",
        links: [
          { to: "/datenschutz", label: "Privacy" },
          { to: "/impressum", label: "Imprint" },
          { to: "/nutzungsbedingungen", label: "Terms of use" },
          { to: "/cookies", label: "Cookies" }
        ]
      }
    ] satisfies ReadonlyArray<FooterColumn>
  }
} as const;

function getHashTarget(to: string) {
  return to.startsWith("/#") ? decodeURIComponent(to.slice(2)) : null;
}

function scrollToMarketingSection(sectionId: string) {
  const target = document.getElementById(sectionId);
  if (!target) return false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
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
    if (!sectionId || location.pathname !== "/" || !scrollToMarketingSection(sectionId)) return;
    event.preventDefault();
    const nextHash = `#${sectionId}`;
    if (window.location.hash !== nextHash) window.history.pushState(null, "", nextHash);
  };
}

export function MarketingHeader() {
  const location = useLocation();
  const { language } = useLanguage();
  const auth = useAuth();
  const copy = marketingCopy[language];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const handleNavClick = useMarketingHashNavigation(() => setIsMenuOpen(false));
  const isSignedIn = auth.status === "authenticated";
  const ctaTo = isSignedIn ? "/app/ich/settings" : betaFeatures.inviteOnly ? "/login" : "/signup";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    const update = () => setIsScrolled(window.scrollY > 16);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [isMenuOpen]);

  const className = ["ma-nav", isScrolled ? "is-scrolled" : "", isMenuOpen ? "is-open" : ""].filter(Boolean).join(" ");

  return (
    <header className={className} aria-label={copy.siteAria}>
      <div className="ma-nav-inner">
        <Link className="ma-brand" to="/" aria-label={copy.brandAria} onClick={() => setIsMenuOpen(false)}>
          <span aria-hidden="true"><img src={avarenoMark} alt="" /></span><strong>avareno</strong>
        </Link>
        <button className="ma-menu-toggle" type="button" aria-controls="ma-nav-menu" aria-expanded={isMenuOpen} aria-label={isMenuOpen ? copy.closeNav : copy.openNav} onClick={() => setIsMenuOpen((value) => !value)}>
          {isMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
        <nav className="ma-nav-links" id="ma-nav-menu" aria-label={copy.navAria}>
          {copy.navLinks.map((link) => <Link to={link.to} key={link.to} onClick={(event) => handleNavClick(event, link.to)}>{link.label}</Link>)}
        </nav>
        <div className="ma-nav-actions">
          <LanguageSwitch className="ma-language-switch" onSwitch={() => setIsMenuOpen(false)} />
          <Link className="ma-nav-login" to={isSignedIn ? "/app" : "/login"}>{isSignedIn ? "App" : copy.app}</Link>
          <Link className="ma-nav-cta" to={ctaTo}>{isSignedIn ? <UserRound size={15} aria-hidden="true" /> : null}{isSignedIn ? copy.account : copy.cta}</Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const { language } = useLanguage();
  const copy = marketingCopy[language];
  const handleNavClick = useMarketingHashNavigation();

  return (
    <footer className="ma-footer">
      <div className="ma-footer-inner">
        <div className="ma-footer-brand">
          <Link className="ma-brand" to="/" aria-label={copy.brandAria}><span aria-hidden="true"><img src={avarenoMark} alt="" /></span><strong>avareno</strong></Link>
          <p>{copy.footerDescription}</p>
        </div>
        <nav className="ma-footer-links" aria-label={copy.footerAria}>
          {copy.footerColumns.map((column) => (
            <div key={column.title}>
              <h2>{column.title}</h2>
              {column.links.map((link) => "href" in link ? <a href={link.href} key={link.href}>{link.label}</a> : <Link to={link.to} key={`${column.title}-${link.label}`} onClick={(event) => handleNavClick(event, link.to)}>{link.label}</Link>)}
            </div>
          ))}
        </nav>
      </div>
      <div className="ma-footer-bottom"><span>© {new Date().getFullYear()} Avareno</span><span>Private memory for real life.</span></div>
    </footer>
  );
}
