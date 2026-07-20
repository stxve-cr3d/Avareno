# AVARENO — FINAL APP EXPERIENCE OVERHAUL

Du arbeitest direkt im bestehenden Avareno-Repository als **Lead Product Designer, UX Architect, Design-System-Engineer, Motion Designer und Senior Frontend Engineer**.

Lade vor der Analyse den vorhandenen **ui-pro-max-Skill** beziehungsweise den stärksten verfügbaren UI/UX-Designskill und wende ihn auf Informationsarchitektur, visuelle Hierarchie, responsive Komposition, Interaktionsdesign und visuelle QA an.

## Hauptziel

Überarbeite die gesamte Oberfläche unter `/app` zu einer modernen, eigenständigen und gerne benutzten Consumer-App.

Das Ergebnis soll nicht wie ein generiertes SaaS-Template, ein CRUD-Frontend oder ein Admin-Dashboard aussehen. Jede Hauptseite muss eine eigene, zum Inhalt passende Komposition besitzen und trotzdem sichtbar zur selben Avareno-Marke gehören.

Avareno soll sich anfühlen wie:

- ein persönliches Produktarchiv,
- ein ruhiger digitaler Ort für Dinge, Dokumente und Fristen,
- eine App, in der Fortschritt sichtbar wird,
- ein Produkt, das man aus eigenem Antrieb gerne öffnet.

Die App darf funktional und informativ sein, soll aber zusätzlich Freude, Eigentumsgefühl, Übersicht und Motivation vermitteln.

---

# 1. Aktuell sichtbare Probleme

Behandle die folgenden Punkte als bestätigte Designfehler, nicht als optionale Geschmacksfragen:

- Auf hellen Flächen erscheinen teilweise weiße beziehungsweise fast weiße Texte und werden unlesbar.
- Zu viele Oberflächen bestehen aus weißen abgerundeten Rechtecken mit identischem Border, Radius und Shadow.
- Fast jede Seite verwendet dasselbe Schema: kleines Uppercase-Label, große Überschrift, Unterzeile, mehrere Cards.
- Die Oberfläche wirkt dadurch KI-generiert und austauschbar.
- Große leere Flächen entstehen, obwohl die Seite inhaltlich wichtige Informationen besitzen könnte.
- Profilseiten nutzen die verfügbare Breite schlecht und lassen große ungenutzte Bereiche zurück.
- Produktdarstellungen fühlen sich wie Datensätze oder Tabellenzeilen an, nicht wie reale Dinge des Nutzers.
- Kleine generische Icons ersetzen echte visuelle Produktidentität.
- Statuszeilen wie „Fehlt“, „Unbekannt“, Prozentwerte oder „Angaben fehlen“ wirken technisch und repetitiv.
- Datenschutz- und Account-Flächen verwenden teilweise falsche inverse Textfarben.
- Erinnerungen besitzen Listen, aber keinen echten Kalender und keine visuelle Zeitstruktur.
- Aktivität, Streaks, Fortschritt und persönliche Entwicklung sind kaum oder gar nicht sichtbar.
- Profil, Freundes-/Personenbereich, Achievements und frühere motivierende Elemente wurden reduziert oder entfernt.
- Die App besitzt zu wenig visuelle und strukturelle Unterschiede zwischen Zuhause, Dinge, Dokumente, Care und Profil.

Der Auftrag ist nicht erfüllt, wenn diese Probleme nur neu eingefärbt werden.

---

# 2. Harte technische Grenzen

Verändere keine bestehende Sicherheits- oder Release-Härtung.

Nicht ohne zwingenden, dokumentierten Grund verändern:

- Authentifizierung,
- Supabase-Konfiguration,
- RLS,
- Storage-Policies,
- Upload-Validierung,
- Account-Löschung,
- IDOR-/BOLA-Schutz,
- Invite-only-Beta-Logik,
- Receipt-Extraction-Kill-Switch,
- bestehende Security-QA,
- Landingpage und Marketingseite.

Der Working Tree kann bereits fremde Änderungen enthalten:

- zuerst `git status`,
- kein `git reset --hard`,
- kein `git checkout -- .`,
- keine fremden Änderungen überschreiben,
- kein globales Reformatting,
- kein Commit,
- kein Push.

