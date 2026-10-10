import { useState } from 'react';
import { Link, router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Brand } from '@/components/brand';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { colors, shadows, radii, spacing, typography } from '@/theme';
import { useLoginMutation, useRegisterMutation } from '@/features/auth/auth.api';
import { authStorage } from '@/features/auth/auth.storage';
import { setSession } from '@/features/auth/auth.slice';
import { useAppDispatch } from '@/store/hooks';

type AuthFormProps = {
  mode: 'login' | 'register';
};

export function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === 'login';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const isSubmitting = loginState.isLoading || registerState.isLoading;

  const submit = async () => {
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password || password.length < 12) {
      setError('Password must be at least 12 characters.');
      return;
    }
    if (!isLogin && !name.trim()) {
      setError('Name is required.');
      return;
    }
    try {
      const response = isLogin
        ? await login({ email: normalizedEmail, password }).unwrap()
        : await register({ name: name.trim(), email: normalizedEmail, password }).unwrap();
      await authStorage.saveRefreshToken(response.data.refreshToken);
      dispatch(setSession({ accessToken: response.data.accessToken, user: response.data.user }));
      router.replace('/(main)');
    } catch (requestError: unknown) {
      const data = (requestError as { data?: { message?: string } }).data;
      const status = (requestError as { status?: string | number }).status;
      setError(data?.message ?? (status === 'TIMEOUT_ERROR' ? 'The server took too long to respond. Please try again.' : status === 'FETCH_ERROR' ? 'Unable to reach the server. Check your connection and try again.' : 'Unable to complete the request. Please try again.'));
    }
  };

  return (
    <Screen keyboardAware contentContainerStyle={styles.screen}>
      <Brand />

      <View style={styles.header}>
        <Text style={typography.title}>{isLogin ? 'Welcome back' : 'Create your account'}</Text>
        <Text style={typography.body}>
          {isLogin
            ? 'Sign in to keep tracking your money in one place.'
            : 'Start tracking accounts, expenses, and budgets in INR.'}
        </Text>
      </View>

      <View style={styles.card}>
        {!isLogin && (
          <FormField
            autoCapitalize="words"
            autoComplete="name"
            label="Name"
            onChangeText={setName}
            placeholder="Your name"
            returnKeyType="next"
            value={name}
          />
        )}
        <FormField
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="you@example.com"
          returnKeyType="next"
          value={email}
        />
        <FormField
          autoCapitalize="none"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          label="Password"
          onChangeText={setPassword}
          placeholder="Enter your password"
          returnKeyType="done"
          secureTextEntry={!passwordVisible}
          value={password}
          rightElement={<Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'} onPress={() => setPasswordVisible((visible) => !visible)} hitSlop={8}><MaterialIcons name={passwordVisible ? 'visibility-off' : 'visibility'} size={22} color={colors.textMuted} /></Pressable>}
        />
        <PrimaryButton
          disabled={isSubmitting}
          onPress={submit}
          label={isLogin ? 'Sign in' : 'Create account'}
          accessibilityHint="Submits your credentials securely."
        />
        {isSubmitting && <ActivityIndicator color={colors.primary} />}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </View>

      <Text style={styles.switchText}>
        {isLogin ? 'New to TrackRupee? ' : 'Already have an account? '}
        <Link href={isLogin ? '/(auth)/register' : '/(auth)/login'} style={styles.link}>
          {isLogin ? 'Create account' : 'Sign in'}
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.md,
    marginTop: spacing.xxxl,
    marginBottom: spacing.xl,
  },
  card: {
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: 36,
    ...shadows.card,
  },
  error: {
    ...typography.caption,
    color: '#B42318',
    textAlign: 'center',
  },
  switchText: {
    ...typography.body,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
