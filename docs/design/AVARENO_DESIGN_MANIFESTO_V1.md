# AVARENO — DESIGN MANIFESTO V1

**Status:** verbindliche Design- und Produktreferenz  
**Version:** 1.0  
**Datum:** 18. Juli 2026  
**Geltungsbereich:** Marketingseite, Web-App, mobile App, Authentifizierung, Systemseiten, E-Mails, Social Assets und neue Produktoberflächen  
**Rolle:** Single Source of Truth für Produktdesign, UX, Markenwirkung und visuelle Qualität

---

## 0. Wie dieses Dokument verwendet wird

Dieses Manifest ist kein Moodboard und keine lose Sammlung von Vorlieben. Es ist die verbindliche Entscheidungsgrundlage für jede sichtbare Avareno-Oberfläche.

Vor jeder größeren UI-Arbeit muss das ausführende Team oder der ausführende Agent:

1. dieses Dokument vollständig lesen,
2. die betroffene Nutzeraufgabe benennen,
3. vorhandene reale Daten und Funktionen prüfen,
4. relevante Screens im echten Browser analysieren,
5. erst danach gestalten oder implementieren.

Bei Widersprüchen gilt folgende Reihenfolge:

1. Sicherheit, Datenschutz und tatsächliche Produktfunktion,
2. Verständlichkeit und Zugänglichkeit,
3. dieses Manifest,
4. bestehende Komponenten und historische Konventionen.

Historischer Code oder ein bestehendes Layout ist kein Argument gegen eine bessere Lösung. Gleichzeitig ist ein visuell reizvoller Entwurf kein Argument dafür, funktionierende Sicherheits- oder Produktlogik zu gefährden.

> **Avareno wird nicht um Daten herum gestaltet. Avareno wird um das Gefühl des Nutzers herum gestaltet.**

---

# 1. Die Idee von Avareno

## 1.1 Avareno in einem Satz

**Avareno ist die digitale Produktakte für den Alltag.**

Menschen besitzen Produkte. Zu jedem Produkt gehören Informationen: Rechnung, Kaufdatum, Garantie, Seriennummer, Anleitung, Wartung, Erinnerungen und persönliche Notizen. Diese Informationen liegen heute verteilt in E-Mails, Ordnern, Shopkonten, Schubladen und auf den Geräten selbst.

Avareno hält zusammen, was zusammengehört.

## 1.2 Das Markenversprechen

> **Was zu deinem Produkt gehört, bleibt zusammen.**

Alternativ für funktionalere Kontexte:

> **Alles, was zu deinen Produkten gehört. An einem Ort.**

Beide Aussagen beschreiben dasselbe Produkt. Die erste ist emotionaler, die zweite unmittelbarer. Sie dürfen nicht wahllos gemischt werden. Pro Oberfläche muss eine klare Botschaft dominieren.

## 1.3 Das Gefühl beim Öffnen

Wenn jemand Avareno öffnet, soll die Person unmittelbar fühlen:

- Ruhe,
- Klarheit,
- Besitz und persönliche Relevanz,
- Vertrauen,
- Erleichterung,
- Kontrolle ohne Verwaltungsgefühl.

Avareno soll nicht vermitteln: „Hier ist eine Datenbank, die du pflegen musst.“

Avareno soll vermitteln:

> **„Alles Wichtige hat endlich einen verlässlichen Platz.“**

## 1.4 Was Avareno nicht ist

Avareno ist nicht:

- ein Admin-Dashboard,
- ein generisches SaaS-Template,
- ein Enterprise-Backoffice,
- ein Datei-Explorer,
- ein Tabellenfrontend,
- eine Smart-Home-Fernbedienung,
- eine Cybersecurity-App,
- ein Gamification-Produkt,
- ein Fitness-Tracker für Haushaltsorganisation,
- eine Notion-, Linear- oder Apple-Kopie,
- ein Öko- oder Pflanzenprodukt nur wegen der grünen Markenfarbe.

## 1.5 Was Avareno ist

Avareno ist:

- ein persönliches Produktarchiv,
- ein digitales Zuhause für Besitz und zugehörige Informationen,
- ein ruhiges Consumer-Produkt,
- hochwertig, aber nicht elitär,
- modern, aber nicht trendgetrieben,
- emotional, aber nicht verspielt,
- hilfreich, ohne Druck zu erzeugen,
- visuell eigenständig, ohne künstlich originell wirken zu müssen.

---

# 2. Die unverhandelbaren Designprinzipien

## 2.1 Eine Geschichte pro Screen

Jede Oberfläche erzählt genau eine Hauptgeschichte.

Beispiele:

- Dashboard: „Mein Archiv ist geordnet und ich weiß, was als Nächstes wichtig ist.“
- Produktdetail: „Hier ist alles, was zu genau diesem Produkt gehört.“
- Dokumentenarchiv: „Ich finde Unterlagen schnell und verstehe ihre Zuordnung.“
- Erfassung: „Ich kann ohne Hürde eine neue Produktakte anlegen.“
- Einstellungen: „Ich kontrolliere mein Konto und meine Darstellung sicher und verständlich.“

Wenn ein Screen gleichzeitig Analyse, Onboarding, Werbung, Aufgabenliste und Datenverwaltung sein will, erzählt er keine klare Geschichte.

## 2.2 Objekte statt Zeilen

Ein Produkt ist kein Datensatz. Es ist ein realer Gegenstand, den der Nutzer besitzt.

> **Baue keine Tabellenzeilen mit abgerundeten Ecken. Baue digitale Repräsentationen persönlicher Gegenstände.**

Eine gute Produktdarstellung lässt den Nutzer denken:

> „Das ist meine Kaffeemaschine.“

Nicht:

> „Das ist Eintrag Nummer vier.“

Produktdarstellungen benötigen daher erkennbare visuelle Identität, klare Typografie, sinnvolle Statusinformationen und eine natürliche Hauptaktion.

## 2.3 Bedeutung vor Dekoration

Jedes sichtbare Element muss eine Aufgabe erfüllen.

