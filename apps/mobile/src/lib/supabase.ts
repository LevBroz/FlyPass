import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Variables públicas: se incorporan al binario en el build. No son secretos.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
export const configMissing = !SUPABASE_URL || !SUPABASE_KEY || !API_URL;

/**
 * Sesión en almacenamiento seguro (Keystore/Keychain). Se fragmenta porque
 * algunos sistemas rechazan valores grandes y una sesión puede superar 2 KB.
 */
const CHUNK = 1800;
const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = await SecureStore.getItemAsync(`${key}.n`);
    if (!n) return null;
    const parts: string[] = [];
    for (let i = 0; i < Number(n); i++) {
      const p = await SecureStore.getItemAsync(`${key}.${i}`);
      if (p === null) return null;
      parts.push(p);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    await secureStorage.removeItem(key);
    const count = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    await SecureStore.setItemAsync(`${key}.n`, String(count));
  },
  async removeItem(key: string): Promise<void> {
    const n = await SecureStore.getItemAsync(`${key}.n`);
    if (n) for (let i = 0; i < Number(n); i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};

export const supabase = createClient(SUPABASE_URL || 'https://invalid.local', SUPABASE_KEY || 'missing', {
  auth: {
    storage: secureStorage,
    storageKey: 'pg_session',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
