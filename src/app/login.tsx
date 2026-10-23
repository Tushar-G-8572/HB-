import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { ENV, isConfigured } from '@/config/env';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, shadow } from '@/theme';

export default function LoginScreen() {
  const { session, loading, signingIn, error, signInWithGoogle, clearError } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) return <FullScreenLoader label="Checking your session…" />;
  if (session) return <Redirect href="/dashboard" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.logo}>
          <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Welcome to HB+ Portal
        </Text>
        <Text style={styles.subtitle}>
          Sign in with your official <Text style={styles.domain}>@{ENV.allowedDomain}</Text> Google
          account to continue.
        </Text>

        {!isConfigured ? (
          <ErrorBanner message="App is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see README)." />
        ) : null}
        {error ? <ErrorBanner message={error} onDismiss={clearError} /> : null}

        <Button
          testID="google-signin"
          variant="google"
          icon="logo-google"
          title={signingIn ? 'Signing you in…' : 'Login with Google'}
          loading={signingIn}
          disabled={!isConfigured}
          onPress={signInWithGoogle}
        />

        <View style={styles.divider} />
        <View style={styles.note}>
          <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
          <Text style={styles.noteText}>
            Access is limited to @{ENV.allowedDomain} accounts. Other Google accounts will be
            rejected.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    gap: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
  domain: { color: colors.primary, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 4 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', justifyContent: 'center' },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.textMuted },
});