Vor dem Hinzufügen eines Elements ist zu fragen:

- Was versteht der Nutzer dadurch schneller?
- Welche Handlung wird dadurch sicherer?
- Welche Emotion wird dadurch bewusst unterstützt?
- Würde der Screen ohne dieses Element schlechter funktionieren?

Wenn die Antwort unklar ist, gehört das Element nicht auf den Screen.

## 2.4 Entfernen vor Hinzufügen

Reihenfolge jeder Verbesserung:

1. Unnötiges entfernen.
2. Hierarchie klären.
3. Inhalte ordnen.
4. Interaktion vereinfachen.
5. Erst danach visualisieren und animieren.

> **Simplify before decorating. Organize before animating. Clarify before beautifying.**

## 2.5 Fortschritt ohne Schuldgefühl

Avareno darf Fortschritt zeigen: Archiv-Vollständigkeit, Aktivität, Wochenserien, Garantiefristen und erledigte Schritte.

Avareno darf daraus keinen Druck erzeugen.

Unvollständige Daten sind kein Fehler. Ein unterbrochener Streak ist kein Versagen. Fehlende Angaben werden neutral oder unterstützend dargestellt, nicht alarmistisch.

Rot ist für echte Fehler, gefährliche Aktionen oder kritische Zustände reserviert. Normale Unvollständigkeit verwendet neutrale oder amberfarbene Hinweise.

## 2.6 Echte Daten oder kein Diagramm

Graphen, Streaks, Prozentwerte und Trends dürfen nur angezeigt werden, wenn sie aus nachvollziehbaren realen Daten entstehen.

Nicht erlaubt:

- künstliche Aktivitätskurven,
- erfundene „Health Scores“,
- unklare „Punkte offen“,
- dekorative Diagramme ohne verständliche Einheit,
- Prozentwerte ohne Beschreibung,
- Streaks, die aus zufälligen App-Aufrufen entstehen.

Wenn nicht genug Daten vorhanden sind, erhält der Nutzer einen hochwertigen Empty State statt einer leeren Achse.

## 2.7 Hochwertig bedeutet nicht kompliziert

Komplexität ist kein Qualitätsmerkmal. Premium entsteht durch:

- präzise Hierarchie,
- gute Proportionen,
- klare Typografie,
- glaubwürdige Inhalte,
- konsistente Interaktionen,
- kontrollierte Bewegung,
- sorgfältige Details.

Nicht durch:

- viele Boxen,
- starke Schatten,
- übermäßigen Blur,
- permanent animierte Flächen,
- riesige Headlines ohne Inhalt,
- überladene Dashboards.

## 2.8 Die Fünf-Sekunden-Regel

Jeder zentrale Screen muss innerhalb von fünf Sekunden verständlich sein.

Der Nutzer muss erkennen:

1. Wo bin ich?
2. Was ist hier wichtig?
3. Was kann oder sollte ich als Nächstes tun?

Wenn dafür eine Erklärung notwendig ist, ist die Informationsarchitektur nicht fertig.

## 2.9 Screenshot-würdig, aber nicht screenshot-getrieben

Jede Oberfläche soll hochwertig genug sein, dass sie freiwillig geteilt werden könnte. Trotzdem darf sie nicht für Dribbble statt für reale Nutzung gestaltet sein.

Die Reihenfolge bleibt:

1. verständlich,
2. bedienbar,
3. vertrauenswürdig,
4. schön.

---

# 3. Markenpersönlichkeit

## 3.1 Markenattribute

Avareno ist:

- ruhig,
- verlässlich,
- organisiert,
- menschlich,
- präzise,
- modern,
- hochwertig,
- alltagsnah,
- unaufdringlich,
- vertrauenswürdig.

## 3.2 Verbotene Markenwirkungen

Avareno darf nicht wirken wie:

- ein lautes Tech-Startup,
- ein Crypto- oder Hackerprodukt,
- ein grünes Nachhaltigkeitsklischee,
- ein Kinderprodukt,
- ein Verwaltungsprogramm,
- eine Tabellenanwendung,
- ein generisches KI-Produkt,
- ein Dashboard, das Daten nur zeigt, weil sie vorhanden sind.

## 3.3 Das wiedererkennbare Markenmotiv

Avarenos visuelles Kernmotiv ist:

> **Verstreute Informationen ordnen sich ruhig um eine zentrale Produktakte.**

Dieses Motiv kann unterschiedlich erscheinen:

- gestaffelte Dokumente,
- eine zentrale Produktfläche,
- feine Verbindungslinien,
- ein charakteristischer Aktenrahmen,
- Informationen, die sich räumlich einordnen,
- ein kleines Mantis-Signal als Orientierungspunkt.

Das Motiv muss funktional und wiedererkennbar bleiben. Es darf nicht in jeder Oberfläche neu erfunden werden.

---

# 4. Finale Farbwelt: Soft White + Mantis + Graphite

## 4.1 Warum kein großflächiges Cream

Avareno verwendet keine gelbliche Papierwelt als Standard. Zu viel Cream erzeugt:

- zu geringe Ebenentrennung,
- eine veraltete oder vergilbte Wirkung,
- beige-in-beige Flächen,
- reduzierte Lesbarkeit,
- den Eindruck eines Notizbuchs statt eines modernen Produkts.

Die warme Herkunft bleibt subtil erhalten, aber die Hauptwirkung ist klar, hell und neutral.

## 4.2 Light-Theme-Tokens

