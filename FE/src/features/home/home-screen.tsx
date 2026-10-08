import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Screen } from '@/components/screen';
import { useAppSelector } from '@/store/hooks';
import { colors, fonts, spacing } from '@/theme';
import { BalanceCard } from './components/balance-card';
import { CategoryPreview } from './components/category-preview';
import { EmptyStateCard } from './components/empty-state-card';
import { HomeHeader } from './components/home-header';
import { MainHeader } from './components/main-header';
import { useGetAccountsQuery } from '@/features/accounts/accounts.api';
import { useGetCategoriesQuery } from '@/features/categories/categories.api';
import { QuickActionCard } from './components/quick-action-card';

export function HomeScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const { data: categoryData } = useGetCategoriesQuery();
  const apiCategories = categoryData?.data.categories ?? [];
  const orderCategories = (items: typeof apiCategories) => [...items].sort((a, b) => Number(a.name.toLowerCase().startsWith('other')) - Number(b.name.toLowerCase().startsWith('other')) || a.name.localeCompare(b.name));
  const incomeCategories = orderCategories(apiCategories.filter((category) => category.type === 'INCOME')).map((category) => ({ ...category, icon: category.icon ?? 'category', color: category.color ?? '#F6ECC9' }));
  const expenseCategories = orderCategories(apiCategories.filter((category) => category.type === 'EXPENSE')).map((category) => ({ ...category, icon: category.icon ?? 'category', color: category.color ?? '#F6ECC9' }));
  const { data } = useGetAccountsQuery();
  const accounts = data?.data.accounts ?? [];
  const totalCents = accounts.reduce((sum, account) => sum + Math.round(Number(account.balance) * 100), 0);
  const balance = Math.floor(totalCents / 100) + '.' + String(totalCents % 100).padStart(2, '0');
  const accountCount = accounts.length;
  console.log("accountCount ---", accountCount);

  const hasAccount = accountCount > 0;

  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.content}>
        <MainHeader title="Home" />
        <BalanceCard balance={balance} accountCount={accountCount} />

        {!hasAccount && (
          <View style={styles.setupCard}>
            <Text style={styles.setupTitle}>Start with your first account</Text>
            <Text style={styles.setupDescription}>Add cash, bank, or wallet accounts to begin tracking your INR balance.</Text>
            <Text
              accessibilityRole="button"
              onPress={() => router.navigate('/(main)/profile')}
              style={styles.setupAction}>
              Add your first account
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actions}>
            <QuickActionCard disabled={!hasAccount} icon="add-circle" label="Add income" />
            <QuickActionCard disabled={!hasAccount} icon="remove-circle" label="Add expense" />
          </View>
        </View>

        <CategoryPreview type="INCOME" categories={incomeCategories} onPress={() => router.push('/categories')} onCategoryPress={() => router.push('/categories?type=INCOME')} />
        <CategoryPreview type="EXPENSE" categories={expenseCategories} onPress={() => router.push('/categories')} onCategoryPress={() => router.push('/categories?type=EXPENSE')} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent transactions</Text>
          <EmptyStateCard icon="receipt-long" message="No transactions yet." />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budgets</Text>
          <EmptyStateCard icon="savings" message="Create a budget to control your spending." />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.lg, paddingBottom: spacing.x7l },
  content: { gap: spacing.md },
  setupCard: { gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface, padding: spacing.lg },
  setupTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
  setupDescription: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21 },
  setupAction: { color: colors.primary, fontFamily: fonts.bold, fontSize: 15, marginTop: spacing.sm },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  actions: { flexDirection: 'row', gap: spacing.md },
});
