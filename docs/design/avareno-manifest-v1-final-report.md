# Avareno — Final Product & Brand Pass (Design-Manifest V1)

**Datum:** 18. Juli 2026
**Branch:** `beta-release-2026-07-17` (Working Tree, kein Commit/Push)
**Referenz:** `docs/design/AVARENO_DESIGN_MANIFESTO_V1.md`
**Screenshots:** `docs/design/qa-avareno-manifest-v1/`

---

## 1. Gelesene Skills und Referenzen

- `docs/design/AVARENO_DESIGN_MANIFESTO_V1.md` — vollständig gelesen, Quelle der Wahrheit für alle Entscheidungen.
- Skill `ui-ux-pro-max` (`.claude/skills/ui-ux-pro-max/`) — vollständig geladen. Der generierte Design-System-Vorschlag des Skills (Cyan-Palette, Handschrift-Font, „Vibrant & Block-based") widersprach dem Manifest und wurde verworfen; genutzt wurden die A11y-/UX-Checklisten des Skills (Kontrast ≥ 4,5:1, 44-px-Touchziele, sichtbarer Fokus, `prefers-reduced-motion`, keine Emoji-Icons, cursor/hover-Disziplin).
- Bestehende QA-Suiten (`frontend/scripts/qa-*.mjs`) als Regressionsreferenz.

## 2. Ausgangsaudit je Hauptscreen

Audit im echten Browser (Chromium, echte Dev-Daten) vor jeder Änderung:

| Screen | Hauptgeschichte | Schwäche vor dem Pass | Reale Daten | Risiko |
|---|---|---|---|---|
| Dashboard `/app` | „Archiv geordnet, nächster Schritt klar" | Kein Archiv-Score, keine Garantie-Übersicht, Cream-Grund | `completenessScore`, `warrantyUntil`, Dokumente | niedrig |
| Produktarchiv `/app/dinge` | „Mein Besitz, ich finde alles" | **Mini-Tabellen-Cards** („Beleg / Fehlt"-Zeilen), nackte „0 % / 80 %", „Beleg +7", „Offen: …", „THING / Wohnzimmer"-Codes, „Aufmerksamkeit 4", Text-Overflow bei 1440 px, Mini-Würfel-Icons | Items-API | mittel |
| Produktdetail `/app/dinge/:id` | „Alles zu diesem Produkt" | „Was Avareno kennt **0 %**", „**8 offener Punkte**", rote „Fehlt"-Optik ×9, „Fehlt noch: …"-Linksuppe, Card-in-Card („Objektgedächtnis"), englische Platzhalter/Aktivitäten, „Objekt löschen" | Item-Detail-API | hoch |
| Einstellungen `/app/settings` | „Konto sicher kontrollieren" | Riesige Hero-Card, Dev-Jargon („Expliziter Dev-Modus", „SMS / Twilio — Vorbereitet"), unsichtbare Feldlabels, versteckte Kontolöschung | Profil-API | mittel (Auth tabu) |
| Dokumente `/app/reports/home-binder` | „Unterlagen im Produktkontext" | „0% vollständig" ohne Kontext, „Fehlende Punkte prüfen", „Offene Angaben 22", grüne „Fehlt"-Pills | Binder-Report | mittel |
| Landing `/` | Produktakte-Motiv | Struktur bereits manifestkonform; einzige Schwäche: Cream-Grund `#fffdf1` | — | niedrig |

## 3. Finale Designentscheidungen

