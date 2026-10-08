import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/theme';

type HomeHeaderProps = { name: string; avatarUri?: string | null; onAdd?: () => void };

export function HomeHeader({ name, onAdd }: HomeHeaderProps) {
  const initials = name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'TR';
  return (
    <View style={styles.row}>
      <View style={styles.user}>
        <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
        <Text numberOfLines={1} style={styles.name}>{name || 'Track Rupee user'}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Add account" onPress={onAdd} style={styles.addButton}><MaterialIcons name="add" size={28} color={colors.text} /></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  user: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  initials: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 20, flexShrink: 1 },
  addButton: { width: 50, height: 50, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center' },
});

export const headerAddButtonStyle = styles.addButton;
