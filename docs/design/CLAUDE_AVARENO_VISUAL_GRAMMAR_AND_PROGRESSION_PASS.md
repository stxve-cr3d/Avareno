# AVARENO — VISUAL GRAMMAR & PROGRESSION PASS

Du arbeitest direkt im bestehenden Avareno-Repository als **Lead Product Designer, UX Architect, Design-System-Engineer, Motion Designer und Senior Frontend Engineer**.

Lies vor jeder Änderung vollständig:

1. `docs/design/AVARENO_DESIGN_MANIFESTO_V1.md`
2. den zuletzt ausgeführten App-Experience-Auftrag und dessen Abschlussbericht
3. die aktuellen Browser-Screenshots der Seiten Dashboard, Dinge, Dokumente, Erinnerungen und Profil

Lade anschließend den vorhandenen **ui-pro-max-Skill** beziehungsweise den stärksten verfügbaren UI/UX-Designskill.

## Hauptziel

Die letzte Überarbeitung hat Funktionalität, Aktivitätsgraph, Meilensteine und bessere Produktdarstellungen eingeführt. Die App wirkt jedoch weiterhin sichtbar KI-generiert, weil fast alle Inhalte mit derselben visuellen Formel dargestellt werden:

- kleine Uppercase-Eyebrow,
- sehr große Überschrift,
- Unterzeile,
- weiße Box mit 1-px-Border,
- weitere weiße Boxen darin,
- identische Radien,
- identische Icon-Flächen,
- identische Grid-Karten,
- viele horizontale Separatoren und Status-Pills.

Dieser Pass ist **kein weiterer Farbwechsel** und kein vollständiger funktionaler Neubau. Er ersetzt die generische visuelle Grammatik der gesamten `/app` durch ein professionelles, eigenständiges und abwechslungsreiches System.

Das Ergebnis muss sich wie ein bewusst gestaltetes Consumer-Produkt anfühlen — nicht wie eine Sammlung korrekt implementierter UI-Komponenten.

---

# 1. Bestätigte Probleme aus der aktuellen Oberfläche

Behandle diese Punkte als konkrete Designfehler:

## Aktivitätsgraph und Streak

- Der Heatmap-Graph besitzt zwar Zellen und eine „Weniger/Mehr“-Legende, erklärt aber nicht ausreichend, **was eine Aktivität ist**.
- Die Aussage „5 sinnvolle Aktionen an 3 Tagen“ ist nicht mit einzelnen Tagen erkundbar.
- Hover-, Fokus- und Auswahlzustände erklären Datum, Anzahl und Aktionstypen nicht sichtbar genug.
- In der aktuellen Jahresansicht sind aktive Zellen visuell kaum oder gar nicht erkennbar, obwohl Aktivität vorhanden ist. Prüfe, ob Datenmapping, Zeitraum, Farbe oder Kontrast fehlerhaft sind.
- Der aktuelle Streak ist nur eine Zahl, kein verständliches Fortschrittserlebnis.

## Meilensteine

- Acht Meilensteine sind für eine langfristig motivierende Produktreise zu wenig.
- Alle Meilensteine erscheinen als identische große Karten in einem gleichförmigen Grid.
- Erreichte, nächste und langfristige Ziele besitzen keine visuelle Hierarchie.
- Fortschritt wie „4 von 10“ wird nur als Text gezeigt.
- Das System wirkt wie eine Checkliste, nicht wie eine persönliche Entwicklung.

## Überschriften und Abschnittsaufbau

- Seiten wiederholen zu häufig dasselbe Muster aus Eyebrow, riesigem Titel und Unterzeile.
- Abschnitte sind oft vollständig von großen weißen Außenkarten umgeben.
- Innerhalb dieser Außenkarten folgen weitere Karten, Linien und Filterleisten.
- Horizontale Separatoren werden als Standardlösung eingesetzt, statt Inhalte über Rhythmus und Hierarchie zu gliedern.
- Seiten wie „Dokumente“ enthalten mehrere konkurrierende große Titel: Seitentitel, Archivstatus, Statistiken und Archivüberschrift.
- Die Hierarchie wirkt dadurch synthetisch und aufgebläht.