**Farbwelt (größter Hebel):** Light-Theme von Cream (`#fffdf1`/`#f7f4e8`) auf Soft White + Mantis + Graphite gemäß Manifest §4.2 umgestellt — Base `#F7F8F5`, Hauptflächen weiß, Elevated `#FAFBF8`, Strong `#F0F3EE`, Graphite-Text `#202522/#5E6862/#7D8781`, Borders `#E4E8E2/#D8DDD7/#C4CBC3`. Dark-Theme auf §4.6 gezogen (`#101311`-Basis, Mantis `#65D454`). Zwei-Grün-Problem beseitigt: der alte Supabase-„Leaf"-Akzent `#3ECF8E` wurde überall durch Mantis ersetzt (eine Markenfarbe in App + Marketing). Landing-Token (`--ma-*`) identisch umgestellt. `theme-color`-Meta (statisch + dynamisch) angepasst. Abweichung vom Manifest-Richtwert: `--av-warning` bleibt `#9A6815` statt `#C98518`, weil der hellere Wert auf Weiß nur ~3,3:1 Kontrast erreicht — Zugänglichkeit rangiert laut Manifest §0 vor Manifest-Richtwerten. Amber-Soft `#FFF3D8` wie vorgegeben.

**Ein Produktobjekt für alle Flächen:** Neue geteilte Komponente [`ProductObjectCard`](../../frontend/src/components/ProductObjectCard.tsx) (aus der Dashboard-Karte extrahiert) rendert jedes Produkt identisch: großes Bild oder Kategorie-Placeholder (Coffee/TV/WashingMachine/Drill …, 32 px+), Produktname, Hersteller · Modell, Ort + Dokumentanzahl, genau zwei Statuszeilen in natürlicher Sprache („Beleg gespeichert", „Garantie endet in 42 Tagen"), Vollständigkeits-Satz („3 Angaben fehlen" statt „66 %"), eine Hauptaktion „Produktakte öffnen". Kartenböden über `grid-template-rows` ausgerichtet.

**Sprachdisziplin:** Verbotene Begriffe entfernt — „Punkte offen"/„offener Punkt", nackte Prozente, „Aufmerksamkeit N", „THING/ELECTRONIC"-Codes, „Objekt(e)" in sichtbarer Copy → „Produkt/Produktakte". Fehlende Angaben heißen überall neutral „Noch nicht angegeben" (muted, nie rot). Rot bleibt destruktiven Aktionen vorbehalten.

## 4. Verwendete reale Daten und nicht mögliche Kennzahlen

**Real genutzt:** `completenessScore` je Produkt (Backend-Logik) → Archiv-Score als Mittelwert mit erklärtem Rechenweg; `warrantyUntil` → Garantie-Überblick + „endet in N Tagen"; Dokumenttyp/-datum/-größe; `missingFields` (über `missingFieldLabel` übersetzt).

**Bewusst nicht gebaut (keine Datenbasis → kein Fake, Manifest §2.6):**
- **Aktivitätsgraph:** Die Items-Liste liefert keine `createdAt`-Zeitreihe ins Frontend; eine ehrliche Wochenserie „organisierte Einträge" bräuchte ein Backend-Feld. Statt eines Platzhalter-Charts entfällt der Graph.
- **Wochen-Streak:** `currentStreakDays` existiert im Profil, aber die Zählsemantik (echte organisatorische Handlung vs. App-Aufruf) ist nicht belegt — kein Streak im Dashboard.

## 5. Änderungen an den vier repräsentativen Screens

**Dashboard** ([MemoryHome.tsx](../../frontend/src/pages/MemoryHome.tsx)): Neuer Archivzustand-Block: radialer SVG-Score-Ring (`aria-label`, erklärender Satz, Berechnungshinweis, Aktion „Angaben ergänzen") + drei Statuskarten (Produkte / Dokumente / Garantien enden bald — „Angaben fehlen" wandert in den Score-Satz). Neue Sektion „Garantie-Überblick": reale Garantien nach Ablaufdatum („noch 14 Monate", <60 Tage amber). Produktbereich nutzt die geteilte Objektkarte. Empty State blendet Score/Überblick aus.

**Produktarchiv** ([Items.tsx](../../frontend/src/pages/Items.tsx)): Mini-Tabellen-Karte `ObjectMemoryCard` vollständig ersetzt; Summary-Zeile inkl. „Aufmerksamkeit" entfernt; doppelte Quick-Action-Seitenleiste entfernt (eine Primäraktion); Filter „Offen"→„Angaben fehlen", „Garantie läuft bald ab"→„Garantie endet bald"; selbstbalancierendes `auto-fill`-Grid (`min(19.5rem, 100%)`); Trefferzeile „N von M Produkten".

