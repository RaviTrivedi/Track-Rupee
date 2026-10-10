import { useEffect, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useLazyMeQuery } from '@/features/auth/auth.api';
import { authStorage } from '@/features/auth/auth.storage';
import { clearSession, setRetry, setSession } from '@/features/auth/auth.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { colors } from '@/theme';

export function SessionBootstrap({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [loadUser] = useLazyMeQuery();

  useEffect(() => {
    let active = true;
    void (async () => {
      const refreshToken = await authStorage.getRefreshToken();
      if (!active) return;
      if (!refreshToken) {
        dispatch(clearSession());
        return;
      }
      try {
        const response = await Promise.race([
          loadUser().unwrap(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Session restore timed out.')), 10000)),
        ]);
        if (active) dispatch(setSession({
          accessToken: accessToken ?? '',
          user: response.data.user,
        }));
      } catch (error: unknown) {
        if (!active) return;
        const statusCode = (error as { status?: number }).status;
        if (statusCode === 401) {
          await authStorage.clearRefreshToken();
          dispatch(clearSession());
        } else {
          dispatch(setRetry('Could not restore your session. Check your connection and retry.'));
        }
      }
    })();
    return () => { active = false; };
  }, [accessToken, dispatch, loadUser]);

  if (status === 'starting') {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  }
  return children;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