Neue Datenmodelle sind nur erlaubt, wenn eine gewünschte Funktion nicht zuverlässig aus vorhandenen Daten abgeleitet werden kann. Jede additive Migration muss minimale Daten speichern, RLS besitzen und getestet werden.

Keine Fake-Daten, keine erfundenen Statistiken und keine nicht funktionierenden Buttons.

---

# 3. Designrichtung: Soft White + Graphite + Mantis

Verwende kein großflächiges Cream oder vergilbtes Papierweiß mehr.

Die Standardrichtung lautet:

```css
:root {
  --av-bg-base: #F5F7F4;
  --av-bg-subtle: #F8FAF7;
  --av-surface: #FFFFFF;
  --av-surface-raised: #FFFFFF;
  --av-surface-muted: #F1F4F0;

  --av-text-primary: #191D1A;
  --av-text-secondary: #5D665F;
  --av-text-muted: #7B847E;
  --av-text-inverse: #FFFFFF;

  --av-border-soft: #E4E9E3;
  --av-border-default: #D6DDD5;
  --av-border-strong: #BEC8BD;

  --av-primary: #59C749;
  --av-primary-hover: #4DB83F;
  --av-primary-active: #3FA134;
  --av-primary-strong: #2F7D2A;
  --av-primary-soft: #EAF7E7;

  --av-warning: #C88419;
  --av-warning-soft: #FFF3DD;
  --av-error: #D84F4F;
  --av-error-soft: #FDECEC;
  --av-info: #3F7FD8;
  --av-info-soft: #EAF2FD;
}
```

Diese Werte sind ein Ausgangspunkt. Prüfe den Kontrast real.

Regeln:

- Seitenhintergrund nahezu neutral und leicht warm.
- Hauptflächen Weiß.
- Sekundärflächen nur leicht getönt.
- Mantis für Aktion, Aktivität und positive Markenmomente.
- Rot nur für echte Fehler oder überfällige kritische Zustände.
- Amber für ergänzbare Informationen und Aufmerksamkeit.
- Keine weiße Schrift auf hellen Flächen.
- Keine inverse Textfarbe, nur weil eine Komponente früher dunkel war.
- Keine großflächigen grünen Cards.

---

# 4. Globaler Kontrast- und Theme-Audit

Suche im gesamten Frontend ausdrücklich nach:

- `text-white`,
- `color: #fff`,
- `color: white`,
- `--text-inverse`,
- Opacity auf Text,
- hellen Gradients mit weißem Text,
- Blend Modes,
- alten Dark-Theme-Klassen auf Light-Flächen,
- direkten Cream-/Milky-Hardcodes,
- überschriebenen semantischen Tokens,
- `!important`-Regeln,
- transparenten Overlays, die Text auswaschen.

Behebe alle sichtbaren Light-Theme-Kontrastfehler systematisch.

Erstelle eine kleine kontrastbezogene Regression-QA für mindestens:

- Datenschutz-Center,
- Profilübersicht,
- Konto,
- Dashboard,
- Dokumente,
- Care,
- Auth-Seiten,
- Dialoge,
- Toasts.

---

# 5. Unterschiedliche Seitentypen statt eines einzigen Card-Templates

Jede Hauptseite unter `/app` erhält eine eigene Struktur.

## Zuhause

Persönliches Dashboard mit Fortschritt, Aktivität, nächsten Schritten und aktuellen Dingen.

## Dinge

Visuelles Produktarchiv beziehungsweise Sammlung. Fokus auf reale Objekte, Bilder, Räume, Kategorien und Zustände.

## Dokumente

Dokumentenbibliothek beziehungsweise Archiv. Fokus auf Suche, Typen, Zuordnung, Zeit und Dateivorschau.

## Care

Kalender- und Fristenoberfläche. Fokus auf Termine, Garantieenden, Erinnerungen und Agenda.

## Profil

Persönliches Cockpit. Fokus auf Identität, Aktivität, Streak, Achievements, Personen/Haushalt und Kontoeinstellungen.

Diese Seiten dürfen nicht alle aus einem Hero-Card plus drei gleich großen Kacheln bestehen.

Nutze bewusst unterschiedliche Muster:

- Split Views,
- Timeline,
- Kalender,
- Heatmap,
- Objektgalerie,
- Listen ohne äußere Card,
- große visuelle Hero-Fläche,
- kompakte Side Panels,
- horizontale Sammlungen,
- detailreiche Zeilen,
- echte Charts.

