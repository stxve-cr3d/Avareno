import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Archive, Bot, FileCheck2, FileText, Gift, Home, ListChecks, MessageSquareText, Package, PenLine, PlugZap, Plus, ReceiptText, UserRound, X } from "lucide-react";
import { useState } from "react";
import avarenoMark from "../assets/avareno-mark.svg";

const nav = [
  { to: "/app", label: "Home", icon: Home },
  { to: "/app/items", label: "Dinge", icon: Archive },
  { to: "/app/ask", label: "Ask", icon: Bot },
  { to: "/app/smart-home", label: "Smart", icon: PlugZap },
  { to: "/app/capture", label: "Capture", icon: Plus },
  { to: "/app/reports/home-binder", label: "Binder", icon: FileCheck2 },
  { to: "/app/capture/loop", label: "Care", icon: ListChecks },
  { to: "/app/rewards", label: "Progress", icon: Gift }
];

const captureOptions = [
  { label: "Smart Capture", helper: "One flow for photo, receipt, text, barcode", to: "/app/capture", icon: Plus },
  { label: "Receipt", helper: "Proof, warranty, item card", to: "/app/capture/receipt", icon: ReceiptText },
  { label: "Thing", helper: "Start a profile for a physical object", to: "/app/capture/item", icon: Package },
  { label: "Message", helper: "Context into a reminder", to: "/app/capture/message", icon: MessageSquareText },
  { label: "Document", helper: "Store and connect later", to: "/app/capture/receipt", icon: FileText },
  { label: "Care", helper: "Warranty, repair, service, return", to: "/app/capture/loop", icon: PenLine }
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isMarketingSurface = ["/", "/pricing", "/impressum", "/datenschutz", "/cookies"].includes(location.pathname);

  if (isMarketingSurface) {
    return (
      <main className="avareno-landing-main">
        <Outlet />
      </main>
    );
  }

  const isSmartSurface = location.pathname === "/smart-home" || location.pathname === "/app" || location.pathname === "/app/smart-home";

  return (
    <div className="avareno-app-shell min-h-screen">
      <header className="avareno-app-topbar">
        <div className="avareno-app-topbar-inner">
          <button className="avareno-app-brand" onClick={() => navigate("/app")} aria-label="Avareno App Home">
            <span className="avareno-app-brand-symbol" aria-hidden="true">
              <img src={avarenoMark} alt="" />
            </span>
            <span className="avareno-app-brand-text">avareno</span>
          </button>

          <nav className="avareno-app-nav no-scrollbar">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/app"}
                  className={({ isActive }) => (isActive ? "is-active" : "")}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="avareno-app-actions">
            <Link className="avareno-app-website-link" to="/">
              Website
            </Link>
            <button className="avareno-app-user" type="button" aria-label="User profile">
              <UserRound size={17} />
              <span>Steve</span>
            </button>
            <button className="avareno-app-capture" onClick={() => setOpen(true)}>
              <Plus size={17} />
              <span>Capture</span>
            </button>
          </div>
        </div>
      </header>

      <main className={isSmartSurface ? "avareno-app-content is-smart-surface" : "avareno-app-content"}>
        <Outlet />
      </main>

      {open ? (
        <div className="fixed inset-0 z-40 bg-ink/58 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="ozma-modal mx-auto mt-8 max-w-2xl rounded-lg p-4 md:mt-24" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-muted">Capture</p>
                <h2 className="mt-1 text-3xl font-black text-ink">Add something real.</h2>
                <p className="mt-2 max-w-lg text-sm font-semibold leading-6 text-muted">Choose a source. Avareno turns it into an object, proof, or care reminder.</p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-wash hover:text-ink" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {captureOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.label}
                    className="ozma-command group"
                    onClick={() => {
                      setOpen(false);
                      navigate(option.to);
                    }}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-white">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block text-base font-black text-ink">{option.label}</span>
                      <span className="text-sm font-semibold text-muted">{option.helper}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
