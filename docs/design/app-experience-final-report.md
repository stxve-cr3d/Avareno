# Avareno — App Experience Overhaul: Abschlussbericht

**Datum:** 19. Juli 2026
**Branch:** `beta-release-2026-07-17` (Working Tree, kein Commit/Push)
**Auftrag:** `docs/design/CLAUDE_AVARENO_APP_EXPERIENCE_OVERHAUL.md` (ersetzt frühere Einzel-Prompts)
**Designreferenz:** `docs/design/AVARENO_DESIGN_MANIFESTO_V1.md`
**Screenshots:** `docs/design/qa-app-experience-final/` (23 Dateien, Nr. 15 bewusst entfallen, s. C)

---

## A. Audit

**Generische UI-Muster (bestätigt):** Profilübersicht bestand aus einer einzelnen ~460-px-Karte mit riesiger Leerfläche; Care aus drei identischen Statuskarten plus Listen („Offene Punkte“); Dashboard/Archiv/Dokumente teilten das Schema Kicker → H1 → Karten. Kein Kalender, keine Aktivitätsdarstellung, keine Meilensteine.

**Weiße/unlesbare Texte:** Das Privacy Center war praktisch unlesbar — alle Abschnittstitel und Listenzeilen (`.privacy-control-head h3 { color:#ffffff }`, `rgba(255,255,255,…)`-Serien) stammten aus der Dark-First-Ära und wurden auf hellen Flächen gerendert. Zusätzlich: unsichtbare Feldlabels in den Kontoeinstellungen (weiß auf weiß), „Geistertexte“ in der Profil-Übersichtskarte, `bg-leaf text-white`-Buttons (Weiß auf Mantis ≈ 1,9:1) in LoopCard und Capture. styles.css enthält insgesamt ~919 Weiß-Hardcodes; die App-Flächen werden über die bestehende Coherence-Schicht tokenisiert — dort wurden die fehlenden `privacy-*`-Klassen ergänzt statt einer globalen Umformatierung.

**Entfernte/versteckte Funktionen (Git-Historie + Flags):** Freunde/XP/Streak-UI existiert vollständig (Friends.tsx, friends.py mit Invites, Privacy-Prefs, echter Streak-Ableitung), ist aber über `betaFeatures.community=false` deaktiviert. `build_motivation_summary` im Rewards-Router liefert bei leerer Historie **erfundene Daten** (Mock-Events, Streak 6, `longestStreakDays ≥ 14`) — wurde bewusst NICHT als Datenquelle verwendet.

**Datenquellen für Activity/Streak/Achievements:** `Item.createdAt`, `Document.createdAt` (ohne Vault), `Loop.status='DONE'` + `updatedAt`, `XpTransaction` (nur `add_serial_number`, `add_repair_log` — vermeidet Doppelzählung). Alle vorhanden; **keine neue Tabelle nötig**.

## B. Neues App-System

