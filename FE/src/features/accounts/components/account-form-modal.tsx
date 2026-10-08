import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import type { AccountType } from '@/features/accounts/accounts.types';
import { colors, fonts, radii, spacing, typography } from '@/theme';

type Props = { visible: boolean; editing: boolean; name: string; type: AccountType | ''; openingBalance: string; error: string | null; submitting: boolean; onNameChange: (v: string) => void; onTypeChange: (v: AccountType) => void; onBalanceChange: (v: string) => void; onCancel: () => void; onSubmit: () => void };
const types: AccountType[] = ['CASH', 'BANK', 'WALLET'];

export function AccountFormModal({ visible, editing, name, type, openingBalance, error, submitting, onNameChange, onTypeChange, onBalanceChange, onCancel, onSubmit }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) progress.setValue(0);
    Animated.spring(progress, {
      toValue: visible ? 1 : 0,
      damping: 22,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  return (
    <Modal animationType="none" transparent visible={visible} onRequestClose={onCancel}>
      <Animated.View style={[styles.overlay, { opacity: progress }]}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] }]}>
        <View style={styles.header}><Text style={styles.title}>{editing ? 'Edit account' : 'Add account'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close add account" hitSlop={12} onPress={onCancel} style={styles.closeButton}><MaterialIcons name="close" size={24} color={colors.text} /></Pressable></View>
        <FormField autoCapitalize="words" label="Account name" onChangeText={onNameChange} placeholder="e.g. Main bank" value={name} />
        <View style={styles.field}><Text style={styles.label}>Account type</Text><View style={styles.typeRow}>{types.map((option) => <Pressable key={option} onPress={() => onTypeChange(option)} style={[styles.typeOption, type === option && styles.typeSelected]}><Text style={[styles.typeText, type === option && styles.typeTextSelected]}>{option}</Text></Pressable>)}</View></View>
        <FormField keyboardType="decimal-pad" label={editing ? "Current balance (INR)" : "Opening balance (INR)"} onChangeText={onBalanceChange} placeholder="0.00" value={openingBalance} />
        
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <View style={styles.actions}><Pressable onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable><View style={styles.create}><PrimaryButton disabled={submitting} label={editing ? 'Save changes' : 'Create account'} onPress={onSubmit} /></View></View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,18,38,0.35)' },
  sheet: { gap: spacing.lg, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, backgroundColor: colors.background, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: typography.heading, closeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  field: { gap: spacing.sm }, label: typography.label, typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeOption: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radii.md, paddingVertical: spacing.md }, typeSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  typeText: { color: colors.textMuted, fontFamily: fonts.semiBold, fontSize: 12 }, typeTextSelected: { color: colors.white }, error: { ...typography.caption, color: '#B42318' }, hint: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, cancel: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radii.md }, cancelText: { color: colors.text, fontFamily: fonts.semiBold, fontSize: 15 }, create: { flex: 1 },
});



