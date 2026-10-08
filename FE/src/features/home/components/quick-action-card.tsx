import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fonts, radii, spacing } from '@/theme';

type QuickActionCardProps = { icon: 'add-circle' | 'remove-circle'; label: string; disabled?: boolean; onPress?: () => void };

export function QuickActionCard({ icon, label, disabled, onPress }: QuickActionCardProps) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.card, disabled && styles.disabled]}>
      <MaterialIcons name={icon} size={24} color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radii.md, backgroundColor: colors.surface },
  disabled: { opacity: 0.5 },
  label: { color: colors.text, fontFamily: fonts.semiBold, fontSize: 14 },
});
