import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radius } from '@/theme';

type Variant = 'primary' | 'outline' | 'google';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  testID,
}: Props) {
  const inactive = disabled || loading;
  const isPrimary = variant === 'primary';
  const fg = isPrimary ? '#FFFFFF' : colors.text;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'google' && styles.google,
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator size="small" color={isPrimary ? '#FFFFFF' : colors.primary} />
        ) : icon ? (
          <Ionicons name={icon} size={18} color={fg} />
        ) : null}
        <Text style={[styles.label, { color: fg }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primary: { backgroundColor: colors.primary },
  outline: { backgroundColor: colors.surface, borderColor: colors.border },
  google: { backgroundColor: colors.surface, borderColor: '#CBD5E1' },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 15, fontWeight: '600' },
});