Verwende Cards nur, wenn die Information tatsächlich eine eigenständige Einheit darstellt.

---

# 6. App-Shell und Navigation

Überarbeite die App-Shell, ohne die Routen zu ändern.

Anforderungen:

- klare aktive Navigation,
- konsistente Begriffe,
- verständlicher Erfassungs-CTA,
- Suchzugang,
- Profilzugang,
- mobil eine eigenständige Bottom Navigation oder kompakte Navigation,
- keine doppelten Profilbuttons,
- keine abgeschnittenen Aktionen,
- keine zu kleinen Icons,
- klarer Fokuszustand.

Prüfe, ob „Care“ als sichtbarer Begriff zur deutschen Oberfläche passt. Ändere ihn nur, wenn das vorhandene Produktvokabular und die Routen sauber konsistent gehalten werden können.

Die Navigation soll ruhig wirken und nicht wie eine Toolbar aus einem Adminsystem.

---

# 7. Zuhause: neues persönliches Dashboard

Das Dashboard ist die emotionale Startseite der App, nicht nur eine Statistikseite.

## Kopf

- echte Begrüßung mit Vorname und Fallback,
- ein kurzer, zustandsabhängiger Satz,
- primärer CTA „Produkt hinzufügen“,
- sekundärer CTA „Dokument hochladen“.

## Hauptmodul: Aktivität und Organisation

Erstelle ein starkes, zusammenhängendes Modul statt vier beliebiger Kacheln.

Es enthält:

- aktuellen Organisations-Streak,
- längsten Streak,
- aktive Tage,
- einen GitHub-/Claude-artigen Aktivitätsgraphen,
- Zeitraumfilter: 30 Tage, 90 Tage, 1 Jahr,
- klare textuelle Zusammenfassung.

### Aktivitätsdefinition

Eine Aktivität zählt nur bei einer sinnvollen Aktion, zum Beispiel:

- Produkt erstellt,
- Dokument gespeichert,
- Produktangaben sinnvoll ergänzt,
- Garantie ergänzt,
- Erinnerung erledigt.

Keine Seitenaufrufe, Logins oder rein technische Events zählen.

### Heatmap

- GitHub-/Claude-inspirierte Tageszellen,
- Mantis-Intensitätsstufen,
- Tooltips mit Datum und Anzahl sinnvoller Aktionen,
- Tastaturzugriff,
- Screenreader-Zusammenfassung,
- auf Mobil eine kürzere 12- oder 16-Wochen-Ansicht,
- Reduced Motion ohne animiertes Einzeichnen.

### Streak

- aktuelle Serie,
- längste Serie,
- aktive Tage im Zeitraum,
- freundlich und motivierend,
- kein aggressiver Verlustzustand,
- keine kindliche Flamme als dominantes Symbol.

Falls vorhandene Daten nicht ausreichen:

1. prüfe zuerst bestehende Aktivierungs-/Activity-Events und Zeitstempel,
2. leite so viel wie zuverlässig möglich daraus ab,
3. füge nur bei Bedarf eine minimale `user_activity_events`-Struktur hinzu,
4. speichere ausschließlich Eventtyp, User-ID und Zeitstempel,
5. keine Produktnamen, Dateinamen, Seriennummern oder Dokumentinhalte,
6. RLS und Löschung müssen vollständig greifen.

## Archivfortschritt

- verständlicher Archiv-Score aus vorhandener Completeness-Logik,
- radial oder als klarer Fortschrittsbalken,
- konkrete Erklärung,
- keine unkommentierte Prozentzahl,
- keine „Punkte offen“.

## Nächste Schritte

Maximal drei echte, priorisierte Aufgaben.

- eine Aufgabe pro Zeile,
- konkreter Produktname,
- klare Aktion,
- kurzer Nutzen,
- Amber statt Rot bei normalen Ergänzungen.

## Produkte

Zeige eine visuelle, abwechslungsreiche Auswahl der zuletzt relevanten Produkte, nicht eine Mini-Tabelle.

## Dokumente und Fristen

Kompakte aktuelle Module:

- zuletzt gespeicherte Dokumente,
- nächste Garantie-/Erinnerungstermine,
- klare Links zu den Fachseiten.