**Produktdetail** ([ItemDetail.tsx](../../frontend/src/pages/ItemDetail.tsx)): Hero neu — „Produktakte / Zu X % vollständig" mit Fortschrittslinie und Satz „N Angaben fehlen noch — als Nächstes: …" (max. 3) statt 0 %-Wert plus Linksuppe; „Objektgedächtnis"-Graph (Card-in-Card, „8 offener Punkte") ersatzlos entfernt; Bild-Placeholder mit Kategorie-Icon statt Fehler-Optik; alle „Fehlt/Unbekannt/Kein Datum"-Werte → „Noch nicht angegeben" (muted); „Nächster fehlender Punkt"→„Identifikation" mit gestapeltem Serien-Feld (kein Umbruchfehler in der Rail); „Offene Punkte zu diesem Objekt"→„Erinnerungen zu diesem Produkt"; „Objekt löschen"→„Produktakte löschen"; Reparatur-Placeholder deutsch; Aktivitätstypen/-nachrichten übersetzt („Produktakte angelegt."); „Typ: Objekt"→„Produkt". Alle Mutations-Flows (Bearbeiten/Sperren, Upload, QR, Support, Care, Löschen) unverändert.

**Einstellungen** ([AuthPages.tsx](../../frontend/src/pages/AuthPages.tsx) + CSS): Hero entkartet und kompakt; Panels gestrafft (max. 720 px); Feldlabels sichtbar gemacht (waren weiß-auf-weiß); im Invite-Beta unkonfigurierte Login-Provider (Google/Apple/SMS/Passkey) ausgeblendet — Engineering-Gerüst ist kein Nutzerversprechen; „Abmelden" von der Kontolöschung getrennt; expliziter, ruhiger Gefahrenbereich („Account löschen" → Privacy Center, rote Outline statt Drama). Auth-Logik unangetastet.

## 6. Landingpage

