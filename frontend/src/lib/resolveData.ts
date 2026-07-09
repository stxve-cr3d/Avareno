export type ResolveProduct = {
  id: string;
  name: string;
  model: string;
  category: string;
  firmware?: string;
  accessories: string[];
  ownership: "VERIFIED" | "IMPORTED" | "MANUAL";
  usageHistory: string;
};

export type ResolvePriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ResolveTicketStatus = "OPEN" | "MATCHING" | "ANSWERED" | "SOLVED";
export type ResolveTicketMode = "OWN" | "HELP" | "SOLVED";

export type MatchFactor = {
  label: string;
  score: number;
  detail: string;
};

export type HelperProfile = {
  id: string;
  name: string;
  initials: string;
  productsOwned: number;
  solvedTickets: number;
  acceptedSolutions: number;
  reliabilityScore: number;
  tags: string[];
  verifiedOwnership: boolean;
};

export type SolutionProposal = {
  id: string;
  helperId: string;
  title: string;
  explanation: string;
  tools: string[];
  risk: "LOW" | "MEDIUM" | "HIGH";
  timeEstimate: string;
  helpedCount: number;
  accepted?: boolean;
};

export type ResolveTicket = {
  id: string;
  mode: ResolveTicketMode;
  productId: string;
  problemTitle: string;
  summary: string;
  description: string;
  status: ResolveTicketStatus;
  matchScore: number;
  permissionReason: string;
  proposedSolutions: number;
  createdAgo: string;
  priority: ResolvePriority;
  firmware?: string;
  deviceDetails: string[];
  accessories: string[];
  usageHistory: string;
  tried: string[];
  aiSummary: string;
  categorySuggestion: string;
  matchFactors: MatchFactor[];
  helperIds: string[];
  solutions: SolutionProposal[];
};

export const resolveProducts: ResolveProduct[] = [
  {
    id: "fritzbox-7590",
    name: "FRITZ!Box 7590 AX",
    model: "7590 AX",
    category: "Netzwerk",
    firmware: "FRITZ!OS 8.02",
    accessories: ["Mesh Repeater", "DSL Kabel"],
    ownership: "VERIFIED",
    usageHistory: "Seit 18 Monaten im Haushalt. Zwei Notizen und Providerbeleg gespeichert."
  },
  {
    id: "samsung-s95c",
    name: "Samsung OLED S95C",
    model: "QE65S95C",
    category: "TV / Medien",
    firmware: "1622.5",
    accessories: ["One Connect Box", "HDMI 2.1 Kabel"],
    ownership: "VERIFIED",
    usageHistory: "Wohnzimmer-TV mit Konsole und Receiver."
  },
  {
    id: "sony-xm5",
    name: "Sony WH-1000XM5",
    model: "WH-1000XM5",
    category: "Audio",
    firmware: "2.1.0",
    accessories: ["Reiseetui"],
    ownership: "VERIFIED",
    usageHistory: "Täglich unterwegs genutzt, gekoppelt mit Smartphone und Laptop."
  },
  {
    id: "ps5",
    name: "PlayStation 5",
    model: "CFI-1216A",
    category: "Konsole",
    firmware: "24.03-09.20",
    accessories: ["DualSense", "Pulse headset"],
    ownership: "VERIFIED",
    usageHistory: "Familienkonsole mit zwei Controllern. Garantiebeleg gespeichert."
  },
  {
    id: "hue-bridge",
    name: "Philips Hue Bridge",
    model: "BSB002",
    category: "Smart Home",
    firmware: "1967054010",
    accessories: ["Hue Dimmer", "Hue Leuchten"],
    ownership: "VERIFIED",
    usageHistory: "42 Geräte in sechs Räumen. Backup-Notiz angehängt."
  },
  {
    id: "macbook-m3",
    name: "MacBook Pro M3",
    model: "A2918",
    category: "Computer",
    firmware: "macOS 15.1",
    accessories: ["USB-C dock", "Studio Display"],
    ownership: "VERIFIED",
    usageHistory: "Arbeits-Laptop mit Docking-Setup. AppleCare-Nachweis gespeichert."
  }
];

