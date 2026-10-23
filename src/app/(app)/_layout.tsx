import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { FullScreenLoader } from '@/components/FullScreenLoader';
import { useAuth } from '@/context/AuthContext';

/**
 * Route guard for everything inside the (app) group.
 * Visiting /dashboard directly without a valid session redirects to /login,
 * and nothing in this group renders until the session check has finished.
 */
export default function ProtectedLayout() {
  const { session, loading } = useAuth();

  if (loading) return <FullScreenLoader label="Checking your session…" />;
  if (!session) return <Redirect href="/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
