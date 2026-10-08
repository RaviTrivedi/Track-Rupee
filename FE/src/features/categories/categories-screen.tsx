import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Screen } from '@/components/screen';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { MainHeader } from '@/features/home/components/main-header';
import { colors, fonts, radii, spacing, typography } from '@/theme';
import type { CategoryType } from '@/features/home/home.types';
import { useCreateCategoryMutation, useDeleteCategoryMutation, useGetCategoriesQuery, useUpdateCategoryMutation } from './categories.api';
import type { Category } from './categories.api';
import { materialCategoryIcon } from './category-icons';

const getError = (e: unknown) => (e as { data?: { message?: string } }).data?.message ?? 'Something went wrong. Try again.';
const categoryStyles = [
  { icon: 'category', color: '#F6ECC9' },
  { icon: 'trending-up', color: '#DCEEDB' },
  { icon: 'receipt-long', color: '#DCE8F7' },
  { icon: 'favorite-border', color: '#F8DDE2' },
  { icon: 'star-border', color: '#E9DDF7' },
] as const;

export function CategoriesScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const [section, setSection] = useState<CategoryType>(params.type === 'EXPENSE' ? 'EXPENSE' : 'INCOME');
  const { data, isLoading, error } = useGetCategoriesQuery();
  const [create, createState] = useCreateCategoryMutation();
  const [update, updateState] = useUpdateCategoryMutation();
  const [remove] = useDeleteCategoryMutation();
  const [editing, setEditing] = useState<Category | null>(null);
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const categories = (data?.data.categories ?? []).filter((c) => c.type === section && !c.name.toLowerCase().startsWith('other')).sort((a, b) => a.name.localeCompare(b.name));
  const openCreate = () => { setEditing(null); setName(''); setFormError(null); setVisible(true); };
  const openEdit = (c: Category) => { setEditing(c); setName(c.name); setFormError(null); setVisible(true); };
  const close = () => { if (!createState.isLoading && !updateState.isLoading) setVisible(false); };
  const submit = async () => {
    setFormError(null);
    if (!name.trim()) return setFormError('Category name is required.');
    try {
      if (editing) {
        await update({ id: editing.id, name: name.trim() }).unwrap();
      } else {
        const style = categoryStyles[(data?.data.categories.length ?? 0) % categoryStyles.length] ?? categoryStyles[0];
        await create({ name: name.trim(), type: section, icon: style.icon, color: style.color }).unwrap();
      }
      setVisible(false);
    } catch (e) { setFormError(getError(e)); }
  };
  return <Screen keyboardAware contentContainerStyle={styles.screen}>
    <MainHeader title="Categories" />
    <View style={styles.tabs}>{(['INCOME', 'EXPENSE'] as CategoryType[]).map((t) => <Pressable key={t} onPress={() => setSection(t)} style={[styles.tab, section === t && styles.selected]}><Text style={[styles.tabText, section === t && styles.selectedText]}>{t === 'INCOME' ? 'Income' : 'Expense'}</Text></Pressable>)}</View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{section === 'INCOME' ? 'Income categories' : 'Expense categories'}</Text><Pressable onPress={openCreate} style={styles.add}><Text style={styles.addText}>+ Add category</Text></Pressable></View>
    {isLoading ? <Text style={typography.body}>Loading categories...</Text> : error ? <Text style={styles.error}>{getError(error)}</Text> : <View style={styles.list}>{categories.map((c) => <Pressable key={c.id} onPress={() => openEdit(c)} style={styles.card}><View style={[styles.icon, { backgroundColor: c.color ?? colors.surface }]}><MaterialIcons name={materialCategoryIcon(c.icon)} size={22} color={colors.text} /></View><View style={styles.details}><Text style={styles.name}>{c.name}</Text><Text style={styles.meta}>{c.isDefault ? 'Default - Tap to edit' : 'Custom - Tap to edit'}</Text></View><Pressable accessibilityLabel={'Delete ' + c.name} onPress={() => Alert.alert('Delete category', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void remove(c.id) }])}><MaterialIcons name="delete-outline" size={22} color={colors.textMuted} /></Pressable></Pressable>)}{categories.length === 0 && <Text style={typography.body}>No categories yet.</Text>}</View>}
    <Modal animationType="fade" transparent visible={visible} onRequestClose={close}><View style={styles.overlay}><View style={styles.modal}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{editing ? 'Edit category' : 'Add category'}</Text><Pressable onPress={close} hitSlop={12}><MaterialIcons name="close" size={24} color={colors.text} /></Pressable></View><Text style={styles.fixedType}>Type: {editing?.type ?? section} (fixed)</Text><FormField label="Category name" onChangeText={setName} value={name} placeholder="e.g. Groceries" />{formError && <Text style={styles.error}>{formError}</Text>}<PrimaryButton disabled={createState.isLoading || updateState.isLoading} label={editing ? 'Save changes' : 'Create category'} onPress={() => void submit()} /><Pressable onPress={close}><Text style={styles.cancel}>Cancel</Text></Pressable></View></View></Modal>
  </Screen>;
}

const styles = StyleSheet.create({ screen: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl }, tabs: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }, tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radii.md }, selected: { backgroundColor: colors.primary, borderColor: colors.primary }, tabText: { color: colors.textMuted, fontFamily: fonts.semiBold }, selectedText: { color: colors.white }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.md }, sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 }, add: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs }, addText: { color: colors.primary, fontFamily: fonts.semiBold }, list: { gap: spacing.md, paddingTop: spacing.xs }, card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.md }, icon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md }, details: { flex: 1 }, name: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 }, meta: { ...typography.caption, color: colors.textMuted }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,18,38,0.35)' }, modal: { gap: spacing.lg, backgroundColor: colors.background, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.xl }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, modalTitle: typography.heading, fixedType: { color: colors.primary, fontFamily: fonts.semiBold }, cancel: { color: colors.textMuted, textAlign: 'center', fontFamily: fonts.semiBold }, error: { ...typography.caption, color: '#B42318' } });

