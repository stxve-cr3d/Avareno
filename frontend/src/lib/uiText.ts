const uiTextReplacements: Array<[RegExp, string]> = [
  [/\bPrivatsph(?:\?|ae)re\b/g, "Privatsphäre"],
  [/\bvollst(?:Ã¤|\?)ndig\b/g, "vollständig"],
  [/\bVollst(?:Ã¤|\?)ndig/g, "Vollständig"],
  [/\b(Ue|\?)bersicht\b/g, "Übersicht"],
  [/\b(Ue|\?)berblick\b/g, "Überblick"],
  [/\b(Oe|\?)ffne\b/g, "Öffne"],
  [/\b(Oe|\?)ffnen\b/g, "Öffnen"],
  [/\b(Oe|\?)ffentlich\b/g, "Öffentlich"],
  [/\boeffentlich/g, "öffentlich"],
  [/\b(Oe|oe)ffentlich/g, "Öffentlich"],
  [/\bf(?:ue|\?)r\b/g, "für"],
  [/\bF(?:ue|\?)r\b/g, "Für"],
  [/\b(?:ue|\?)ber\b/g, "über"],
  [/\b(?:ae|\?)ndern\b/g, "ändern"],
  [/\bsp(?:ae|\?)ter\b/g, "später"],
  [/\bSp(?:ae|\?)ter\b/g, "Später"],
  [/\bzur(?:ue|\?)ck/g, "zurück"],
  [/\bZur(?:ue|\?)ck/g, "Zurück"],
  [/\bpr(?:ue|\?)fen\b/g, "prüfen"],
  [/\bPr(?:ue|\?)fen\b/g, "Prüfen"],
  [/\bpr(?:ue|\?)fe\b/g, "prüfe"],
  [/\bPr(?:ue|\?)fe\b/g, "Prüfe"],
  [/\bbest(?:ae|\?)tigen\b/g, "bestätigen"],
  [/\bBest(?:ae|\?)tigung\b/g, "Bestätigung"],
  [/\bbest(?:ae|\?)tigt\b/g, "bestätigt"],
  [/\bBest(?:ae|\?)tigt\b/g, "Bestätigt"],
  [/\bg(?:ue|\?)ltig/g, "gültig"],
  [/\bunterst(?:ue|\?)tzt\b/g, "unterstützt"],
  [/\bR(?:ae|\?)ume\b/g, "Räume"],
  [/\bR(?:ae|\?)umen\b/g, "Räumen"],
  [/\bstandardm(?:ae|\?\?)ig\b/g, "standardmäßig"],
  [/\berg(?:ae|\?)nz/g, "ergänz"],
  [/\bk(?:oe|\?)nnen\b/g, "können"],
  [/\bm(?:ue|\?)ssen\b/g, "müssen"],
  [/\bd(?:ue|\?)rfen\b/g, "dürfen"],
  [/\bN(?:ae|\?)chste/g, "Nächste"],
  [/\bn(?:ae|\?)chste/g, "nächste"],
  [/\bGer(?:ae|\?)t/g, "Gerät"],
  [/\bGer(?:ae|\?)te/g, "Geräte"],
  [/\bSchlie(?:ss|\?)en\b/g, "Schließen"]
];

export function formatUiText(value: string) {
  return uiTextReplacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

export function formatUiTextList(values: string[]) {
  return values.map(formatUiText);
}

/* The backend reports missing passport fields as stable English tokens
   (see backend/app/services/item_service.py missing_fields). Translate
   them at the display layer only. */
const missingFieldLabels: Record<string, string> = {
  receipt: "Beleg",
  "serial number": "Seriennummer",
  "warranty date": "Garantiedatum",
  manual: "Anleitung",
  "driver/software": "Treiber/Software",
  "support contact": "Support-Kontakt",
  "model data": "Modelldaten",
  "purchase data": "Kaufdaten"
};

export function missingFieldLabel(value: string) {
  return missingFieldLabels[value] ?? value;
}
