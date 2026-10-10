import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radii, spacing, typography } from '@/theme';

type FormFieldProps = ComponentProps<typeof TextInput> & {
  label: string;
  rightElement?: ReactNode;
};

export function FormField({ label, style, rightElement, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}><TextInput accessibilityLabel={label} placeholderTextColor={colors.textMuted} selectionColor={colors.primary} style={[styles.input, style]} {...inputProps} />{rightElement}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: typography.label,
  input: {
    flex: 1,
    minHeight: 56,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: radii.md,
    backgroundColor: 'transparent',
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputWrap: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radii.md, backgroundColor: colors.white, paddingRight: spacing.md },
});
