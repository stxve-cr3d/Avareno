import { api } from './api';
import { Platform } from 'react-native';

import type { MobileBootstrap } from './types';

/** Full home payload in one round trip. GET /api/mobile/bootstrap */
export function fetchBootstrap() {
  return api<MobileBootstrap>('/api/mobile/bootstrap');
}

export type DeviceRegistration = {
  id: string;
  platform: string;
  pushToken: string;
  deviceName?: string | null;
  lastSeenAt: string;
};

/** Register/refresh an Expo push token (upserts by token).
    POST /api/mobile/devices */
export function registerDevice(pushToken: string, deviceName?: string) {
  return api<DeviceRegistration>('/api/mobile/devices', {
    method: 'POST',
    body: JSON.stringify({ platform: Platform.OS, pushToken, deviceName }),
  });
}
