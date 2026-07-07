import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  FileLock2,
  FilePlus2,
  FileText,
  KeyRound,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
  Unlock
} from "lucide-react";
import { api, PlanLimitError } from "../lib/api";

type VaultPinStatus = { pinSet: boolean; locked: boolean; lockedUntil: string | null };
type Vault = { id: string; name: string; createdAt: string; documentCount: number };
type VaultDocument = { id: string; fileName: string; type: string; createdAt: string };
type LooseDocument = { id: string; fileName: string; type: string };
type Overview = { pin: VaultPinStatus; vaults: Vault[] };

const TICKET_KEY = "avareno-vault-ticket";

function storedTicket(): string | null {
  return sessionStorage.getItem(TICKET_KEY);
}

/* Private Vault: PIN-geschützter Bereich für sensible Dokumente.
   Jede Inhalts-Operation läuft über ein kurzlebiges Unlock-Ticket —
   eine normale App-Session allein zeigt nie Vault-Inhalte. */
export function VaultPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [ticket, setTicket] = useState<string | null>(() => storedTicket());
  const [message, setMessage] = useState<string | null>(null);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unlocked = Boolean(ticket);

  const load = useCallback(async () => {
    try {
      setOverview(await api<Overview>("/api/vaults"));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function rememberTicket(value: string) {
    sessionStorage.setItem(TICKET_KEY, value);
    setTicket(value);
  }

  function forgetTicket() {
    sessionStorage.removeItem(TICKET_KEY);
    setTicket(null);
  }

  async function vaultApi<T>(path: string, options: RequestInit = {}): Promise<T> {
    try {
      return await api<T>(path, {
        ...options,
        headers: { ...(options.headers as Record<string, string>), "X-Vault-Ticket": ticket ?? "" }
      });
    } catch (error) {
      if (error instanceof PlanLimitError) {
        setPlanNotice(error.message);
        throw error;
      }
      // Abgelaufenes/ungültiges Ticket: zurück in den gesperrten Zustand.
      if (error instanceof Error && /Ticket|gesperrt|entsperren|abgelaufen/i.test(error.message)) {
        forgetTicket();
      }
      throw error;
    }
  }

  if (status === "loading") {
    return <main className="av-page vault-page"><p className="vault-muted">Vault wird geladen...</p></main>;
  }
  if (status === "error" || !overview) {
    return (
      <main className="av-page vault-page">
        <p className="vault-muted">Vault konnte nicht geladen werden.</p>
        <button className="vault-secondary" onClick={() => void load()} type="button">Erneut versuchen</button>
      </main>
    );
  }

  return (
    <main className="av-page vault-page">
      <Link className="av-back" to="/app/ich">
        <ArrowLeft size={15} /> Zurück zu Ich
      </Link>

      <header className="vault-head">
        <span className="vault-eyebrow"><FileLock2 size={15} /> Private Vault</span>
        <h1>Extra Schutz für sensible Dokumente</h1>
        <p>
          Identität, Versicherungen, Verträge, Medizin — getrennt von der normalen Dokumentenliste,
          nie automatisch analysiert, nur mit PIN sichtbar.
        </p>
      </header>

      {planNotice ? (
        <div className="vault-plan-notice" role="alert">
          <span>{planNotice}</span>
          <Link to="/pricing">Pläne ansehen</Link>
          <button onClick={() => setPlanNotice(null)} type="button" aria-label="Hinweis schließen">×</button>
        </div>
      ) : null}
      {message ? <p className="vault-message" role="status">{message}</p> : null}

      {!overview.pin.pinSet ? (
        <PinSetup
          busy={busy}
          onSubmit={async (pin) => {
            setBusy(true);
            setMessage(null);
            try {
              await api("/api/vaults/pin", { method: "POST", body: JSON.stringify({ pin }) });
              const unlockResult = await api<{ ticket: string }>("/api/vaults/unlock", { method: "POST", body: JSON.stringify({ pin }) });
              rememberTicket(unlockResult.ticket);
              await load();
              setMessage("PIN gesetzt. Vault ist entsperrt.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "PIN konnte nicht gesetzt werden.");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : !unlocked ? (
        <PinUnlock
          busy={busy}
          locked={overview.pin.locked}
          onSubmit={async (pin) => {
            setBusy(true);
            setMessage(null);
            try {
              const result = await api<{ ticket: string }>("/api/vaults/unlock", { method: "POST", body: JSON.stringify({ pin }) });
              rememberTicket(result.ticket);
              await load();
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Entsperren fehlgeschlagen.");
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : (
        <UnlockedVaults
          onLock={() => {
            forgetTicket();
            setMessage("Vault gesperrt.");
          }}
          onPlanNotice={setPlanNotice}
          onReload={load}
          setMessage={setMessage}
          vaultApi={vaultApi}
          vaults={overview.vaults}
        />
      )}

      <p className="vault-trust">
        <ShieldCheck size={14} /> PIN wird nur als Hash gespeichert · Entsperrung gilt 10 Minuten · 5 Fehlversuche sperren 15 Minuten
      </p>
    </main>
  );
}

function PinSetup({ busy, onSubmit }: { busy: boolean; onSubmit: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const valid = /^\d{4,8}$/.test(pin) && pin === confirm;
  return (
    <section className="vault-card">
      <h2><KeyRound size={17} /> Vault-PIN anlegen</h2>
      <p>4 bis 8 Ziffern. Ohne diese PIN bleibt der Vault gesperrt — auch für eingeloggte Sitzungen.</p>
      <form
        className="vault-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onSubmit(pin);
        }}
      >
        <label>
          <span>Neue PIN</span>
          <input autoComplete="off" inputMode="numeric" maxLength={8} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} type="password" value={pin} />
        </label>
        <label>
          <span>PIN wiederholen</span>
          <input autoComplete="off" inputMode="numeric" maxLength={8} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} type="password" value={confirm} />
        </label>
        <button disabled={!valid || busy} type="submit">
          <Lock size={15} /> {busy ? "Wird gesetzt..." : "PIN setzen und entsperren"}
        </button>
      </form>
    </section>
  );
}

function PinUnlock({ busy, locked, onSubmit }: { busy: boolean; locked: boolean; onSubmit: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  return (
    <section className="vault-card">
      <h2><Lock size={17} /> Vault ist gesperrt</h2>
      {locked ? <p className="vault-warn">Zu viele Fehlversuche. Bitte warte 15 Minuten.</p> : <p>Mit deiner Vault-PIN entsperren.</p>}
      <form
        className="vault-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (pin) onSubmit(pin);
        }}
      >
        <label>
          <span>PIN</span>
          <input autoComplete="off" autoFocus inputMode="numeric" maxLength={8} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} type="password" value={pin} />
        </label>
        <button disabled={!pin || busy || locked} type="submit">
          <Unlock size={15} /> {busy ? "Wird geprüft..." : "Entsperren"}
        </button>
      </form>
    </section>
  );
}

function UnlockedVaults({
  onLock,
  onPlanNotice,
  onReload,
  setMessage,
  vaultApi,
  vaults
}: {
  onLock: () => void;
  onPlanNotice: (notice: string) => void;
  onReload: () => Promise<void>;
  setMessage: (value: string | null) => void;
  vaultApi: <T>(path: string, options?: RequestInit) => Promise<T>;
  vaults: Vault[];
}) {
  const [newName, setNewName] = useState("");
  const [openVaultId, setOpenVaultId] = useState<string | null>(vaults[0]?.id ?? null);
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [looseDocuments, setLooseDocuments] = useState<LooseDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openVault = useMemo(() => vaults.find((vault) => vault.id === openVaultId) ?? null, [vaults, openVaultId]);

  const loadDocuments = useCallback(async (vaultId: string) => {
    try {
      setDocuments(await vaultApi<VaultDocument[]>(`/api/vaults/${vaultId}/documents`));
    } catch {
      setDocuments([]);
    }
  }, [vaultApi]);

  useEffect(() => {
    if (openVaultId) void loadDocuments(openVaultId);
  }, [openVaultId, loadDocuments]);

  useEffect(() => {
    // Kandidaten zum Hineinlegen: normale (nicht-Vault) Dokumente des Nutzers.
    api<{ items?: unknown } | LooseDocument[]>("/api/documents").then((payload) => {
      if (Array.isArray(payload)) setLooseDocuments(payload as LooseDocument[]);
    }).catch(() => setLooseDocuments([]));
  }, [documents.length]);

  async function createVault() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setMessage(null);
    try {
      await vaultApi("/api/vaults", { method: "POST", body: JSON.stringify({ name }) });
      setNewName("");
      await onReload();
    } catch (error) {
      if (!(error instanceof PlanLimitError)) {
        setMessage(error instanceof Error ? error.message : "Vault konnte nicht erstellt werden.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="vault-toolbar">
        <span className="vault-unlocked"><Unlock size={14} /> Entsperrt</span>
        <button className="vault-secondary" onClick={onLock} type="button">
          <Lock size={14} /> Jetzt sperren
        </button>
      </div>

      <section className="vault-grid">
        {vaults.map((vault) => (
          <button
            className={vault.id === openVaultId ? "vault-tile is-active" : "vault-tile"}
            key={vault.id}
            onClick={() => setOpenVaultId(vault.id)}
            type="button"
          >
            <FileLock2 size={16} />
            <strong>{vault.name}</strong>
            <small>{vault.documentCount} {vault.documentCount === 1 ? "Dokument" : "Dokumente"}</small>
          </button>
        ))}
        <form
          className="vault-tile vault-tile-new"
          onSubmit={(event) => {
            event.preventDefault();
            void createVault();
          }}
        >
          <label>
            <span>Neuer Vault</span>
            <input maxLength={80} onChange={(e) => setNewName(e.target.value)} placeholder="z. B. Identität" value={newName} />
          </label>
          <button disabled={!newName.trim() || busy} type="submit">
            <Plus size={14} /> Anlegen
          </button>
        </form>
      </section>

      {openVault ? (
        <section className="vault-card">
          <div className="vault-card-head">
            <h2><FileText size={17} /> {openVault.name}</h2>
            {confirmDeleteId === openVault.id ? (
              <button
                className="vault-danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await vaultApi(`/api/vaults/${openVault.id}`, { method: "DELETE" });
                    setConfirmDeleteId(null);
                    setOpenVaultId(null);
                    await onReload();
                    setMessage("Vault gelöscht. Dokumente sind zurück in der normalen Liste.");
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "Löschen fehlgeschlagen.");
                  } finally {
                    setBusy(false);
                  }
                }}
                type="button"
              >
                <Trash2 size={14} /> Wirklich löschen?
              </button>
            ) : (
              <button className="vault-secondary" onClick={() => setConfirmDeleteId(openVault.id)} type="button">
                <Trash2 size={14} /> Vault löschen
              </button>
            )}
          </div>

          {documents.length ? (
            <ul className="vault-doc-list">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <FileText size={15} />
                  <span>{doc.fileName}</span>
                  <small>{doc.type}</small>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await vaultApi(`/api/vaults/${openVault.id}/documents/${doc.id}`, { method: "DELETE" });
                        await loadDocuments(openVault.id);
                        await onReload();
                      } finally {
                        setBusy(false);
                      }
                    }}
                    type="button"
                  >
                    Herausnehmen
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vault-muted">Noch keine Dokumente in diesem Vault.</p>
          )}

          {looseDocuments.length ? (
            <details className="vault-add">
              <summary><FilePlus2 size={15} /> Dokument in den Vault legen</summary>
              <ul className="vault-doc-list">
                {looseDocuments.slice(0, 12).map((doc) => (
                  <li key={doc.id}>
                    <FileText size={15} />
                    <span>{doc.fileName}</span>
                    <small>{doc.type}</small>
                    <button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await vaultApi(`/api/vaults/${openVault.id}/documents/${doc.id}`, { method: "POST" });
                          await loadDocuments(openVault.id);
                          await onReload();
                        } catch (error) {
                          if (error instanceof PlanLimitError) onPlanNotice(error.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                      type="button"
                    >
                      Hinzufügen
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
