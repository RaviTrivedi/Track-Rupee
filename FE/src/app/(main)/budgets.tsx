import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/screen';
import { MainHeader } from '@/features/home/components/main-header';
import { colors, spacing, typography } from '@/theme';

export default function BudgetsScreen() {
  return <Screen contentContainerStyle={styles.screen}><MainHeader title="Budgets" /><Text style={typography.body}>Monthly category budgets and progress will appear here.</Text><Text style={styles.placeholder}>Placeholder screen</Text></Screen>;
}
const styles = StyleSheet.create({ screen: { gap: spacing.xl }, placeholder: { ...typography.label, color: colors.primary } });
