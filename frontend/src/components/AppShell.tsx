import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Archive,
  Brain,
  FileText,
  Gift,
  Home,
  ListChecks,
  MessageSquareText,
  Package,
  PenLine,
  Plus,
  ReceiptText,
  Sparkles,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "./Button";

const nav = [
  { to: "/", label: "Today", icon: Home },
  { to: "/items", label: "Items", icon: Archive },
  { to: "/capture/receipt", label: "Capture", icon: Plus },
  { to: "/capture/loop", label: "Loops", icon: ListChecks },
  { to: "/rewards", label: "Rewards", icon: Gift }
];

const captureOptions = [
  { label: "Receipt", helper: "Beleg rein, Gerät raus.", to: "/capture/receipt", icon: ReceiptText, tone: "text-leaf bg-emerald-50" },
  { label: "Message", helper: "Aus Text wird Erinnerung.", to: "/capture/message", icon: MessageSquareText, tone: "text-sky bg-sky-50" },
  { label: "Document", helper: "Sicher parken.", to: "/capture/receipt", icon: FileText, tone: "text-amber bg-amber-50" },
  { label: "Manual Loop", helper: "Kurz aus dem Kopf.", to: "/capture/loop", icon: PenLine, tone: "text-coral bg-orange-50" },
  { label: "Item", helper: "Besitz merken.", to: "/capture/item", icon: Package, tone: "text-moss bg-green-50" }
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:px-6">
      <header className="sticky top-0 z-20 px-3 py-3 backdrop-blur md:pt-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/78 px-3 py-3 shadow-soft">
          <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => navigate("/")}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-coal text-white">
              <Brain size={22} />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-black tracking-normal text-ink">Second memory</span>
              <span className="block truncate text-xs font-bold text-ink/50">Alles ist geparkt, wenn du es reinwirfst.</span>
            </span>
          </button>
          <div className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-extrabold transition ${
                      isActive ? "bg-coal text-white" : "text-ink/58 hover:bg-mist hover:text-ink"
                    }`
                  }
                >
                  <Icon size={16} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
          <Button className="shrink-0" icon={<Plus size={18} />} onClick={() => setOpen(true)}>
            Drop something in
          </Button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4 md:pb-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-coal px-2 py-2 text-white md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold transition ${
                    isActive ? "bg-white text-ink" : "text-white/70 hover:bg-white/10"
                  }`
                }
              >
                <Icon size={19} />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-30 bg-coal/40 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="soft-pop mx-auto mt-16 max-w-md rounded-lg border border-white/70 bg-paper p-4 shadow-lift md:mt-24"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-moss">
                  <Sparkles size={15} />
                  Good catch
                </div>
                <p className="text-2xl font-black text-ink">Was soll ich fuer dich merken?</p>
                <p className="mt-1 text-sm font-medium text-ink/55">Einwerfen reicht. Second Memory baut daraus den naechsten leichten Schritt.</p>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-lg text-ink/50 hover:bg-mist hover:text-ink" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-2">
              {captureOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.label}
                    className="group flex items-center gap-3 rounded-lg border border-line bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-leaf hover:shadow-soft"
                    onClick={() => {
                      setOpen(false);
                      navigate(option.to);
                    }}
                  >
                    <span className={`grid h-11 w-11 place-items-center rounded-lg ${option.tone}`}>
                      <Icon size={20} />
                    </span>
                    <span>
                      <span className="block font-black text-ink">{option.label}</span>
                      <span className="text-sm font-semibold text-ink/48">{option.helper}</span>
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
