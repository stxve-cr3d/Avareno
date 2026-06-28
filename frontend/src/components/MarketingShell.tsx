import { Link } from "react-router-dom";
import avarenoMark from "../assets/avareno-mark.svg";

const navLinks = [
  { to: "/#product", label: "Product" },
  { to: "/#dinge", label: "Dinge" },
  { to: "/#memory-gallery", label: "Memory" },
  { to: "/#how-it-works", label: "How it works" },
  { to: "/datenschutz", label: "Sicherheit" },
  { to: "/#pricing", label: "Preise" }
];

const footerColumns = [
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
    title: "Company",
    links: [
      { to: "/impressum", label: "Imprint" },
      { to: "/datenschutz", label: "Privacy" },
      { to: "/cookies", label: "Cookies" },
      { to: "/login", label: "Open app" }
    ]
  }
];

export function MarketingHeader() {
  return (
    <header className="site-nav" aria-label="Avareno website navigation">
      <Link className="site-brand-lockup" to="/" aria-label="Avareno homepage">
        <span className="site-brand-symbol" aria-hidden="true">
          <img src={avarenoMark} alt="" />
        </span>
        <span className="site-brand-text">avareno</span>
      </Link>

      <nav className="site-nav-links" aria-label="Website sections">
        {navLinks.map((link) => (
          <Link to={link.to} key={link.to}>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="site-nav-actions">
        <Link className="site-nav-login" to="/login">
          App
        </Link>
        <Link className="site-nav-cta" to="/signup">
          Get started
        </Link>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <Link className="site-footer-logo" to="/" aria-label="Avareno homepage">
          <span className="site-brand-symbol" aria-hidden="true">
            <img src={avarenoMark} alt="" />
          </span>
          <span>avareno</span>
        </Link>
        <p>A private memory for products, receipts, warranties and the next actions real life keeps asking for.</p>
      </div>

      <nav className="site-footer-links" aria-label="Footer navigation">
        {footerColumns.map((column) => (
          <div key={column.title}>
            <h2>{column.title}</h2>
            {column.links.map((link) => (
              <Link to={link.to} key={`${column.title}-${link.label}`}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </footer>
  );
}