export const helperProfiles: HelperProfile[] = [
  {
    id: "helper-nora",
    name: "Nora K.",
    initials: "NK",
    productsOwned: 14,
    solvedTickets: 38,
    acceptedSolutions: 27,
    reliabilityScore: 94,
    tags: ["OLED", "HDMI", "Firmware"],
    verifiedOwnership: true
  },
  {
    id: "helper-ivo",
    name: "Ivo M.",
    initials: "IM",
    productsOwned: 9,
    solvedTickets: 21,
    acceptedSolutions: 16,
    reliabilityScore: 88,
    tags: ["DualSense", "Garantie", "Reparatur"],
    verifiedOwnership: true
  },
  {
    id: "helper-lea",
    name: "Lea S.",
    initials: "LS",
    productsOwned: 22,
    solvedTickets: 52,
    acceptedSolutions: 41,
    reliabilityScore: 97,
    tags: ["Hue", "Router", "Wiederherstellung"],
    verifiedOwnership: true
  },
  {
    id: "helper-arin",
    name: "Arin T.",
    initials: "AT",
    productsOwned: 11,
    solvedTickets: 18,
    acceptedSolutions: 12,
    reliabilityScore: 84,
    tags: ["Audio", "Bluetooth", "Mac"],
    verifiedOwnership: true
  }
];

