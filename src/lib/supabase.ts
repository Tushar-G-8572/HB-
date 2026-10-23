import { AppState, Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

import { ENV } from '@/config/env';
import { secureStorage } from '@/lib/secureStorage';

const isWeb = Platform.OS === 'web';

// createClient() throws on empty values, so fall back to placeholders. The UI
// shows a "not configured" message instead of crashing (see login screen).
export const supabase = createClient(
  ENV.supabaseUrl || 'http://localhost:54321',
  ENV.supabaseAnonKey || 'public-anon-key-not-configured',
  {
    auth: {
      // web: default localStorage | native: encrypted Keychain/Keystore
      storage: isWeb ? undefined : secureStorage,
      persistSession: true,
      autoRefreshToken: true,
      // Web finishes the OAuth redirect by reading the URL; native does it manually.
      detectSessionInUrl: isWeb,
    },
  },
);

// On native, only refresh tokens while the app is in the foreground.
if (!isWeb) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
