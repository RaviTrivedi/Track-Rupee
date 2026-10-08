import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LocalAccount } from "@/features/accounts/accounts.types";
import { colors, fonts, radii, spacing } from "@/theme";
import { formatInr } from "@/utils/currency";

const icons = {
  CASH: "payments",
  BANK: "account-balance",
  WALLET: "account-balance-wallet",
} as const;

export function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: LocalAccount;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <MaterialIcons
          name={icons[account.type]}
          size={26}
          color={colors.text}
        />
      </View>
      <View style={styles.details}>
        <Text style={styles.name}>{account.name}</Text>
        <Text style={styles.type}>{account.type}</Text>
      </View>
      <View style={styles.actions}>
        <Text style={styles.balance}>₹{formatInr(account.balance)}</Text>
        <Pressable
          accessibilityLabel={"Edit " + account.name}
          onPress={onEdit}
          hitSlop={8}
        >
          <MaterialIcons name="edit" size={20} color={colors.primary} />
        </Pressable>
        <Pressable
          accessibilityLabel={"Delete " + account.name}
          onPress={onDelete}
          hitSlop={8}
        >
          <MaterialIcons
            name="delete-outline"
            size={21}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderTopRightRadius: radii.brand,
    borderBottomLeftRadius: radii.brand,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  icon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: "#F6ECC9",
  },
  details: { flex: 1, gap: spacing.xs },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  type: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  balance: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  actions: { alignItems: "flex-end", gap: spacing.sm },
});