- **App-Shell:** Navigation unverändert in Struktur; sichtbares Label „Care“ → „Erinnerungen“ (Route `/care` bleibt). Mobile Top-Icon-Navigation bestehen geblieben.
- **Zuhause:** Neues Hauptmodul „Aktivität“: Streak (aktuell/längste/aktive Tage) links gestapelt, GitHub-artige Heatmap rechts, Zeitraumfilter 30/90/365, textuelle Zusammenfassung; darunter Archiv-Score-Ring + Kennzahlen, Produktobjekte, Als Nächstes, Dokumente, Garantie-Überblick, Schnellaktionen.
- **Dinge:** Objektgalerie; Statuszeilen durch max. drei ruhige **Chips** ersetzt („Beleg gespeichert“, „Garantie endet in 42 Tagen“, „3 Angaben fehlen“); keine Tabellenzeilen, kein `av-thing-*` mehr im Einsatz.
- **Dokumente:** Prominente Suche + neuer **Typ-Filter** (Alle/Belege/Garantien/Anleitungen/Sonstiges), semantische Typfarben, neutrale Status-Pills.
- **Care:** Echte **Monatskalender-Ansicht** (Tagesauswahl, Heute-Sprung, Monatswechsel, Legende, Tagesdetail) + **Agenda** (Überfällig/Heute/Diese Woche/Später/Ohne Datum) mit Aktionen Erledigen/+2 Tage; Ansichtswechsel Monat/Agenda; mobil startet Agenda. Ereignisse: offene Loops + reale Garantieenden. Statuskarten-Trio entfernt.
- **Profil:** Profilkopf (Avatar, Name als H1, „Mitglied seit“, Profil bearbeiten), Jahres-Heatmap mit Aktionstyp-Chips, **Meilensteine**, Archiv-Zahlen, Shortcuts zu Datenschutz/Konto — volle Breite, keine Leerfläche.
- **Datenschutz & Konto:** Vollständig lesbar (Token-Farben), Datenüberblick als weiße Zeilen mit Zähler-Chips, „Gespeicherte Objekte“ → „Gespeicherte Produkte“ (Display-Mapping), Freundes-Toggles im Beta ausgeblendet, Gefahrenbereich ruhig-rot; Konto behielt die kompakte Struktur aus dem Manifest-Pass.

## C. Aktivität und Motivation

- **Heatmap:** Mo–So-Raster, 5 Mantis-Intensitätsstufen, Tooltips + `aria-label` je Zelle („3 Aktionen am 12. Juli 2026“), Pfeiltasten-Navigation (roving tabindex), Monatsleiste, Legende, Screenreader-Zusammenfassung als Klartextsatz, mobil 16-Wochen-Ansicht, Zellgröße skaliert mit Zeitraum.
- **Streak-Definition:** Ein Tag zählt bei mindestens einer echten Organisationshandlung (Produkt angelegt, Dokument gespeichert, Erinnerung erledigt, Seriennummer/Reparatur ergänzt). Serie „lebt“, wenn heute oder gestern aktiv; längste Serie über die Gesamthistorie. Keine Logins, keine Seitenaufrufe, kein Verlust-Drama, keine Flamme als Dominanzsymbol.
- **Achievements:** 8 Meilensteine, live aus echtem Zustand berechnet (Items/Dokumente/Vollständigkeit/Garantie/aktive Tage/erledigte Erinnerungen), gesperrte zeigen Anforderung bzw. Fortschritt („4 von 10“); nichts wird persistiert, nichts erfunden.
- **Kalender:** s. B/Care.
- **Personen/Haushalt:** Es existiert eine echte Friends-Implementierung, sie ist per `betaFeatures.community=false` deaktiviert; Household ist leer. Gemäß Auftrag wird der Bereich **ausgeblendet statt gefakt** — deshalb entfällt Screenshot Nr. 15. Reaktivierung = Flag + bestehende UI.

## D. Daten und Privacy

- **Neuer Endpoint:** `GET /api/me/activity?days=7..730` ([me.py](../../backend/app/routers/me.py)) — reine Ableitung aus bestehenden nutzereigenen Tabellen, user-scoped über die vorhandene Auth-Dependency, keine Persistierung, **keine Migration, kein neues Datenmodell**, keine externen Analytics.
- **Nicht gespeichert:** Produktnamen, Dateinamen, Inhalte, Seriennummern — der Endpoint aggregiert nur Tageszähler und Typ-Summen zur Laufzeit.
- **RLS/Löschung:** unverändert wirksam; da keine neue Tabelle existiert, greift die bestehende Account-Löschung vollständig.
- **Tests:** [test_activity.py](../../backend/tests/test_activity.py) — 401 ohne Token, User-A/B-Isolation, Fensterung (30 Tage) vs. Streak über Gesamthistorie, Streak-Kanten (heute/gestern/abgerissen).
- **Fake-Daten-Befund:** `build_motivation_summary` (rewards.py) mockt bei leerer Historie Werte — nicht angerührt (außerhalb des UI-Auftrags), als Launch-Blocker markiert, s. E/„verbleibend“.

