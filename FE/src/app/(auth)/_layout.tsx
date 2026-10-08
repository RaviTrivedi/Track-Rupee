import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import { useAppSelector } from '@/store/hooks';

export default function AuthLayout() {
  const status = useAppSelector((state) => state.auth.status);
  if (status === 'signed-in') return <Redirect href="/(main)" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
