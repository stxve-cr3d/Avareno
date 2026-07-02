export type HomeProviderCategory =
  | "smart_home"
  | "bridge"
  | "voice_assistant"
  | "local_bridge"
  | "router"
  | "media"
  | "cleaning"
  | "security"
  | "appliance";

export type HomeProviderConnectionStatus = "not_available" | "planned" | "available" | "beta";

export type HomeProvider = {
  id: string;
  name: string;
  appName?: string;
  category: HomeProviderCategory;
  logoKey: string;
  brandColor?: string;
  websiteUrl?: string;
  supportsCloud: boolean;
  supportsLocal: boolean;
  supportsMatter: boolean;
  supportsOAuth: boolean;
  supportsApiToken: boolean;
  connectionStatus: HomeProviderConnectionStatus;
  supportedDeviceTypes: string[];
  supportedCapabilities: HomeCapability[];
  description: string;
  userFriendlyLabel: string;
};

export type HomeConnectionLevel = 0 | 1 | 2 | 3 | 4;

export type HomeCapability =
  | "power"
  | "brightness"
  | "color"
  | "colorTemperature"
  | "temperature"
  | "humidity"
  | "lock"
  | "scene"
  | "motion"
  | "contact"
  | "battery"
  | "energy"
  | "mediaPlayback"
  | "volume"
  | "cleaning"
  | "camera"
  | "alarm"
  | "presence";

export type HomeDevice = {
  id: string;
  name: string;
  room?: string;
  providerId?: string;
  appName?: string;
  deviceType?: string;
  connectionLevel: HomeConnectionLevel;
  isControllable: boolean;
  capabilities: HomeCapability[];
  linkedProductId?: string;
  receiptId?: string;
  warrantyId?: string;
  manualUrl?: string;
  supportUrl?: string;
  resetInstructions?: string;
  notes?: string;
};

export type HomeCommand =
  | { capability: "power"; action: "turn_on" | "turn_off" | "toggle" }
  | { capability: "brightness"; action: "set"; value: number }
  | { capability: "color"; action: "set"; value: string }
  | { capability: "colorTemperature"; action: "set"; value: number }
  | { capability: "temperature"; action: "set"; value: number }
  | { capability: "lock"; action: "lock" | "unlock" }
  | { capability: "scene"; action: "run"; sceneId: string }
  | { capability: "mediaPlayback"; action: "play" | "pause" | "stop" }
  | { capability: "volume"; action: "set" | "up" | "down"; value?: number }
  | { capability: "cleaning"; action: "start" | "pause" | "dock" }
  | { capability: "alarm"; action: "arm" | "disarm" };

export interface HomeProviderAdapter {
  providerId: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listDevices(): Promise<HomeDevice[]>;
  getDeviceStatus(deviceId: string): Promise<Record<string, unknown>>;
  executeCommand(deviceId: string, command: HomeCommand): Promise<void>;
}