```css
:root {
  --av-bg-base: #F7F8F5;
  --av-bg-surface: #FFFFFF;
  --av-bg-panel: #FFFFFF;
  --av-bg-elevated: #FAFBF8;
  --av-bg-strong: #F0F3EE;
  --av-bg-inverse: #171B18;

  --av-text-primary: #202522;
  --av-text-secondary: #5E6862;
  --av-text-muted: #7D8781;
  --av-text-subtle: #9AA29D;
  --av-text-inverse: #F8FAF7;

  --av-border-soft: #E4E8E2;
  --av-border-default: #D8DDD7;
  --av-border-strong: #C4CBC3;

  --av-primary: #59C749;
  --av-primary-hover: #4EBB41;
  --av-primary-active: #43A638;
  --av-primary-strong: #347F2D;
  --av-primary-soft: #EDF8EA;
  --av-primary-muted: #D6EFD1;
  --av-primary-foreground: #10220D;

  --av-success: #3F9C42;
  --av-success-soft: #E9F6E8;
  --av-warning: #C98518;
  --av-warning-soft: #FFF3D8;
  --av-error: #D64F4F;
  --av-error-soft: #FDECEC;
  --av-info: #397FC6;
  --av-info-soft: #EAF2FB;

  --av-focus: #3F9F35;
  --av-selection: #DDF2D8;
  --av-overlay: rgba(20, 26, 22, 0.42);
}
```

## 4.3 Farbrollen

- **Soft White:** Ruhe und Klarheit.
- **Graphite:** Vertrauen, Struktur und Lesbarkeit.
- **Mantis:** Handlung, Orientierung und Markenmoment.
- **Amber:** ergänzbare oder bald relevante Informationen.
- **Red:** echte Fehler, destruktive Aktionen oder kritische Zustände.
- **Blue:** neutrale Information.

## 4.4 Mantis-Regeln

Mantis wird verwendet für:

- primäre CTAs,
- aktive Navigation,
- ausgewählte Zustände,
- Fortschritt,
- Fokusakzente,
- kleine Markenmomente,
- positive Hervorhebungen.

Mantis wird nicht verwendet für:

- jede Überschrift,
- jede Karte,
- jede Zahl,
- jeden Icon-Hintergrund,
- ganze Seitenflächen,
- sämtliche Statusbadges.

Kleine grüne Texte verwenden `--av-primary-strong`, nicht automatisch das hellere Mantis.

## 4.5 Ebenen

Die Standard-Ebenen sind:

1. Seitenhintergrund: `--av-bg-base`
2. Hauptfläche: `--av-bg-surface`
3. interaktive oder leicht differenzierte Fläche: `--av-bg-elevated`
4. aktive oder markierte Fläche: `--av-primary-soft`

Keine vier nahezu identischen Creme- oder Weißtöne innerhalb derselben verschachtelten Komponente.

## 4.6 Dark Theme

Das Dark Theme bleibt funktional und eigenständig, verwendet jedoch dieselben semantischen Rollen. Direkte Light-Hardcodes in Komponenten sind verboten.

Orientierung:

```css
[data-theme="dark"] {
  --av-bg-base: #101311;
  --av-bg-surface: #171B18;
  --av-bg-panel: #1C211D;
  --av-bg-elevated: #222823;
  --av-bg-strong: #293029;

  --av-text-primary: #F4F7F3;
  --av-text-secondary: #B3BDB6;
  --av-text-muted: #89938C;

  --av-border-soft: #272E29;
  --av-border-default: #343D36;
  --av-border-strong: #455048;

  --av-primary: #65D454;
  --av-primary-hover: #76DE66;
  --av-primary-active: #50BD42;
  --av-primary-strong: #85E276;
  --av-primary-soft: #1E3720;
}
```

---

# 5. Typografie

## 5.1 Aufgabe der Typografie

Typografie erzeugt Ruhe, Orientierung und Wertigkeit. Sie darf nicht nur Inhalte beschriften.

## 5.2 Grundregeln

- Bestehende hochwertige und lizenzierte Schrift beibehalten, sofern sie technisch geeignet ist.
- Keine neue Schrift allein für vermeintliche Premiumwirkung.
- Keine extrem dünnen Schnitte.
- Keine zu hellen Sekundärtexte.
- Keine wichtigen Informationen unter einer sinnvoll lesbaren Größe.
- Uppercase-Labels nur sparsam als echte Abschnittsmarker verwenden.
- Produktnamen, Hauptaktionen und zentrale Zustände benötigen klare Priorität.

## 5.3 Empfohlene Skala

```css
--av-font-display: clamp(3rem, 6vw, 6.5rem);
--av-font-h1: clamp(2.25rem, 4vw, 4.5rem);
--av-font-h2: clamp(1.75rem, 3vw, 3rem);
--av-font-h3: clamp(1.25rem, 2vw, 1.75rem);
--av-font-body-lg: 1.125rem;
--av-font-body: 1rem;
--av-font-small: 0.875rem;
--av-font-meta: 0.8125rem;
```

Diese Werte sind Richtwerte und müssen in die bestehende Skala integriert werden.

## 5.4 Informationshierarchie

Ein typischer Produktblock priorisiert:

1. Produktname,
2. relevante visuelle Identität,
3. Hersteller/Modell oder Ort,
4. ein verständlicher Status,
5. eine klare Aktion,
6. erst danach Metadaten.

Kategorie-Labels dürfen nicht stärker wirken als der Produktname.

---

# 6. Raum, Layout und Proportion

## 6.1 Weißraum ist Luxus

Dichte Interfaces fühlen sich billig und verwaltungslastig an. Großzügiger Raum erzeugt Vertrauen, solange er die verfügbare Fläche sinnvoll nutzt.

Leerer Raum ist nicht gleich gute Gestaltung. Riesige ungenutzte Flächen rechts oder unterhalb kleiner Karten sind ein Layoutfehler, kein Premiummerkmal.

## 6.2 Container

- Marketing: kontextabhängig, typischerweise 1200–1440 px.
- App: maximal ungefähr 1440–1520 px, abhängig von Navigation und Screen.
- Große Bildschirme müssen sinnvoll genutzt werden.
- Mobile ist kein verkleinerter Desktop.

## 6.3 Raster

- Desktop: 12-Spalten-System.
- Tablet: 8 Spalten.
- Mobil: 4 Spalten.
- Kartenbreiten und Inhaltsdichte folgen Inhalt, nicht einer starren Zahl gleich großer Boxen.

## 6.4 Spacing-System

Orientierung:

```text
2, 4, 8, 12, 16, 24, 32, 48, 64, 96
```

