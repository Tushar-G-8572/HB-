import * as SecureStore from 'expo-secure-store';

/**
 * Token storage for native (iOS Keychain / Android Keystore).
 *
 * Supabase stores the whole session (access token + refresh token + user) as
 * one JSON string. SecureStore recommends values below ~2KB, so we split the
 * value into small chunks. Keys may only contain [A-Za-z0-9._-].
 *
 * On web we do NOT use this - supabase-js uses localStorage there.
 */
const CHUNK_SIZE = 1000;

const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, i: number) => `${key}.part${i}`;

async function removeItem(key: string): Promise<void> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  const count = raw ? parseInt(raw, 10) : 0;
  for (let i = 0; i < count; i++) {
    await SecureStore.deleteItemAsync(chunkKey(key, i));
  }
  await SecureStore.deleteItemAsync(countKey(key));
}

async function getItem(key: string): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  if (!raw) return null;
  const count = parseInt(raw, 10);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    if (part == null) return null; // corrupted -> treat as signed out
    parts.push(part);
  }
  return parts.join('');
}

async function setItem(key: string, value: string): Promise<void> {
  await removeItem(key);
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
  }
  await SecureStore.setItemAsync(countKey(key), String(chunks.length));
}

export const secureStorage = { getItem, setItem, removeItem };
