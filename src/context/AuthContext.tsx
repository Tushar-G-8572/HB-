import type { Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { isAllowedEmail, RESTRICTED_MESSAGE } from '@/lib/domain';
import { initialUrlError, startGoogleSignIn, toFriendlyError } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** True while we restore a saved session on app start. */
  loading: boolean;
  /** True while the Google flow is in progress. */
  signingIn: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Re-fetch "last login" at most this often (Supabase also fires SIGNED_IN on tab focus).
const LAST_LOGIN_THROTTLE_MS = 10 * 60 * 1000;

async function loadProfile(user: User): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('[auth] could not load profile:', error.message);
    return null;
  }
  if (data) return data as Profile;

  // Safety net: user exists but the signup trigger has not created a profile.
  // RLS only lets a user insert their OWN row with role = 'user'.
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: (user.email ?? '').toLowerCase(),
      full_name: meta.full_name ?? meta.name ?? null,
      avatar_url: meta.avatar_url ?? meta.picture ?? null,
    })
    .select('*')
    .single();

  if (insertError) {
    console.warn('[auth] could not create profile:', insertError.message);
    return null;
  }
  return created as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(initialUrlError);

  /**
   * Single place where a session is accepted or rejected.
   * Even if a non-allowed account somehow obtains a session, it is signed out
   * here before any protected screen can render (defence in depth).
   */
  const applySession = useCallback(async (next: Session | null, event?: string) => {
    if (!next) {
      setSession(null);
      setProfile(null);
      return;
    }

    if (!isAllowedEmail(next.user.email)) {
      setError(RESTRICTED_MESSAGE);
      setSession(null);
      setProfile(null);
      await supabase.auth.signOut({ scope: 'local' });
      return;
    }

    setSession(next);
    const loaded = await loadProfile(next.user);
    setProfile(loaded);

    if (loaded && event === 'SIGNED_IN') {
      const last = loaded.last_login_at ? new Date(loaded.last_login_at).getTime() : 0;
      if (Date.now() - last > LAST_LOGIN_THROTTLE_MS) {
        void supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', next.user.id);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    // 1) Restore the saved session on start (or finish the web OAuth redirect).
    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .finally(() => {
        if (active) setLoading(false);
      });

    // 2) React to sign-in / sign-out / token refresh.
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'INITIAL_SESSION') return; // handled by getSession() above
      // Never await supabase calls directly inside this callback (can deadlock).
      setTimeout(() => {
        void applySession(next, event).finally(() => {
          if (active) setLoading(false);
        });
      }, 0);
    });

    // Remove "?error=..." from the address bar after we have read it.
    if (Platform.OS === 'web' && initialUrlError && typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }

    // Web: if the user presses "Back" from Google, the page is restored from
    // the back/forward cache with the spinner still on - reset it.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setSigningIn(false);
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('pageshow', onPageShow);
    }

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('pageshow', onPageShow);
      }
    };
  }, [applySession]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setSigningIn(true);
    try {
      await startGoogleSignIn();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setError(toFriendlyError(raw));
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
    setProfile(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin: profile?.role === 'admin',
      loading,
      signingIn,
      error,
      signInWithGoogle,
      signOut,
      clearError,
    }),
    [session, profile, loading, signingIn, error, signInWithGoogle, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
