import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { AnimatedSheet } from '@/components/animated-sheet';
import { FormField } from "@/components/form-field";
import { PrimaryButton } from "@/components/primary-button";
import { colors, fonts, radii, spacing, typography } from "@/theme";
import type { TransactionDraft, TransactionType } from "../transaction.types";

type Option = { id: string; name: string };
type Props = {
  visible: boolean;
  editing: boolean;
  draft: TransactionDraft;
  accounts: Option[];
  categories: Option[];
  error: string | null;
  onChange: (draft: TransactionDraft) => void;
  onClose: () => void;
  onSave: () => void;
};
export function TransactionModal({
  visible,
  editing,
  draft,
  accounts,
  categories,
  error,
  onChange,
  onClose,
  onSave,
}: Props) {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const set = (key: keyof TransactionDraft, value: string) =>
    onChange({ ...draft, [key]: value });
  return (
    <AnimatedSheet visible={visible} onClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {editing ? "Edit transaction" : "Add transaction"}
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.row}>
            {(["INCOME", "EXPENSE"] as TransactionType[]).map((type) => (
              <Pressable
                key={type}
                onPress={() => set("type", type)}
                style={[styles.choice, draft.type === type && styles.selected]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    draft.type === type && styles.selectedText,
                  ]}
                >
                  {type === "INCOME" ? "Income" : "Expense"}
                </Text>
              </Pressable>
            ))}
          </View>
          <FormField
            label="Amount (INR)"
            keyboardType="decimal-pad"
            value={draft.amount}
            onChangeText={(v) => set("amount", v)}
            placeholder="0.00"
          />
          <Text style={styles.label}>Account</Text>
          <View style={styles.row}>
            {accounts.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => set("accountId", a.id)}
                style={[
                  styles.choice,
                  draft.accountId === a.id && styles.selected,
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    draft.accountId === a.id && styles.selectedText,
                  ]}
                >
                  {a.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Category</Text>
          <View style={styles.row}>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => set("categoryId", c.id)}
                style={[
                  styles.choice,
                  draft.categoryId === c.id && styles.selected,
                ]}
              >
                <Text
                  style={[
                    styles.choiceText,
                    draft.categoryId === c.id && styles.selectedText,
                  ]}
                >
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.dateField}>
            <Text style={styles.label}>Date</Text>
            <Pressable style={styles.dateInput} onPress={() => setDatePickerVisible(true)}>
              <Text style={styles.dateText}>{draft.date}</Text>
              <MaterialIcons name="calendar-month" size={22} color={colors.primary} />
            </Pressable>
            {datePickerVisible && <DateTimePicker value={new Date(`${draft.date}T12:00:00`)} mode="date" onChange={(_event: DateTimePickerEvent, value?: Date) => { setDatePickerVisible(false); if (value) set("date", value.toISOString().slice(0, 10)); }} />}
          </View>
          <FormField
            label="Note (optional)"
            value={draft.note}
            onChangeText={(v) => set("note", v)}
            placeholder="Add a note"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <View style={styles.save}>
              <PrimaryButton label="Save" onPress={onSave} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AnimatedSheet>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(8,18,38,0.35)",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
  sheetContent: { gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: typography.heading,
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  choice: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { color: colors.textMuted, fontFamily: fonts.semiBold },
  selectedText: { color: colors.white },
  label: typography.label,
  dateField: { gap: spacing.sm },
  dateInput: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radii.md, backgroundColor: colors.white, paddingHorizontal: spacing.lg },
  dateText: { color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  error: { ...typography.caption, color: "#B42318" },
  actions: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  cancel: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
  },
  cancelText: { color: colors.text, fontFamily: fonts.semiBold },
  save: { flex: 1 },
});