---

# 8. Dinge: Produkte als reale Besitztümer

Produkte dürfen nicht länger wie Zeilen oder Formularzustände wirken.

## Sammlung

Erstelle eine visuelle Produktgalerie mit:

- Bild oder hochwertigem Kategorie-Placeholder,
- großem Produktnamen,
- Hersteller/Modell,
- Raum,
- Dokumentanzahl,
- Garantie-Status,
- verständlichem Fortschritt,
- klarer Öffnungsaktion.

## Bildsprache

Wenn kein Bild vorhanden ist:

- nutze eine großzügige Kategorieillustration,
- verwende passende Icons oder eigene einfache SVGs,
- keine winzigen generischen Würfel,
- unterschiedliche Kategorien müssen visuell unterscheidbar sein.

## Kartenaufbau

Keine inneren Tabellenzeilen wie:

- Beleg — Fehlt,
- Garantie — Unbekannt,
- Offen — 7 Punkte.

Stattdessen:

- klare Statuschips,
- eine kurze Statuszusammenfassung,
- maximal eine primäre Ergänzungsaktion,
- Produktakte als Gesamtobjekt.

Beispiele:

- „Rechnung fehlt“
- „Garantie bis 14. Sept. 2027“
- „3 Angaben fehlen“
- „Produktakte vollständig“

## Ansichten

Falls sinnvoll, biete:

- Galerie,
- kompakte Liste,
- Gruppierung nach Raum oder Kategorie.

Keine Ansicht darf wie eine klassische Admin-Tabelle aussehen.

---

# 9. Dokumente: echtes digitales Archiv

Die Dokumentseite soll wie ein persönliches Archiv wirken.

Enthalten:

- prominente Suche,
- Filter nach Dokumenttyp, Produkt und Zeitraum,
- zuletzt hinzugefügt,
- Dokumenttypenübersicht,
- klare Dateizeilen oder Dokumentkarten,
- verständliche Zuordnung zum Produkt,
- Dateigröße, Datum und Typ,
- Upload-CTA.

Nutze unterschiedliche Darstellungen:

- wichtige beziehungsweise neue Dokumente als größere Preview,
- restliche Dokumente als hochwertige Liste,
- Timeline oder Monatsgruppen statt ausschließlich Cards.

Dokumenttypen erhalten eigene, zurückhaltende semantische Identität:

- Rechnung: Amber,
- Garantie: Grün,
- Anleitung: Blau,
- Sonstiges: Graphit.

Keine automatische Analyse behaupten, wenn sie in der Beta deaktiviert ist.

Die lokale, nicht persistierte Suche darf bleiben, muss aber klar und schnell wirken.

---

# 10. Care: Kalender, Agenda und Fristen

Die Care-/Erinnerungsseite benötigt eine echte Kalenderoberfläche.

## Kalender

Implementiere eine moderne Monatsansicht mit:

- Garantieenden,
- Erinnerungen,
- Rückgabefristen,
- Wartungen,
- eigenen Terminen,
- klaren farblichen Typen,
- Tagesauswahl,
- Tastaturbedienung,
- Mobile-Alternative.

## Agenda

Neben oder unter dem Kalender:

- „Heute“,
- „Diese Woche“,
- „Später“,
- überfällige Einträge,
- klare Aktionen Öffnen, Erledigen, Verschieben.

## Ansichtswechsel

- Monat,
- Agenda,
- optional Timeline.

Keine drei identischen Statuskarten als Hauptinhalt.

Auf Mobil zuerst Agenda, danach kompakter Kalender.

---

# 11. Profil: wieder ein persönlicher, motivierender Ort

Die Profilübersicht darf nicht aus einer großen leeren Fläche und einer einzelnen Datenschutzkarte bestehen.

## Profilkopf

- Avatar,
- Name,
- Rolle beziehungsweise sinnvoller Kontext,
- Mitglied seit,
- kurzer persönlicher Status,
- Profil bearbeiten.

## Aktivität

Zeige den vollständigen Aktivitätsgraphen oder eine größere Jahresansicht mit:

- aktuellem Streak,
- längstem Streak,
- aktiven Tagen,
- sinnvoller Aktivitätszusammenfassung.

## Achievements

Führe ein zurückhaltendes Achievement-System ein oder stelle das bereits vorhandene wieder her.

