import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

/** False when the EXPO_PUBLIC_SUPABASE_* env vars are missing (fresh checkout without .env). */
export const authConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = authConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      // Web (incl. Expo web dev SSR pass) must not touch AsyncStorage's
      // localStorage shim — supabase's default web storage is SSR-safe.
      ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: 'avareno-supabase-auth',
    },
  })
  : null;

// Supabase only refreshes tokens while the app is foregrounded; pause the
// timer in background so the refresh fires immediately on return instead.
// Web handles this itself via visibility events.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export async function getAuthAccessToken() {
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
