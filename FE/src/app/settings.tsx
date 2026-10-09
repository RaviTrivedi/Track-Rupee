import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, router } from 'expo-router';
import { Screen } from '@/components/screen';
import { authStorage } from '@/features/auth/auth.storage';
import { useLogoutMutation } from '@/features/auth/auth.api';
import { clearSession } from '@/features/auth/auth.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { colors, fonts, radii, spacing, typography } from '@/theme';

export default function SettingsScreen() {
  const status = useAppSelector((state) => state.auth.status);
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [logout, logoutState] = useLogoutMutation();
  if (status !== 'signed-in') return <Redirect href="/login" />;
  const signOut = () =>
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await authStorage.getRefreshToken();
            if (token) await logout({ refreshToken: token }).unwrap();
          } finally {
            await authStorage.clearRefreshToken();
            dispatch(clearSession());
          }
        },
      },
    ]);
  const row = (
    icon: keyof typeof MaterialIcons.glyphMap,
    title: string,
    subtitle: string,
    onPress?: () => void,
    disabled = false,
  ) => (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, disabled && styles.disabled]}
    >
      <MaterialIcons name={icon} size={24} color={disabled ? colors.textMuted : colors.primary} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
    </Pressable>
  );
  return (
    <Screen contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={10}>
          <MaterialIcons name="arrow-back" size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name ?? 'U').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.name ?? 'TrackRupee user'}</Text>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
          </View>
        </View>
        <View style={styles.list}>
          {row('category', 'Categories', 'Manage income and expense categories', () =>
            router.push('/categories'),
          )}
          {row('notifications-none', 'Notifications', 'Coming soon', undefined, true)}
          {row(
            'logout',
            logoutState.isLoading ? 'Logging out...' : 'Logout',
            'Sign out of this device',
            signOut,
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  title: typography.title,
  spacer: { width: 25 },
  content: { gap: spacing.xl },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: { color: colors.white, fontFamily: fonts.bold, fontSize: 22 },
  userName: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  email: { color: colors.textMuted, fontFamily: fonts.medium, marginTop: spacing.xs },
  list: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 76,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  rowText: { flex: 1, gap: spacing.xs },
  rowTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  rowSubtitle: { ...typography.caption, color: colors.textMuted },
  disabled: { opacity: 0.55 },
});
