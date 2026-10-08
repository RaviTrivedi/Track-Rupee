import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/screen';
import { MainHeader } from '@/features/home/components/main-header';
import { colors, spacing, typography } from '@/theme';

export default function TransactionsScreen() {
  return <Screen contentContainerStyle={styles.screen}><MainHeader title="Transactions" /><Text style={typography.body}>Income and expense tracking will be connected in a later step.</Text><Text style={styles.placeholder}>Placeholder screen</Text></Screen>;
}
const styles = StyleSheet.create({ screen: { gap: spacing.xl }, placeholder: { ...typography.label, color: colors.primary } });