Mögliche echte Meilensteine:

- erstes Produkt,
- erstes Dokument,
- erste vollständige Produktakte,
- fünf vollständige Produktakten,
- erste Garantie erfasst,
- sieben aktive Tage,
- zehn Produkte organisiert,
- fünf Erinnerungen erledigt.

Regeln:

- Achievements nur aus echten Zuständen,
- keine erfundenen Punkte,
- keine aggressive Gamification,
- subtile hochwertige Badges,
- zuletzt freigeschaltete und Gesamtübersicht,
- verständliche Anforderungen.

## Personen, Freunde und Haushalt

Prüfe Git-Historie, alte Komponenten und bestehende Datenmodelle auf frühere Freundes-, Kontakte-, Haushalts- oder Verbindungsfunktionen.

Nutze dafür `git log`, `git show` und Code-Suche, ohne alte Änderungen zurückzusetzen.

Wenn eine sichere, bereits vorhandene Funktion existiert:

- stelle die Personen-/Freundesliste wieder her,
- zeige Avatare, Namen und Beziehung/Haushalt,
- biete nur funktionierende Aktionen,
- respektiere bestehende Feature Flags und Berechtigungen.

Wenn keine sichere Backendfunktion existiert:

- erfinde keine Freunde,
- baue keinen öffentlichen Social Graph,
- verwende stattdessen vorhandene Household-/Trusted-People-Daten,
- blende den Bereich aus, statt eine riesige leere Fake-Card zu zeigen,
- dokumentiere die Einschränkung.

## Tabs

Übersicht, Datenschutz und Konto bleiben möglich, aber jede Ansicht nutzt die volle verfügbare Breite sinnvoll.

Keine einzelne 600-px-Card links mit leerer Fläche rechts.

---

# 12. Datenschutz und Konto

Diese Seiten sollen seriös, klar und vollständig lesbar sein.

## Datenschutz

- klare, dunkle Textfarben auf hellen Flächen,
- keine weißen Texte auf hellgrauen Cards,
- Datenbereiche als verständliche Liste oder zweispaltige Übersicht,
- Export, Löschung und Verarbeitung klar getrennt,
- echte Zustände und Aktionen,
- keine irreführenden Aussagen über KI oder Private Vault,
- in der Beta deaktivierte Funktionen ehrlich kennzeichnen.

## Konto

- Identität,
- Login-Methoden,
- Sprache,
- Theme,
- Sessions oder Geräte, falls vorhanden,
- Gefahrenzone,
- Account-Löschung.

Vermeide riesige Container mit jeweils nur einer Zeile.

---

# 13. Visuelle Vielfalt ohne Inkonsistenz

Die App benötigt mehr Abwechslung, aber kein Chaos.

Verwende ein gemeinsames System für:

- Farbe,
- Typografie,
- Spacing,
- Radius,
- Icon-Stroke,
- Motion,
- Fokus.

Erlaube unterschiedliche Kompositionen:

- Heatmap,
- Kalender,
- Timeline,
- Galerie,
- Split View,
- Detailpanel,
- Aktivitätsleiste,
- horizontale Sammlung,
- einfache Liste ohne äußere Box.

Vermeide die typischen KI-UI-Muster:

- überall 16-px-Radius,
- überall weiße Card mit grauem Border,
- überall kleine grüne Iconfläche,
- überall Uppercase-Eyebrow,
- überall drei gleich große Stats,
- überall identischer Shadow,
- überall dieselbe Seitenüberschrift.

Nicht jede Fläche braucht einen Border. Nicht jede Gruppe braucht eine Card.

---

# 14. Typografie und Iconografie

## Typografie

- ausreichend große, gut lesbare Texte,
- keine weißen oder zu hellen sekundären Texte,
- weniger Uppercase,
- stärkere visuelle Hierarchie,
- kürzere Textzeilen,
- klare numerische Darstellung.

## Icons

- vorhandenes konsistentes Iconset nutzen,
- unterschiedliche, passende Icons für Produkttypen,
- keine generischen Würfel für alles,
- Icons in wichtigen Produktvisuals größer darstellen,
- keine Mischung aus Emojis, Filled Icons und Outline Icons.

---

# 15. Motion und Freude

Die App darf lebendig sein.

Geeignet:

