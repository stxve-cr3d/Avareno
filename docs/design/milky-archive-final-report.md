# Avareno Milky Archive — finaler Design- und QA-Bericht

Stand: 18. Juli 2026

## A. Ausgangsanalyse

| Bereich | Vorheriger Zustand | Hauptproblem | Finale Richtung | Umsetzung |
| --- | --- | --- | --- | --- |
| Landingpage | dunkle, teilweise räumliche Produktwelt | Produktgeschichte unvollständig; Dokumente, Fristen, Vertrauen, Beta und FAQ nicht als geschlossene Story | warmes persönliches Produktarchiv | vollständige Informationsarchitektur vom Alltagsproblem bis zum Beta-CTA |
| Hero / SpatialHero | dunkler Prototyp mit verstreuten Elementen | Nutzen und Transformation waren nicht in jedem Scrollzustand klar; mobile Komposition zu komplex | reales Produkt → geordnete digitale Produktakte | eigene SVG-Espressomaschine, fünf Dokument-Chips, Produktakte, sichtbare Zuordnung und scrollgebundene Konvergenz |
| Navigation / Footer | uneinheitliche Marketingnavigation und unvollständige Zielstruktur | zu wenig Orientierung und fehlende rechtliche Zielseite | kompakt, milky, transparent und eindeutig | sechs Anker, Login, Invite-CTA, mobile Navigation, vollständiger Footer ohne Platzhalterlinks |
| Pricing / Beta | Preiskarten wirkten verbindlicher als der aktuelle Produktstand | nicht passend zur kostenlosen Invite-only-Beta | ein ehrlicher Beta-Block | keine Tarife oder künstlichen Rabatte; keine Zahlungsdaten im Beta-Flow |
| FAQ | kurzer, unvollständiger Fragenblock | zentrale Einwände fehlten | neun echte Beta-, Produkt- und Privacy-Fragen | kontrolliertes, tastaturbedienbares Accordion |
| App-Shell | Dark Theme als Standard, grünlich-kühle Light-Variante | öffentliche Marke und App wirkten getrennt | Milky Light als Standard, bestehendes Dark Theme als Regression | semantische Tokens, warme Flächen, Mantis-Aktivzustände, fünf primäre Navigationsziele |
| Dashboard / Produkte | vorhandene funktionale Ansichten | Light Theme war nicht durchgängig markenkonsistent | ruhiges persönliches Archiv | Milky-Grund, weiße Hauptflächen, Mantis nur für primäre Aktionen und Status |
| Dokumentenarchiv | vier Kennzahlen, keine direkte Archivsuche, alte helle Textfarben | Admin-/Report-Eindruck und Light-Kontrastfehler | modernes, durchsuchbares Archiv | drei Kennzahlen, lokale Suche, Dateityp, Produkt, Datum, Größe und Verknüpfungsstatus |
| Auth / Onboarding / Einstellungen | funktional, aber visuell vom Marketing getrennt | alte Oberflächen- und Textfarben | dieselbe Milky-Marke wie Landingpage und App | Light als Standard, einheitliche Inputs, Fokus, Buttons, Panels und Theme-Regler |
| CSS / Motion | große historische `styles.css`, mehrere ältere visuelle Phasen | direkte Hexwerte und kaskadierende Altregeln erschweren Wartung | semantische Tokens plus isolierte Marketingkomponenten | neue `ma-*`-Komponentenklasse; gezielte Korrektur bestehender App-Tokens statt globaler Reformatierung |
| QA | vorhandene Landing- und Onboarding-Skripte | neue Zustände und Browsermatrix nicht abgedeckt | reproduzierbare visuelle Regression | 51 Landing-, 37 Onboarding- und 24 App-Checks plus 31 kanonische Screenshots |

Es wurden keine Motion-, Canvas-, WebGL- oder 3D-Abhängigkeiten ergänzt. Die bestehende Schriftfamilie und Lucide-Icons bleiben erhalten.

## B. Neue Markenidentität

### Farbe

- Basis: `#fffdf1`
- Surface: `#f7f4e8`
- Panel: `#ffffff`
- Elevated: `#fbfaf5`
- Strong surface: `#eff0e8`
- Graphit: `#1f2421`
- Sekundärtext: `#626c67`
- zugänglicher Metatext: `#6b746f`
- Mantis: `#59c749`
- Mantis Hover / Active: `#4fba42` / `#43a938`
- Mantis Strong: `#347f2d`
- Mantis Soft: `#e9f7e5`
- Warnung / Fehler / Info: Amber, Rot und Blau bleiben semantisch getrennt.

