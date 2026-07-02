import type { HomeCommand, HomeDevice, HomeProviderAdapter } from "../types";

class PlannedHomeProviderAdapter implements HomeProviderAdapter {
  constructor(public providerId: string) {}

  async connect(): Promise<void> {
    throw new Error(`${this.providerId} adapter is planned and not connected to a real provider yet.`);
  }

  async disconnect(): Promise<void> {
    throw new Error(`${this.providerId} adapter is planned and has no stored connection yet.`);
  }

  async listDevices(): Promise<HomeDevice[]> {
    throw new Error(`${this.providerId} adapter cannot list real devices yet.`);
  }

  async getDeviceStatus(_deviceId: string): Promise<Record<string, unknown>> {
    throw new Error(`${this.providerId} adapter cannot read real status yet.`);
  }

  async executeCommand(_deviceId: string, _command: HomeCommand): Promise<void> {
    throw new Error(`${this.providerId} adapter cannot execute commands yet.`);
  }
}

export const plannedHomeProviderAdapters: Record<string, HomeProviderAdapter> = {
  home_assistant: new PlannedHomeProviderAdapter("home_assistant"),
  philips_hue: new PlannedHomeProviderAdapter("philips_hue"),
  shelly: new PlannedHomeProviderAdapter("shelly"),
  switchbot: new PlannedHomeProviderAdapter("switchbot"),
  tuya_smart_life: new PlannedHomeProviderAdapter("tuya_smart_life"),
  smartthings: new PlannedHomeProviderAdapter("smartthings"),
  tp_link_tapo: new PlannedHomeProviderAdapter("tp_link_tapo")
};
