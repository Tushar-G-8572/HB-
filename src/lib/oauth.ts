import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { RESTRICTED_MESSAGE } from '@/lib/domain';
import { supabase } from '@/lib/supabase';

// Needed so the auth popup/tab can close itself when it returns to the app.
WebBrowser.maybeCompleteAuthSession();

/** Parses `?a=1&b=2` and `#a=1&b=2` params from a URL (OAuth uses either). */
export function parseAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hash = url.indexOf('#');
  const query = url.indexOf('?');

  const read = (chunk: string) => {
    chunk.split('&').forEach((pair) => {
      if (!pair) return;
      const [key, ...rest] = pair.split('=');
      try {
        params[decodeURIComponent(key)] = decodeURIComponent(rest.join('=').replace(/\+/g, ' '));
      } catch {
        params[key] = rest.join('=');
      }
    });
  };

  if (query !== -1) read(url.slice(query + 1, hash > query ? hash : undefined));
  if (hash !== -1) read(url.slice(hash + 1));
  return params;
}

/** Turns raw provider / Supabase errors into text that is safe to show. */
export function toFriendlyError(raw: string): string {
  const message = raw.toLowerCase();
  if (
    message.includes('restricted') ||
    message.includes('database error saving new user') || // our DB trigger rejected the signup
    message.includes('domain')
  ) {
    return RESTRICTED_MESSAGE;
  }
  if (message.includes('access_denied') || message.includes('cancel')) {
    return 'Sign-in was cancelled. Please try again.';
  }
  return 'Sign-in failed. Please try again.';
}

// Web: after Google redirects back, an error (e.g. rejected domain) arrives in
// the URL. Read it at import time, before supabase-js processes/clears the URL.
function readInitialUrlError(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const params = parseAuthParams(window.location.href);
  const raw = params.error_description ?? params.error;
  return raw ? toFriendlyError(raw) : null;
}
export const initialUrlError = readInitialUrlError();

function googleQueryParams() {
  return { prompt: 'select_account' };
}

/**
 * Starts the Google sign-in.
 *  - Web:    full-page redirect to Google, then back to this origin.
 *  - Native: opens the system browser sheet and finishes via a deep link.
 * Resolves quietly when the user cancels; throws on real failures.
 */
export async function startGoogleSignIn(): Promise<void> {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams: googleQueryParams() },
    });
    if (error) throw error;
    return;
  }

  const redirectTo = Linking.createURL('/');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: googleQueryParams() },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('No authorization URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return; // dismissed / cancelled

  const params = parseAuthParams(result.url);
  if (params.error || params.error_description) {
    throw new Error(params.error_description ?? params.error);
  }
  if (params.access_token && params.refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (sessionError) throw sessionError;
  }
}