`#59c749` bleibt Marken- und Aktionsfarbe. Für kleinen Text und kleine Icons wird `#347f2d` verwendet. Der ursprünglich hellere Muted-Ton wurde für kleine Metadaten auf `#6b746f` verdunkelt.

### Typografie und Layout

- Bestehende Helvetica-/SF-/Aptos-/Systemschrift bleibt erhalten; keine zusätzliche Font-Anfrage.
- Display- und Abschnittsüberschriften verwenden responsive `clamp()`-Skalen.
- Fließtext bleibt auf lesbare Zeilenbreiten begrenzt.
- Großbuchstaben werden nur für kurze Section Labels und Metadaten verwendet.
- Zentraler Inhaltsbereich: maximal etwa 1180–1360 px je nach Marketing- oder App-Kontext.
- Radius: überwiegend 0,7–1,25 rem; kleine Controls kompakter.
- Schatten: warm, weich, niedrig kontrastiert; kein Neon oder starkes Glassmorphism.
- Icons: weiterhin Lucide; eigene SVG-Produktillustration ohne Marken- oder Stockasset.

### Motion

- Microinteractions: 140–220 ms.
- Komponentenwechsel und Accordion: etwa 220–400 ms.
- Section-Reveals: 500–900 ms.
- Hero-Chips: langsame 8-s-Dauerbewegung.
- Gemeinsames Easing: kontrollierte kubische Kurve über Token.
- Scrollfortschritt wird mit gedrosseltem `requestAnimationFrame` aktualisiert.
- Bewegung pausiert außerhalb des Viewports und bei verstecktem Tab.

## C. Landingpage

| Abschnitt | Ziel und Umsetzung | Motion | Responsive Verhalten |
| --- | --- | --- | --- |
| Navigation | Logo, sechs Inhaltsziele, Sprachwechsel, Login und Invite-CTA | subtiler Hintergrund- und Borderwechsel beim Scrollen | fokussiertes 44-px-Menü; kein Desktop-Linkstau |
| Hero | Produktnutzen in Headline, Unterzeile, zwei CTAs und ehrlichem Beta-Hinweis | Produkt zuerst, Chips versetzt, Produktakte danach; Scrollkonvergenz | Text und CTA zuerst; statische vereinfachte Produktwelt ohne Pinning |
| Problem | sechs reale Fundorte für Produktinformationen | ruhige räumliche Unordnung und Reveals | lineare, scanbare Folge statt verkleinerter Desktopkomposition |
| Transformation | vier nachvollziehbare Schritte neben einer vollständigen Produktakte | geordnete Progression statt Autoplay-Demo | Schritte und Akte werden vertikal gestapelt |
| So funktioniert es | drei kleine Micro-Scenes für Produkt, Dokumente und Suche | sanfte Reveal- und Hoverreaktion | eine Story pro Zeile |
| Produktakte | realistische Avareno-Struktur mit Produkt-, Kauf-, Garantie-, Dokument- und Erinnerungsdaten | fokussierte Marker, keine Fake-Statistik | App-Fenster bleibt horizontal sicher und wird vereinfacht |
| Dokumente | gestaffelte Rechnung-, Garantie-, Anleitung- und Sonstige-Dokumente | subtile Papierwirkung ohne wilde Rotation | Karten werden flacher und leichter scanbar |
| Garantie | aktive, bald endende, unbekannte und eigene Frist; ehrliche manuelle Ergänzung | Statuslinien und ruhige Reveals | Karten untereinander; Status nicht nur über Farbe |
| Anwendungsfälle | Reparatur, Umzug, Versicherung und Alltag | minimale Pfeilbewegung auf Hover | klar getrennte Zeilen |
| Vertrauen | bestätigte Aussagen zu privatem Zugriff, Konto, Export/Löschung und deaktivierter Analyse | keine Cyber-Inszenierung | kompakte, lesbare Zweier- bzw. Einerstruktur |
| Beta | ein kostenloser Invite-only-Block ohne Preiskarten | CTA-Hover ohne aggressive Skalierung | CTA unter dem Text |
| FAQ | neun echte Einwände mit nativen Buttons und ARIA | animierte Höhe; Reduced Motion ohne Übergang | volle Breite und große Touchflächen |
| Abschluss / Footer | letzte Produktakte, ein CTA und vollständige Produkt-, Zugangs- und Rechtsnavigation | ruhiger Abschluss ohne neue Showeffekte | Footergruppen werden gestapelt |

