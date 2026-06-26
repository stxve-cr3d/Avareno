import { Link } from "react-router-dom";
import avarenoMark from "../assets/avareno-mark.svg";

const legalLinks = [
  { to: "/pricing", label: "Preise" },
  { to: "/impressum", label: "Impressum" },
  { to: "/datenschutz", label: "Datenschutz" },
  { to: "/cookies", label: "Cookies" }
];

export function MarketingHeader() {
  return (
    <header className="avareno-site-nav" aria-label="Avareno website navigation">
      <Link className="avareno-brand-lockup" to="/" aria-label="Avareno Startseite">
        <span className="avareno-brand-symbol" aria-hidden="true">
          <img src={avarenoMark} alt="" />
        </span>
        <span className="avareno-brand-text">avareno</span>
      </Link>
      <nav className="avareno-site-links" aria-label="Website sections">
        <Link to="/#product">Produkt</Link>
        <Link to="/pricing">Preise</Link>
        <Link to="/#modules">Module</Link>
        <Link to="/datenschutz">Datenschutz</Link>
      </nav>
      <Link className="avareno-site-action" to="/app">
        Starten
      </Link>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="avareno-site-footer">
      <div>
        <Link className="avareno-footer-brand" to="/" aria-label="Avareno Startseite">
          <span className="avareno-brand-symbol" aria-hidden="true">
            <img src={avarenoMark} alt="" />
          </span>
          <span>avareno</span>
        </Link>
        <p>Dein zweites Gedächtnis für dein echtes Leben.</p>
      </div>
      <nav aria-label="Legal navigation">
        {legalLinks.map((link) => (
          <Link to={link.to} key={link.to}>
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