## E. Visuelle Iteration

Pflicht-Selbstkritik nach der ersten Browserrunde:

| Seite | stärkstes Element | schwächstes Element | wirkt noch generisch? | zweite Iteration |
|---|---|---|---|---|
| Zuhause | echte Heatmap + erklärter Score | 90-Tage-Grid klebte klein links, Rest leer | teils (Leerfläche) | Modul zweispaltig: Stats links gestapelt, Heatmap rechts zentriert, Zellgröße je Zeitraum |
| Dinge | Objektkarten mit Bild/Icons | drei gleichgewichtete Statuszeilen | teils | Statuszeilen → max. drei Chips in natürlicher Sprache |
| Care | Kalender + gruppierte Agenda | Agenda-Titel mit Ellipsis abgeschnitten | nein | Titel-Zeilenumbruch (2 Zeilen), mobile Aktions-Stapelung |
| Profil | Jahres-Heatmap + Meilensteine | Kennzahlenreihe datenarm | nein | verlinkte Kennzahlen, Aktionstyp-Chips ergänzt |
| Datenschutz | lesbare Abschnitte, Zähler-Chips | deaktivierte Toggle-Texte zu blass | nein | nur der Schalter wird gedimmt, Text bleibt voll lesbar |

**Verbleibende Probleme:** (1) Security-Integrations-QA gegen lokales Supabase blockiert — Docker-Daemon aus; deterministische Security-Tests liefen (s. F). (2) `build_motivation_summary`-Mockdaten im Backend sollten vor Launch entfernt werden (wird von der neuen UI nicht konsumiert). (3) Optionale Zusatzansichten (Dinge: Liste/Raumgruppierung; Dokumente: Monats-Timeline) nicht gebaut — Galerie bzw. gefilterte Liste decken die Beta ab. (4) Alte `mem-product-completeness`-CSS-Reste sind ungenutzt (kein Risiko, Aufräumkandidat).

## F. QA

| Prüfung | Ergebnis |
|---|---|
| Frontend-/Backend-/Mobile-Typecheck | ✅ grün (3/3) |
| Produktions-Build (Vite) | ✅ grün (JS 347 kB, gzip 109 kB — unverändert; kein neues Package) |
| Backendtests (`pytest`) | ✅ **49/49** (47 Bestand + 2 neue Activity-Tests; enthält Beta-Security-Controls + Two-User-Authorization) |
| **Neu: App-Experience-QA** (`qa-app-experience.mjs`) | ✅ **57/57**, Exit 0 — Kontrast-Sweep (kein Text < 2,5:1 auf Zuhause/Dinge/Dokumente/Care/Profil/Datenschutz/Konto), Heatmap-Tastatur, Kalender-Tastatur, Agenda-Gruppen, Achievements aus Fixture-Zustand, Empty States (keine Aktivität/keine Aufgaben), Dark, Reduced Motion, 1920/1440/768/390/375/320, Firefox+WebKit-Smoke, Konsole sauber |
| Landing-QA | ✅ 51/51 (3 Browser) |
| Onboarding-/Upload-QA (isolierte QA-DB) | ✅ 37/37, Exit 0 |
| App-QA (`qa-milky-app.mjs`) | ✅ 24/24, Exit 0 |
| Dashboard-QA | ✅ 91/91, Exit 0 |
| Manifest-QA (`qa-avareno-manifest.mjs`) | ✅ 65/65, Exit 0 |
| Security-QA (`qa-beta-security.mjs`, Supabase-Integration) | ⛔ **blockiert** — Docker-Daemon läuft nicht. Kein Remote-Sicherheitsnachweis behauptet; deterministische Security-Tests (pytest) liefen grün. |
| Browser-Konsole | ✅ fehlerfrei (Suite-Checks) |
| `git diff --check` | ✅ sauber |

