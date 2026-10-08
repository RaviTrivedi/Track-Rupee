import { AuthForm } from '@/features/auth/components/auth-form';
import { Redirect } from 'expo-router';
import { useAppSelector } from '@/store/hooks';

/**
 * The native splash hands off directly to the login surface. Rendering the
 * screen here avoids startup redirects competing with the main tab group's
 * own index route.
 */
export default function IndexScreen() {
  const status = useAppSelector((state) => state.auth.status);
  if (status === 'starting') return null;
  if (status === 'signed-in') return <Redirect href="/(main)" />;
  return <AuthForm mode="login" />;
}
