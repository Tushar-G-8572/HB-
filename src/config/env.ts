/**
 * Central place for runtime configuration.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` at build time, so these values are
 * baked into the bundle. Only put PUBLIC values here (Supabase URL + anon key).
 * Never put a service-role key in an EXPO_PUBLIC_ variable.
 */
export const ENV = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '',
  /** Only emails ending in `@<allowedDomain>` may sign in. */
  allowedDomain: (process.env.EXPO_PUBLIC_ALLOWED_DOMAIN ?? 'hbplus.fit')
    .trim()
    .toLowerCase()
    .replace(/^@/, ''),
};

export const isConfigured = Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
