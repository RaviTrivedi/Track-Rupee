import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/theme';

type BalanceCardProps = { balance: string; accountCount: number };

export function BalanceCard({ balance, accountCount }: BalanceCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Total balance</Text>
      <View style={styles.row}>
        <Text style={styles.amount}>₹{balance}</Text>
        <Text style={styles.meta}>{accountCount} {'account(s)'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xl, backgroundColor: colors.primary, borderTopRightRadius: radii.brand, borderBottomLeftRadius: radii.brand, paddingHorizontal: spacing.xl, paddingVertical: 26 },
  label: { color: colors.white, fontFamily: fonts.semiBold, fontSize: 20 },
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  amount: { color: colors.white, fontFamily: fonts.bold, fontSize: 36, letterSpacing: -1.4 },
  meta: { color: colors.white, fontFamily: fonts.semiBold, fontSize: 14, paddingBottom: 5 },
});
