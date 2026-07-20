# Avareno Design Freeze V1

**Datum:** 2026-07-20
**Git-Stand:** Branch `beta-release-2026-07-17`, HEAD `1ffb791` (`feat(beta): prepare invite-only release`) plus die uncommitteten Working-Tree-Änderungen des Visual-Grammar-&-Progression-Passes (Inventar: `docs/beta-release-candidate-report.md`).
**Abnahme:** Visual-Grammar-&-Progression-Pass, Urteil `FINAL – visueller Pass vollständig abgenommen` (zwei Browser-Iterationsrunden, 0 Kontrastfehler Light + Dark).

Dieser Stand ist **Design Freeze V1**. Er ist die verbindliche visuelle Referenz für die Invite-only-Beta.

> Änderungen am Designsystem erfolgen nach dem Beta-Start nur aufgrund beobachteter Nutzerprobleme, Accessibility-Probleme oder klarer Produktanforderungen.

---

## 1. Finale visuelle Prinzipien

1. **Jede Seite hat eine eigene räumliche Logik** — Aktivität = zusammenhängende Zeitvisualisierung, Meilensteine = Fortschrittsweg + Sammlungen, Produkte = Objektgalerie, Dokumente = Bibliothek mit Zeitachse, Erinnerungen = Kalender + Agenda, Profil = Identität + Entwicklung.
2. **Ein dominanter Seitentitel pro Seite**; Abschnittstitel kleiner und ruhiger, Unterzeilen nur mit neuer Information, ein Seiten-Kicker genügt (keine Eyebrow-Inflation).
3. **Zahlen erklären sich selbst**: der Vollständigkeitsring ist die einzige hervorgehobene Kennzahl des Dashboards; alle weiteren Fakten stehen als ruhige Sätze („4 gespeicherte Produktakten"), nie als KPI-Kachelwand.
4. **Ehrliche Daten, keine Dekoration**: Heatmap, Meilensteine, Statuszeilen und Belegsummen stammen ausschließlich aus Nutzer-eigenen Records. Keine Fake-Vorschauen, keine erfundenen Fortschritte, unbekannte Werte werden weggelassen statt als „unbekannt" wiederholt.
5. **Ein dominanter Status pro Produkt** (Garantie-Frist > fehlende Angaben > Garantie aktiv > vollständig); ganze Karte ist der Link, kein wiederholter Karten-Footer.
6. **Verbotene Muster** (im Pass entfernt, bleiben verboten): identische KPI-Kartenreihen, Icon-in-Soft-Box als Standarddekor, Card-in-Card-in-Card, 1-px-Separator zwischen jeder Zeile, Pill-Inflation, gleichförmige 3×N-Kachelwände, Überschriften, die dieselbe Information wiederholen, große leere Container.

## 2. Kanonische Seiten

| Seite | Route | Kern |
|---|---|---|
| Dashboard | `/app` | Begrüßung, Aktivität (90 Tage), Vollständigkeitsring + Faktenliste, 3 Produkt-Objekte, gruppierte Nächste-Schritte, Dokumente, Garantie-Überblick, Schnellaktionen |
| Produkte | `/app/dinge` | Objektgalerie mit Featured-Karte, Suche, Status-/Kategorie-Filter, Sortierung |
| Produktakte | `/app/dinge/:id` | Detailseite (Struktur eingefroren, nicht Teil des Passes) |
| Dokumente | `/reports/home-binder` | Bibliothek mit Monats-Zeitachse, Typ-Chips, Vollständigkeitshinweis |
| Erinnerungen | `/care` | Monatskalender + Agenda (Überfällig / Später / Ohne Datum) |
| Profil | `/ich` | Identität, Aktivität (1 Jahr), Meilensteine, Kurzfakten, Einstiege zu Datenschutz/Konto |
| Datenschutz | `/rewards/datenschutz` | Datenüberblick, Export, KI-Analyse-Schalter, Private Vault, Löschbereich |
| Konto | `/settings/account` | Profil, Sprache, Darstellung, Login-Methoden |

## 3. Kanonische Screenshots

`docs/design/qa-design-freeze-v1/` (20 Aufnahmen, Manifest in dortiger `README.md`). Ältere QA-Ordner bleiben als historische Läufe erhalten und sind nicht mehr maßgeblich.

## 4. Eingefrorene Modul-Verhalten

### Activity-Heatmap
- GitHub-Stil: Spalten = Wochen, Zeilen = Mo–So, Perioden 30 Tage / 90 Tage / 1 Jahr, mobil kompakte 16 Wochen, Strip startet auf heute gescrollt.
- Legende numerisch: 0 / 1 / 2–3 / 4–5 / 6+ Aktionen (`levelFor`).
- Hover UND Tastaturfokus zeigen Datum, Aktionszahl und Aktionsarten im Tooltip-Strip; Klick/Enter pinnt das Tagespanel; leere Tage werden erklärt („Ein ruhiger Tag …").
- Pfeiltasten navigieren das Grid (`:focus-visible`-Ring), Screenreader erhält sr-only-Zusammenfassung plus aria-Label je Zelle.
- Datenquelle ausschließlich `/api/me/activity`: Item.createdAt, Document.createdAt (ohne Vault), Loop DONE, XP-Aktionen `add_serial_number`/`add_repair_log`. Keine Logins, keine Seitenaufrufe, kein Event-Log, keine PII im Payload.

### Meilenstein-System
- 29 Meilensteine in fünf Sammlungen: Start (5), Archiv (7), Dokumentation (6), Care (4), Konsistenz (7). **Keine weiteren Meilensteine im Freeze.**
- Ein hervorgehobener nächster Meilenstein (Fortschrittsring + Balken, höchster relativer Fortschritt), Medaillenreihe „Zuletzt erreicht" (max. 6, echte Daten wo bekannt), Sammlungen als kompakte Listen mit „x von y" und Zustandsdifferenzierung (Balken / Häkchen / Anforderungstext).
- Alles live aus `/api/items`, `/api/loops`, `/api/me/activity` abgeleitet; nichts persistiert, keine Fake-Erfolge, Löschungen wirken sofort.

### Produktdarstellung
- `ProductObjectCard`: großes Visual (Foto `object-fit: cover` oder Kategorie-Komposition aus zwei versetzten Kreisformen + Linien-Icon direkt auf dem Family-Tint), Name (2-zeilig geklammert), Hersteller · Modell, eine Metazeile, genau ein Status.
- Kategorie-Familien: kitchen / laundry / media / computer / tools / other mit zurückhaltenden Tints (Light + Dark definiert).
- Featured-Karte: erstes Produkt bei ungefilterter Standardsortierung ab 3 Produkten.

### Dokumentdarstellung
- Ein H1 „Dokumente", Suche + fünf Typ-Chips, Vollständigkeitszeile („x von y Produkten besitzt einen Beleg"), Monatsgruppen absteigend, Zeile = Typ-Icon (amber/grün/blau/neutral) + Dateiname + Typ · Produkt · extrahierte Belegsumme + Datum (+ Größe nur falls bekannt). Keine Vorschau, solange technisch keine existiert.

### Care / Kalender
- Monatskalender mit Legende (Erinnerung / Garantie-Ende / Überfällig) + Agenda-Spalte (Überfällig / Später / Ohne Datum) mit Erledigen/+2-Tage-Aktionen; Tagesdetail unter dem Kalender.

### Profil
- Identitätskopf (Avatar, Name, E-Mail, Mitglied seit), Tabs Übersicht / Datenschutz / Konto, danach Aktivität (1 Jahr), Meilensteine, drei Kurzfakten, zwei Einstiegskarten.

### Themes & Motion
- Light + Dark vollständig getragen (`avareno-theme`, `[data-theme="dark"]`), 0 bekannte Kontrastfehler (automatischer Scan beider Themes).
- `prefers-reduced-motion: reduce` deaktiviert Karten-Transitions und Motion-Effekte; QA misst `transitionDuration ≤ 0.001s`.

## 5. Erlaubte zukünftige Änderungen

Nur mit nachvollziehbarem Anlass und dokumentiert:
1. reproduzierbarer Fehler (Bug mit Repro-Schritten),
2. fehlschlagender Test wegen realem UI-Bug,
3. nachgewiesener Accessibility-Blocker,
4. Darstellung, die Daten oder Aktionen falsch wiedergibt,
5. beobachtetes Nutzerproblem aus der Beta,
6. klare neue Produktanforderung (bewusste Design-Entscheidung, kein Drive-by).

## 6. Nicht erlaubt (spontane Redesigns)

- Neue Karten-, Farb-, Radius-, Spacing-, Motion- oder Icon-Systeme; keine neue Komponentenbibliothek; kein globales CSS-Reformatting.
- Neue Graphen/Visualisierungen, zusätzliche Meilensteine, neue Seitenstrukturen.
- Subjektive Nachpolitur („noch schöner") ohne einen Anlass aus Abschnitt 5.
- Wiedereinführung der unter 1.6 verbotenen Muster.
