import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Alert,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Screen } from "@/components/screen";
import { MainHeader } from "@/features/home/components/main-header";
import { useGetAccountsQuery } from "@/features/accounts/accounts.api";
import { useGetCategoriesQuery } from "@/features/categories/categories.api";
import { TransactionModal } from "@/features/transactions/components/transaction-modal";
import {
  useCreateTransactionMutation,
  useDeleteTransactionMutation,
  useGetTransactionsQuery,
  useUpdateTransactionMutation,
} from "@/features/transactions/transactions.api";
import type {
  TransactionDraft,
  TransactionType,
} from "@/features/transactions/transaction.types";
import type { Transaction } from "@/features/transactions/transactions.api";
import { colors, fonts, radii, spacing, typography } from "@/theme";

const blank: TransactionDraft = {
  type: "EXPENSE",
  amount: "",
  accountId: "",
  categoryId: "",
  date: new Date().toISOString().slice(0, 10),
  note: "",
};
const money = (v: string) =>
  Number(v).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const monthName = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
const dateLabel = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function TransactionsScreen() {
  const params = useLocalSearchParams<{ type?: string; open?: string }>();
  const [filter, setFilter] = useState<TransactionType | "ALL">("ALL");
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [visible, setVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    data: txData,
    isLoading,
    isFetching,
    error: txError,
  } = useGetTransactionsQuery(filter === "ALL" ? undefined : { type: filter });
  const { data: accountData } = useGetAccountsQuery();
  const { data: categoryData } = useGetCategoriesQuery();
  const [create, createState] = useCreateTransactionMutation();
  const [update, updateState] = useUpdateTransactionMutation();
  const [remove] = useDeleteTransactionMutation();
  const transactions = [...(txData?.data.transactions ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const groups = useMemo(
    () =>
      transactions.reduce<Record<string, Transaction[]>>((r, x) => {
        const key = x.date.slice(0, 7);
        (r[key] ??= []).push(x);
        return r;
      }, {}),
    [transactions]
  );
  const accounts = (accountData?.data.accounts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
  }));
  const allCategories = categoryData?.data.categories ?? [];
  const categories = allCategories
    .filter((c) => c.type === draft.type)
    .map((c) => ({ id: c.id, name: c.name }));
  useEffect(() => {
    if (params.type === "INCOME" || params.type === "EXPENSE") {
      setDraft((current) => ({ ...current, type: params.type as TransactionType, categoryId: "" }));
    }
    if (params.open === "1") setVisible(true);
  }, [params.open, params.type]);
  const message = (e: unknown) =>
    (e as { data?: { message?: string } }).data?.message ??
    "Unable to complete the request.";
  const open = (item?: Transaction) => {
    setEditing(item ?? null);
    setDraft(
      item
        ? {
          type: item.type,
          amount: item.amount,
          accountId: item.accountId,
          categoryId: item.categoryId,
          date: item.date.slice(0, 10),
          note: item.note ?? "",
        }
        : blank
    );
    setFormError(null);
    setVisible(true);
  };
  const save = async () => {
    setFormError(null);
    if (!/^\d+(\.\d{1,2})?$/.test(draft.amount) || Number(draft.amount) <= 0)
      return setFormError(
        "Enter a positive INR amount with at most two decimal places."
      );
    if (!draft.accountId || !draft.categoryId || !draft.date)
      return setFormError("Select an account, category, and date.");
    const payload = {
      type: draft.type,
      amount: draft.amount,
      accountId: draft.accountId,
      categoryId: draft.categoryId,
      date: `${draft.date}T12:00:00+05:30`,
      note: draft.note || null,
    };
    try {
      if (editing) await update({ id: editing.id, data: payload }).unwrap();
      else await create(payload).unwrap();
      setVisible(false);
    } catch (e) {
      setFormError(message(e));
    }
  };
  const deleteItem = (item: Transaction) =>
    Alert.alert("Delete transaction", "Delete this transaction?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(item.id).unwrap();
          } catch (e) {
            setRequestError(message(e));
          }
        },
      },
    ]);
  return (
    <Screen contentContainerStyle={styles.screen}>
      <MainHeader title="Transactions" />
      <View style={styles.tabs}>
        {(["ALL", "INCOME", "EXPENSE"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setFilter(tab)}
            style={[styles.tab, filter === tab && styles.activeTab]}
          >
            <Text style={[styles.tabText, filter === tab && styles.activeText]}>
              {tab === "ALL" ? "All" : tab === "INCOME" ? "Income" : "Expense"}
            </Text>
            {filter === tab && <View style={styles.activeIndicator} />}
          </Pressable>
        ))}
      </View>
      <View style={styles.heading}>
        <Text style={styles.title}>Transaction history</Text>
        <Pressable onPress={() => open()}>
          <Text style={styles.add}>+ Add transaction</Text>
        </Pressable>
      </View>
      {requestError && <Text style={styles.error}>{requestError}</Text>}
      {isLoading || isFetching ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={typography.body}>Loading transactions...</Text>
        </View>
      ) : txError ? (
        <Text style={styles.error}>{message(txError)}</Text>
      ) : transactions.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="receipt-long" size={42} color={colors.primary} />
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={typography.body}>
            Add income or expenses to see them here.
          </Text>
        </View>
      ) : (
        <View style={styles.groups}>
          {Object.entries(groups).map(([month, rows]) => (
            <View key={month} style={styles.group}>
              <Text style={styles.month}>{monthName(`${month}-01`)}</Text>
              {rows.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => open(item)}
                  style={styles.rowItem}
                >
                  <View style={styles.icon}>
                    <MaterialIcons
                      name="category"
                      size={21}
                      color={colors.text}
                    />
                  </View>
                  <View style={styles.details}>
                    <Text style={styles.category}>
                      {allCategories.find((c) => c.id === item.categoryId)
                        ?.name ?? "Category"}
                    </Text>
                    <Text style={styles.secondary}>
                      {dateLabel(item.date)} ·{" "}
                      {accounts.find((a) => a.id === item.accountId)?.name ??
                        "Account"}
                    </Text>
                  </View>
                  <View style={styles.amountBox}>
                    <Text
                      style={[
                        styles.amount,
                        item.type === "INCOME" ? styles.income : styles.expense,
                      ]}
                    >
                      {item.type === "INCOME" ? "+" : "−"}₹{money(item.amount)}
                    </Text>
                    <Pressable onPress={() => deleteItem(item)} hitSlop={8}>
                      <MaterialIcons
                        name="delete-outline"
                        size={18}
                        color={colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      )}
      <TransactionModal
        visible={visible}
        editing={Boolean(editing)}
        draft={draft}
        accounts={accounts}
        categories={categories}
        error={formError}
        submitting={createState.isLoading || updateState.isLoading}
        onChange={setDraft}
        onClose={() => setVisible(false)}
        onSave={() => void save()}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  activeTab: {},
  tabText: { color: colors.textMuted, fontFamily: fonts.semiBold },
  activeText: { color: colors.primary },
  activeIndicator: { width: "100%", height: 2, marginTop: spacing.sm, backgroundColor: colors.primary },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: spacing.lg
  },
  title: typography.heading,
  add: { color: colors.primary, fontFamily: fonts.semiBold },
  groups: { gap: spacing.xl },
  group: { gap: spacing.xs },
  month: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  rowItem: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: "#F6ECC9",
  },
  details: { flex: 1 },
  category: { color: colors.text, fontFamily: fonts.semiBold, fontSize: 15 },
  secondary: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  amountBox: { alignItems: "flex-end", gap: spacing.xs },
  amount: { fontFamily: fonts.bold, fontSize: 15 },
  income: { color: "#27734A" },
  expense: { color: "#B42318" },
  empty: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xxxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  emptyTitle: typography.heading,
  state: { alignItems: "center", gap: spacing.md, padding: spacing.xl },
  error: { ...typography.caption, color: "#B42318" },
});