## Produktdarstellungen

- Produktkarten besitzen weiterhin dieselbe Struktur und denselben Rhythmus.
- Kategorie, Titel, Modell, Raum, Dokumentzahl und mehrere Status-Pills konkurrieren gleichzeitig.
- Chips wie „Beleg fehlt noch“, „Garantie nicht angegeben“ und „8 Angaben fehlen“ wiederholen denselben negativen Zustand.
- Die Karten wirken trotz Icons weiterhin wie Formulardatensätze.
- Der visuelle Schwerpunkt liegt nicht auf dem realen Gegenstand.

## Dokumentseite

- Zu viele große Container und Überschriften.
- „Unterlagen zu 0 % vollständig“ dominiert eine Seite, deren Hauptaufgabe das Finden und Öffnen von Dokumenten ist.
- Suche, Filter, Statistiken und Liste wirken wie getrennte Widgets statt wie ein zusammenhängendes Archiv.

Der Auftrag gilt nicht als erfüllt, wenn nur Radius, Schatten, Farbe oder Abstände geringfügig verändert werden.

---

# 2. Harte Grenzen

Nicht verändern:

- Authentifizierung,
- Supabase-Konfiguration,
- RLS,
- Storage-Security,
- Upload-Validierung,
- Account-Löschung,
- IDOR-/BOLA-Schutz,
- Invite-only-Beta,
- Receipt-Extraction-Kill-Switch,
- Marketing-Landingpage,
- bestehende funktionierende Nutzerabläufe.

Der Working Tree kann fremde Änderungen enthalten:

- zuerst `git status`,
- kein `git reset --hard`,
- kein `git checkout -- .`,
- keine fremden Änderungen überschreiben,
- kein globales Reformatting,
- kein Commit,
- kein Push.

Keine Fake-Daten. Keine erfundenen Freunde, Aktivitäten, Dokumente oder Fortschritte.

Additive Datenänderungen sind nur erlaubt, wenn die gewünschte Progressionsfunktion nicht zuverlässig aus vorhandenen Daten ableitbar ist. Jede Migration muss minimal, RLS-geschützt, löschbar und getestet sein.

---

# 3. Neue visuelle Grammatik

## 3.1 Die Seite ist eine Leinwand, keine Außenkarte

Entferne die Gewohnheit, jede Seite in einen großen weißen Rahmen zu legen.

Standard:

- neutraler Seitenhintergrund,
- ein klarer Seitenkopf ohne umschließende Card,
- offene Abschnitte mit großzügigem vertikalem Rhythmus,
- eigenständige Flächen nur dort, wo Inhalte tatsächlich zusammengehören.

Nicht jede Sektion benötigt:

- Border,
- Radius,
- Shadow,
- Eyebrow,
- Untertitel,
- eigene Card.

## 3.2 Drei Surface-Ebenen

Verwende maximal drei klar erkennbare Flächentypen:

1. **Canvas** — Seitenhintergrund, ohne Border.
2. **Module** — wichtige interaktive Einheit, meist Weiß, gezielt begrenzt oder erhöht.
3. **Inset** — subtile innere Fläche für Controls, Auswahl oder Vorschau.

Keine vierte und fünfte verschachtelte Box-Ebene.

## 3.3 Unterschiedliche Radien nach Funktion

Verwende nicht überall denselben Radius.

Beispielrichtung:

- Controls: 10–12 px,
- Listen-/Dokumentzeilen: 12–14 px,
- Produktobjekte: 18–22 px,
- große Story-/Aktivitätsmodule: 24–28 px.

Passe an vorhandene Tokens an. Radien müssen Bedeutung und Maßstab widerspiegeln.

## 3.4 Typografie-Hierarchie

Definiere verbindlich:

- Seitentitel: 34–44 px Desktop, klar und knapp.
- Seiteneinleitung: maximal eine Zeile, 16–18 px.
- Abschnittstitel: 22–28 px.
- Karten-/Objekttitel: 17–22 px.
- Metadaten: 13–15 px.
- Eyebrows: nur bei echtem Kontextwechsel, nicht vor jedem Titel.

