import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { HomeCategory, CategoryType } from '@/features/home/home.types';
import { materialCategoryIcon } from '@/features/categories/category-icons';
import { colors, fonts, radii, spacing } from '@/theme';

type CategoryPreviewProps = { type: CategoryType; categories: HomeCategory[]; onPress?: () => void; onCategoryPress?: (category: HomeCategory) => void };

export function CategoryPreview({ type, categories, onPress, onCategoryPress }: CategoryPreviewProps) {
  return (
    <View style={styles.section}>
      <Pressable accessibilityRole="button" onPress={onPress}><Text style={styles.title}>{type === 'INCOME' ? 'Income categories' : 'Expense categories'}</Text></Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {categories.map((category) => (
          <Pressable key={category.id} onPress={() => onCategoryPress?.(category)} style={styles.item}>
            <View style={[styles.icon, { backgroundColor: category.color }]}>
              <MaterialIcons name={materialCategoryIcon(category.icon)} size={22} color={colors.text} />
            </View>
            <Text numberOfLines={1} style={styles.name}>{category.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  list: { gap: spacing.md, paddingRight: spacing.lg },
  item: { width: 76, alignItems: 'center', gap: spacing.sm },
  icon: { width: 56, height: 56, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.textMuted, fontFamily: fonts.semiBold, fontSize: 11, textAlign: 'center' },
});
