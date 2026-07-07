import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Archive, ChevronDown, FileText, Home, LifeBuoy, LogOut, MessageSquareText, Package, PenLine, Plus, ReceiptText, Search, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import avarenoMark from "../assets/avareno-test-logo.png";
import { useAuth } from "../lib/authProvider";
import { CommandPalette } from "./CommandPalette";

const nav = [
  { to: "/app", label: "Zuhause", icon: Home },
  { to: "/app/dinge", label: "Objekte", icon: Archive, activePaths: ["/app/dinge", "/app/items"] },
  { to: "/app/resolve", label: "Offene Punkte", icon: LifeBuoy },
  { to: "/app/care", label: "Erinnerungen", icon: PenLine },
  { to: "/app/profile", label: "Profil", icon: UserRound, activePaths: ["/app/profile", "/app/ich", "/app/rewards", "/app/friends", "/app/settings"] }
];

const captureOptions = [
  { label: "Smart erfassen", helper: "Ein Flow für Foto, Beleg, Text und Barcode", to: "/app/capture", icon: Plus },
  { label: "Objekt", helper: "Produkt oder Gerät als Objektprofil anlegen", to: "/app/capture/item", icon: Package },
  { label: "Beleg", helper: "Kaufbeleg speichern und mit einem Objekt verbinden", to: "/app/capture/receipt", icon: ReceiptText },
  { label: "Dokument", helper: "Anleitung, Garantie oder Vertrag hochladen", to: "/app/capture/receipt", icon: FileText },
  { label: "Erinnerung", helper: "Service, Frist oder Rückgabe festhalten", to: "/app/capture/loop", icon: PenLine },
  { label: "Nachricht", helper: "Notiz in eine Erinnerung verwandeln", to: "/app/capture/message", icon: MessageSquareText }
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const captureModalRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const isMarketingSurface = ["/", "/pricing", "/impressum", "/datenschutz", "/cookies"].includes(location.pathname) || location.pathname.startsWith("/checkout/");
  const isAuthSurface = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback", "/auth/verify-email", "/onboarding"].includes(location.pathname);
  const isProtectedSurface = !isMarketingSurface && !isAuthSurface;

  useEffect(() => {
    setProfileMenuOpen(false);
    setPaletteOpen(false);
  }, [location.pathname]);

  // ⌘K / Ctrl+K opens global search from anywhere in the app.
  useEffect(() => {
    if (!isProtectedSurface) return;
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isProtectedSurface]);

  // Profile menu: roving arrow-key navigation, Escape/Tab close, focus restore.
  useEffect(() => {
    if (!profileMenuOpen) return;
    const container = profileMenuRef.current;
    const trigger = container?.querySelector<HTMLElement>(".avareno-profile-trigger");
    const getItems = () => Array.from(container?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

    getItems()[0]?.focus();

    function closeOnOutsideClick(event: MouseEvent) {
      if (container?.contains(event.target as Node)) return;
      setProfileMenuOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      const items = getItems();
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          setProfileMenuOpen(false);
          trigger?.focus();
          break;
        case "Tab":
          setProfileMenuOpen(false);
          break;
        case "ArrowDown":
          event.preventDefault();
          items[(index + 1) % items.length].focus();
          break;
        case "ArrowUp":
          event.preventDefault();
          items[(index - 1 + items.length) % items.length].focus();
          break;
        case "Home":
          event.preventDefault();
          items[0].focus();
          break;
        case "End":
          event.preventDefault();
          items[items.length - 1].focus();
          break;
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileMenuOpen]);

  // Capture dialog: focus trap, Escape-to-close, focus restore, scroll lock.
  useEffect(() => {
    if (!open) return;
    const modal = captureModalRef.current;
    if (!modal) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const getFocusable = () =>
      Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    modal.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (isMarketingSurface || isAuthSurface) {
    return (
      <main className={isAuthSurface ? "auth-shell" : "avareno-landing-main"}>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    );
  }

  if (isProtectedSurface && auth.status === "loading") {
    return <AuthRouteLoading />;
  }

  if (isProtectedSurface && auth.status === "anonymous") {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  const isSmartSurface =
    location.pathname === "/smart-home" ||
    location.pathname === "/app" ||
    location.pathname === "/app/smart-home" ||
    location.pathname === "/home-graph" ||
    location.pathname.startsWith("/home-graph/") ||
    location.pathname === "/app/home" ||
    location.pathname.startsWith("/app/home/") ||
    location.pathname === "/app/home-graph" ||
    location.pathname.startsWith("/app/home-graph/");

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
              const activePaths = "activePaths" in item && item.activePaths ? item.activePaths : [item.to];
              const isNavActive = activePaths.some((path) =>
                path === "/app" ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`)
              );
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/app"}
                  className={() => (isNavActive ? "is-active" : "")}
                  aria-label={item.label}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="avareno-app-actions">
            <button className="avareno-app-search" onClick={() => setPaletteOpen(true)} type="button" aria-label="Suche (⌘K)" title="Suche · ⌘K">
              <Search size={17} />
            </button>
            <button className="avareno-app-capture" onClick={() => setOpen(true)}>
              <Plus size={17} />
              <span>Erfassen</span>
            </button>
            <div className="avareno-profile-menu" ref={profileMenuRef}>
              <button
                className="avareno-profile-trigger"
                onClick={() => setProfileMenuOpen((current) => !current)}
                type="button"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                aria-label={`Konto: ${auth.profile?.displayName ?? "Avareno"}`}
              >
                <ProfileAvatar name={auth.profile?.displayName ?? "Avareno"} src={auth.profile?.avatarUrl} />
                <ChevronDown size={13} />
              </button>
              {profileMenuOpen ? (
                <div className="avareno-profile-dropdown" role="menu">
                  <div className="avareno-profile-dropdown-head">
                    <ProfileAvatar name={auth.profile?.displayName ?? "Avareno"} src={auth.profile?.avatarUrl} />
                    <div>
                      <strong>{auth.profile?.displayName ?? "Avareno"}</strong>
                      <span>{auth.profile?.email ?? "Privater Workspace"}</span>
                    </div>
                  </div>
                  <Link onClick={() => setProfileMenuOpen(false)} role="menuitem" tabIndex={-1} to="/app/ich/settings">
                    <UserRound size={15} />
                    Profil bearbeiten
                  </Link>
                  <Link onClick={() => setProfileMenuOpen(false)} role="menuitem" tabIndex={-1} to="/app/ich/friends">
                    <UsersRound size={15} />
                    Freunde
                  </Link>
                  <Link onClick={() => setProfileMenuOpen(false)} role="menuitem" tabIndex={-1} to="/app/ich/privacy">
                    <ShieldCheck size={15} />
                    Privatsphäre
                  </Link>
                  <Link onClick={() => setProfileMenuOpen(false)} role="menuitem" tabIndex={-1} to="/">
                    <Home size={15} />
                    Website
                  </Link>
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      void auth.logout();
                      navigate("/login", { replace: true });
                    }}
                    role="menuitem"
                    tabIndex={-1}
                    type="button"
                  >
                    <LogOut size={15} />
                    Abmelden
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <main className={isSmartSurface ? "avareno-app-content is-smart-surface" : "avareno-app-content"}>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      {open ? (
        <div className="fixed inset-0 z-40 bg-ink/58 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            ref={captureModalRef}
            className="ozma-modal mx-auto mt-8 max-w-2xl rounded-lg p-4 md:mt-24"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="capture-modal-title"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-muted">Erfassen</p>
                <h2 id="capture-modal-title" className="mt-1 text-3xl font-black text-ink">Was möchtest du erfassen?</h2>
                <p className="mt-2 max-w-lg text-sm font-semibold leading-6 text-muted">Wähle eine Art. Details kannst du danach in Ruhe ergänzen.</p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-wash hover:text-ink" onClick={() => setOpen(false)} type="button" aria-label="Schließen">
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

function ProfileAvatar({ name, src }: { name: string; src?: string | null }) {
  return (
    <span className="avareno-profile-avatar" aria-hidden="true">
      {src ? <img src={src} alt="" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function AuthRouteLoading() {
  return (
    <main className="auth-route-loading">
      <div>
        <div className="av-loading-bar is-route" role="status" aria-live="polite">
          <span>Privater Bereich wird vorbereitet...</span>
          <i aria-hidden="true" />
        </div>
        <p>Session und Speicher werden geprüft.</p>
      </div>
    </main>
  );
}

/* Suspense fallback while a lazily code-split route chunk loads.
   Calm indeterminate bar; the shell/nav stay in place around it. */
function RouteFallback() {
  return (
    <div className="av-route-fallback" role="status" aria-live="polite" aria-label="Wird geladen">
      <span className="av-route-fallback-bar" aria-hidden="true" />
    </div>
  );
}
