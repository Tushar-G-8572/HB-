import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';

type Tone = 'primary' | 'success' | 'neutral';

const tones: Record<Tone, { bg: string; fg: string }> = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  neutral: { bg: '#F1F5F9', fg: colors.textMuted },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { bg, fg } = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
});
