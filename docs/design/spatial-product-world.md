# Designvorschlag: Räumliche Avareno-Produktwelt („Digital Product Archive")

Status: **visuell abgenommen und eingefroren** (Abnahme-/Hardening-Pass 2026-07-16,
48/48 Checks in `frontend/scripts/qa-landing.mjs`, Screenshots in
`qa-2026-07-landing/`). Kein weiterer Redesign-Durchgang geplant; nächster
Schritt ist ausschließlich die dezente App-Übernahme (§7) nach Freigabe.

## 0. Umgesetzte Landingpage-Struktur (`pages/Home.tsx`)

1. **Hero** — Positionierung links, räumliche Produktakte rechts (`SpatialHero`).
2. **Das Problem** (`#problem`) — fünf verstreute Fundorte (Postfach, Schublade,
   Gerät, Herstellerseite, Shopkonto), Karten mit ±0.5°-Kippung als „verstreut"-Signal.
3. **Die Transformation** (`#transformation`) — Chip-Stapel → Pfeil → kompakte
   Produktakte (`.avdoc-card.is-compact`), rein statisch + Reveal.
4. **Drei Schritte** (`#how-it-works`) — erfassen, zuordnen, wiederfinden.
5. **Die Produktakte** (`#produktakte`) — Beispiel-Detailansicht
   (`.avdoc-card.is-detail`) mit Badge „Beispielansicht"; fiktiver Hersteller
   „Aroma Uno" (markenfrei, §13-konform).
6. **Anwendungsfälle** (`#use-cases`) — Alltag, Garantie & Reparatur,
   Umzug & Versicherung, Zuhause & Haushalt (nur real vorhandene Funktionen).
7. **Vertrauen** (`#security`) — sachlich, keine erfundenen Sicherheitsversprechen.
8. Preise (Beta-Entwurf) + FAQ (bestehend, beibehalten).
9. **Abschluss** — „Deine nächste Rechnung landet nicht mehr irgendwo." /
   CTA „Erstes Produkt hinzufügen".

Entfernt: „Memory-Galerie" und generische Feature-Karten (Inhalt in
Problem/Schritte/Anwendungsfälle aufgegangen). Navigation/Footer-Anker in
`MarketingShell.tsx` entsprechend aktualisiert.

Kernkonzept: **„Aus verstreuten Informationen wird eine vollständige digitale Produktakte."**

Die App selbst bleibt eine schnelle, ruhige 2D-Oberfläche. Räumliche Wirkung ist ein
Marketing- und Markenwerkzeug — kein Interaktionsmodell.

---

## 1. Landingpage-Hero (umgesetzt, Abnahme-Pass 16.07.)

Komponente: `frontend/src/components/SpatialHero.tsx`, eingebunden in `pages/Home.tsx`.
CSS: Abschnitte „Spatial hero" am Ende von `styles.css`.

Die Szene unterscheidet drei Ebenen:

1. **Physisches Produkt**: stilisierte Espressomaschine als eigene Inline-SVG
   (`ProductIllustration`, eigene Vektorgrafik, markenfrei, matte Anthrazit-Flächen,
   eine grüne Statusleuchte, Label „Espressomaschine"). Steht links, leicht tiefer
   im Raum (`translateZ(-3rem)`), bleibt bei der Konvergenz unbewegt.
2. **Verstreute Informationen**: fünf Chips (Rechnung, Garantiekarte, Seriennummer,
   Anleitung, Erinnerung) in leichter 3D-Staffelung
   (CSS `perspective` + `translate3d` + `rotateX/Y`).
3. **Digitale Produktakte**: dunkle matte Karte rechts der Mitte
   (um `+3.5rem` versetzt, damit das Produkt frei sichtbar bleibt) mit denselben
   fünf Einträgen und „Vollständigkeit"-Leiste.

Weiches gerichtetes Licht (Verlaufs-Schein oben links), Akzent nur `#3ECF8E`.

## 2. Scroll-Verhalten

- Fortschritt `--p` (0 → 1) hängt an der Bühne selbst: 0 bei Bühnen-Oberkante auf
  78 % der Viewporthöhe, 1 bei 22 % — die gesamte Konvergenz ist damit auf dem
  Bildschirm sichtbar.
- Chips wandern mit `calc(offset * (1 - p))` zur Akte und blenden **vor dem
  Erreichen der Karte** gestaffelt aus (Fade endet je Chip deutlich vor Kontakt,
  damit nie ein Chip über Aktentext liegt).
- Das Produkt bewegt sich nicht; die Akte erhält mit steigendem `p` die füllende
  „Vollständig"-Leiste.
- Kein Scroll-Hijacking; Rück-Scroll stellt den Streuzustand wieder her.
- Scroll-Listener sofort aktiv (funktioniert auch ohne IntersectionObserver);
  der Observer pausiert Listener + Schwebe-Animation außerhalb des Viewports.

## 3. Mobile Darstellung (< 860 px)

Statische, vereinfachte Alternative: kein Perspektiv-Raum, keine Scroll-Kopplung.
Die fünf Chips erscheinen als ruhige Badge-Reihe über der Akte. Gleiche Aussage,
null Bewegungszwang, volle Bedienbarkeit bei 375 px.

## 4. Fallbacks & Zugänglichkeit

- `prefers-reduced-motion: reduce` → alle Animationen aus, Chips in fester,
  aufgeräumter Anordnung; Scroll-Kopplung wird gar nicht erst gestartet.
- Pause-Knopf am Hero (aria-pressed) friert Schwebe-Animation und Konvergenz ein.
- Screenreader: Bühne ist `aria-hidden`, daneben ein visually-hidden Absatz mit
  derselben Aussage in einem Satz.
- Ohne JavaScript/Animationen bleibt eine vollständig lesbare statische Komposition.

## 5. Technik

- **Nur CSS-Transforms + eine CSS-Variable.** Kein WebGL, kein Three.js/R3F
  (nicht im Projekt vorhanden — bewusst nicht eingeführt), keine Bilder, keine
  zusätzlichen Abhängigkeiten, kein Einfluss auf den initialen Seitenaufbau.
- Animiert werden ausschließlich `transform` und `opacity` (compositor-freundlich,
  geringe GPU-Last). `will-change` nur auf den fünf Chips.
- Sollte später ein echtes 3D-Produktmodell gewünscht sein: eigenes, lazy geladenes
  Marketing-Bundle (z. B. `<model-viewer>` oder R3F) hinter `IntersectionObserver`,
  niemals im App-Bundle.

## 6. Mögliche 3D-Assets (spätere Phase, nicht umgesetzt)

- Ein einziges stilisiertes Produktmodell (Kaffeemaschine, matt anthrazit,
  Akzentkante `#3ECF8E`) als vor-gerendertes Video/Sequenz oder GLB ≤ 500 KB.
- Gerenderte Stills desselben Modells für Social/OG-Bilder und Leerstände.
- Keine Produktfotos fremder Marken, keine Neon-/Gaming-Optik.

## 7. Anwendung in der App (spätere Phase, bewusst nicht umgesetzt)

Erlaubt (dezent): Tiefenwirkung bei Produktbildern, sehr leichter Hover-Tilt auf
Produktkarten, gestaffelte Dokumentstapel, kleine räumliche Illustrationen in
Leerständen, sanfte Einfüge-Übergänge.

Tabu: Formulare, Tabellen, Einstellungen, lange Dokumentlisten, Navigation, Dialoge.

Entscheidung über App-Anwendung erst nach Beurteilung dieses Hero-Prototyps.