Verwende höchstens **eine** Eyebrow pro Seite und nur, wenn sie wirklich Orientierung schafft.

Keine komplette Seite aus Uppercase-Microcopy aufbauen.

## 3.5 Separatoren

Verwende Linien nur, wenn sie eine echte Lesereihenfolge strukturieren.

Bevorzugt:

- 40–72 px vertikaler Abstand zwischen Hauptabschnitten,
- Wechsel zwischen Canvas und Module,
- Ausrichtung und Typografie,
- Gruppierung über Spalten.

Keine Linie unter jedem Metadatenblock.

## 3.6 Chips und Pills

Status-Pills sind kein Standardlayout.

Regeln:

- maximal ein primärer Status-Chip pro Produktdarstellung,
- weitere Informationen als natürliche Metadatenzeile,
- keine drei Chips für denselben unvollständigen Zustand,
- Pill nur für echten Zustand, Filter oder kompakte Auswahl.

---

# 4. Aktivitätsgraph: aus Diagramm wird ein erklärbares Erlebnis

Behalte die GitHub-/Claude-artige Heatmap, aber vervollständige sie.

## 4.1 Sichtbare Definition

Direkt beim Graphen muss eine knappe Erklärung stehen:

> „Ein aktiver Tag entsteht, wenn du ein Produkt anlegst, ein Dokument speicherst, Angaben ergänzt oder eine Erinnerung erledigst.“

Auf kleinen Bildschirmen darf diese Erklärung über einen Info-Button zugänglich sein.

## 4.2 Tooltip und Tastatur

Jede aktive und inaktive Zelle muss per Hover und Tastaturfokus erreichbar sein.

Tooltip-Inhalt:

- vollständiges Datum,
- Anzahl sinnvoller Aktionen,
- Aufschlüsselung nach Typ,
- bei null Aktionen: „Keine Aktivität an diesem Tag“.

Beispiel:

```text
12. Juli 2026
3 Aktionen
• 1 Produkt angelegt
• 1 Dokument gespeichert
• 1 Erinnerung erledigt
```

Tooltip darf nicht nur visuell per Maus funktionieren.

## 4.3 Ausgewählter Tag

Ein Klick beziehungsweise Enter auf eine Zelle öffnet unter dem Graphen ein kompaktes Detailpanel:

- Datum,
- Aktionstypen und Anzahl,
- optional direkte Links zu noch existierenden Ressourcen, sofern sicher und verfügbar,
- keine sensiblen Namen in Analytics-Events speichern.

Das Detailpanel ist kein Modal und erzeugt keinen Layoutsprung.

## 4.4 Legende

Ersetze die rein abstrakte „Weniger/Mehr“-Legende durch klare Intensitäten:

- 0 Aktionen,
- 1 Aktion,
- 2–3 Aktionen,
- 4–5 Aktionen,
- 6+ Aktionen.

Auf Mobil kompakt darstellen.

## 4.5 Daten- und Kontrastprüfung

Erstelle Tests, die sicherstellen:

- die Zahl aktiver Heatmap-Tage entspricht den Daten,
- vorhandene Aktivität erzeugt sichtbar gefärbte Zellen,
- Monats- und Wochenausrichtung stimmt,
- 30 Tage, 90 Tage und 1 Jahr zeigen korrekte Zeiträume,
- Tooltips zeigen echte Werte,
- Dark Theme und Reduced Motion funktionieren.

## 4.6 Streak-Darstellung

Stelle Streak nicht als drei gleichartige Cards links vom Graphen dar.

Entwickle ein zusammenhängendes Aktivitätsmodul:

- aktuelle Serie groß und klar,
- längste Serie und aktive Tage als sekundäre Kennzahlen,
- Heatmap als Hauptvisual,
- kurze motivierende Zusammenfassung,
- kein Schuldgefühl bei null Tagen.

Beispiel bei null Tagen:

> „Deine nächste sinnvolle Ergänzung startet eine neue Serie.“

Beispiel bei aktiver Serie:

> „Seit 4 Tagen hältst du dein Archiv aktuell.“

---

# 5. Meilensteine: ein echtes Progressionssystem statt acht Karten

## 5.1 Umfang