## D. Anwendung

- **App-Shell:** Light ist Standard. Basis und Topbar nutzen Milky, Hauptflächen Weiß, aktive Navigation Mantis Soft mit Mantis Strong. Die primäre Navigation ist auf Zuhause, Dinge, Dokumente, Care und Profil begrenzt.
- **Dashboard:** maximal drei Übersichtswerte, ein klarer Produkt-CTA, Produkt-, Dokument- und fehlende-Angaben-Vorschau. Amber und Rot behalten ihre Bedeutung.
- **Produktliste:** klare Suche, Status- und Kategorienfilter, ruhige Produktkarte, Garantie- und Dokumentkontext, ein sekundärer Aktionsbereich.
- **Produktdetail:** starker Produktkopf, Kaufdaten, Garantie, Dokumente, Seriennummer, Erinnerungen, Notizen, fehlende Angaben und Aktivität bleiben in der bestehenden Detailroute. Primäre Aktionen sind Mantis; Inhalte wurden nicht erfunden.
- **Dokumentenarchiv:** drei Übersichtswerte, clientseitige Suche nur über bereits geladene Dateinamen, Dokumenttypen und Produktnamen; Datum, Dateigröße und Zuordnung sind sichtbar. Die Suchanfrage wird weder gespeichert noch geloggt.
- **Produk­terfassung / Onboarding / Auth:** warme Inputs, sichtbarer Fokus, klare Fehlermeldungen, Mantis-Primäraktion und unveränderte Abläufe.
- **Einstellungen:** Sprache, Theme, Profil, Provider und Kontoaktionen bleiben funktional; alte Weiß-auf-Weiß-Kontraste wurden entfernt.
- **Mobile:** kompakte Iconnavigation, frühe Hauptaktion, keine horizontale Überbreite. Bei 390 × 844 zeigt das Dashboard Inhalt statt große Leerflächen.
- **Dark Theme:** funktional erhalten; semantische Tokens verhindern Light-Hardcodes in den angepassten Komponenten.

## E. Accessibility

- genau eine `h1` auf der Landingpage; folgende Abschnitte nutzen `h2`/`h3` hierarchisch;
- Header, Navigation, Main und Footer bleiben als Landmarks erhalten;
- mobile Navigation und FAQ besitzen `aria-expanded` und benannte Controls;
- die dekorative Hero-Bühne ist `aria-hidden`; eine textliche Zusammenfassung erklärt Produkt, Dokumente und Produktakte;
- Pause-Control ist per Tastatur erreichbar, besitzt sichtbaren Fokus und korrektes `aria-pressed`;
- alle relevanten Controls besitzen mindestens etwa 44 px Touchhöhe;
- Mantis wird nicht allein zur Statusvermittlung verwendet;
- 200-%-Texttest auf dem App-Dashboard bei 720 px: kein horizontaler Overflow;
- Live-Wechsel von Reduced Motion stoppt Dauerbewegung und Scrollkonvergenz; alle Inhalte bleiben sichtbar;
- gemessene Kontraste auf Milky: Graphit 15,44:1, Sekundärtext 5,33:1, Mantis-Buttontext 7,71:1, Mantis Strong 4,88:1, Metatext 4,73:1.

## F. Performance

Messung gegen lokalen Produktions-Build in Chromium, 1440 × 900:

| Wert | Ergebnis |
| --- | --- |
| LCP | 276 ms |
| CLS | 0,0000 |
| Long Tasks | 0 |
| TBT-Näherung | 0 ms |
| Initiale Requests | 19 |
| Initiales JavaScript | 346,85 kB roh / 109,03 kB gzip |
| CSS | 565,21 kB roh / 92,13 kB gzip |
| Home-Chunk | 33,47 kB roh / 10,45 kB gzip |

