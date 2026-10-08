import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/theme';

type EmptyStateCardProps = { icon: 'receipt-long' | 'savings'; message: string };

export function EmptyStateCard({ icon, message }: EmptyStateCardProps) {
  return (
    <View style={styles.card}>
      <MaterialIcons name={icon} size={28} color={colors.textMuted} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: spacing.lg, backgroundColor: colors.surface },
  message: { color: colors.textMuted, fontFamily: fonts.semiBold, fontSize: 14 },
});
