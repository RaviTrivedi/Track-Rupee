import type { ComponentProps } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radii, spacing, typography } from '@/theme';

type FormFieldProps = ComponentProps<typeof TextInput> & {
  label: string;
};

export function FormField({ label, style, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: typography.label,
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
