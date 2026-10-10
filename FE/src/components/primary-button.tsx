import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/theme';

type PrimaryButtonProps = Omit<ComponentProps<typeof Pressable>, 'children'> & {
  label: string;
  loading?: boolean;
};

export function PrimaryButton({ label, loading = false, style, ...pressableProps }: PrimaryButtonProps) {
  const disabled = loading || Boolean(pressableProps.disabled);
  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled}
      style={(state) => [
        styles.button,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      >
      {loading ? (
        <View style={styles.loadingContent}>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.label}>Saving...</Text>
        </View>
      ) : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.primaryPressed,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