Keine zufälligen 18-, 22- oder 37-Pixel-Abstände ohne gestalterischen Grund.

## 6.5 Radius

Wenige klare Stufen:

- Small: 8 px
- Medium: 12 px
- Large: 18 px
- Extra Large: 24–28 px
- Pill: 999 px

Nicht jede Komponente benötigt einen anderen Radius.

## 6.6 Schatten

Maximal drei Rollen:

- Subtle: leichte Trennung,
- Raised: interaktive oder wichtige Fläche,
- Overlay: Dialog, Popover, Navigationsebene.

Schatten dürfen nicht die fehlende Hierarchie kompensieren.

---

# 7. Komponentenphilosophie

## 7.1 Karten sind kein Standardlayout

Eine Card ist nur gerechtfertigt, wenn sie:

- ein eigenständiges Objekt repräsentiert,
- als klar abgrenzbare Interaktion funktioniert,
- eine vergleichbare Gruppe strukturiert,
- oder eine wichtige Geschichte visuell bündelt.

Nicht jeder Abschnitt benötigt eine Card. Nicht jede Card benötigt innere Cards.

## 7.2 Produktobjekte

Eine Produktdarstellung muss mindestens enthalten:

- ein echtes Bild oder einen hochwertigen Kategorie-Placeholder,
- Produktname,
- relevante Identifikation wie Hersteller/Modell,
- höchstens ein bis zwei primäre Statusinformationen,
- eine verständliche nächste Handlung.

Nicht erlaubt:

- winzige generische Würfelicons,
- starre Mini-Tabellen in der Card,
- Prozentwerte ohne Erklärung,
- „Punkte offen“,
- drei horizontale Trennlinien,
- fünf gleichgewichtete Metadatenzeilen,
- unverständliche englische Kategoriecodes.

### Gute Statussprache

- „Produktakte zu 70 % vollständig“
- „3 Angaben fehlen“
- „Rechnung gespeichert“
- „Garantie endet in 3 Monaten“
- „Garantie noch nicht angegeben“

### Schlechte Statussprache

- „70 %“
- „Beleg +7“
- „Offen: 8 Punkte“
- „THING / Wohnzimmer“
- „Unbekannt“ ohne Kontext

## 7.3 Dokumentobjekte

Ein Dokumenteintrag zeigt:

- Dokumenttyp mit erkennbarem Icon,
- Dateiname,
- zugeordnetes Produkt,
- Datum,
- optional Dateigröße,
- klare Öffnen- oder Zuordnen-Aktion.

Dokumenttypen verwenden semantische visuelle Unterschiede:

- Rechnung: Amber,
- Garantie: Grün,
- Anleitung: Blau oder neutral,
- Sonstiges: Graphit/Grau.

## 7.4 Buttons

### Primär

- eine dominante Aktion pro Kontext,
- Mantis-Hintergrund,
- nachgewiesener Textkontrast,
- klare Verbform.

### Sekundär

- neutraler Hintergrund oder Border,
- kein zweiter visueller Primärbutton,
- verständliche Hierarchie.

### Tertiär

- Textaktion oder dezente Fläche,
- nicht am äußersten Rand versteckt,
- als Handlung erkennbar.

Keine generischen Labels wie „Weiter“, wenn tatsächlich „Produkt speichern“ gemeint ist.

## 7.5 Inputs

- neutral weiß oder leicht getönt,
- klarer Border,
- sichtbarer Fokus,
- verständlicher Placeholder,
- Fehlerzustand mit Text, nicht nur Farbe,
- sinnvolle mobile Tastaturtypen,
- keine beige-in-beige Felder.

## 7.6 Badges

Badges sind kurze Zustände, keine Ersatzüberschriften.

- nicht jede Information als Badge,
- nicht alle Badges grün,
- keine unverständlichen Codes,
- Status zusätzlich in Text erkennbar.

## 7.7 Navigation

- aktive Route klar, aber ruhig,
- Mantis-Soft statt vollgrüner Fläche,
- Icons konsistent,
- maximal relevante Hauptbereiche,
- keine historischen Modulkürzel ohne Nutzerverständnis.

---

# 8. Dashboard: das emotionale Zuhause

## 8.1 Aufgabe

Das Dashboard ist nicht primär Analytics. Es ist die Eingangstür zum persönlichen Archiv.

Der Nutzer soll denken:

> „Ich weiß, was ich besitze, was organisiert ist und was als Nächstes sinnvoll ist.“

Nicht:

> „Ich sehe viele Statistiken.“

## 8.2 Empfohlene Hierarchie

1. Begrüßung und klare Hauptaktion.
2. Archivzustand und aktuelle Relevanz.
3. Aktivität oder Entwicklung.
4. maximal drei nächste Schritte.
5. visuelle Produktobjekte.
6. Garantiefristen und zuletzt gespeicherte Dokumente.
7. Schnellaktionen.

## 8.3 Archiv-Score

Der Archiv-Score ist eine verständliche Zusammenfassung realer Vollständigkeitsdaten.

Er darf nur eine bestehende, nachvollziehbare Completeness-Logik verwenden. Er wird dargestellt mit:

- radialem SVG-Ring oder vergleichbarer klarer Visualisierung,
- Prozentwert,
- erklärendem Satz,
- konkreter nächster Handlung.

Beispiel:

> „Dein Archiv ist zu 68 % vollständig. Drei Produkte benötigen noch wichtige Angaben.“

Nicht:

> „Health Score 68“

## 8.4 Wochenserie oder Aktivitätsstreak

Eine Woche zählt nur bei einer echten organisatorischen Handlung, etwa:

- Produkt erstellt,
- Dokument gespeichert,
- Produktdaten sinnvoll ergänzt,
- Erinnerung erledigt.

Der Streak ist unterstützend, nicht zwingend. Keine Flammen-Gaming-Optik. Kein roter Verlustzustand.

Beispiele:

- „4 Wochen in Folge organisiert“
- „Diese Woche bereits aktiv“
- „In dieser Woche noch keine Ergänzung“