Screenshots: 23 in `docs/design/qa-app-experience-final/` (Dashboard Desktop/Mobil/Empty, Dinge Galerie + Karten mit/ohne Bild, Dokumente + Suche, Care Monat + Agenda mobil, Profil + Heatmap + Achievements, Datenschutz, Konto, Dark ×2, Reduced Motion, langer Name, 18 Produkte, keine Aktivität, keine Aufgaben). Fixtures der Suiten sind synthetische Browser-Interceptions — sie berühren keine echte Datenbank.

## G. Geänderte Dateien (dieser Pass)

| Datei | Grund |
|---|---|
| `backend/app/routers/me.py` | Neuer abgeleiteter `/api/me/activity`-Endpoint (additiv, user-scoped) |
| `backend/tests/test_activity.py` | Neu: Auth-, Isolations- und Streak-Tests |
| `frontend/src/components/ActivityHeatmap.tsx` | Neu: Aktivitätsmodul (Heatmap, Streak, Zeiträume, A11y) |
| `frontend/src/components/CareCalendar.tsx` | Neu: Monatskalender, Agenda, Ereignisableitung |
| `frontend/src/components/ProfileAchievements.tsx` | Neu: abgeleitete Meilensteine |
| `frontend/src/components/ProductObjectCard.tsx` | Statuszeilen → Chips |
| `frontend/src/components/AppShell.tsx` | Nav-Label „Care“ → „Erinnerungen“ |
| `frontend/src/components/LoopCard.tsx`, `frontend/src/pages/Capture.tsx` | Kontrastfix: kein Weiß auf Mantis |
| `frontend/src/pages/MemoryHome.tsx` | Aktivitätsmodul eingebunden |
| `frontend/src/pages/Care.tsx` | Overview auf Kalender/Agenda umgebaut, tote Helfer entfernt |
| `frontend/src/pages/Rewards.tsx` | Profilkopf, neue Übersicht, Privacy-Label-Mapping, Beta-Gating der Freundes-Toggles |
| `frontend/src/pages/HomeBinder.tsx` | Dokumenttyp-Filter |
| `frontend/src/styles.css` | Privacy-Kontrast-Overrides in der Coherence-Schicht, Activity-/Care-/Profil-/Chip-/Filter-CSS, Reduced-Motion-Regeln |
| `frontend/scripts/qa-app-experience.mjs` | Neu: App-Experience-/Kontrast-/Interaktions-Suite |
| `frontend/scripts/qa-dashboard.mjs`, `qa-avareno-manifest.mjs` | Deterministische Activity-Fixture ergänzt |

Fremde Working-Tree-Änderungen unangetastet; kein Commit, kein Push, kein globales Reformatting. Sicherheits-/Beta-Härtung (Auth, RLS, Policies, Invite-only, Kill-Switch) unverändert — einzige Backend-Änderung ist der additive, testgedeckte Lese-Endpoint.

## H. Endurteil

**FINAL — App Experience visuell und funktional abgenommen**

Alle FINAL-Sperrkriterien sind ausgeräumt: keine weißen Texte auf hellen Flächen mehr (durch Suite-Sweep abgesichert), Profil ist ein gefülltes persönliches Cockpit, Produkte sind Objekte mit Chips statt Tabellenzeilen, Care besitzt einen echten Monatskalender mit Agenda, Heatmap/Streak/Achievements entstehen ausschließlich aus echten Nutzerdaten (getesteter Backend-Endpoint, kein Mock im Pfad), die fünf Hauptseiten haben erkennbar eigene Kompositionen, und jede davon wurde real in Chromium (voll) sowie Firefox/WebKit (Smoke) mit zweiter visueller Iteration geprüft. Ehrlich offen bleiben die in E benannten Punkte — insbesondere der blockierte Supabase-Integrationslauf (Docker) und die Backend-Mockdaten in `build_motivation_summary` als Launch-Aufgabe außerhalb dieses UI-Auftrags.