Struktur, Hero-Motiv (Produkt + konvergierende Dokument-Chips + Produktakte), Invite-CTA („Beta-Zugang erhalten · Geschlossene Beta · Keine Zahlungsdaten erforderlich") entsprachen dem Manifest bereits — kein Neubau. Geändert: komplette `--ma-*`-Palette auf Soft White, Cream-Hardcodes (Nav-Glas, Seiten-Gradient, Hero-Border) neutralisiert. `qa-landing.mjs`: **51/51** in Chromium, Firefox und WebKit.

## 7. Motion und Reduced Motion

Keine neue Bewegung außer dem einmaligen, ruhigen Einzeichnen des Score-Rings (700 ms, ease-out). Bestehende Motion-Signatur (Konvergenz im Hero, sanfte Reveals) unverändert. `prefers-reduced-motion`: Ring und Produktkarten statisch (geprüft: Transition ≤ 0,001 s), Landing vollständig statisch inkl. sofort sichtbarer Inhalte — durch Suite belegt.

## 8. Accessibility

Geprüft (automatisiert in `qa-avareno-manifest.mjs` + Suiten): sichtbarer Tastaturfokus auf Primäraktionen (Outline ≥ 2 px), Touchziele ≥ 44 px, Kontrast Summary-Label und Score-Text ≥ 4,5:1, Score-Ring mit `role="img"` + Klartext-Label und redundantem Textsatz, Status nie nur über Farbe (immer Text: „Beleg gespeichert/nicht hinterlegt"), 200-%-Zoom-Fußabdruck (720 px, DPR 2) ohne Overflow, Reduced Motion s. o., Screenreader-Namen über `aria-label`/sr-only-Überschriften. Statusfarben-Korrektur: „Unvollständig"-Pills der Dokumentseite von grün auf neutral gestellt.

## 9. Browser- und Viewport-QA

- **Chromium:** vollständige Matrix — 1920×1080, 1440×900, 1280×720, 1024×768, 768×1024, 430×932, 390×844, 375×812, 320×568; Dashboard + Archiv je Viewport ohne horizontalen Overflow.
- **Firefox / WebKit:** Smoke (Dashboard-Ring, Archiv-Objekte, Overflow) + komplette Landing-Suite.
- Zwei behobene Overflow-Bugs bei 320 px (Grid-Minimum > Viewport; Sort-Select-Min-Content) — Fixes: `min(19.5rem, 100%)`-Track, `min-width: 0`-Disziplin für Konsolen-Grid-Kinder.
- Screenshots (25 Dateien) in `docs/design/qa-avareno-manifest-v1/`: Landing Hero Desktop/Mobile, Dashboard (Daten/Empty/Dark/Reduced-Motion/4 Viewports), Archiv (Desktop/Tablet/Mobile/1/4/18 Produkte), Produktobjekt mit/ohne Bild, Produktdetail, Lösch-Bestätigung (Dialogzustand), Dokumente, Erfassung (Produkt + Beleg), Login, Einstellungen, langer Produktname @375.
- Onboarding-Screens zusätzlich über `qa-onboarding.mjs` (`docs/design/qa-milky-archive-final/`).

## 10. Performance und Bundle

- Produktions-Build grün (Vite 6): JS-Hauptbundle 347 kB (gzip 109 kB), `ItemDetail`-Chunk 82 kB — unverändert zur Vorfassung (Code-Splitting bestehen geblieben, keine neuen Abhängigkeiten, kein WebGL, Score-Ring ist reines Inline-SVG).
- CSS-Bundle 586 kB: Bestandsgröße des 30k-Zeilen-Stylesheets; dieser Pass hat Werte getauscht und ~250 Zeilen ergänzt, keine neue Override-Schicht eingeführt. Ein Vorher-Baseline-Build wurde nicht vermessen — nicht gemessen ist nicht gemessen.
- Keine permanenten Animationen ergänzt; Reveal-/Konvergenz-Verhalten unverändert.

## 11. Technische Tests

| Prüfung | Ergebnis |
|---|---|
| Frontend-Typecheck (`tsc`) | ✅ grün |
| Backend-Typecheck (`compileall`) | ✅ grün |
| Mobile-Typecheck (`tsc`, Expo) | ✅ grün |
| Produktions-Build (`vite build`) | ✅ grün |
| Backendtests (`pytest`, 47 Tests) | ✅ 47/47 |
| Landing-QA (3 Browser) | ✅ 51/51 |
| Onboarding-/Upload-QA (isolierte QA-DB auf :4010) | ✅ 37/37, Exit 0 |
| App-QA (`qa-milky-app.mjs`) | ✅ 24/24, Exit 0 |
| Dashboard-QA (`qa-dashboard.mjs`, Erwartungen an neues Layout angepasst) | ✅ 91/91, 3 Browser, Exit 0 |
| Manifest-QA (`qa-avareno-manifest.mjs`, neu) | ✅ alle Checks, 3 Browser, Konsole sauber |
| Security-QA (`qa-beta-security.mjs`) | ⛔ **nicht ausgeführt** — lokales Supabase braucht Docker, Daemon läuft nicht. Kein Erfolg behauptet. |
| Browserkonsole | ✅ fehlerfrei (Suite-Check) |
| `git diff --check` | ✅ sauber |

Hinweise zur Testinfrastruktur (keine Produktlogik geändert): `qa-dashboard.mjs`-Erwartungen an das neue Dashboard angepasst (3 Statuskarten + Score-Ring statt 4 Karten; Empty-State-Anker auf die Begrüßung statt der bewusst ausgeblendeten Summary-Zeile). Der QA-Backend-Lauf benötigt auf diesem Branch `BETA_INVITE_ONLY=false` (sonst verlangt `main.py` `AVARENO_REQUIRE_AUTH=1` und lehnt Mock-Tokens mit 401 ab) — das Invite-Gating des Frontends bleibt davon unberührt und wurde mitgetestet („invite-only signup redirects to login": PASS).

## 12. Geänderte Dateien (dieser Pass)

- `frontend/src/styles.css` — Token-Umstellung Light/Dark, Score-/Garantie-/Archiv-CSS, Settings-Kompaktierung, Pill-Neutralisierung, Overflow-Fixes
- `frontend/src/milky-archive.css` — Landing-Token + Cream-Hardcodes
- `frontend/src/lib/theme.tsx`, `frontend/index.html` — theme-color
- `frontend/src/components/ProductObjectCard.tsx` — **neu** (geteiltes Produktobjekt + Ableitungen)
- `frontend/src/pages/MemoryHome.tsx` — Score-Ring, Garantie-Überblick, geteilte Karte, Helper-Dedupe
- `frontend/src/pages/Items.tsx` — Archiv-Neuaufbau
- `frontend/src/pages/ItemDetail.tsx` — Hero, Sprache, Rail, Aktivitäten
- `frontend/src/pages/AuthPages.tsx` — Settings (Provider-Filter, Gefahrenbereich, Login-Subline)
- `frontend/src/pages/HomeBinder.tsx`, `CaptureLoop.tsx`, `Care.tsx`, `Rewards.tsx`, `MarketingPages.tsx` — Wording-Rollout
- `frontend/scripts/qa-avareno-manifest.mjs` — **neu**; `frontend/scripts/qa-dashboard.mjs`, `qa-onboarding.mjs` — Erwartungen aktualisiert

Fremde Working-Tree-Änderungen (u. a. `docs/*`, gelöschte alte QA-PNGs, `qa-beta-security.mjs`) wurden nicht angetastet. Kein Commit, kein Push, kein globales Reformatting.

## 13. Offene konkrete Probleme

1. **Security-QA nicht gelaufen** (Docker/Supabase lokal aus) — vor Release einmal mit laufendem Docker ausführen.
2. **Aktivitätsgraph + Wochenserie fehlen weiterhin bewusst**: braucht ein ehrliches Backend-Signal (z. B. `createdAt` in der Items-Liste oder ein Aggregat „organisierte Einträge/Woche") — dann Manifest §8.4/§8.5 nachziehen.
3. **Dokumentgröße „Größe unbekannt"**: die Dokumente-API liefert kein `fileSize` für Bestandsdaten; Anzeige ist ehrlich, aber ein Backfill wäre besser.
4. **Rewards-/„Ich"-Seite** (Profil) wurde nur sprachlich angefasst, nicht komponiert — nächster Kandidat nach den Kernscreens.
5. `.env.local` mit `VITE_AUTH_PROVIDER=mock` bleibt Deploy-Falle (bekannter Repo-Quirk, nicht Teil dieses Passes).

---

## Designurteil

**CONDITIONAL – Design ist stark, aber die konkret benannten Abnahmegates fehlen**

Alle visuellen Manifest-Gates sind erfüllt: keine Tabellen-in-Cards mehr, keine unkommentierten Prozente oder „Punkte offen", Soft White statt Cream auf jeder Fläche, große passende Icons, eigenständiges Mobile, reale Browser-Screenshots in drei Engines, alle Kernscreens mindestens zweimal sichtbar iteriert. Für **FINAL** fehlen genau zwei außer-visuelle Gates: (1) der Security-QA-Lauf, der mangels laufender Docker-/Supabase-Infrastruktur nicht ausgeführt werden konnte, und (2) die im Manifest vorgesehene Dashboard-Aktivitätsvisualisierung, die ohne echtes Backend-Zeitreihensignal bewusst nicht gebaut wurde. Beide Punkte sind oben als konkrete nächste Schritte beschrieben; nach ihrem Abschluss kann das Design eingefroren werden.
