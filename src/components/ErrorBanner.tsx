import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.wrap}>
      <Ionicons name="alert-circle" size={20} color={colors.danger} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityLabel="Dismiss error" hitSlop={10}>
          <Ionicons name="close" size={18} color={colors.danger} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  icon: { marginTop: 1 },
  text: { flex: 1, color: colors.danger, fontSize: 14, lineHeight: 20 },
});