Wenn verlässliche Daten fehlen, wird kein Fake-Streak angezeigt.

## 8.5 Aktivitätsgraph

Ein echter Aktivitätsgraph kann zeigen:

- gespeicherte Produkte,
- gespeicherte Dokumente,
- ergänzte Angaben,
- erledigte Erinnerungen.

Bevorzugt wird zunächst eine verständliche aggregierte Serie „Organisierte Einträge“ mit optionaler Aufteilung.

Regeln:

- höchstens ein großer primärer Graph,
- klare Zeitachse,
- wenige Grid-Linien,
- verständliche Tooltips,
- textuelle Zusammenfassung,
- hochwertiger Empty State,
- mobile Vereinfachung.

## 8.6 Garantie-Timeline

Die Garantieübersicht priorisiert reale bevorstehende Fristen:

- Produkt,
- Datum,
- verbleibende Zeit,
- Status,
- Link zur Produktakte.

Unbekannte Garantie ist ein neutraler Zustand. Sie wird nicht als Fehler dargestellt.

## 8.7 „Als Nächstes“

Maximal drei priorisierte Aufgaben. Jede Aufgabe enthält:

- passendes Icon,
- konkretes Produkt,
- genau eine Aufgabe,
- kurzen Nutzen,
- klare Aktion.

Nicht zehn rote Zeilen mit fehlenden Feldern.

## 8.8 Produktbereich

Produkte werden als visuelle Gegenstände präsentiert, nicht als Tabellenkarten.

Bei vier Produkten soll das Layout bewusst komponiert werden. Eine einzelne vierte Card in einer leeren neuen Reihe ist nur akzeptabel, wenn die Gesamtkomposition trotzdem balanciert wirkt. Alternativ sind größere Featured-Objekte, asymmetrische Grids oder horizontale Archivdarstellungen möglich.

## 8.9 Mobile Dashboard-Reihenfolge

1. Begrüßung,
2. Hauptaktion,
3. Archiv-Score,
4. Als Nächstes,
5. Aktivitätsgraph,
6. Produkte,
7. Garantie,
8. Dokumente,
9. Schnellaktionen.

Keine geschrumpften Desktop-Diagramme und keine winzigen Legenden.

---

# 9. Produktarchiv und Produktdetail

## 9.1 Produktarchiv

Das Archiv vermittelt Besitz und Orientierung.

Es bietet:

- starke Suche,
- sinnvolle Filter,
- visuelle Produktobjekte,
- klare Statusinformationen,
- flexible Darstellung abhängig von Datenmenge.

Eine Liste darf verwendet werden, wenn sie für große Bestände sinnvoller ist. Sie darf aber nicht wie eine technische Tabelle aussehen.

## 9.2 Produktdetail

Die Produktdetailseite ist das Herz von Avareno.

Priorität:

1. Produktidentität,
2. wichtigste Kauf- und Garantieinformationen,
3. Dokumente,
4. Seriennummer und Identifikationsdaten,
5. Erinnerungen,
6. Notizen,
7. ergänzbare Angaben.

Die Seite verwendet Weißraum, Abschnittshierarchie und klare visuelle Anker statt Card-in-Card-in-Card.

## 9.3 Produktbild oder Placeholder

Wenn kein Bild vorhanden ist, wird ein hochwertiger kategoriespezifischer Placeholder verwendet. Er ist groß genug, um visuelle Identität zu tragen.

Mögliche Icon-Kategorien:

- Coffee,
- WashingMachine,
- Tv,
- Monitor,
- Laptop,
- Drill,
- Wrench,
- Camera,
- Headphones,
- Package.

Keine falschen oder austauschbaren Symbole.

---

# 10. Dokumentenarchiv

Das Dokumentenarchiv ist kein Dateisystem. Es ist eine organisierte Sicht auf Unterlagen im Kontext realer Produkte.

Es priorisiert:

- Dokumenttyp,
- Produktzuordnung,
- Datum,
- Suchbarkeit,
- verständliche Hauptaktion.

Die Dateiendung ist Metadatum, nicht Hauptidentität. Ein PDF-Name allein erzählt keine Geschichte.

Gute Darstellung:

> Rechnung  
> mediamarkt-lg-oled-receipt.pdf  
> Gehört zu: LG OLED C3 Wohnzimmer · 12.04.2024 · 1,8 MB

---

# 11. Erfassung und Onboarding

## 11.1 Ziel

Der Nutzer erreicht innerhalb weniger Minuten den ersten realen Erfolg.

## 11.2 Produkterfassung

- höchstens notwendige Pflichtangaben,
- manuelle Erfassung immer funktionsfähig,
- optionale Angaben ruhig gruppiert,
- klare Speicherung,
- kein Fake-AI-Ergebnis,
- Datenverlust bei Fehlern verhindern.

## 11.3 Erfolg

Nach dem Speichern zeigt Avareno:

- das echte neue Produkt,
- den unmittelbaren Nutzen,
- eine klare nächste Handlung,
- keine fünf gleich starken Optionen.

## 11.4 Onboarding

Kein Carousel, keine Modulführung, keine Interessenabfrage. Avareno erklärt sich durch den ersten Erfolg.

---

# 12. Einstellungen und Authentifizierung

## 12.1 Einstellungen

Settings dürfen nicht wie riesige weiße Container mit kleinen Zeilen im Inneren wirken.

Sie brauchen:

- klare Navigation oder Abschnittshierarchie,
- kompakte, nachvollziehbare Gruppen,
- angemessene Content-Breite,
- verständliche Beschreibungen,
- visuell klare Controls,
- weniger ungenutzten Raum.

Die Hauptüberschrift darf stark sein, aber nicht einen Großteil des Screens ohne funktionalen Mehrwert beanspruchen.

## 12.2 Auth

Login, Einladung, Passwort-Reset und Bestätigung sind Markenmomente. Sie sollen Avarenos Ruhe und Klarheit tragen, ohne vom eigentlichen Auth-Zweck abzulenken.

Keine generischen Framework-Seiten.

---

