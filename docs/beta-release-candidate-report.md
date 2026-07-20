# Avareno Beta — Release-Candidate-Report

**Datum:** 2026-07-20 (Supabase-Gate geschlossen am selben Tag)
**Branch:** `beta-release-2026-07-17`, HEAD `1ffb791` + uncommitteter Working Tree (Inventar unten)
**Design-Referenz:** `docs/design/AVARENO_DESIGN_FREEZE_V1.md` (Design Freeze V1)
**Urteil:** `RC READY – lokaler Release Candidate vollständig verifiziert` (Begründung: Abschnitt H/I)

---

## A. Design Freeze

- Freeze dokumentiert in `docs/design/AVARENO_DESIGN_FREEZE_V1.md`; 20 kanonische Screenshots mit Manifest in `docs/design/qa-design-freeze-v1/`.
- Eingefroren: Seiten-Logiken (Heatmap, 29 Meilensteine in 5 Sammlungen, Objektgalerie, Dokumentbibliothek, Care-Kalender, Profil), Typografie, Tints, Light/Dark, Reduced Motion. Im Supabase-Gate wurden **keine** visuellen Änderungen vorgenommen.

## B. QA-Hygiene

- Kernursache historischer Hänger: fehlendes try/finally im Fehlerpfad ließ Browser + Chromium-Kinder leben. Fix: explizites try/finally-Teardown (qa-dashboard, qa-app-experience); unref'ter 15-s-Watchdog nur als dokumentierter Notausgang in drei Standalone-Skripten (loggt offene Handles, exitet mit aufgezeichnetem Code; feuerte in keinem Lauf).
- Negativtest gegen tote Ports: Exit 1, null Prozessreste. Mehrfachläufe aller kritischen Suiten identisch grün.
- Restlücke dokumentiert: qa-landing/qa-milky/qa-manifest ohne Guard (nie ausgelöst).

## C. Supabase (lokales Gate — ausgeführt und bestanden)

