import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { router } from 'expo-router';

import { colors, fonts, radii } from '@/theme';

export function MainHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.actions}>
        {action}
        <Pressable accessibilityLabel="Open settings" accessibilityRole="button" hitSlop={10} onPress={() => router.push('/settings')} style={styles.button}>
          <MaterialIcons name="settings" size={24} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 24, lineHeight: 30 },
  button: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radii.pill },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
