import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';

import { Screen } from '@/components/screen';
import { MainHeader } from '@/features/home/components/main-header';
import { useAppSelector } from '@/store/hooks';
import { colors, fonts, radii, spacing, typography } from '@/theme';

export default function SettingsScreen() {
  const status = useAppSelector((state) => state.auth.status);
  if (status !== 'signed-in') return <Redirect href="/login" />;
  return (
    <Screen contentContainerStyle={styles.screen}>
      <MainHeader title="Settings" />
      <Pressable onPress={() => router.navigate('/(main)/profile')} style={styles.option}>
        <View><Text style={styles.optionTitle}>Profile</Text><Text style={typography.body}>Manage your account details</Text></View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  option: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg },
  optionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 17, marginBottom: spacing.xs },
});
