import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  ChevronRight,
  Copy,
  Database,
  Download,
  FileLock2,
  History,
  LockKeyhole,
  PauseCircle,
  PlugZap,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound
} from "lucide-react";
import { Link, NavLink, useLocation, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/authProvider";
import {
  buildCurrentUserProgress,
  defaultMotivationPrivacy,
  mockFriendCircle,
  mockFriendInvite,
  mockFriends
} from "../lib/friendsData";
import type { FriendProgress, MotivationPrivacyPreferences } from "../lib/friendsData";
import type { PrivacyDataOverviewItem, PrivacySummary } from "../lib/types";

const preferenceKey = "avareno-private-motivation-preferences";

export function Rewards() {
  const { profile } = useAuth();
  const location = useLocation();
  const { friendId } = useParams();
  const [preferences, setPreferences] = useState<MotivationPrivacyPreferences>(() => readMotivationPreferences());
  const [inviteCode, setInviteCode] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  const acceptedFriends = mockFriends.filter((friend) => friend.status === "accepted");
  const pendingFriends = mockFriends.filter((friend) => friend.status === "pending");
  const currentUserProgress = profile ? buildCurrentUserProgress(profile, preferences) : null;
  const progressRows = useMemo(() => {
    if (!currentUserProgress) return [];
    return [currentUserProgress, ...acceptedFriends];
  }, [acceptedFriends, currentUserProgress]);
  const section = getProfileSection(location.pathname);
  const selectedFriend = friendId ? progressRows.find((friend) => friend.id === friendId) ?? null : null;
  const profileBasePath = location.pathname.startsWith("/app/ich")
    ? "/app/ich"
    : location.pathname.startsWith("/app/profile")
      ? "/app/profile"
      : location.pathname.startsWith("/app")
        ? "/app/ich"
        : "/rewards";
  const [privacySummary, setPrivacySummary] = useState<PrivacySummary | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  useEffect(() => {
    if (section !== "privacy") {
      return;
    }

    let active = true;
    setPrivacyError(null);
    api<PrivacySummary>("/api/privacy/summary")
      .then((summary) => {
        if (active) {
          setPrivacySummary(summary);
        }
      })
      .catch(() => {
        if (active) {
          setPrivacyError("Backend-Zusammenfassung noch nicht erreichbar. Die sicheren Platzhalter bleiben sichtbar.");
        }
      });

    return () => {
      active = false;
    };
  }, [section]);

  if (!profile || !currentUserProgress) return <div className="profile-loading">Profil wird geladen...</div>;

  function updatePreferences(next: Partial<MotivationPrivacyPreferences>) {
    setPreferences((current) => {
      const merged = { ...current, ...next };
      window.localStorage.setItem(preferenceKey, JSON.stringify(merged));
      return merged;
    });
  }

  function copyInvite() {
    setInviteCopied(true);
    window.setTimeout(() => setInviteCopied(false), 1800);
  }

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1>Ich</h1>
          <p>{profile.displayName}</p>
          <span>{profile.email}</span>
        </div>
      </section>

      <section className="profile-focus">
        <div>
          <span>Privater Freundeskreis</span>
          <h2>Gemeinsam dranbleiben, ohne Druck.</h2>
          <p>Freunde, Motivation und Sichtbarkeit sind getrennt. Jede Seite hat nur eine Aufgabe.</p>
        </div>
        <button className="profile-primary-action" onClick={copyInvite} type="button">
          <Copy size={16} />
          {inviteCopied ? "Link bereit" : "Einladung kopieren"}
        </button>
      </section>

      <section className="profile-stats" aria-label="Profil Überblick">
        <ProfileStat icon={<Sparkles size={18} />} label="Diese Woche" value={preferences.hideXpFromFriends ? "Privat" : `${profile.weeklyXp} XP`} />
        <ProfileStat icon={<CheckCircle2 size={18} />} label="Streak" value={preferences.hideStreakFromFriends ? "Privat" : `${profile.currentStreakDays} Tage`} />
        <ProfileStat icon={<PauseCircle size={18} />} label="Pausentage" value={String(profile.freezeDaysAvailable)} />
      </section>

      <ProfileSectionNav app={location.pathname.startsWith("/app")} basePath={profileBasePath} />

      {section === "overview" ? (
        <ProfileOverview
          acceptedFriends={acceptedFriends}
          basePath={profileBasePath}
          preferences={preferences}
          progressRows={progressRows}
        />
      ) : null}

      {section === "friends" ? (
        <FriendsPage
          basePath={profileBasePath}
          inviteCode={inviteCode}
          onInviteCodeChange={setInviteCode}
          pendingFriends={pendingFriends}
          acceptedFriends={acceptedFriends}
          progressRows={progressRows}
          invitesEnabled={preferences.allowFriendInvites}
          motivationEnabled={preferences.motivationEnabled}
          progressEnabled={preferences.leaderboardEnabled}
        />
      ) : null}

      {section === "friendDetail" ? (
        <FriendDetailPage basePath={profileBasePath} friend={selectedFriend} />
      ) : null}

      {section === "privacy" ? (
        <PrivacyCenterPanel
          summary={privacySummary ?? buildPrivacyFallback(profile.displayName)}
          loadError={privacyError}
          preferences={preferences}
          onChange={updatePreferences}
        />
      ) : null}
    </main>
  );
}

