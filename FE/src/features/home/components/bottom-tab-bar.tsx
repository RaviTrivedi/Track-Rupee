import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/theme';

const icons = ['home', 'receipt-long', 'account-balance-wallet', 'account-balance'] as const;
const labels = ['Home', 'Transactions', 'Budgets', 'Accounts'] as const;

type BottomTabBarProps = {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  navigation: { navigate: (name: string) => void };
};

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(spacing.sm, insets.bottom) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              onPress={() => navigation.navigate(route.name)}
              style={[styles.item, focused && styles.active]}>
              <MaterialIcons name={icons[index] ?? 'circle'} size={22} color={colors.white} />
              <Text style={styles.label}>{labels[index] ?? route.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', paddingHorizontal: spacing.lg, paddingTop: 0 },
  bar: { height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.text },
  item: { flex: 1, height: 62, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radii.pill },
  active: { backgroundColor: colors.primary },
  label: { color: colors.white, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 9, lineHeight: 12 },
});