INP wurde nicht belastbar gemessen; dafür wäre eine echte Interaktions- bzw. Feldmessung erforderlich. Es gibt keinen WebGL-Pfad und keine neue schwere Abhängigkeit. Unterhalb des Einstiegs bleiben Routen code-gesplittet. Die räumliche Szene nutzt SVG, CSS, IntersectionObserver und eine nur bei Scrollereignissen geplante `requestAnimationFrame`-Aktualisierung.

## G. Browser-QA

- Chromium: vollständige 51-Check-Landing-Suite, App- und Onboarding-Suite.
- Firefox: Hero, Navigation, Overflow und Scrollkonvergenz bestanden.
- WebKit: Hero, Navigation, Overflow und Scrollkonvergenz bestanden.
- Desktop: 1280 × 720, 1440 × 900, 1920 × 1080.
- Tablet: 768 × 1024, 1024 × 768.
- Mobile: 320 × 568, 375 × 812, 390 × 844, 430 × 932.
- Zusätzlich: Resize, Zurückscrollen, Anchor Clearance, Landscape-Wechsel, Fokus, DE/EN, Reduced Motion, Dark Theme und Browserkonsole.

Gefundene und korrigierte Fehler:

1. Dokument-Chip berührte im Dauerbewegungszustand die Produktakte.
2. Mobile-Menü-QA verwendete einen veralteten Selektor.
3. Dokumentarchiv enthielt Weiß-auf-Weiß-Texte aus einer alten Dark-Theme-Regel.
4. Provider-Bezeichnungen in den Einstellungen übernahmen eine alte weiße Textfarbe.
5. ursprünglicher kleiner Metatext erreichte auf Milky nur 4,16:1.

## H. Screenshots

Kanonische Screenshots in `docs/design/qa-milky-archive-final/`:

1. `01-navigation-top.png`
2. `02-navigation-scrolled.png`
3. `03-hero-start.png`
4. `04-hero-transform.png`
5. `05-hero-end.png`
6. `06-problem.png`
7. `07-transformation.png`
8. `08-three-steps.png`
9. `09-product-record.png`
10. `10-documents.png`
11. `11-warranty.png`
12. `12-use-cases.png`
13. `13-trust.png`
14. `14-beta-pricing.png`
15. `15-faq.png`
16. `16-final-cta.png`
17. `17-footer.png`
18. `18-mobile-hero.png`
19. `19-mobile-navigation.png`
20. `20-reduced-motion.png`
21. `21-login.png`
22. `22-onboarding.png`
23. `23-dashboard-desktop.png`
24. `24-dashboard-mobile.png`
25. `25-product-list.png`
26. `26-product-detail.png`
27. `27-document-archive.png`
28. `28-product-capture.png`
29. `29-settings.png`
30. `30-dialog.png`
31. `31-dark-theme-regression.png`

Zusätzliche Viewport-, Firefox-, WebKit-, Sprachwechsel- und responsive Flow-Screenshots liegen im selben Ordner. Vorherige Design-Screenshots wurden nicht von diesem Pass gelöscht.

## I. Technische Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| `npm run verify` | bestanden |
| Backend-Compile | bestanden |
| Frontend-Typecheck | bestanden |
| Mobile-Typecheck | bestanden |
| Backendtests | 47/47 bestanden |
| Produktions-Build | bestanden |
| Landingpage-QA | 51/51 bestanden |
| Onboarding-/Upload-QA | 37/37 bestanden |
| Milky-App-QA | 24/24 bestanden |
| Browserkonsole | keine Fehler |
| `git diff --check` | bestanden |
| Supabase-Integration-Security-QA | lokal nicht ausführbar: Docker-Daemon nicht erreichbar |

Die 47 Backendtests enthalten Upload-Validierung, Signed Download, Dokumentlöschung, Account-Löschung, Auth-Boot-Garantien, Zwei-Nutzer-Autorisierung und Beta-Security-Controls. Die separate `qa-beta-security.mjs` benötigt eine laufende lokale Supabase-/Docker-Umgebung; sie scheiterte vor dem ersten Test an `npx supabase status -o env`. Security-QA-Code und Security-Implementierung wurden durch diesen Design-Pass nicht verändert.

## Datenschutz- und Sicherheitsreview