# 13. Landingpage und Marketing

## 13.1 Aufgabe

Die Landingpage muss in wenigen Sekunden erklären:

1. Es geht um reale Produkte.
2. Die zugehörigen Informationen sind verstreut.
3. Avareno verbindet sie zu einer Produktakte.
4. Der Zugang entspricht dem tatsächlichen Beta-Modell.

## 13.2 Erzählstruktur

1. Navigation,
2. Hero,
3. Problem,
4. Transformation,
5. So funktioniert es,
6. echte Produktakte,
7. Dokumente und Garantie,
8. Anwendungsfälle,
9. Vertrauen,
10. Beta/Preise,
11. FAQ,
12. Abschluss-CTA,
13. Footer.

## 13.3 Hero

Der Hero enthält:

- klare Headline,
- konkrete Unterzeile,
- korrekten Beta-CTA,
- physisches Produkt,
- verstreute Dokumente,
- zentrale Produktakte.

Die räumliche Szene muss den Nutzen erklären. Dekorative 3D-Objekte ohne Zusammenhang sind verboten.

## 13.4 Conversion

CTA-Wortlaut muss zum realen Produktzustand passen. Invite-only bedeutet nicht „sofort kostenlos registrieren“, wenn technisch nur Einladungen möglich sind.

---

# 14. Motion: Organisation in Bewegung

## 14.1 Motion-Signatur

Avarenos Bewegung erzählt:

> **Einzelne Elemente finden ruhig ihren richtigen Platz.**

Das gilt für:

- Hero-Transformation,
- Dokumentzuordnung,
- Produkt gespeichert,
- Aufgaben erledigt,
- Filterergebnisse,
- Leerstzustände, die gefüllt werden.

## 14.2 Erlaubte Bewegung

- sanftes Einordnen,
- kontrollierte Konvergenz,
- langsames Schweben,
- minimale Tiefenverschiebung,
- kurze Zustandsübergänge,
- dezentes Zeichnen eines Graphen.

## 14.3 Verbotene Bewegung

- aggressive Parallaxe,
- starke Mausverfolgung,
- Bounce,
- schnelle Rotation,
- Cursor-Trails,
- Partikelhintergründe,
- Konfetti,
- permanente Renderloops ohne Nutzen,
- Animationen, die Interaktion verzögern.

## 14.4 Dauern

Orientierung:

- Microinteraction: 120–220 ms,
- Komponentenwechsel: 220–400 ms,
- Section Reveal: 500–900 ms,
- Story-Animation: länger und scrollgebunden,
- kontinuierliche Bewegung: sehr langsam.

## 14.5 Reduced Motion

Bei `prefers-reduced-motion`:

- keine kontinuierliche Bewegung,
- keine scrollgebundene Konvergenz,
- keine Parallaxe,
- alle Inhalte sofort sichtbar,
- keine Information geht verloren.

---

# 15. Datenvisualisierung

## 15.1 Zweck

Ein Diagramm muss eine konkrete Frage beantworten.

Beispiele:

- Wie entwickelt sich mein Archiv?
- Welche Garantie endet als Nächstes?
- Wie vollständig sind meine Produktakten?
- Was habe ich in den letzten Wochen organisiert?

## 15.2 Regeln

- höchstens wenige primäre Visualisierungen pro Screen,
- echte Daten,
- klare Einheit,
- verständlicher Titel,
- textuelle Zusammenfassung,
- zugängliche Tooltips,
- keine 3D-Charts,
- keine Regenbogenpalette,
- keine dekorativen Donuts ohne Informationswert.

## 15.3 Empty States

Keine leeren Achsen. Stattdessen:

> „Deine Aktivität erscheint hier, sobald du Produkte oder Dokumente ergänzt.“

## 15.4 Mobile

- weniger Achsenlabels,
- keine feste Mindestbreite,
- vereinfachte Legende,
- touchfähige Datenpunkte,
- textuelle Zusammenfassung bleibt sichtbar.

---

# 16. Icons und Illustrationen

## 16.1 Icon-System

- eine Familie, bevorzugt die bereits verwendete konsistente Outline-Bibliothek,
- gleiche Stroke Width,
- feste Größen,
- optisch korrekte Ausrichtung,
- keine Mischung aus Emoji, 3D, Filled und Outline.

Orientierung:

- Navigation: 18–20 px,
- Buttons: 16–20 px,
- Summary: 20–24 px,
- Produkt-Placeholder: 32–48 px,
- Empty State: größer und illustrativer.

## 16.2 Illustration

Avareno verwendet markenfreie Alltagsprodukte, matte Materialien, klare Konturen und Mantis nur als kleinen Akzent.

Keine generischen Stockbilder, keine Markenprodukte, keine zufälligen KI-Stile.

---

# 17. Sprache und Tone of Voice

## 17.1 Avareno spricht

- klar,
- ruhig,
- direkt,
- freundlich,
- sachlich,
- ohne Übertreibung.

## 17.2 Bevorzugte Begriffe

- Produkt hinzufügen
- Produktakte
- Dokument speichern
- Rechnung hinzufügen
- Garantie ergänzen
- Anleitung hinterlegen
- Produktakte öffnen
- Angaben fehlen
- Noch nicht angegeben
- Als Nächstes

## 17.3 Zu vermeiden

- Asset
- Record
- Node
- Memory Graph
- Workflow starten
- Punkte offen
- Health Score
- revolutionär
- magisch
- Gamechanger
- KI-gestützt, wenn die Funktion nicht aktiv ist

## 17.4 Fehlermeldungen

Fehlermeldungen erklären:

1. was passiert ist,
2. ob Daten erhalten blieben,
3. was der Nutzer tun kann.

Keine technischen Rohfehler.

---

# 18. Accessibility, Privatsphäre und Vertrauen

## 18.1 Accessibility ist Designqualität

Jeder zentrale Flow muss funktionieren mit:

- Tastatur,
- sichtbaren Fokuszuständen,
- Screenreader,
- 200-%-Zoom,
- vergrößerter Schrift,
- Reduced Motion,
- ausreichendem Kontrast.

