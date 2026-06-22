import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Archive, Bot, FileCheck2, FileText, Gift, Home, ListChecks, MessageSquareText, Package, PenLine, PlugZap, Plus, ReceiptText, X } from "lucide-react";
import { useState } from "react";
import primaryLogo from "../assets/primary-logo.svg";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/items", label: "Things", icon: Archive },
  { to: "/ask", label: "Ask", icon: Bot },
  { to: "/smart-home", label: "Smart", icon: PlugZap },
  { to: "/capture", label: "Drop", icon: Plus },
  { to: "/reports/home-binder", label: "Binder", icon: FileCheck2 },
  { to: "/capture/loop", label: "Care", icon: ListChecks },
  { to: "/rewards", label: "Progress", icon: Gift }
];

const captureOptions = [
  { label: "Smart Capture", helper: "One flow for photo, receipt, text, barcode", to: "/capture", icon: Plus },
  { label: "Receipt", helper: "Proof, warranty, item card", to: "/capture/receipt", icon: ReceiptText },
  { label: "Thing", helper: "Start a profile for a physical object", to: "/capture/item", icon: Package },
  { label: "Message", helper: "Context into a reminder", to: "/capture/message", icon: MessageSquareText },
  { label: "Document", helper: "Store and connect later", to: "/capture/receipt", icon: FileText },
  { label: "Care", helper: "Warranty, repair, service, return", to: "/capture/loop", icon: PenLine }
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="ozma-shell min-h-screen">
      <header className="sticky top-0 z-30 px-4 py-3 backdrop-blur-xl md:py-5">
        <div className="ozma-nav mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-lg px-3 py-3">
          <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => navigate("/")}>
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-leaf">
              <img src={primaryLogo} alt="" className="h-full w-full object-contain" aria-hidden="true" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block text-lg font-black leading-tight text-ink">Mavora</span>
              <span className="block truncate text-xs font-bold text-muted">your things, close by</span>
            </span>
          </button>

          <nav className="no-scrollbar flex flex-1 justify-center overflow-auto">
            <div className="flex items-center gap-1 rounded-full bg-white/72 p-1 ring-1 ring-line/80">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-black transition ${
                        isActive ? "bg-ink text-white" : "text-muted hover:bg-white hover:text-ink"
                      }`
                    }
                  >
                    <Icon size={15} />
                    <span className="hidden sm:inline">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </nav>

          <button className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5" onClick={() => setOpen(true)}>
            <Plus size={17} />
            <span className="hidden sm:inline">Capture</span>
          </button>
        </div>
      </header>

      <main className="px-4 pb-24 pt-2 md:pb-10">
        <Outlet />
      </main>

      {open ? (
        <div className="fixed inset-0 z-40 bg-ink/58 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="ozma-modal mx-auto mt-8 max-w-2xl rounded-lg p-4 md:mt-24" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-muted">Capture</p>
                <h2 className="mt-1 text-3xl font-black text-ink">Add something real.</h2>
                <p className="mt-2 max-w-lg text-sm font-semibold leading-6 text-muted">Choose a source. Mavora turns it into an object, proof, or care reminder.</p>
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