- Heatmap-Zellen erscheinen sanft,
- neue Produkte ordnen sich in die Sammlung ein,
- erledigte Aufgaben verschwinden kontrolliert,
- Kalenderwechsel gleitet ruhig,
- Achievement wird dezent hervorgehoben,
- Karten reagieren leicht auf Hover,
- Zahlen und Charts bauen sich kontrolliert auf.

Nicht geeignet:

- Konfetti,
- starkes Bouncen,
- aggressive Skalierung,
- Cursor-Trails,
- dauerhafte Rotation,
- unnötige Partikel.

Motion soll Organisation und Fortschritt zeigen.

`prefers-reduced-motion` muss alle nicht notwendigen Animationen deaktivieren.

---

# 16. Datenlogik für Heatmap, Streak und Achievements

Prüfe vorhandene Quellen:

- Produkt-`created_at`,
- Dokument-`created_at`,
- Erinnerung erstellt/erledigt,
- Produktaktualisierungen,
- bestehende Aktivierungs- oder Activity-Events,
- frühere Streak-/Achievement-Implementierungen in Git-Historie.

Bevorzuge Ableitung aus vorhandenen echten Daten.

Falls eine minimale Aktivitätstabelle notwendig ist:

```text
user_activity_events
- id
- user_id
- event_type
- occurred_at
```

Optional nur minimale, nicht sensible technische Metadaten.

Nicht speichern:

- Produktnamen,
- Dateinamen,
- Dokumentinhalte,
- Seriennummern,
- Händler,
- freie Notizen.

Erforderlich:

- RLS,
- Löschung bei Account-Löschung,
- Retention dokumentieren,
- Tests mit User A/User B,
- keine externe Analyticsplattform.

Achievements sollen bevorzugt aus dem aktuellen Zustand berechnet werden und nur bei Bedarf als Freischaltung persistiert werden.

---

# 17. Arbeitsweise und Iteration

Arbeite nicht blind über alle Seiten gleichzeitig.

## Audit

- `git status`,
- UI-Pro-Max-Skill laden,
- bestehende Komponenten und Datenmodelle prüfen,
- Git-Historie nach entfernten Profil-, Freunde-, Streak- und Achievement-Funktionen durchsuchen,
- aktuelle Theme-/Kontrastfehler katalogisieren.

## Repräsentative erste Umsetzung

Überarbeite zuerst vollständig:

1. Zuhause/Dashboard,
2. Dinge/Produktarchiv,
3. Care/Kalender,
4. Profilübersicht,
5. Datenschutz-Center.

## Echte Browserprüfung

Prüfe jede dieser Seiten im echten Browser bei:

- 1440 × 900,
- 1920 × 1080,
- 768 × 1024,
- 390 × 844,
- 320 × 568.

Erstelle Screenshots.

## Verpflichtende Selbstkritik

Nach der ersten Browserrunde erstelle eine Tabelle:

| Seite | stärkstes Element | schwächstes Element | wirkt noch generisch? | notwendige zweite Iteration |
|---|---|---|---|---|

Führe mindestens eine echte zweite visuelle Iteration durch.

Ein Code-Review allein gilt nicht als visuelle Prüfung.

## Rollout

Übertrage das bestätigte System danach auf Dokumente, Konto, Onboarding, Auth und mobile Navigation.

---

# 18. QA und Screenshots

Erstelle einen neuen Ordner:

```text
docs/design/qa-app-experience-final/
```

Mindestens folgende Screenshots:

1. Dashboard Desktop mit Aktivität
2. Dashboard Mobil
3. Dashboard Empty State
4. Dinge Galerie
5. Dinge Listenansicht
6. Produktkarte mit Bild
7. Produktkarte ohne Bild
8. Dokumentarchiv
9. Dokument-Suche
10. Care Monatskalender
11. Care Agenda Mobil
12. Profilübersicht
13. Profil Heatmap
14. Achievements
15. Personen/Haushalt, falls real vorhanden
16. Datenschutz
17. Konto
18. Dark Theme Dashboard
19. Dark Theme Profil
20. Reduced Motion
21. langer Produktname
22. viele Produkte
23. keine Aktivitätsdaten
24. keine offenen Aufgaben

Prüfe Chromium, Firefox und WebKit soweit verfügbar.

---

# 19. Technische Prüfungen