Status darf nie nur über Farbe vermittelt werden.

## 18.2 Privatsphäre

Design darf keine Funktionen versprechen, die technisch nicht bestätigt sind.

Verbotene Aussagen ohne Beweis:

- Ende-zu-Ende verschlüsselt,
- niemand außer dir,
- vollständig anonym,
- garantiert DSGVO-konform,
- militärische Verschlüsselung.

## 18.3 Keine Security-Regression durch Design

UI-Arbeit darf nicht verändern:

- RLS,
- Storage-Policies,
- Authentifizierung,
- Autorisierung,
- Upload-Validierung,
- Account-Löschung,
- Invite-only-Konfiguration,
- API-Sicherheitsgrenzen.

---

# 19. Performance

Premium fühlt sich schnell an.

Anforderungen:

- keine unnötigen schweren Abhängigkeiten,
- Lazy Loading unterhalb des kritischen Pfads,
- feste Assetgrößen gegen Layout Shift,
- keine permanente Animation außerhalb des Viewports,
- keine unnötigen Re-Renders,
- optimierte SVGs,
- keine WebGL-Abhängigkeit für dekorative Effekte,
- mobile Performance als reale Zielgröße.

Nicht gemessene Werte werden als nicht gemessen dokumentiert.

---

# 20. Anti-Patterns: Was nie wieder akzeptiert wird

## 20.1 „Basic Table in a Card“

Symptome:

- drei horizontale Linien,
- links Labels, rechts Werte,
- runde Außenkante,
- winziges Icon,
- keine visuelle Produktidentität.

Das ist keine moderne Produktkarte. Es ist eine Tabelle mit Radius.

## 20.2 Beige-in-Beige

- Cream-Hintergrund,
- Cream-Card,
- Cream-Input,
- schwacher Border,
- grauer Text.

Ergebnis: unlesbar, papierartig und flach.

## 20.3 Unkommentierte Zahlen

Nicht erlaubt:

- „0 %“ neben dem Produktnamen,
- „8 Punkte offen“,
- „Aufmerksamkeit 4“,
- Zahlen ohne Einheit oder Bedeutung.

## 20.4 Mini-Icons

Winzige generische Icons sind kein visuelles System. Wichtige Objekte brauchen erkennbare Icons oder Illustrationen.

## 20.5 Alles ist eine Warnung

Normale fehlende Angaben dürfen nicht mit roten Balken, roten Badges und Fehleroptik dargestellt werden.

## 20.6 Leere große Flächen

Eine kleine Inhaltskarte in einem riesigen Container ist kein Luxus. Layoutbreite und Komposition müssen absichtlich sein.

## 20.7 Tiny Uppercase Everywhere

Uppercase-Labels sind nur echte Abschnittsmarker, nicht die Standardmethode für Hierarchie.

## 20.8 Card-in-Card-in-Card

Jede zusätzliche Ebene muss begründet sein. Sonst werden Grenzen entfernt und Inhalte über Raum und Typografie gegliedert.

## 20.9 „Mehr Daten = mehr Karten“

Daten werden priorisiert, gruppiert und in eine Geschichte übersetzt. Nicht jede vorhandene Zahl verdient eine Kachel.

## 20.10 Dekorative Gamification

Streaks und Scores müssen real, verständlich und druckfrei sein. Keine künstlichen Belohnungen.

---

# 21. Arbeitsweise für Designer und Agenten

## 21.1 Vor jedem Design-Pass

1. `git status` prüfen.
2. vorhandene fremde Änderungen respektieren.
3. relevante Screens im Browser ansehen.
4. reale Datenquellen prüfen.
5. Nutzeraufgabe und Hauptgeschichte definieren.
6. vorhandene UI-Pro-/Design-Skills lesen, falls verfügbar.
7. erst danach planen.

## 21.2 UI Pro Max

Falls im Arbeitskontext ein Skill mit Namen wie `ui-pro-max`, `ui-ux-pro-max` oder vergleichbar verfügbar ist:

- vor der Planung vollständig lesen,
- als ergänzende Fachreferenz verwenden,
- dieses Manifest bleibt die Avareno-spezifische Quelle der Wahrheit,
- keine generischen Skill-Empfehlungen übernehmen, die den Avareno-Prinzipien widersprechen.

Wenn kein Skill vorhanden ist, wird dies dokumentiert und die Arbeit mit diesem Manifest fortgesetzt.

## 21.3 Iterationspflicht

Ein Screen wird nicht nach der ersten Implementierung abgenommen.

Mindestens:

1. erster Browserzustand,
2. kritische visuelle Analyse,
3. gezielte zweite Iteration,
4. Responsive- und Accessibility-Prüfung,
5. finaler Screenshotvergleich.

## 21.4 Reale Browserprüfung

Codeanalyse ersetzt keine visuelle Prüfung.

Mindestens Chromium, nach Möglichkeit Firefox und WebKit. Relevante Desktop-, Tablet- und Mobile-Viewports werden geprüft.

## 21.5 Keine globalen Kollateralschäden

- kein globales CSS-Reformatting,
- keine neuen Override-Schichten,
- keine fremden Änderungen zurücksetzen,
- kein Commit oder Push ohne ausdrückliche Anweisung,
- `git diff --check` am Ende.

---

# 22. Qualitätsgates

Eine Oberfläche ist erst fertig, wenn alle folgenden Fragen mit „Ja“ beantwortet werden:

## Produkt

- Erzählt der Screen genau eine Hauptgeschichte?
- Verwendet er reale Daten und reale Funktionen?
- Ist die wichtigste nächste Handlung klar?
- Wurde Unnötiges entfernt?

## Visuell

- Ist die Hierarchie innerhalb von fünf Sekunden verständlich?
- Wirkt der Screen wie ein Consumer-Produkt statt wie ein Admin-Panel?
- Sind Objekte als persönliche Gegenstände erkennbar?
- Sind Icons sichtbar und passend?
- Sind Flächen und Ebenen klar getrennt?
- Wird Mantis gezielt eingesetzt?
- Ist die Komposition auf großen Screens balanciert?