- **Verarbeitete Daten:** nur bestehende UI-Darstellung von Produkt- und Dokumentmetadaten; keine neue Erhebung.
- **Neue Suche:** filtert ausschließlich bereits geladene Dateinamen, Dokumenttypen und Produktnamen im React-State; keine Persistenz, kein Log, keine Analyse und kein neuer API-Request.
- **Datenminimierung:** kein Dokumentinhalt, keine extrahierten Texte und keine weiteren Kontodaten werden für die Suche verwendet.
- **Speicherort / Aufbewahrung:** unverändert; die Suchanfrage verlässt den Browser nicht und wird beim Verlassen der Seite verworfen.
- **Export / Löschung:** bestehende Abläufe unverändert und durch Backendtests abgedeckt.
- **Dritte / AI / Consent:** keine neue Drittpartei, keine AI-Verarbeitung, kein neuer Consent-Zweck.
- **Connected Accounts / Secrets / Tokens:** unverändert; keine Secrets oder Tokens werden im Frontend ergänzt oder geloggt.
- **Sensible Dokumente:** keine automatische Vault-Verarbeitung und keine neue Offenlegung; Marketingcopy beschränkt sich auf technisch bestätigte Aussagen.
- **Risiken:** keine neue serverseitige Angriffsfläche; clientseitige Filterung rendert React-Text und führt keine Nutzereingaben aus.

Da sich die tatsächliche Datenverarbeitung, Rechtsgrundlage, Retention, Export-/Löschlogik und Providerlandschaft nicht geändert haben, war keine Änderung der Compliance- oder Security-Architekturdokumente erforderlich.

## J. Geänderte Dateien

| Datei | Grund |
| --- | --- |
| `frontend/src/pages/Home.tsx` | vollständige Landingpage-Orchestrierung und DE/EN-Inhalte |
| `frontend/src/components/MarketingShell.tsx` | finale Marketingnavigation und Footer |
| `frontend/src/components/SpatialHero.tsx` | SVG-Produktwelt, Scrollstory, Pause, Reduced Motion |
| `frontend/src/components/marketing/MarketingSections.tsx` | wiederverwendbare Landingpage-Sektionen |
| `frontend/src/milky-archive.css` | isoliertes finales Marketingdesignsystem |
| `frontend/src/styles.css` | semantische Milky-App-Tokens, Fokus, Light-/Dark-Kompatibilität und gezielte Kontrastkorrekturen |
| `frontend/src/components/AppShell.tsx` | fünf primäre App-Navigationsziele und Marketing-Surface-Zuordnung |
| `frontend/src/pages/HomeBinder.tsx` | ruhiges Dokumentarchiv, lokale Suche und Dateimetadaten |
| `frontend/src/lib/theme.tsx` | Light als Standard und Milky Theme-Color |
| `frontend/src/main.tsx` | Milky-Stylesheet und Terms-Route |
| `frontend/src/pages/MarketingPages.tsx` | transparente Beta-Nutzungsbedingungen-Seite |
| `frontend/scripts/qa-landing.mjs` | finale Browser-, Viewport-, Motion- und Screenshot-QA |
| `frontend/scripts/qa-onboarding.mjs` | kanonische finale Screenshotziele |
| `frontend/scripts/qa-milky-app.mjs` | App-, Mobile-, Dialog-, Suche-, 200-%-Text- und Dark-Regression |
| `docs/design/qa-milky-archive-final/` | reale Browser-Screenshots |
| `docs/design/milky-archive-final-report.md` | dieser Abschlussbericht |

Bestehende unbeteiligte Änderungen an Security-, Supabase-, Release- und Archivdateien wurden nicht zurückgesetzt oder überschrieben. Es wurde kein Commit erstellt und nichts gepusht.

## K. Noch offen

1. Die historische globale `styles.css` bleibt mit 565,21 kB roh / 92,13 kB gzip groß. Ein sicherer Abbau benötigt routeübergreifende Coverage für alle noch vorhandenen Legacy- und Feature-Flag-Seiten; im finalen Design-Pass wurde deshalb nur gezielt geändert.
2. Die integrierte Supabase-Security-Suite ist in dieser Umgebung wegen des nicht laufenden Docker-Daemons nicht verifiziert. Die deterministischen Backend-Securitytests sind grün.
3. Die neue Nutzungsbedingungen-Seite kennzeichnet ihren Beta-Status transparent; verbindliche rechtliche Inhalte benötigen weiterhin die vorgesehene juristische Prüfung.
