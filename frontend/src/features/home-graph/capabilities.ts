import type { HomeCapability } from "./types";

export const homeCapabilities: HomeCapability[] = [
  "power",
  "brightness",
  "color",
  "colorTemperature",
  "temperature",
  "humidity",
  "lock",
  "scene",
  "motion",
  "contact",
  "battery",
  "energy",
  "mediaPlayback",
  "volume",
  "cleaning",
  "camera",
  "alarm",
  "presence"
];

export const homeCapabilityLabels: Record<HomeCapability, string> = {
  power: "An/Aus",
  brightness: "Helligkeit",
  color: "Farbe",
  colorTemperature: "Lichtfarbe",
  temperature: "Temperatur",
  humidity: "Luftfeuchte",
  lock: "Schloss",
  scene: "Szene",
  motion: "Bewegung",
  contact: "Kontakt",
  battery: "Batterie",
  energy: "Energie",
  mediaPlayback: "Medien",
  volume: "Lautstaerke",
  cleaning: "Reinigung",
  camera: "Kamera",
  alarm: "Alarm",
  presence: "Anwesenheit"
};