## Inhalt

- Sind Begriffe natürlich und verständlich?
- Gibt es keine unkommentierten Prozentwerte oder Punkte?
- Sind Zustände neutral, positiv oder kritisch korrekt unterschieden?

## Interaktion

- Funktioniert Tastaturbedienung?
- Sind Fokuszustände sichtbar?
- Sind Touchziele ausreichend groß?
- Bleiben Inhalte bei Fehlern erhalten?
- Respektiert Motion die Reduced-Motion-Einstellung?

## Technik

- Typechecks grün?
- Produktions-Build grün?
- relevante QA-Suites grün?
- keine Konsolenfehler?
- kein Security- oder Backend-Regressionsrisiko?
- `git diff --check` grün?

---

# 23. Verbindliche Review-Checkliste pro Screen

Vor Abnahme wird dokumentiert:

1. **Nutzerfrage:** Welche Frage beantwortet dieser Screen?
2. **Hauptaktion:** Was ist der wichtigste nächste Schritt?
3. **Entfernt:** Was wurde bewusst nicht gezeigt?
4. **Objekte:** Welche Elemente fühlen sich wie reale Gegenstände an?
5. **Daten:** Welche Kennzahlen sind real und wie werden sie berechnet?
6. **Empty State:** Was sieht ein neuer Nutzer?
7. **Mobile:** Welche Reihenfolge gilt mobil?
8. **Reduced Motion:** Welche statische Alternative existiert?
9. **Accessibility:** Welche Tastatur- und Screenreaderprüfung wurde ausgeführt?
10. **Visual QA:** Welche Screenshots und Browser wurden geprüft?
11. **Regression:** Welche Produkt- und Security-Flows blieben unverändert?
12. **Schwächstes Element:** Welches Element war zuletzt noch nicht gut genug und wie wurde es verbessert?

---

# 24. Beispiel-Blueprints

## 24.1 Dashboard Desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ Guten Morgen, Stefan                       + Produkt hinzufügen│
│ Dein Produktarchiv wird immer vollständiger.                  │
└──────────────────────────────────────────────────────────────┘

┌───────────────────┐ ┌──────────────────┐ ┌───────────────────┐
│ Archiv vollständig│ │ 4 Wochen in Folge│ │ Nächste Garantie │
│ 68 % · Ring       │ │ ruhig organisiert│ │ in 42 Tagen      │
└───────────────────┘ └──────────────────┘ └───────────────────┘

┌─────────────────────────────────────┐ ┌──────────────────────┐
│ Aktivität · letzte 30 Tage          │ │ Als Nächstes        │
│ echte Zeitreihe + Zusammenfassung   │ │ max. 3 Aufgaben     │
└─────────────────────────────────────┘ └──────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Deine Produkte · visuelle Objekte                            │
└──────────────────────────────────────────────────────────────┘

┌────────────────────────────────┐ ┌───────────────────────────┐
│ Garantie-Timeline             │ │ Zuletzt gespeichert      │
└────────────────────────────────┘ └───────────────────────────┘
```

## 24.2 Produktobjekt

```text
┌──────────────────────────────────────┐
│ [großer visueller Placeholder]       │
│ Kaffeemaschine Küche                 │
│ Aroma Uno · Küche                    │
│                                      │
│ 3 Angaben fehlen                     │
│ Rechnung noch nicht hinterlegt       │
│                                      │
│ Produktakte öffnen               →   │
└──────────────────────────────────────┘
```

Keine Mini-Tabelle und keine ungeklärten Prozentwerte.

## 24.3 Settings

```text
Account & Sicherheit
Kurze Beschreibung

[kompakte Navigation oder Abschnittsanker]

Profil
Name, E-Mail, Status                         [Bearbeiten]

Sprache & Darstellung
Deutsch                                      [Ändern]
System / Hell / Dunkel                       [Segmented Control]

Privatsphäre
Daten exportieren                            [Export anfordern]
Account löschen                              [Gefahrenbereich]
```

Keine riesigen leeren Container mit kleinen Zeilen.

---

# 25. Definition of Done für das gesamte Avareno-Design

Avarenos Designsystem gilt als reif, wenn:

1. die Marke auch ohne Logo erkennbar ist,
2. Soft White + Mantis + Graphite konsistent eingesetzt wird,
3. kein zentraler Screen wie ein Admin-Panel oder CRUD-Interface wirkt,
4. Produkte als persönliche Gegenstände wahrgenommen werden,
5. Dashboard-Graphen und Streaks reale Daten erklären,
6. Tabellen nur dort verwendet werden, wo echte Tabellen sinnvoll sind,
7. große Screens sinnvoll komponiert sind,
8. Mobile eigenständig gestaltet ist,
9. Motion Organisation statt Show vermittelt,
10. Reduced Motion vollständig funktioniert,
11. Accessibility Teil der visuellen Qualität ist,
12. Marketing und App dieselbe Marke sprechen,
13. Designänderungen keine Security- oder Produktlogik gefährden,
14. jede zentrale Oberfläche reale Browser-QA bestanden hat,
15. nach Abschluss nicht reflexartig erneut redesigniert wird.

---

# 26. Schlussmanifest

Avareno wird nicht dadurch zur Marke, dass jede Oberfläche mehr Effekte erhält.

Avareno wird zur Marke, wenn jede Entscheidung dieselbe Haltung vermittelt:

- Dinge verdienen einen verlässlichen Platz.
- Klarheit ist wertvoller als Menge.
- Fortschritt darf motivieren, aber niemals belasten.
- Persönlicher Besitz soll sich persönlich anfühlen.
- Gute Software erklärt sich durch ihre Form.
- Ruhe ist kein Mangel an Gestaltung. Ruhe ist das Ergebnis präziser Gestaltung.

> **Every pixel has to earn the right to exist.**

> **Do not optimize mediocrity. Replace it.**

> **Pretend Avareno is the only product you will ever build. Design accordingly.**