Erweitere das System auf **mindestens 24 echte, ableitbare Meilensteine**, sofern die bestehenden Daten dies erlauben.

Ordne sie in Sammlungen:

### Start

- erstes Produkt,
- erstes Dokument,
- erste Garantie,
- erste Erinnerung,
- erste vollständige Produktakte.

### Archiv

- 5 Produkte,
- 10 Produkte,
- 25 Produkte,
- 50 Produkte,
- 5 vollständige Produktakten,
- 10 vollständige Produktakten,
- 25 vollständige Produktakten.

### Dokumentation

- 5 Dokumente,
- 10 Dokumente,
- 25 Dokumente,
- erste Rechnung,
- erste Anleitung,
- jedes vorhandene Produkt besitzt mindestens ein Dokument.

### Care

- erste erledigte Erinnerung,
- 5 erledigte Erinnerungen,
- 10 erledigte Erinnerungen,
- erste Garantiefrist vollständig hinterlegt.

### Konsistenz

- 3 aktive Tage,
- 7 aktive Tage,
- 14 aktive Tage,
- 30 aktive Tage,
- 3-Tage-Serie,
- 7-Tage-Serie,
- 4 aktive Wochen.

Passe die genaue Liste an reale Daten an. Zeige keinen Meilenstein, der technisch nicht zuverlässig berechnet werden kann.

## 5.2 Keine 24 identischen Karten

Die Gesamtübersicht darf nicht als riesiges Grid identischer Boxen entstehen.

Verwende stattdessen drei Ebenen:

1. **Als Nächstes** — ein hervorgehobener nächster Meilenstein mit echtem Fortschritt und kurzer Bedeutung.
2. **Zuletzt erreicht** — kompakte, visuell wertige Medaillen-/Badge-Reihe.
3. **Sammlungen** — gruppierte Fortschrittswege oder kompakte Listen je Kategorie.

Mögliche Darstellung:

- horizontale Progressionspfade,
- Medaillons mit Ringfortschritt,
- Kategorie-Tabs,
- kompakte Sammlung mit 3–4 Zielen pro Reihe,
- Detaildrawer beim Öffnen.

Keine versteckten Anforderungen. Gesperrte Meilensteine zeigen immer:

- Ziel,
- aktuellen Fortschritt,
- verbleibende Anforderung.

## 5.3 Wertigkeit

Erreichte Meilensteine dürfen sich hochwertig anfühlen:

- dezentes Motion-Highlight,
- Mantis-Akzent,
- Datum der Freischaltung, wenn zuverlässig ableitbar,
- keine Konfetti- oder Gaming-Optik.

## 5.4 Fortschritt

Text wie „4 von 10“ benötigt eine visuelle Darstellung:

- Progress Bar,
- Ring,
- segmentierter Fortschritt,
- oder Fortschrittsroute.

Kein unkommentierter Zahlenrest am Kartenende.

---

# 6. Produktarchiv: reale Dinge, keine Status-Formulare

## 6.1 Bild zuerst

Die visuelle Produktidentität ist die größte Fläche jeder Produktdarstellung.

- echtes Bild, wenn vorhanden,
- andernfalls hochwertige kategoriespezifische SVG-/Icon-Komposition,
- Bildbereich deutlich größer als heute,
- unterschiedliche visuelle Behandlung für Haushalt, TV/Media, Computer, Werkzeug und Sonstiges.

Kategorie darf nicht die prominenteste Textzeile sein.

## 6.2 Informationspriorität

Reihenfolge:

1. Produktbild,
2. Produktname,
3. Hersteller/Modell,
4. Raum und Dokumentanzahl in einer Metadatenzeile,
5. ein klarer Gesamtstatus,
6. eine Hauptaktion.

Entferne parallele Chip-Aufzählungen.

Beispiel vollständig:

```text
LG OLED C3 Wohnzimmer
LG · OLED65C3
Wohnzimmer · 1 Dokument
Garantie bis 14. Sept. 2027
```

Beispiel unvollständig:

```text
Kaffeemaschine Küche
Hersteller und Modell fehlen noch
Wohnzimmer · keine Dokumente
3 wichtige Angaben fehlen
```

