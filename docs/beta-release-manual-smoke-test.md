# Beta Release — manueller Smoke-Test

Durchzuführen gegen das verknüpfte Beta-Projekt (Staging/Remote) **nach** grünem
lokalem RC und **vor** den ersten Einladungen. Jede Zeile mit Datum + Kürzel
abhaken; jeder Fehlschlag blockiert Einladungen.

Voraussetzungen: Supabase-Beta-Projekt verknüpft, Migrationen angewendet,
`qa-beta-security.mjs` gegen dieses Projekt grün, SMTP + Redirect-URLs gesetzt.

Lokaler Nachweis: dieselbe Suite lief am 2026-07-20 zweimal identisch grün
(71/71) gegen die frische lokale Instanz inkl. Account-Löschung und
altem-JWT-Block — Urteil `RC READY` in `docs/beta-release-candidate-report.md`.
Dieser Smoke-Test wiederholt die kritischen Pfade gegen das echte Beta-Projekt.

## Konto & Zugang

- [ ] **Einladung:** Invite-E-Mail kommt an, Link führt auf die Beta-Domain, Signup ohne Einladung bleibt gesperrt.
- [ ] **Login:** frisch provisionierter Nutzer landet im Onboarding; Bestandsnutzer auf `/app`.
- [ ] **Logout:** Session endet, geschützte Routen leiten auf `/login?next=…`.
- [ ] **Passwort-Reset:** E-Mail kommt an, Reset-Link funktioniert genau einmal, altes Passwort ungültig.

## Erste Schritte (Aktivierung)

- [ ] **Erstes Produkt:** Anlegen mit Name + Kategorie; erscheint sofort in Galerie und Suche.
- [ ] **Erstes Dokument:** Upload (PDF ≤ 10 MiB) am Produkt; erscheint in Produktakte und Dokumentbibliothek.
- [ ] **Activity erscheint:** beide Aktionen erzeugen am selben Tag genau die zwei erwarteten Aktionen in der Heatmap (kein Login-/Seitenaufruf-Eintrag).
- [ ] **Heatmap-Tag ist erklärbar:** Hover UND Tastaturfokus zeigen Datum, Anzahl, Aktionsarten; Klick öffnet das Tagespanel; Legende 0/1/2–3/4–5/6+.
- [ ] **Meilenstein-Fortschritt stimmt:** „Erstes Produkt" und „Erstes Dokument" erreicht, Zähler „x von 29" konsistent zu den echten Daten, nächster Meilenstein plausibel.

## Kernflüsse

- [ ] **Erinnerung und Kalender:** Erinnerung anlegen → erscheint in Monat + Agenda; erledigen → Activity „Erinnerung erledigt"; Überfällig-Zustand rot.
- [ ] **Produktsuche:** Name/Hersteller/Modell/Seriennummer finden das Produkt; Filter + Sortierung greifen.
- [ ] **Dokumentensuche:** Datei-, Typ- und Produktsuche in der Bibliothek; Typ-Chips filtern korrekt.
- [ ] **Export:** Datenexport lädt vollständiges Bundle; Inhalt enthält nur eigene Daten.
- [ ] **Account-Löschung:** Löschung entfernt Profil, Produkte, Dokumente, Storage-Objekte, Erinnerungen; Login danach unmöglich.
- [ ] **Alter Token:** vor Löschung ausgestelltes JWT erhält nach Löschung auf PostgREST **und** Storage nur noch Fehler (restriktive `beta_auth_user_active`-Policy) — keine Daten, keine Mutation.

## Darstellung & Zugänglichkeit

- [ ] **Mobile:** 320er- und 390er-Viewport ohne horizontales Scrollen; Heatmap kompakt bedienbar; Galerie/Bibliothek einspaltig.
- [ ] **Dark Theme:** Umschalten in Konto-Einstellungen; Dashboard, Galerie, Bibliothek, Profil ohne unlesbare Flächen.
- [ ] **Reduced Motion:** OS-Einstellung aktiv → keine Karten-/Scroll-Animationen.

## Kill-Switches (Feature-Gates)

- [ ] **Upload-Kill-Switch:** `VITE_ENABLE_DOCUMENT_UPLOADS=false` (bzw. Server-Flag) → Upload-Wege ausgeblendet/blockiert, freundliche Meldung, keine 500er, kein Objekt entsteht.
- [ ] **Receipt-Extraction-Kill-Switch:** `VITE_ENABLE_RECEIPT_EXTRACTION=false` bzw. fehlender `ANTHROPIC_API_KEY` → Beleg-Upload funktioniert ohne Analyse, UI verspricht keine Extraktion, keine Hintergrundjobs.

## Abschluss

- [ ] Browserkonsole während des gesamten Durchlaufs ohne Fehler.
- [ ] Ergebnis + Datum + Tester in `docs/beta-release-candidate-report.md` nachtragen.
