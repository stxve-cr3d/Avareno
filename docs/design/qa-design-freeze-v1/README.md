# Design Freeze V1 — kanonische Screenshots

Referenzstand des abgenommenen Visual-Grammar-&-Progression-Passes.
Erzeugt am **2026-07-20** auf Branch `beta-release-2026-07-17` (HEAD `1ffb791` + Working-Tree-Änderungen des Passes).

Quelle: Browser-Iterationsrunde 2 (Playwright/Chromium gegen den Dev-Quellstand)
sowie frische Interaktionsaufnahmen (03–05) gegen den Production-Build
(`VITE_AUTH_PROVIDER=mock`, `vite preview :4174`, FastAPI `:4010`).

Diese Bilder sind die Abnahme-Referenz: Abweichungen nach dem Freeze sind
Regressionen, sofern sie nicht durch einen dokumentierten Fix begründet sind.

| Datei | Route | Viewport | Theme | Zustand / Fixture |
|---|---|---|---|---|
| 01-dashboard-desktop.png | /app | 1440×900, full page | Light | Dev-Datensatz: 4 Produkte (1 mit echtem Foto), 1 Dokument, 3 aktive Tage |
| 02-dashboard-mobile.png | /app | 390×844, full page | Light | wie 01 |
| 03-heatmap-tooltip.png | /app (Hover auf aktiver Zelle) | 1440×900, Modul | Light | Live-Backend: 4 Aktionen am 20.07. (Produkt, Dokument, Erinnerung, Angabe) |
| 04-heatmap-selected-day.png | /app (Zelle angeklickt) | 1440×900, Modul | Light | wie 03, Tagespanel gepinnt |
| 05-heatmap-keyboard-focus.png | /app (ArrowLeft von aktiver Zelle) | 1440×900, Modul | Light | :focus-visible auf 13.07., Tooltip folgt Fokus |
| 06-milestone-next.png | /ich | 1440×900, Modul | Light | Nächster Meilenstein mit Fortschrittsring („5 Produkte, 4 von 5") |
| 07-milestones-collections.png | /ich | 1440×900, Modul | Light | 29 Meilensteine, 5 Sammlungen, Medaillenreihe |
| 08-product-gallery-desktop.png | /app/dinge | 1440×900, full page | Light | Featured-Karte + Galerie, Foto- und Illustrations-Fallbacks |
| 09-product-gallery-mobile.png | /app/dinge | 390×844, full page | Light | wie 08 |
| 10-product-with-photo.png | /app/dinge (Karte) | Element | Light | LG OLED mit echtem Produktfoto |
| 11-product-without-photo.png | /app/dinge (Karte) | Element | Light | Kategorie-Komposition (Kreisformen + Linien-Icon) |
| 12-documents-library.png | /reports/home-binder | 1440×900, full page | Light | Monats-Zeitachse, Beleg mit extrahierter Summe |
| 13-documents-mobile.png | /reports/home-binder | 390×844, full page | Light | einspaltig, keine Tabellen |
| 14-care-calendar.png | /care | 1440×900, full page | Light | Monatskalender + Agenda, Überfällig-Zustand |
| 15-profile-overview.png | /ich | 1440×900, full page | Light | Identität, Aktivität (1 Jahr), Meilensteine |
| 16-privacy-center.png | /rewards/datenschutz | 1440×900, full page | Light | Datenüberblick, Export, KI-Analyse, Löschbereich |
| 17-dashboard-dark.png | /app | 1440×900, full page | Dark | wie 01 |
| 18-profile-dark.png | /ich | 1440×900, full page | Dark | wie 15 |
| 19-dashboard-reduced-motion.png | /app | 1440×900 | Light, `prefers-reduced-motion: reduce` | Transitions deaktiviert |
| 20-dashboard-320.png | /app | 320×568 | Light | kleinster unterstützter Viewport, kein Overflow |

Ältere QA-Screenshot-Ordner (`qa-2026-07-*`, `qa-app-experience-final/`,
`qa-visual-grammar-final/`, `qa-milky-archive-final/`, `qa-dashboard-readability-final/`,
`qa-avareno-manifest-v1/`) bleiben unverändert als historische Läufe erhalten;
maßgeblich für den Freeze ist ausschließlich dieser Ordner.