Nicht gleichzeitig zeigen:

- Rechnung fehlt,
- Garantie fehlt,
- 8 Angaben fehlen,
- Vollständigkeit 0 %, 
- mehrere Trennlinien.

## 6.3 Visuelle Vielfalt

Nutze ein bewusstes Galerie-System:

- eine größere „zuletzt verwendet“- oder „zuletzt ergänzt“-Darstellung,
- reguläre Objektkarten,
- optional kompakte Listendarstellung,
- Gruppierung nach Raum oder Kategorie.

Nicht jede Karte muss exakt dieselbe Höhe und innere Geometrie besitzen.

Trotzdem müssen Scanbarkeit und Alignment erhalten bleiben.

## 6.4 Aktionen

Die ganze Karte darf barrierefrei zur Produktakte führen.

Zusätzliche Aktionen erscheinen erst bei Hover/Fokus oder in einem klaren Menü, sofern tatsächlich mehrere Aktionen existieren.

Kein dauerhafter Footer „Produktakte öffnen“ auf jeder Karte, wenn die gesamte Karte bereits klickbar ist.

---

# 7. Dokumentseite: ein Archiv, nicht vier übereinander gestapelte Dashboards

## 7.1 Ein Seitentitel

Verwende genau einen dominanten Seitentitel:

> Dokumente

Darunter eine kurze Erklärung und den Upload-CTA.

Entferne konkurrierende große Titel wie:

- „Unterlagen zu 0 % vollständig“,
- „Gespeicherte Dokumente“ als zweiter H1-artiger Block,
- große Statistik-Card-Reihe direkt darunter.

## 7.2 Archivlayout

Desktop:

- obere, kompakte Such- und Filterleiste,
- Hauptbereich als Dokumentliste oder Monatsgruppen,
- optional rechtes Detail-/Previewpanel für das ausgewählte Dokument,
- kompakte Archivzusammenfassung im Side Panel oder als kleine Statuszeile.

Mobil:

- Suche,
- Filterchips,
- Dokumentliste,
- Detailansicht als eigene Ebene oder Bottom Sheet.

## 7.3 Dokumentzeilen

Jede Zeile zeigt:

- deutlichen Dokumenttyp,
- Dateiname,
- zugehöriges Produkt,
- Datum und Größe,
- Status,
- klare Öffnungsaktion.

Gruppiere nach Monat oder „Zuletzt hinzugefügt“, statt jede Datei in eine weitere Card zu legen.

## 7.4 Archivvollständigkeit

Wenn Archivvollständigkeit relevant bleibt, zeige sie kompakt:

> „1 von 4 Produkten besitzt einen Beleg.“

Mit einer sinnvollen Aktion.

Keine gigantische 0-%-Headline als dominantes Seitenmotiv.

---

# 8. Globale Abschnitts- und Titelregeln

Auf jeder Hauptseite:

- exakt ein H1,
- maximal eine Einleitung,
- Abschnittstitel ohne wiederholte Eyebrow,
- keine äußere Card nur für Überschrift und Untertitel,
- maximal ein dominanter CTA im Kopf,
- sekundäre Aktionen zurückhaltend.

Erstelle eine wiederverwendbare, aber flexible Seitenkopf-Komponente, die Varianten erlaubt:

- Standard,
- Split Header,
- Header mit Visual,
- kompakter Library Header.

Keine starre Komponente, die jede Seite wieder gleich aussehen lässt.

---

# 9. Professionelle Detailqualität

Prüfe gezielt:

- optische Ausrichtung von Icons und Text,
- Baseline der Zahlen,
- konsistente Interaktionshöhen,
- Zeilenlängen,
- Fokuszustände,
- Tooltippositionen,
- Hover ohne Layout Shift,
- Long-Title-Truncation,
- leere Zustände,
- unterschiedliche Datenmengen,
- Dark Theme,
- 200-%-Zoom,
- 320-px-Mobile.

Verwende keine generischen Texte wie „Hier findest du ...“, wenn eine konkrete Aussage möglich ist.

---

# 10. Verpflichtende visuelle Iteration

Dieser Auftrag darf nicht nach der ersten funktionierenden Implementierung beendet werden.

