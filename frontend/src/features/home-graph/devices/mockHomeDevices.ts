import type { HomeDevice } from "../types";

export const mockHomeDevices: HomeDevice[] = [
  {
    id: "home-device-passport-hue",
    name: "Wohnzimmer Stehlampe",
    room: "Wohnzimmer",
    providerId: "philips_hue",
    appName: "Hue",
    deviceType: "Lampe",
    connectionLevel: 1,
    isControllable: false,
    capabilities: ["power", "brightness", "colorTemperature"],
    manualUrl: "https://www.philips-hue.com",
    resetInstructions: "Hue-App, Bridge und Lampenmodell prüfen. Reset-Schritte später am Gerätepass speichern.",
    notes: "Als Beispiel für ein erkanntes, aber noch nicht steuerbares Gerät."
  },
  {
    id: "home-device-passport-shelly",
    name: "Waschkeller Steckdose",
    room: "Waschkeller",
    providerId: "shelly",
    appName: "Shelly Smart Control",
    deviceType: "Steckdose",
    connectionLevel: 2,
    isControllable: false,
    capabilities: ["power", "energy"],
    resetInstructions: "Lokale IP, Shelly-App und Sicherungskreis dokumentieren.",
    notes: "Gute Kandidatin für Stromverbrauch, Garantie und Care-Hinweise."
  },
  {
    id: "home-device-passport-roborock",
    name: "Roborock Saugroboter",
    room: "Flur",
    providerId: "roborock",
    appName: "Roborock",
    deviceType: "Saugroboter",
    connectionLevel: 1,
    isControllable: false,
    capabilities: ["cleaning", "battery"],
    resetInstructions: "WLAN-Reset, Filterwechsel und Dockingstation später im Gerätepass festhalten.",
    notes: "Zeigt, dass Avareno auch ohne Steuerung Wartung und Support nützlich macht."
  }
];
