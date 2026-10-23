import { Redirect } from 'expo-router';
import React from 'react';

import { FullScreenLoader } from '@/components/FullScreenLoader';
import { useAuth } from '@/context/AuthContext';

/** Entry route: wait for the session to be restored, then send the user on. */
export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenLoader label="Checking your session…" />;
  return <Redirect href={session ? '/dashboard' : '/login'} />;
}