Nach der Umsetzung:

- Frontend-Typecheck,
- Backend-Typecheck,
- Mobile-Typecheck,
- Produktions-Build,
- bestehende Backendtests,
- Landingpage-QA,
- Onboarding-/Upload-QA,
- App-QA,
- Security-QA,
- Dashboard-QA,
- neue Activity-/Heatmap-QA,
- neue Calendar-QA,
- Profile-QA,
- Contrast-QA,
- Browser-Konsole,
- `git diff --check`.

Falls Docker für die lokale Supabase-Integration nicht läuft, führe deterministische Tests aus und kennzeichne die Integrationstests ehrlich als blockiert. Behaupte keinen vollständigen Remote-Sicherheitsnachweis.

---

# 20. Abschlussbericht

Berichte strukturiert:

## A. Audit

- gefundene generische UI-Muster,
- weiße beziehungsweise unlesbare Texte,
- entfernte oder versteckte frühere Funktionen,
- Datenquellen für Activity, Streak und Achievements.

## B. Neues App-System

- App-Shell,
- Dashboard,
- Dinge,
- Dokumente,
- Care,
- Profil,
- Datenschutz und Konto.

## C. Aktivität und Motivation

- Heatmap,
- Streak-Definition,
- Achievements,
- Kalender,
- Personen/Haushalt.

## D. Daten und Privacy

- verwendete Daten,
- neue Migrationen, falls notwendig,
- RLS,
- Löschung,
- nicht gespeicherte sensible Daten.

## E. Visuelle Iteration

- erste Schwächen,
- zweite Iteration,
- verbleibende Probleme.

## F. QA

- Browser,
- Viewports,
- Screenshots,
- Typechecks,
- Builds,
- Tests,
- blockierte Tests.

## G. Geänderte Dateien

Datei und kurzer Grund.

## H. Endurteil

Gib genau eines aus:

- `FINAL — App Experience visuell und funktional abgenommen`
- `CONDITIONAL — konkrete Punkte vor Abnahme offen`
- `NOT FINAL — wesentliche UX-/Designprobleme verbleiben`

`FINAL` ist nicht erlaubt, wenn:

- noch weiße Texte auf hellen Flächen existieren,
- Profil weiterhin große leere Bereiche besitzt,
- Produkte weiterhin wie Tabellenzeilen wirken,
- Care keinen echten Kalender besitzt,
- Heatmap/Streak nur Fake-Daten verwenden,
- mehrere Hauptseiten weiterhin identisch aufgebaut sind,
- die App nur anhand von Code und nicht real im Browser geprüft wurde.

---

# Definition of Done

Der Auftrag ist abgeschlossen, wenn:

1. alle sichtbaren Light-Theme-Texte lesbar sind,
2. die App nicht mehr wie ein generisches KI-SaaS-Template wirkt,
3. jede Hauptseite eine eigene, passende Informationsarchitektur besitzt,
4. Dashboard einen echten Activity-Graphen und sinnvolle Fortschrittsdarstellung besitzt,
5. Care eine echte Kalender-/Agenda-UI besitzt,
6. Produkte wie reale Besitztümer und nicht wie Datensätze wirken,
7. Profil wieder reichhaltig und persönlich ist,
8. Streak und Achievements aus echten Daten entstehen,
9. Freunde/Personen nur bei realer und sicherer Funktion gezeigt werden,
10. große leere Flächen sinnvoll beseitigt sind,
11. Mobil und Desktop eigenständig funktionieren,
12. Dark Theme und Reduced Motion erhalten bleiben,
13. Security- und Beta-Härtung nicht beschädigt wurde,
14. mindestens eine zweite visuelle Iteration nach Browser-Screenshots durchgeführt wurde,
15. der endgültige Stand gern und freiwillig benutzbar wirkt.

Beginne jetzt mit:

1. `git status`,
2. Laden des ui-pro-max-Skills,
3. Audit von Theme, Seitenmustern und Git-Historie,
4. Behebung aller weißen Light-Theme-Texte,
5. vollständiger Überarbeitung von Dashboard, Dinge, Care, Profil und Datenschutz,
6. echter Browserprüfung,
7. zweiter visueller Iteration,
8. kontrolliertem Rollout,
9. vollständiger QA.

Erstelle keinen Commit und pushe keine Änderungen.
