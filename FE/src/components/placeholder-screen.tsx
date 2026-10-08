import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import { Screen } from '@/components/screen';
import { colors, currency, radii, spacing, typography } from '@/theme';

type PlaceholderScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderScreen({ title, description, children }: PlaceholderScreenProps) {
  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.currencyBadge}>
        <Text style={styles.currencyText}>
          {currency.code} {currency.symbol}
        </Text>
      </View>
      <Text style={typography.title}>{title}</Text>
      <Text style={typography.body}>{description}</Text>
      <Text style={styles.placeholder}>Placeholder screen</Text>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
  },
  currencyBadge: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  currencyText: typography.label,
  placeholder: {
    ...typography.label,
    marginTop: spacing.xl,
    color: colors.primary,
  },
});
