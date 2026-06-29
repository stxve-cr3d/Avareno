import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Archive, ChevronDown, FileText, Home, LifeBuoy, LogOut, MessageSquareText, Package, PenLine, Plus, ReceiptText, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import avarenoMark from "../assets/avareno-mark.svg";
import { useAuth } from "../lib/authProvider";
import { api } from "../lib/api";
import type { AdminAccess } from "../lib/types";

const nav = [
  { to: "/app", label: "Zuhause", icon: Home },
  { to: "/app/dinge", label: "Dinge", icon: Archive, activePaths: ["/app/dinge", "/app/items"] },
  { to: "/app/resolve", label: "Resolve", icon: LifeBuoy },
  { to: "/app/care", label: "Care", icon: PenLine },
  { to: "/app/profile", label: "Ich", icon: UserRound, activePaths: ["/app/profile", "/app/ich", "/app/rewards", "/app/friends", "/app/settings"] }
];

const captureOptions = [
  { label: "Smart erfassen", helper: "Ein Flow für Foto, Beleg, Text und Barcode", to: "/app/capture", icon: Plus },
  { label: "Beleg", helper: "Nachweis, Garantie und Produktkarte", to: "/app/capture/receipt", icon: ReceiptText },
  { label: "Ding", helper: "Produktpass für ein echtes Objekt starten", to: "/app/capture/item", icon: Package },
  { label: "Nachricht", helper: "Kontext in Erinnerung verwandeln", to: "/app/capture/message", icon: MessageSquareText },
  { label: "Dokument", helper: "Speichern und später verbinden", to: "/app/capture/receipt", icon: FileText },
  { label: "Care", helper: "Garantie, Reparatur, Service, Rückgabe", to: "/app/care", icon: PenLine }
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [adminAccess, setAdminAccess] = useState<AdminAccess | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const isMarketingSurface = ["/", "/pricing", "/impressum", "/datenschutz", "/cookies"].includes(location.pathname);
  const isAuthSurface = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback", "/auth/verify-email", "/onboarding"].includes(location.pathname);
  const isProtectedSurface = !isMarketingSurface && !isAuthSurface;

  function refreshAdminAccess() {
    if (auth.status !== "authenticated") {
      setAdminAccess(null);
      return;
    }

    api<AdminAccess>("/api/admin/access")
      .then(setAdminAccess)
      .catch(() => setAdminAccess(null));
  }

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (auth.status !== "authenticated") {
      setAdminAccess(null);
      return;
    }

    refreshAdminAccess();
  }, [auth.status]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (profileMenuRef.current?.contains(event.target as Node)) return;
      setProfileMenuOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

  if (isMarketingSurface || isAuthSurface) {
    return (
      <main className={isAuthSurface ? "auth-shell" : "avareno-landing-main"}>
        <Outlet />
      </main>
    );
  }

  if (isProtectedSurface && auth.status === "loading") {
    return <AuthRouteLoading />;
  }

  if (isProtectedSurface && auth.status === "anonymous") {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
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
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="avareno-app-actions">
            <button className="avareno-app-capture" onClick={() => setOpen(true)}>
              <Plus size={17} />
              <span>Erfassen</span>
            </button>
            <div className="avareno-profile-menu" ref={profileMenuRef}>
              <button
                className="avareno-profile-trigger"
                onClick={() => {
                  if (!profileMenuOpen) refreshAdminAccess();
                  setProfileMenuOpen((current) => !current);
                }}
                type="button"
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
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
                  <Link onClick={() => setProfileMenuOpen(false)} role="menuitem" to="/app/ich/settings">
                    <UserRound size={15} />
                    Profil bearbeiten
                  </Link>
                  <Link onClick={() => setProfileMenuOpen(false)} role="menuitem" to="/app/ich/friends">
                    <UsersRound size={15} />
                    Freunde
                  </Link>
                  <Link onClick={() => setProfileMenuOpen(false)} role="menuitem" to="/app/ich/privacy">
                    <ShieldCheck size={15} />
                    Privatsphäre
                  </Link>
                  {adminAccess?.active ? (
                    <Link onClick={() => setProfileMenuOpen(false)} role="menuitem" to="/app/admin">
                      <ShieldCheck size={15} />
                      Admin
                    </Link>
                  ) : null}
                  <Link onClick={() => setProfileMenuOpen(false)} role="menuitem" to="/">
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

      <main className={isSmartSurface ? "avareno-app-content is-smart-surface" : "avareno-app-content"}>
        <Outlet />
      </main>

      {open ? (
        <div className="fixed inset-0 z-40 bg-ink/58 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="ozma-modal mx-auto mt-8 max-w-2xl rounded-lg p-4 md:mt-24" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-muted">Erfassen</p>
                <h2 className="mt-1 text-3xl font-black text-ink">Etwas Echtes hinzufügen.</h2>
                <p className="mt-2 max-w-lg text-sm font-semibold leading-6 text-muted">Wähle eine Quelle. Avareno macht daraus ein Ding, einen Nachweis oder eine Care-Erinnerung.</p>
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