- **Docker:** Daemon 29.6.1 aktiv (Docker Desktop). **Supabase CLI:** 2.109.1, `supabase/config.toml` vorhanden, ausschließlich lokale Ziele (API `127.0.0.1:54321`, DB `127.0.0.1:54322`); kein `link`, kein `db push`, kein `--linked`, keine Remote-Umgebung.
- **Frische Datenbank:** `npx supabase db reset --local` — alle **5 versionierten Migrationen** in Zeitstempel-Reihenfolge fehlerfrei angewendet (`beta_authorization_rls` → `beta_private_storage` → `beta_service_role_account_deletion` → `beta_function_execute_grants` → `beta_server_only_private_storage_writes`); einzige Ausgaben: idempotente `drop … if exists`-NOTICEs. `seed.sql` bewusst leer („Security QA creates and removes two controlled users") — keine echten Nutzerdaten.
- **Live-Schema-Audit (echte Abfragen in der laufenden Instanz):**
  - 30/30 public-Tabellen mit aktiviertem RLS, 0 ohne.
  - 150 Policies in `public`, 0 davon für `anon`; 5 Policies auf `storage.objects`: `beta_storage_active_subject` **RESTRICTIVE**, 3 Avatar-Policies, `beta_private_select` — private INSERT/UPDATE/DELETE existieren nicht (server-only Writes wirksam).
  - `anon`: **0** Tabellen-Grants; `authenticated`: 52 (RLS-gefiltertes CRUD, beabsichtigt).
  - PUBLIC-EXECUTE: 0; genau 6 Helper-RPCs mit `authenticated`-EXECUTE.
  - Einzige `SECURITY DEFINER`-Funktion: `beta_auth_user_active` mit `search_path=""`.
  - Buckets: nur `avatars` public; documents/receipts/object-images/support-files privat.

## D. Datenisolation (`qa-beta-security.mjs`, echte Auth-Sessions User A / User B / anon)

**2 Läufe, je 71 Checks, Exit 0, nach ID-Normalisierung byte-identisch (keine Flakiness).** Abgedeckt u. a.:
- Public Signup abgelehnt (invite-only); Admin-Provisionierung + echtes E-Mail/Passwort-Login für A und B; anon ohne DB-Zugriff.
- A sieht/ändert nur eigene Rows; Fremd-Reads liefern leere Mengen (keine fremden Metadaten); Ownership-Reassignment abgelehnt.
- Objektbeziehungen sämtlich abgelehnt: fremde `householdId`, `spaceId`, `parentId`, `itemId`-Dokument, Selbst-Add in fremden Household, fremde `documentId` unsichtbar.
- Nicht-Mutation nachgewiesen: abgelehnter Storage-Delete lässt Objekt byte-identisch zurück (Service-Read-Vergleich); abgelehnte Writes erzeugen keine Rows/Beziehungen; keine Hintergrundjobs (Kill-Switches liefern 503 **vor** DB-/Storage-/Provider-Zugriff); Activity bleibt frei von abgelehnten Operationen (kein Event-Log, Ableitung nur aus eigenen Records).

## E. Storage

- Direkter Client-Write/Replace/Delete auf private Buckets abgelehnt (auch für den Eigentümer — server-only), Fremdpfad-Write abgelehnt, Service-Role provisioniert kontrolliert.
- B kann A-Dateien nicht lesen/listen/überschreiben/löschen und keine Signed URL erzeugen; anon ohne Lese-/Listenzugriff; Client-Listing exponiert servergemanagte Dateien nicht.
- Upload-Härtung über das integrierte Backend: PDF/JPEG/PNG akzeptiert; falsche Endung, falscher MIME, falsche Magic Bytes → 400; > 10 MiB → 413; Storage-Key servergeneriert (`<uid>/<hex-id>.<ext>`), kein frei wählbarer finaler Key; fehlgeschlagener Upload erzeugt keinen Dokumentdatensatz; öffentliche Links deaktiviert (503).

## F. Account-Löschung und altes JWT (integrierter Orchestrator gegen lokale Instanz)

- Ablauf: A + B mit echten Sessions am kontrollierten FastAPI-Backend (frische tmp-DB, `AVARENO_REQUIRE_AUTH=1`, Kill-Switch-Env), A erstellt Item + 3 validierte Dokumente, B eigenes Item; Cross-Download/-Delete für B → 404.
- `POST /api/privacy/deletion/request` → 200 mit `authUserDeleted=true`, `localFileCount=3`; danach: A-Storage-Prefix leer (Service-List), A-Profil absent, altes JWT von Auth abgelehnt, alte-JWT-DB-Mutation abgelehnt, alte-JWT-Storage-Mutation abgelehnt, altes JWT am integrierten Backend 401; B-Daten vollständig intakt.
- Activity: kein Event-Log — personenbezogene Activity verschwindet mit den Records (in D/Live-Checks verifiziert).
- Nach beiden Läufen: `public."User"`=0, `Item`=0, `auth.users`=0, `storage.objects`=0 — vollständiges Cleanup, keine Testnutzer/-dateien, keine tmp-Verzeichnisse, keine Token in Logs.

## G. Activity- und Meilenstein-Integration (echte lokale Daten, zusätzlich zur Suite)

Produkt/Dokument/Seriennummer/Erinnerung erzeugen exakt je ein korrektes Ereignis; identischer Re-PATCH ohne Duplikat; GET-Reads und Logins erzeugen nichts (strukturell: Ableitung statt Event-Log); PII-Scan des Payloads negativ; Item-Löschung senkt Zähler inkl. Dokument-Kaskade; Meilenstein-DOM kongruent zur Live-DB („x von 29", keine client-erfundenen Werte); abgelehnte/fremde Operationen schalten nichts frei (Nicht-Mutation, Abschnitt D).

## H. Regression (nach dem Supabase-Gate erneut, alle Exit 0)

| Prüfung | Ergebnis |
|---|---|
| `npm run verify` (3 Typechecks + 49 Backendtests + Prod-Build) | grün |
| `qa-beta-security.mjs` | 71/71 ×2, identisch, Cleanup vollständig |
| Onboarding-QA (frische DB) | 37/37 |
| Dashboard-QA | 99/99 |
| App-Experience-QA | 70/70 |
| Landing-QA | 51/51 |
| Milky-App-QA | 24/24 |
| Manifest-QA | 65/65 |
| 200-%-Zoom-Proxy | 7/7 |
| `git diff --check` | sauber |
| Prozessreste (Browser/Node/Ports/tmp) | 0 |

**Geänderte Dateien in diesem Gate:** ausschließlich Dokumentation (`beta-release-candidate-report.md`, `beta-release-supabase-checklist.md`, `beta-release-manual-smoke-test.md`). Kein Produkt-, QA- oder Security-Code verändert; die Suite lief unverändert.

## I. Urteil

**`RC READY – lokaler Release Candidate vollständig verifiziert`**

Alle Kriterien erfüllt: frische Migrationen fehlerfrei, vollständige Supabase-Integration (2× identisch grün), A/B/anon- und Storage-Isolation, Account-Löschung inkl. altem-JWT-Block auf Auth/REST/Storage/Backend, restlose Testdaten-Bereinigung, deterministische QA-Teardowns, vollständige Regression grün, Design Freeze dokumentiert.

## Verbleibende Remote-Gates (vor Einladungen; außerhalb des lokalen RC)

1. Beta-Supabase-Projekt verknüpfen (nur dediziertes Testprojekt), Migrationen per Dry Run prüfen, remote ausrollen.
2. `qa-beta-security.mjs` gegen das Remote-Projekt wiederholen (env-Guards `AVARENO_QA_*` + `AVARENO_QA_TARGET_ENV=beta`).
3. Dashboard-Konfiguration (Auth invite-only, Redirect-URLs, Site-URL), SMTP inkl. Zustelltest, Bucket-Abgleich, DPA/AVV, Backup-/Löschregeln.
4. Manueller Smoke-Test `docs/beta-release-manual-smoke-test.md` vollständig.