function getProfileSection(pathname: string) {
  if (pathname.includes("/friends/")) return "friendDetail";
  if (pathname.endsWith("/friends")) return "friends";
  if (pathname.endsWith("/privacy") || pathname.endsWith("/datenschutz")) return "privacy";
  return "overview";
}

function ProfileSectionNav({ app, basePath }: { app: boolean; basePath: string }) {
  const items = [
    { to: basePath, label: "Übersicht", end: true },
    { to: `${basePath}/friends`, label: "Freunde" },
    { to: `${basePath}/privacy`, label: "Datenschutz" },
    { to: app ? `${basePath}/settings` : "/settings/account", label: "Konto" }
  ];

  return (
    <nav className="profile-section-nav" aria-label="Profil Bereiche">
      {items.map((item) => (
        <NavLink className={({ isActive }) => (isActive ? "is-active" : "")} end={item.end} key={item.to} to={item.to}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function ProfileOverview({
  acceptedFriends,
  basePath,
  preferences,
  progressRows
}: {
  acceptedFriends: FriendProgress[];
  basePath: string;
  preferences: MotivationPrivacyPreferences;
  progressRows: FriendProgress[];
}) {
  const sharedActions = progressRows.reduce((sum, friend) => sum + friend.helpfulActions, 0);

  return (
    <section className="profile-overview-grid">
      <article className="profile-panel">
        <div className="profile-panel-head">
          <div>
            <span>Nächster Bereich</span>
            <h2>Freundeskreis</h2>
            <p>{acceptedFriends.length} Freunde sind verbunden. Fortschritt bleibt privat und ohne Platzierungen.</p>
          </div>
          <UserPlus size={18} />
        </div>
        <div className="profile-preview-row">
          <span>{sharedActions} kleine Aktionen</span>
          <span>{preferences.leaderboardEnabled ? "Sichtbar im Kreis" : "Ausgeblendet"}</span>
        </div>
        <Link className="profile-secondary-action" to={`${basePath}/friends`}>Freunde ansehen</Link>
      </article>

      <article className="profile-panel">
        <div className="profile-panel-head">
          <div>
            <span>Datenschutz</span>
            <h2>Kontrolle</h2>
            <p>Freundes-Sichtbarkeit, Export, Löschung und AI-Verarbeitung werden hier getrennt vorbereitet.</p>
          </div>
          <LockKeyhole size={18} />
        </div>
        <div className="profile-preview-row">
          <span>{preferences.hideXpFromFriends ? "XP privat" : "XP teilbar"}</span>
          <span>Export in Vorbereitung</span>
        </div>
        <Link className="profile-secondary-action" to={`${basePath}/privacy`}>Datenschutz prüfen</Link>
      </article>
    </section>
  );
}

function FriendsPage({
  basePath,
  inviteCode,
  onInviteCodeChange,
  pendingFriends,
  acceptedFriends,
  progressRows,
  invitesEnabled,
  motivationEnabled,
  progressEnabled
}: {
  basePath: string;
  inviteCode: string;
  onInviteCodeChange: (value: string) => void;
  pendingFriends: FriendProgress[];
  acceptedFriends: FriendProgress[];
  progressRows: FriendProgress[];
  invitesEnabled: boolean;
  motivationEnabled: boolean;
  progressEnabled: boolean;
}) {
  const sharedActions = progressRows.reduce((sum, friend) => sum + friend.helpfulActions, 0);
  const progressText = motivationEnabled && progressEnabled
    ? `${sharedActions} kleine Aktionen diese Woche`
    : "Freundliche Motivation ist pausiert";

  return (
    <section className="friends-workspace">
      <article className="profile-panel friends-list-panel">
        <div className="profile-panel-head">
          <div>
            <span>Freundeskreis</span>
            <h2>Wer dazugehört</h2>
            <p>{mockFriendCircle.name} ist ein privater Kreis für sanfte Motivation. Fortschritt bleibt ein kurzer Status, nicht ein Vergleich.</p>
          </div>
          <UserPlus size={18} />
        </div>

        <div className="friends-week-note">
          <strong>{progressText}</strong>
          <span>{acceptedFriends.length} verbundene Freunde, privat geteilt</span>
        </div>

        {acceptedFriends.length ? (
          <div className="friend-list" aria-label="Freundesliste">
            {acceptedFriends.map((friend) => (
              <FriendRow basePath={basePath} friend={friend} key={friend.id} />
            ))}
          </div>
        ) : (
          <div className="private-empty-state">
            <UserRound size={18} />
            <p>Füge enge Freunde hinzu, wenn ihr euch gegenseitig motivieren wollt.</p>
          </div>
        )}
      </article>

      <article className="profile-panel friends-invite-panel">
        <div className="profile-panel-head">
          <div>
            <span>Einladen</span>
            <h2>Freund hinzufügen</h2>
            <p>Teile einen privaten Code nur mit Menschen, die du wirklich in deinem Kreis haben willst.</p>
          </div>
        </div>

        <div className="friend-invite-box">
          <label>
            <span>Einladungscode</span>
            <input
              disabled={!invitesEnabled}
              onChange={(event) => onInviteCodeChange(event.target.value)}
              placeholder={mockFriendInvite.inviteCode}
              type="text"
              value={inviteCode}
            />
          </label>
          <small>{invitesEnabled ? "Invite-Link Platzhalter: avareno.app/invite/privat" : "Einladungen sind pausiert."}</small>
        </div>

        <div className="pending-invite-row">
          <span>Offen</span>
          <strong>{pendingFriends.map((friend) => friend.displayName).join(", ") || "Keine offenen Einladungen"}</strong>
        </div>
      </article>
    </section>
  );
}

function ProfileStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="profile-stat">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function FriendRow({ basePath, friend }: { basePath: string; friend: FriendProgress }) {
  const progress = friend.hidesXp ? "XP privat" : friend.helpfulActions ? `${friend.helpfulActions} kleine Aktionen` : "Ruhig gestartet";
  const context = friend.sourceBreakdown.length
    ? friend.sourceBreakdown.slice(0, 2).map((source) => source.label).join(", ")
    : "Noch nichts geteilt";

  return (
    <Link className="friend-row" to={`${basePath}/friends/${friend.id}`}>
      <Avatar name={friend.displayName} />
      <div>
        <strong>{friend.displayName}</strong>
        <small>{progress} - {context}</small>
      </div>
      <span>{friend.hidesStreak ? "Privat" : friend.label}</span>
      <ChevronRight size={16} />
    </Link>
  );
}

function FriendDetailPage({ basePath, friend }: { basePath: string; friend: FriendProgress | null }) {
  if (!friend) {
    return (
      <section className="profile-panel friend-detail-panel">
        <Link className="friend-detail-back" to={`${basePath}/friends`}>
          <ArrowLeft size={16} />
          Zurück zu Freunde
        </Link>
        <div className="private-empty-state">
          <UserRound size={18} />
          <p>Dieser Freund ist nicht in deinem privaten Kreis sichtbar.</p>
        </div>
      </section>
    );
  }

  const weeklyLabel = friend.hidesXp ? "XP privat" : `${friend.weeklyXp} XP`;
  const streakLabel = friend.hidesStreak ? "Privat" : `${friend.currentStreakDays} Tage`;

  return (
    <section className="profile-panel friend-detail-panel">
      <Link className="friend-detail-back" to={`${basePath}/friends`}>
        <ArrowLeft size={16} />
        Zurück zu Freunde
      </Link>

      <div className="friend-detail-hero">
        <Avatar name={friend.displayName} />
        <div>
          <span>Freund</span>
          <h2>{friend.displayName}</h2>
          <p>{friend.note}</p>
        </div>
      </div>

      <div className="friend-detail-stats" aria-label="Freund Status">
        <ProfileStat icon={<Sparkles size={18} />} label="Woche" value={weeklyLabel} />
        <ProfileStat icon={<CheckCircle2 size={18} />} label="Aktionen" value={String(friend.helpfulActions)} />
        <ProfileStat icon={<PauseCircle size={18} />} label="Streak" value={streakLabel} />
      </div>

      <div className="friend-detail-context">
        <strong>Warum sichtbar?</strong>
        <p>Ihr seid in einem privaten Freundeskreis verbunden. Geteilte Werte bleiben optional und können jederzeit ausgeblendet werden.</p>
      </div>

      {friend.sourceBreakdown.length ? (
        <div className="friend-detail-source-list" aria-label="Fortschrittsquellen">
          {friend.sourceBreakdown.map((source) => (
            <span key={source.label}>{source.count} {source.label}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PrivacyCenterPanel({
  summary,
  loadError,
  preferences,
  onChange
}: {
  summary: PrivacySummary;
  loadError: string | null;
  preferences: MotivationPrivacyPreferences;
  onChange: (next: Partial<MotivationPrivacyPreferences>) => void;
}) {
  const [deleteState, setDeleteState] = useState<"idle" | "confirm">("idle");

  return (
    <section className="profile-panel privacy-panel privacy-center-panel">
      <div className="profile-panel-head">
        <div>
          <span>Privacy Center</span>
          <h2>Datenschutz & Kontrolle</h2>
          <p>Ein ruhiger Ort für Datenüberblick, Export, Löschung, verbundene Quellen, KI-Analyse und Private Vault.</p>
        </div>
        <ShieldCheck size={18} />
      </div>

      {loadError ? (
        <div className="privacy-status-note">
          <AlertTriangle size={16} />
          <span>{loadError}</span>
        </div>
      ) : null}

      <div className="privacy-center-list">
        <PrivacySection icon={<Database size={18} />} label="Datenüberblick" title="Was Avareno gerade kennt">
          <div className="privacy-data-grid">
            {summary.dataOverview.map((item) => (
              <PrivacyDataRow item={item} key={item.id} />
            ))}
          </div>
        </PrivacySection>

        <PrivacySection icon={<Download size={18} />} label="Export" title="Kopie deiner Daten">
          <p>Erhalte eine Kopie deiner gespeicherten Dinge, Dokument-Metadaten und Einstellungen.</p>
          {/* TODO: Enable when /api/privacy/export/request returns a real export artifact. */}
          <button className="profile-primary-action privacy-action-button" disabled type="button">
            <Download size={16} />
            Daten exportieren
          </button>
          <small>{summary.export.userVisibleMessage}</small>
        </PrivacySection>

        <PrivacySection icon={<PlugZap size={18} />} label="Connect" title="Verbundene Quellen">
          {summary.connectedSources.length ? (
            <div className="privacy-source-list">
              {summary.connectedSources.map((source) => (
                <div className="privacy-source-row" key={source.id}>
                  <div>
                    <strong>{source.name}</strong>
                    <small>{source.type} · {source.status} · {source.permissions.join(", ")}</small>
                  </div>
                  <button disabled type="button">Trennen</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="private-empty-state privacy-empty-state">
              <PlugZap size={18} />
              <p>Noch keine verbundenen Quellen. Connect bleibt leer, bis du bewusst etwas verknüpfst.</p>
            </div>
          )}
        </PrivacySection>

        <PrivacySection icon={<Brain size={18} />} label="KI-Analyse" title="Belege und Dokumente">
          <div className="privacy-toggle-list">
            <PrivacyToggle
              checked={false}
              disabled
              label="KI-Analyse für Belege und Dokumente"
              note="Einstellungsmodell ist vorbereitet. Extrahierte Daten müssen später sichtbar korrigierbar bleiben."
              onChange={() => undefined}
            />
            <PrivacyToggle
              checked={!summary.aiControls.vaultAutoAnalysis}
              disabled
              label="Private Vault nie automatisch analysieren"
              note="Sensible Vault-Dokumente bleiben von automatischer Analyse getrennt."
              onChange={() => undefined}
            />
          </div>
        </PrivacySection>

        <PrivacySection icon={<FileLock2 size={18} />} label="Private Vault" title="Extra Schutz für sensible Dokumente">
          <p>Vault ist als geschützter Bereich für Identität, Versicherungen, Zahlung, Medizin, Arbeits-, Vertrags- und Rechtsdokumente geplant.</p>
          <div className="privacy-chip-row">
            {summary.privateVault.sensitiveCategories.slice(0, 7).map((category) => (
              <span key={category}>{formatVaultCategory(category)}</span>
            ))}
          </div>
          <div className="privacy-action-pair">
            <button className="profile-secondary-action is-muted" disabled type="button">Vault verwalten</button>
            <button className="profile-secondary-action is-muted" disabled type="button">Re-Auth / PIN TODO</button>
          </div>
        </PrivacySection>

        <PrivacySection icon={<History size={18} />} label="Historie" title="Einwilligungen & Berechtigungen">
          {summary.consentHistory.length ? (
            <div className="privacy-source-list">
              {summary.consentHistory.map((event) => (
                <div className="privacy-source-row" key={event.id}>
                  <div>
                    <strong>{event.label}</strong>
                    <small>{event.createdAt} · {event.status}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="private-empty-state privacy-empty-state">
              <History size={18} />
              <p>Noch keine gespeicherte Consent-Historie. Speicherung und Widerruf werden als eigener Audit-Trail vorbereitet.</p>
            </div>
          )}
        </PrivacySection>

        <PrivacySection icon={<LockKeyhole size={18} />} label="Freigaben" title="Freundeskreis sichtbar halten">
          <div className="privacy-toggle-list">
            <PrivacyToggle
              checked={preferences.hideXpFromFriends}
              label="Meine XP vor Freunden verbergen"
              note="Freunde sehen dann nur, dass du privat bleibst."
              onChange={(checked) => onChange({ hideXpFromFriends: checked })}
            />
            <PrivacyToggle
              checked={preferences.hideStreakFromFriends}
              label="Meinen Streak vor Freunden verbergen"
              note="Private Standardeinstellung für sensible Fortschrittsdaten."
              onChange={(checked) => onChange({ hideStreakFromFriends: checked })}
            />
          </div>
        </PrivacySection>

        <PrivacySection danger icon={<Trash2 size={18} />} label="Kritischer Bereich" title="Account und Daten löschen">
          <p>Eine Löschung muss Nutzerprofil, Auth-User, Dinge, Dokumente, extrahierte Metadaten, Erinnerungen, Care/Resolve-Daten, Connector-Tokens, Logs, Storage-Objekte und Backup-Regeln abdecken.</p>
          {deleteState === "confirm" ? (
            <div className="privacy-delete-confirm">
              <strong>Noch nicht aktiv</strong>
              <span>{summary.deletion.userVisibleMessage}</span>
              {/* TODO: Enable only after backend deletion orchestration covers all known tables, storage objects and Supabase auth user deletion. */}
              <button disabled type="button">Löschung verbindlich anfordern</button>
            </div>
          ) : null}
          <button className="leave-circle-button is-danger" onClick={() => setDeleteState("confirm")} type="button">
            <Trash2 size={16} />
            Account löschen
          </button>
        </PrivacySection>
      </div>
    </section>
  );
}

function PrivacySection({
  children,
  danger = false,
  icon,
  label,
  title
}: {
  children: ReactNode;
  danger?: boolean;
  icon: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <article className={danger ? "privacy-control-block is-danger" : "privacy-control-block"}>
      <div className="privacy-control-head">
        <span aria-hidden="true">{icon}</span>
        <div>
          <small>{label}</small>
          <h3>{title}</h3>
        </div>
      </div>
      {children}
    </article>
  );
}

function PrivacyDataRow({ item }: { item: PrivacyDataOverviewItem }) {
  return (
    <div className="privacy-data-row">
      <div>
        <strong>{item.label}</strong>
        <small>{item.note}</small>
      </div>
      <span>{item.value}</span>
    </div>
  );
}

function PrivacyToggle({
  checked,
  disabled = false,
  label,
  note,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  note: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={disabled ? "privacy-toggle is-disabled" : "privacy-toggle"}>
      <input checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <small>{note}</small>
      </div>
    </label>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="friend-avatar" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function readMotivationPreferences(): MotivationPrivacyPreferences {
  try {
    return {
      ...defaultMotivationPrivacy,
      ...JSON.parse(window.localStorage.getItem(preferenceKey) ?? "{}")
    } as MotivationPrivacyPreferences;
  } catch {
    return defaultMotivationPrivacy;
  }
}

function buildPrivacyFallback(displayName: string): PrivacySummary {
  return {
    generatedAt: new Date().toISOString(),
    implementationState: "FOUNDATION_ONLY",
    dataOverview: [
      { id: "items", label: "Gespeicherte Dinge", value: 0, status: "TODO", note: `${displayName}s Ding-Speicher wird geladen, sobald das Backend erreichbar ist.` },
      { id: "documents", label: "Dokumente / Belege", value: 0, status: "TODO", note: "Dokument-Metadaten und Upload-Speicher sind im Exportplan vorgesehen." },
      { id: "sources", label: "Verbundene Quellen", value: 0, status: "TODO", note: "Connect-Quellen werden erst nach bewusster Verknuepfung angezeigt." },
      { id: "ai-analysis", label: "KI-Analyse", value: 0, status: "TODO", note: "Analyse bleibt kontrolliert und korrigierbar." },
      { id: "private-vault", label: "Private Vault", value: 0, status: "TODO", note: "Sensible Dokumente werden nicht automatisch analysiert." }
    ],
    connectedSources: [],
    aiControls: {
      receiptDocumentAnalysis: "TODO_MODEL",
      vaultAutoAnalysis: false,
      userCorrection: "TODO",
      note: "Backend noch nicht erreichbar."
    },
    privateVault: {
      status: "PLANNED",
      sensitiveCategories: ["IDENTITY", "INSURANCE", "PAYMENT", "MEDICAL", "EMPLOYMENT", "CONTRACTS", "LEGAL"],
      requiresReauth: "TODO",
      strongerEncryption: "TODO"
    },
    consentHistory: [],
    export: {
      state: "FOUNDATION_ONLY",
      ready: false,
      userVisibleMessage: "Datenexport ist vorbereitet, aber noch nicht vollständig implementiert."
    },
    deletion: {
      state: "FOUNDATION_ONLY",
      ready: false,
      userVisibleMessage: "Kontolöschung ist als Orchestrierung geplant, aber noch nicht aktiv."
    },
    thirdPartyProviders: []
  };
}

function formatVaultCategory(category: string) {
  const labels: Record<string, string> = {
    IDENTITY: "Identität",
    INSURANCE: "Versicherung",
    PAYMENT: "Zahlung",
    MEDICAL: "Medizin",
    EMPLOYMENT: "Arbeit",
    CONTRACTS: "Verträge",
    LEGAL: "Recht",
    HIGHLY_PERSONAL: "Sehr persönlich"
  };
  return labels[category] ?? category.toLowerCase().replace(/_/g, " ");
}
