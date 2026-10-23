import { Redirect } from 'expo-router';
import React from 'react';

/** Unknown URL -> back to the entry route, which applies the auth rules. */
export default function NotFound() {
  return <Redirect href="/" />;
}