export const resolveTickets: ResolveTicket[] = [
  {
    id: "ticket-oled-hdmi",
    mode: "OWN",
    productId: "samsung-s95c",
    problemTitle: "OLED TV verliert sporadisch HDMI Signal",
    summary: "Seit dem letzten Firmware-Update fällt das Signal zwischen Konsole und One Connect Box kurz aus.",
    description:
      "Das Bild wird für zwei bis drei Sekunden schwarz, meistens beim Wechsel vom Dashboard in HDR-Spiele. Der Ton läuft manchmal weiter über den Receiver.",
    status: "OPEN",
    matchScore: 92,
    permissionReason: "Gleiche TV-Generation und ein ähnliches HDMI-2.1-Problem gelöst.",
    proposedSolutions: 3,
    createdAgo: "vor 18 Min.",
    priority: "HIGH",
    firmware: "1622.5",
    deviceDetails: ["One Connect Box", "HDMI 2.1 Port 4", "Game Mode aktiv", "Externer Receiver dazwischen"],
    accessories: ["HDMI 2.1 Kabel", "PlayStation 5", "AV-Receiver"],
    usageHistory: "Seit 9 Monaten installiert. HDMI-Kabel einmal ersetzt. Keine Panel-Reparatur.",
    tried: ["Strom getrennt", "Neues HDMI-Kabel", "CEC deaktiviert", "Videoeinstellungen der Konsole zurückgesetzt"],
    aiSummary:
      "Wahrscheinlich ein instabiler HDMI-Handshake nach dem Firmware-Wechsel. Am besten passen S95C-Besitzer mit One-Connect- oder Receiver-Erfahrung.",
    categorySuggestion: "Signal / Firmware / HDMI-Handshake",
    matchFactors: [
      { label: "Gleiches Produkt", score: 35, detail: "Samsung OLED S95C im Objektgedächtnis verifiziert" },
      { label: "Gleiches Modell", score: 20, detail: "QE65S95C passt exakt" },
      { label: "Ähnlich gelöst", score: 15, detail: "HDMI-Aussetzer bereits gelöst" },
      { label: "Besitz bestätigt", score: 10, detail: "Rechnung und Seriennummer gespeichert" },
      { label: "Helfer-Qualität", score: 7, detail: "Hohe Quote akzeptierter Lösungen" },
      { label: "Antworttempo", score: 5, detail: "Antwortet meist innerhalb von 2 Stunden" }
    ],
    helperIds: ["helper-nora", "helper-lea"],
    solutions: [
      {
        id: "solution-hdmi-signal-plus",
        helperId: "helper-nora",
        title: "Input Signal Plus nach Update neu setzen",
        explanation:
          "Bei diesem Modell kann der Schalter aktiv wirken, obwohl das HDMI-Profil veraltet ist. Input Signal Plus deaktivieren, TV und Konsole neu starten und danach nur für den Konsolen-Port wieder aktivieren.",
        tools: ["TV-Fernbedienung", "Anzeigeeinstellungen der Konsole"],
        risk: "LOW",
        timeEstimate: "8 min",
        helpedCount: 12
      },
      {
        id: "solution-receiver-bypass",
        helperId: "helper-lea",
        title: "Receiver kurz umgehen",
        explanation:
          "Die Konsole einen Abend direkt an HDMI 4 anschließen. Wenn das Problem verschwindet, Video direkt lassen und Ton über eARC führen.",
        tools: ["HDMI-Kabel", "Receiver-Einstellungen"],
        risk: "LOW",
        timeEstimate: "15 min",
        helpedCount: 7
      }
    ]
  },
  {
    id: "ticket-xm5-auto-connect",
    mode: "HELP",
    productId: "sony-xm5",
    problemTitle: "Kopfhörer verbinden sich nicht mehr automatisch",
    summary: "Der XM5 bleibt gekoppelt, verbindet sich nach Laptop-Nutzung aber nicht automatisch mit dem Smartphone.",
    description: "Multipoint ist aktiv. Der Kopfhörer bevorzugt den Laptop und ignoriert das Smartphone, bis Bluetooth manuell neu gestartet wird.",
    status: "MATCHING",
    matchScore: 86,
    permissionReason: "Gleicher Kopfhörer und ein Multipoint-Problem bereits gelöst.",
    proposedSolutions: 2,
    createdAgo: "vor 42 Min.",
    priority: "MEDIUM",
    firmware: "2.1.0",
    deviceDetails: ["Multipoint aktiv", "iOS Smartphone", "macOS Laptop", "Sony Headphones App installiert"],
    accessories: ["Reiseetui"],
    usageHistory: "Täglicher Kopfhörer für unterwegs. Keine Reparaturhistorie. App-Profil synchronisiert.",
    tried: ["Bluetooth-Gerät am Smartphone entfernt", "Kopfhörer geladen", "Laptop neu gestartet"],
    aiSummary: "Wahrscheinlich ein Multipoint-Prioritätskonflikt. Passende Helfer haben XM5-Erfahrung mit macOS/iOS.",
    categorySuggestion: "Bluetooth / Multipoint",
    matchFactors: [
      { label: "Gleiches Produkt", score: 35, detail: "WH-1000XM5 im Objektgedächtnis" },
      { label: "Gleiche Firmware", score: 10, detail: "2.1.x Generation" },
      { label: "Ähnlich gelöst", score: 15, detail: "Multipoint-Reset bereits erfolgreich" },
      { label: "Besitz bestätigt", score: 10, detail: "Besitznachweis gespeichert" },
      { label: "Helfer-Bewertung", score: 8, detail: "Akzeptierte Audio-Antworten" },
      { label: "Antworttempo", score: 8, detail: "Schnelle Antwort-Historie" }
    ],
    helperIds: ["helper-arin"],
    solutions: [
      {
        id: "solution-xm5-priority",
        helperId: "helper-arin",
        title: "Geräteplätze leeren und Reihenfolge neu aufbauen",
        explanation:
          "Beide gekoppelten Geräte in der Sony App löschen, zuerst das Smartphone koppeln, danach den Laptop. Nach App-Resets nutzt der XM5 das erste mobile Profil zuverlässiger.",
        tools: ["Sony Headphones App", "Bluetooth-Einstellungen"],
        risk: "LOW",
        timeEstimate: "10 min",
        helpedCount: 9
      }
    ]
  },
  {
    id: "ticket-ps5-drift",
    mode: "OWN",
    productId: "ps5",
    problemTitle: "PS5 Controller Drift nach 8 Monaten",
    summary: "Der linke Stick driftet nach kurzen Sessions nach oben. Garantienachweis ist vorhanden.",
    description: "Der Controller ist sauber und nicht heruntergefallen. Der Drift beginnt nach etwa 20 Minuten und betrifft Menüs und Spiele.",
    status: "ANSWERED",
    matchScore: 81,
    permissionReason: "Passende Helfer besitzen dieselbe Controller-Revision und haben einen Garantietausch abgeschlossen.",
    proposedSolutions: 4,
    createdAgo: "vor 2 Std.",
    priority: "MEDIUM",
    firmware: "Controller 0402",
    deviceDetails: ["DualSense", "CFI-ZCT1W", "Keine sichtbaren Schäden"],
    accessories: ["Ladekabel", "Pulse Headset"],
    usageHistory: "Vor 8 Monaten mit der Konsole gekauft. Rechnung und Garantie sind angehängt.",
    tried: ["Controller per Pin zurückgesetzt", "Deadzone erhöht", "USB-Kabelmodus getestet"],
    aiSummary: "Wahrscheinlich Analogstick-Drift. Priorität haben garantie-sichere Schritte, keine riskanten Reparaturversuche.",
    categorySuggestion: "Garantie / Controller-Drift",
    matchFactors: [
      { label: "Gleiches Zubehör", score: 20, detail: "DualSense-Revision passt" },
      { label: "Ähnlich gelöst", score: 15, detail: "Garantietausch abgeschlossen" },
      { label: "Besitz bestätigt", score: 10, detail: "Rechnung gespeichert" },
      { label: "Helfer-Qualität", score: 9, detail: "Hohe Bestätigungsquote" }
    ],
    helperIds: ["helper-ivo"],
    solutions: [
      {
        id: "solution-ps5-warranty",
        helperId: "helper-ivo",
        title: "Garantiefall vor Reinigungsversuchen öffnen",
        explanation:
          "Da der Controller erst 8 Monate alt ist und die Rechnung gespeichert wurde, zuerst Seriennummer, kurzes Fehler-Video und Rechnung vorbereiten. Kein Kontaktspray nutzen, bevor der Support es freigibt.",
        tools: ["Rechnung", "Seriennummer", "Kurzes Video"],
        risk: "LOW",
        timeEstimate: "20 min",
        helpedCount: 18,
        accepted: true
      }
    ]
  },
  {
    id: "ticket-hue-power",
    mode: "HELP",
    productId: "hue-bridge",
    problemTitle: "Hue Bridge verliert Geräte nach Stromausfall",
    summary: "Nach einem Stromausfall fehlen mehrere Leuchten und Dimmer. Räume bleiben sichtbar, Geräte sind aber nicht erreichbar.",
    description: "Die Bridge ist wieder online, aber 12 Geräte sind nicht verfügbar. Der Router zeigt eine normale LAN-Verbindung.",
    status: "OPEN",
    matchScore: 89,
    permissionReason: "Hue Bridge mit vielen Räumen und dokumentierten Wiederherstellungsschritten vorhanden.",
    proposedSolutions: 1,
    createdAgo: "vor 3 Std.",
    priority: "HIGH",
    firmware: "1967054010",
    deviceDetails: ["42 Geräte", "6 Räume", "DHCP-Reservierung im Router", "Matter nicht aktiv"],
    accessories: ["Hue Dimmer", "Hue Leuchten"],
    usageHistory: "Bridge wird in sechs Räumen genutzt. Kein Austausch der Bridge dokumentiert.",
    tried: ["Bridge neu gestartet", "Router neu gestartet", "App aktualisiert", "Netzteil der Bridge umgesetzt"],
    aiSummary: "Wahrscheinlich ein Mesh-Wiederherstellungsproblem nach dem Stromausfall. Am besten passen Helfer mit großem Hue-Setup und Router-Erfahrung.",
    categorySuggestion: "Smart Home / Wiederherstellung",
    matchFactors: [
      { label: "Gleiches Produkt", score: 35, detail: "Hue Bridge BSB002" },
      { label: "Ähnlich gelöst", score: 15, detail: "Wiederherstellung nach Ausfall akzeptiert" },
      { label: "Besitz bestätigt", score: 10, detail: "Bridge ist dem Haushalt zugeordnet" },
      { label: "Helfer-Bewertung", score: 9, detail: "Smart-Home-Antworten bestätigt" },
      { label: "Antworttempo", score: 8, detail: "Fragt meistens nach" }
    ],
    helperIds: ["helper-lea"],
    solutions: [
      {
        id: "solution-hue-channel",
        helperId: "helper-lea",
        title: "Zigbee-Kanal nach Wiederherstellung wechseln",
        explanation:
          "Wenn nach dem Ausfall viele Geräte fehlen, den Zigbee-Kanal einmal wechseln, 15 Minuten warten und nur die fehlenden Leuchten raumweise kurz stromlos machen.",
        tools: ["Hue App", "Lichtschalter je Raum"],
        risk: "MEDIUM",
        timeEstimate: "35 min",
        helpedCount: 6
      }
    ]
  },
  {
    id: "ticket-macbook-dock",
    mode: "SOLVED",
    productId: "macbook-m3",
    problemTitle: "USB-C Dock verliert Monitor nach Sleep",
    summary: "Externer Monitor wacht nach macOS-Update nicht zuverlässig auf.",
    description: "Der Monitor bleibt schwarz, bis das Dock abgezogen wird. Das Problem begann nach einem Systemupdate.",
    status: "SOLVED",
    matchScore: 78,
    permissionReason: "Gelöst durch einen Helfer mit gleicher MacBook-Generation und Docking-Setup.",
    proposedSolutions: 2,
    createdAgo: "gestern",
    priority: "LOW",
    firmware: "macOS 15.1",
    deviceDetails: ["USB-C Dock", "Studio Display", "Clamshell-Modus"],
    accessories: ["USB-C Dock", "Studio Display"],
    usageHistory: "Täglicher Arbeitsplatz. Dock-Firmware war vor dem Problem nicht aktualisiert.",
    tried: ["Neustart", "Kabel getauscht", "Display-Einstellungen zurückgesetzt"],
    aiSummary: "Dock-Firmware und Wake-Aushandlung waren nach dem OS-Update wahrscheinlich veraltet.",
    categorySuggestion: "Dock / Monitor-Aufwachen",
    matchFactors: [
      { label: "Gleiche Modellfamilie", score: 20, detail: "MacBook Pro M3 Generation" },
      { label: "Passendes Zubehör", score: 10, detail: "USB-C-Docking-Setup" },
      { label: "Akzeptierte Lösung", score: 15, detail: "Dock-Firmware-Fix bestätigt" },
      { label: "Besitz bestätigt", score: 10, detail: "Gerätenachweis gespeichert" }
    ],
    helperIds: ["helper-arin"],
    solutions: [
      {
        id: "solution-mac-dock",
        helperId: "helper-arin",
        title: "Dock-Firmware aktualisieren, danach Monitore neu anordnen",
        explanation:
          "Das Dock-Firmware-Update hat die Wake-Aushandlung repariert. Danach die alte Monitor-Anordnung löschen und den Monitor einmal neu verbinden.",
        tools: ["Dock-Hersteller-App", "macOS Display-Einstellungen"],
        risk: "LOW",
        timeEstimate: "25 min",
        helpedCount: 14,
        accepted: true
      }
    ]
  }
];

export function getProduct(productId: string) {
  return resolveProducts.find((product) => product.id === productId) ?? resolveProducts[0];
}

export function getHelper(helperId: string) {
  return helperProfiles.find((helper) => helper.id === helperId) ?? helperProfiles[0];
}

export function ticketModeLabel(mode: ResolveTicketMode) {
  return mode === "OWN" ? "Meine Tickets" : mode === "HELP" ? "Kann helfen" : "Gelöst";
}

export function resolveMetrics(tickets: ResolveTicket[]) {
  const openOwn = tickets.filter((ticket) => ticket.mode === "OWN" && ticket.status !== "SOLVED").length;
  const qualified = tickets.filter((ticket) => ticket.mode === "HELP").length;
  const solved = tickets.filter((ticket) => ticket.status === "SOLVED").length;
  const averageMatch = Math.round(tickets.reduce((sum, ticket) => sum + ticket.matchScore, 0) / Math.max(tickets.length, 1));
  const experienceScore = 742;
  return { openOwn, qualified, solved, averageMatch, experienceScore };
}
