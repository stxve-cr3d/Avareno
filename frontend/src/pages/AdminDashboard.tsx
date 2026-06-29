import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AlertTriangle, ClipboardCheck, KeyRound, ShieldCheck, UserCog, UsersRound } from "lucide-react";
import { api } from "../lib/api";
import type { AdminMembership, AdminRole, AdminSummary } from "../lib/types";

type AdminView = "roles" | "users";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  SUPPORT: "Support",
  BILLING_ADMIN: "Billing",
  PRIVACY_ADMIN: "Privacy",
  MODERATOR: "Moderator"
};

export function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [view, setView] = useState<AdminView>("roles");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("SUPPORT");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError(null);
    const payload = await api<AdminSummary>("/api/admin/summary");
    setSummary(payload);
  }

  useEffect(() => {
    void load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Admin Dashboard konnte nicht geladen werden."));
  }, []);

  const canManageRoles = summary?.access.capabilities.includes("admin:roles:manage") ?? false;
  const activeRoleNames = useMemo(() => summary?.access.roles.map((item) => roleLabels[item] ?? item).join(", ") ?? "", [summary]);

  async function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageRoles) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api<{ membership: AdminMembership }>("/api/admin/memberships", {
        method: "POST",
        body: JSON.stringify({
          email,
          role,
          reason,
          status: "ACTIVE"
        })
      });
      setEmail("");
      setReason("");
      setMessage("Rolle wurde gespeichert und auditierbar protokolliert.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Rolle konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  if (error && !summary) {
    return (
      <main className="admin-page">
        <section className="admin-state">
          <AlertTriangle size={22} />
          <h1>Adminzugang nicht verfügbar</h1>
          <p>{error}</p>
          <button className="admin-state-action" onClick={() => void load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Admin Dashboard konnte nicht geladen werden."))} type="button">
            Erneut prÃ¼fen
          </button>
        </section>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="admin-page">
        <section className="admin-state">
          <ShieldCheck size={22} />
          <h1>Admin wird geprüft</h1>
          <p>Rollen, Capabilities und Audit werden geladen.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <span className="admin-kicker">Avareno Admin</span>
          <h1>Zugriff & Rollen</h1>
          <p>Interne Verwaltung mit minimalen Daten, klaren Rollen und Audit-Pflicht.</p>
        </div>
        <div className="admin-access-card">
          <ShieldCheck size={18} />
          <span>Aktiver Zugriff</span>
          <strong>{activeRoleNames || "Keine Rolle"}</strong>
          {summary.access.devBootstrap ? <small>Lokaler Dev-Bootstrap aktiv</small> : null}
        </div>
      </section>

      <section className="admin-stat-grid" aria-label="Admin Status">
        <AdminStat icon={<UsersRound size={17} />} label="Nutzer" value={summary.stats.users} />
        <AdminStat icon={<UserCog size={17} />} label="Admin-Rollen" value={summary.stats.adminMembers} />
        <AdminStat icon={<ClipboardCheck size={17} />} label="Audit Events" value={summary.stats.auditEvents} />
      </section>

      <section className="admin-layout">
        <div className="admin-main-panel">
          <div className="admin-panel-head">
            <div>
              <span>Rollenverteilung</span>
              <h2>Admin-Zugriff steuern</h2>
            </div>
            <div className="admin-view-toggle" role="tablist" aria-label="Admin Ansicht">
              <button className={view === "roles" ? "is-active" : ""} onClick={() => setView("roles")} type="button">Rollen</button>
              <button className={view === "users" ? "is-active" : ""} onClick={() => setView("users")} type="button">Nutzer</button>
            </div>
          </div>

          {canManageRoles ? (
            <form className="admin-role-form" onSubmit={submitRole}>
              <label>
                <span>E-Mail</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@avareno.de" type="email" />
              </label>
              <label>
                <span>Rolle</span>
                <select value={role} onChange={(event) => setRole(event.target.value)}>
                  {summary.roleCatalog.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="admin-role-reason">
                <span>Begründung</span>
                <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Warum braucht diese Person Zugriff?" />
              </label>
              <button disabled={saving || !email.trim() || reason.trim().length < 12} type="submit">
                <KeyRound size={15} />
                Speichern
              </button>
            </form>
          ) : null}

          {message ? <p className="admin-success">{message}</p> : null}
          {error ? <p className="admin-error">{error}</p> : null}

          {view === "roles" ? (
            <div className="admin-list" aria-label="Aktive Admin Rollen">
              {summary.memberships.map((membership) => (
                <article className="admin-row" key={membership.id}>
                  <div>
                    <strong>{roleLabels[membership.role] ?? membership.role}</strong>
                    <span>{membership.userName || membership.email || "Pending invite"}</span>
                  </div>
                  <p>{membership.reason}</p>
                  <small>{membership.status} · {formatDate(membership.updatedAt)}</small>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-list" aria-label="Sichere Nutzerübersicht">
              {summary.users.map((user) => (
                <article className="admin-row" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <p>{user.itemCount} Dinge · {user.documentCount} Dokumente · {user.openLoopCount} offene Punkte</p>
                  <small>{user.contactVisible ? "Kontakt sichtbar" : "Kontakt maskiert"} · {formatDate(user.updatedAt)}</small>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="admin-side-panel">
          <section>
            <span>Guardrails</span>
            <h2>Was Admins nicht sehen</h2>
            <ul>
              {summary.guardrails.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section>
            <span>Audit</span>
            <h2>Letzte Ereignisse</h2>
            {summary.audit.length ? (
              <div className="admin-audit-list">
                {summary.audit.map((event) => (
                  <article key={event.id}>
                    <strong>{event.action}</strong>
                    <p>{event.role ?? event.targetType} · {event.safeStatus}</p>
                    <small>{formatDate(event.createdAt)}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p className="admin-muted">Keine Audit-Einträge für deine Rolle sichtbar.</p>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

function AdminStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <article className="admin-stat">
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}
