import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ENV } from '@/config/env';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, MAX_CONTENT_WIDTH, radius, shadow, WIDE_BREAKPOINT } from '@/theme';
import type { Profile } from '@/types';

function formatDateTime(value?: string | number | Date | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function DashboardScreen() {
  const { user, session, profile, isAdmin, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  const [signingOut, setSigningOut] = useState(false);
  const [members, setMembers] = useState<Profile[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Admin-only data. Row Level Security on the database enforces this too:
  // a normal user calling the same query only ever gets their own row back.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setMembersError(error.message);
        else setMembers((data ?? []) as Profile[]);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!user) return null; // the route guard normally prevents this

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const email = user.email ?? '';
  const name = profile?.full_name ?? meta.full_name ?? meta.name ?? email.split('@')[0];
  const avatar = profile?.avatar_url ?? meta.avatar_url ?? meta.picture ?? null;
  const role = profile?.role ?? 'user';
  const expiresAt = session?.expires_at ? session.expires_at * 1000 : null;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(); // the route guard then redirects to /login
    } finally {
      setSigningOut(false);
    }
  };

  const stats = [
    { icon: 'ribbon-outline', label: 'Role', value: role === 'admin' ? 'Admin' : 'User' },
    { icon: 'shield-checkmark-outline', label: 'Domain verified', value: `@${ENV.allowedDomain}` },
    { icon: 'time-outline', label: 'Last login', value: formatDateTime(profile?.last_login_at) },
    { icon: 'key-outline', label: 'Session refreshes by', value: formatDateTime(expiresAt) },
  ] as const;

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBarInner}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.brandText}>HB+ Portal</Text>
          </View>
          <Button
            testID="logout"
            title="Logout"
            icon="log-out-outline"
            variant="outline"
            loading={signingOut}
            onPress={handleSignOut}
            style={styles.logout}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.container}>
          {/* Welcome card */}
          <View style={[styles.card, styles.welcome, wide && styles.welcomeWide]}>
            <Avatar name={name} uri={avatar} size={64} />
            <View style={styles.welcomeText}>
              <Text style={styles.hello}>Welcome back,</Text>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {email}
              </Text>
            </View>
            <Badge label={role === 'admin' ? 'ADMIN' : 'USER'} tone={role === 'admin' ? 'primary' : 'neutral'} />
          </View>

          {/* Stat cards */}
          <View style={[styles.grid, wide && styles.gridWide]}>
            {stats.map((s) => (
              <View key={s.label} style={[styles.card, styles.stat, wide && styles.statWide]}>
                <View style={styles.statIcon}>
                  <Ionicons name={s.icon} size={18} color={colors.primary} />
                </View>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue} numberOfLines={2}>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Role-based section */}
          {isAdmin ? (
            <View style={styles.card}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Team members</Text>
                <Badge label="Admin only" tone="primary" />
              </View>

              {membersError ? <ErrorBanner message={membersError} /> : null}
              {!members && !membersError ? (
                <ActivityIndicator color={colors.primary} style={styles.membersLoader} />
              ) : null}

              {members?.map((m, i) => (
                <View key={m.id} style={[styles.memberRow, i > 0 && styles.memberRowBorder]}>
                  <Avatar name={m.full_name ?? m.email} uri={m.avatar_url} size={36} />
                  <View style={styles.memberText}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.full_name ?? m.email.split('@')[0]}
                    </Text>
                    <Text style={styles.memberEmail} numberOfLines={1}>
                      {m.email}
                    </Text>
                  </View>
                  <Badge label={m.role.toUpperCase()} tone={m.role === 'admin' ? 'primary' : 'neutral'} />
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.card, styles.userCard]}>
              <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
              <View style={styles.userCardText}>
                <Text style={styles.sectionTitle}>Standard access</Text>
                <Text style={styles.muted}>
                  You are signed in as a regular user. Admin tools are only visible to accounts with the
                  admin role.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  topBarInner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { fontSize: 17, fontWeight: '800', color: colors.text },
  logout: { minHeight: 40, paddingHorizontal: 14 },

  content: { padding: 20 },
  container: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', gap: 16 },

  card: {
    padding: 20,
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  welcome: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  welcomeWide: { padding: 24 },
  welcomeText: { flex: 1, gap: 2 },
  hello: { fontSize: 13, color: colors.textMuted },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  email: { fontSize: 14, color: colors.textMuted },

  grid: { gap: 16 },
  gridWide: { flexDirection: 'row' },
  stat: { gap: 6 },
  statWide: { flex: 1 },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.text },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  muted: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  membersLoader: { paddingVertical: 16 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  memberRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  memberText: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: colors.text },
  memberEmail: { fontSize: 13, color: colors.textMuted },

  userCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  userCardText: { flex: 1, gap: 4 },
});
