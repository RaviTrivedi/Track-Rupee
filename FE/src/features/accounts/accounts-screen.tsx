import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Screen } from "@/components/screen";
import { PrimaryButton } from "@/components/primary-button";
import { colors, fonts, radii, spacing, typography } from "@/theme";
import { headerAddButtonStyle } from "@/features/home/components/home-header";
import { MainHeader } from "@/features/home/components/main-header";
import { AccountFormModal } from "./components/account-form-modal";
import { AccountCard } from "./components/account-card";
import type { AccountType } from "./accounts.types";
import {
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useGetAccountsQuery,
  useUpdateAccountMutation,
} from "./accounts.api";

const amountPattern = /^(?:0|[1-9]\d*)(?:\.\d{0,2})?$/;
const requestMessage = (error: unknown) =>
  (error as { data?: { message?: string } }).data?.message ??
  "Unable to load accounts. Please try again.";

export function AccountsScreen() {
  const {
    data,
    error: loadError,
    isLoading,
    isFetching,
    refetch,
  } = useGetAccountsQuery();
  const [createAccount, createState] = useCreateAccountMutation();
  const [updateAccount, updateState] = useUpdateAccountMutation();
  const [deleteAccount] = useDeleteAccountMutation();
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType | "">("");
  const [openingBalance, setOpeningBalance] = useState("0.00");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const accounts = data?.data.accounts ?? [];
  const totalCents = accounts.reduce(
    (sum, account) => sum + Math.round(Number(account.balance) * 100),
    0
  );
  const total =
    Math.floor(totalCents / 100) +
    "." +
    String(totalCents % 100).padStart(2, "0");

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );
  const openForm = () => {
    setEditingId(null);
    setName("");
    setType("");
    setOpeningBalance("0.00");
    setError(null);
    setVisible(true);
  };
  const openEdit = (account: (typeof accounts)[number]) => {
    setEditingId(account.id);
    setName(account.name);
    setType(account.type);
    setOpeningBalance(account.openingBalance);
    setError(null);
    setVisible(true);
  };
  const closeForm = () => {
    if (!createState.isLoading && !updateState.isLoading) {
      setVisible(false);
      setError(null);
    }
  };
  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Account name is required.");
    if (!editingId && !type) return setError("Account type is required.");
    if (editingId) {
      try {
        await updateAccount({ id: editingId, name: name.trim() }).unwrap();
        setVisible(false);
      } catch (requestError) {
        setError(requestMessage(requestError));
      }
      return;
    }
    if (!amountPattern.test(openingBalance) || Number(openingBalance) < 0)
      return setError(
        "Opening balance must be a non-negative amount with at most two decimal places."
      );
    try {
      await createAccount({
        name: name.trim(),
        type: type as AccountType,
        openingBalance,
      }).unwrap();
      setName("");
      setType("");
      setOpeningBalance("0.00");
      setVisible(false);
    } catch (requestError) {
      setError(requestMessage(requestError));
    }
  };

  return (
    <>
      <Screen keyboardAware contentContainerStyle={styles.screen}>
        <View style={styles.content}>
          <MainHeader title="Accounts" />
          <View style={styles.balance}>
            <Text style={styles.balanceLabel}>Total balance</Text>
            <Text style={styles.balanceAmount}>₹{total}</Text>
          </View>
          {isLoading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.primary} />
              <Text style={typography.body}>Loading accounts…</Text>
            </View>
          ) : loadError ? (
            <View style={styles.state}>
              <Text style={styles.error}>{requestMessage(loadError)}</Text>
              <PrimaryButton label="Retry" onPress={() => void refetch()} />
            </View>
          ) : accounts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No accounts yet</Text>
              <Text style={styles.emptyText}>
                Add your first account to start tracking your money.
              </Text>
              <PrimaryButton label="Add account" onPress={openForm} />
            </View>
          ) : (
            <View style={styles.list}>
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>Your accounts</Text>
                {isFetching && <ActivityIndicator color={colors.primary} />}
              </View>
              {accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={() => openEdit(account)}
                  onDelete={() =>
                    Alert.alert("Delete account", `Delete ${account.name}?`, [
                      { text: "Cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => void deleteAccount(account.id),
                      },
                    ])
                  }
                />
              ))}
              <PrimaryButton label="Add account" onPress={openForm} />
            </View>
          )}
        </View>
      </Screen>
      <AccountFormModal
        visible={visible}
        name={name}
        type={type}
        openingBalance={openingBalance}
        error={error}
        editing={Boolean(editingId)}
        submitting={createState.isLoading || updateState.isLoading}
        onNameChange={setName}
        onTypeChange={setType}
        onBalanceChange={setOpeningBalance}
        onCancel={closeForm}
        onSubmit={() => void submit()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  content: { gap: spacing.md },
  balance: {
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderTopRightRadius: radii.brand,
    borderBottomLeftRadius: radii.brand,
    padding: spacing.xl,
  },
  balanceLabel: {
    color: colors.white,
    fontFamily: fonts.semiBold,
    fontSize: 18,
  },
  balanceAmount: { color: colors.white, fontFamily: fonts.bold, fontSize: 36 },
  empty: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  emptyTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  emptyText: typography.body,
  list: { gap: spacing.md },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  state: { alignItems: "center", gap: spacing.md, padding: spacing.xl },
  error: { ...typography.body, color: "#B42318", textAlign: "center" },
});


