import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

export function Avatar({ name, uri, size = 44 }: { name: string; uri?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials =
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const box = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, box]}
        onError={() => setFailed(true)}
        accessibilityLabel={`${name} avatar`}
      />
    );
  }
  return (
    <View style={[styles.fallback, box]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  fallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.primary, fontWeight: '700' },
});