## Runde 1

Implementiere:

1. Aktivität/Streak,
2. Meilenstein-System,
3. Produktarchiv,
4. Dokumentseite,
5. globale Titel- und Surface-Grammatik.

Erstelle reale Browser-Screenshots in:

- 1440 × 900,
- 1920 × 1080,
- 768 × 1024,
- 390 × 844,
- Dark Theme,
- Reduced Motion.

## Kritischer Review

Vergleiche jeden Screenshot mit diesen Fragen:

- Sehe ich wieder identische weiße Karten?
- Gibt es mehr als einen konkurrierenden großen Titel?
- Werden Chips als Ersatz für Informationsarchitektur verwendet?
- Ist ein realer Gegenstand oder nur ein Datensatz sichtbar?
- Kann ich den Heatmap-Tag erklären und auswählen?
- Gibt es einen klaren nächsten Meilenstein?
- Entsteht unnötiger leerer Raum?
- Sieht die Seite wie ein generiertes SaaS-Template aus?

## Runde 2

Behebe alle sichtbaren Schwächen und erstelle die Screenshots erneut.

Ein Abschlussbericht ohne zweite visuelle Runde ist nicht akzeptabel.

---

# 11. QA

Führe mindestens aus:

- Frontend-Typecheck,
- Backend-Typecheck,
- Mobile-Typecheck,
- Produktions-Build,
- Backendtests,
- Landingpage-QA,
- Onboarding-/Upload-QA,
- App-QA,
- Dashboard-/Activity-QA,
- neue Heatmap-Tooltip- und Datenmapping-Tests,
- Milestone-Berechnungstests,
- Produktarchiv-QA,
- Dokumentarchiv-QA,
- Chromium,
- Firefox,
- WebKit,
- Browserkonsole,
- `git diff --check`.

Bestehende Supabase-Security-Integrationstests nicht verändern. Falls Docker nicht läuft, ehrlich als nicht ausgeführt dokumentieren.

---

# 12. Abschlussbericht

Berichte strukturiert:

## A. Visuelle Systemfehler vorher

- wiederholte Header,
- Card-Soup,
- Separatoren,
- Chip-Soup,
- gleichförmige Grids.

## B. Neue visuelle Grammatik

- Canvas,
- Module,
- Inset,
- Typografie,
- Radien,
- Abschnittsrhythmus.

## C. Aktivität und Streak

- Aktivitätsdefinition,
- Tooltip,
- Auswahlpanel,
- Legende,
- Datenmapping,
- Accessibility.

## D. Meilensteine

- Anzahl,
- Kategorien,
- Berechnungsgrundlage,
- nächstes Ziel,
- erreichte Sammlung,
- Progressionsdarstellung.

## E. Produkte

- Bildsprache,
- Informationspriorität,
- Statusvereinfachung,
- Galerie-/Listenlogik.

## F. Dokumente

- Seitenhierarchie,
- Suche/Filter,
- Gruppierung,
- Detailpanel,
- Archivstatus.

## G. Visuelle Iterationen

- Screenshots Runde 1,
- erkannte Schwächen,
- Änderungen Runde 2,
- finale Screenshots.

## H. Tests

- alle ausgeführten Tests,
- Ergebnisse,
- nicht ausgeführte Tests.

## I. Geänderte Dateien

Datei und kurzer Grund.

## J. Urteil

Gib genau eines aus:

- `FINAL — visuelle Grammatik und Progression abgenommen`
- `CONDITIONAL — konkrete visuelle Schwächen verbleiben`
- `NOT FINAL — Oberfläche wirkt weiterhin generisch`

Ein `FINAL` ist nicht zulässig, wenn:

- aktive Heatmap-Tage nicht sichtbar oder erklärbar sind,
- nur acht Meilensteine existieren,
- Produktkarten weiterhin mehrere redundante Status-Pills besitzen,
- Dokumente weiterhin mehrere konkurrierende Großtitel zeigen,
- jede Hauptsektion weiterhin in einer identischen weißen Card liegt,
- keine zweite visuelle Iteration durchgeführt wurde.

Erstelle keinen Commit und pushe keine Änderungen.
