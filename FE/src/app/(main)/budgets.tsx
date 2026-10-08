import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AnimatedSheet } from '@/components/animated-sheet';
import { Screen } from '@/components/screen';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { MainHeader } from '@/features/home/components/main-header';
import { useGetCategoriesQuery } from '@/features/categories/categories.api';
import {
  useCreateBudgetMutation,
  useDeleteBudgetMutation,
  useGetBudgetsQuery,
  useUpdateBudgetMutation,
} from '@/features/budgets/budgets.api';
import type { Budget } from '@/features/budgets/budgets.api';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import { formatInr } from '@/utils/currency';
const monthNow = new Date().getMonth() + 1;
const yearNow = new Date().getFullYear();
export default function BudgetsScreen() {
  const [month, setMonth] = useState(monthNow);
  const [year] = useState(yearNow);
  const [selected, setSelected] = useState<Budget | null>(null);
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, error: loadError } = useGetBudgetsQuery({ month, year });
  const { data: cats } = useGetCategoriesQuery('EXPENSE');
  const [create, creating] = useCreateBudgetMutation();
  const [update, updating] = useUpdateBudgetMutation();
  const [remove] = useDeleteBudgetMutation();
  const budgets = data?.data.budgets ?? [];
  const categories = cats?.data.categories ?? [];
  const message = (e: unknown) =>
    (e as { data?: { message?: string } }).data?.message ?? 'Unable to complete the request.';
  const open = (b?: Budget) => {
    setSelected(b ?? null);
    setAmount(b?.amount ?? '');
    setCategoryId(b?.categoryId ?? categories[0]?.id ?? '');
    setError(null);
    setVisible(true);
  };
  const save = async () => {
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0)
      return setError('Enter a positive INR amount with at most two decimal places.');
    try {
      if (selected) await update({ id: selected.id, amount }).unwrap();
      else await create({ categoryId, amount, month, year }).unwrap();
      setVisible(false);
    } catch (e) {
      setError(message(e));
    }
  };
  return (
    <Screen contentContainerStyle={styles.screen}>
      <MainHeader title="Budgets" />
      <View style={styles.month}>
        <Pressable onPress={() => setMonth((m) => (m === 1 ? 12 : m - 1))}>
          <MaterialIcons name="chevron-left" size={26} color={colors.primary} />
        </Pressable>
        <Text style={styles.monthText}>
          {new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
            month: 'long',
            year: 'numeric',
          })}
        </Text>
        <Pressable onPress={() => setMonth((m) => (m === 12 ? 1 : m + 1))}>
          <MaterialIcons name="chevron-right" size={26} color={colors.primary} />
        </Pressable>
      </View>
      {isLoading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={typography.body}>Loading budgets...</Text>
        </View>
      ) : loadError ? (
        <Text style={styles.error}>{message(loadError)}</Text>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Total planned budget</Text>
            <Text style={styles.summaryAmount}>
              ₹{formatInr(budgets.reduce((s, b) => s + Number(b.amount), 0))}
            </Text>
          </View>
          <View style={styles.heading}>
            <Text style={styles.title}>Expense budgets</Text>
            <Pressable onPress={() => open()}>
              <Text style={styles.add}>+ Add budget</Text>
            </Pressable>
          </View>
          {budgets.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No budgets yet</Text>
              <Text style={typography.body}>Create a budget to control your spending.</Text>
              <PrimaryButton label="Add budget" onPress={() => open()} />
            </View>
          ) : (
            <View style={styles.list}>
              {budgets.map((b) => (
                <Pressable key={b.id} onPress={() => open(b)} style={styles.card}>
                  <View style={styles.top}>
                    <View style={styles.icon}>
                      <MaterialIcons name="category" size={22} color={colors.text} />
                    </View>
                    <View style={styles.details}>
                      <Text style={styles.name}>
                        {categories.find((c) => c.id === b.categoryId)?.name ?? 'Category'}
                      </Text>
                      <Text style={styles.meta}>
                        ₹{formatInr(b.spent)} spent of ₹{formatInr(b.amount)}
                      </Text>
                    </View>
                    <Text style={[styles.percent, b.isOverBudget && styles.over]}>
                      {Math.round(b.percentageUsed)}%
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.progress,
                        { width: `${Math.min(b.percentageUsed, 100)}%` },
                        b.isOverBudget && styles.overBg,
                      ]}
                    />
                  </View>
                  <View style={styles.bottom}>
                    <Text style={styles.meta}>
                      {b.isOverBudget
                        ? `₹${formatInr(Math.abs(Number(b.remaining)))} over budget`
                        : `₹${formatInr(b.remaining)} remaining`}
                    </Text>
                    {b.isOverBudget && (
                      <Pressable
                        onPress={() =>
                          Alert.alert('Delete budget', 'Delete this budget?', [
                            { text: 'Cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => void remove(b.id),
                            },
                          ])
                        }
                      >
                        <Text style={styles.over}>Delete</Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
      <AnimatedSheet visible={visible} onClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selected ? 'Edit budget' : 'Add budget'}</Text>
              <Pressable onPress={() => setVisible(false)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            {!selected && (
              <>
                <Text style={styles.label}>Expense category</Text>
                <View style={styles.options}>
                  {categories.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => setCategoryId(c.id)}
                      style={[styles.option, categoryId === c.id && styles.selected]}
                    >
                      <Text style={[styles.optionText, categoryId === c.id && styles.selectedText]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            <FormField
              label="Budget amount (INR)"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actions}>
              <Pressable style={styles.cancel} onPress={() => setVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <View style={styles.save}>
                <PrimaryButton
                  disabled={creating.isLoading || updating.isLoading}
                  label="Save"
                  onPress={() => void save()}
                />
              </View>
            </View>
          </View>
        </View>
      </AnimatedSheet>
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  month: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  monthText: { color: colors.text, fontFamily: fonts.bold },
  summary: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    marginTop: spacing.lg,
    borderTopRightRadius: radii.brand,
    borderBottomLeftRadius: radii.brand,
    gap: spacing.sm,
  },
  summaryLabel: { color: colors.white, fontFamily: fonts.semiBold },
  summaryAmount: { color: colors.white, fontFamily: fonts.bold, fontSize: 32 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.lg },
  title: typography.heading,
  add: { color: colors.primary, fontFamily: fonts.semiBold },
  list: { gap: spacing.md },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: '#F6ECC9',
  },
  details: { flex: 1 },
  name: { color: colors.text, fontFamily: fonts.bold },
  meta: { ...typography.caption, color: colors.textMuted },
  percent: { color: colors.primary, fontFamily: fonts.bold },
  over: { color: '#B42318', fontFamily: fonts.bold },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progress: { height: '100%', backgroundColor: colors.primary },
  overBg: { backgroundColor: '#B42318' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: typography.heading,
  state: { alignItems: 'center', gap: spacing.md },
  error: { ...typography.caption, color: '#B42318' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8,18,38,0.35)',
  },
  modal: {
    gap: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.xl,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  modalTitle: typography.heading,
  label: typography.label,
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
  },
  selected: { backgroundColor: colors.primary },
  optionText: { color: colors.textMuted, fontFamily: fonts.semiBold },
  selectedText: { color: colors.white },
  actions: { flexDirection: 'row', gap: spacing.md },
  cancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
  },
  cancelText: { color: colors.text },
  save: { flex: 1 },
});



