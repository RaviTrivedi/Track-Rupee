import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radii, spacing } from '@/theme';

type PrimaryButtonProps = Omit<ComponentProps<typeof Pressable>, 'children'> & {
  label: string;
};

export function PrimaryButton({ label, style, ...pressableProps }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={(state) => [
        styles.button,
        state.pressed && styles.pressed,
        pressableProps.disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...pressableProps}>
      <Text style={styles.label}>{label}</Text>
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
});
