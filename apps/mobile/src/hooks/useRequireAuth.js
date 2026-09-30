import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

/**
 * Screen-level auth guard for React Navigation (mirrors web useRequireAuth).
 */
export function useRequireAuth({ role, redirectTo = 'Login' } = {}) {
  const { user, loading } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: redirectTo, params: { reason: 'auth_required' } }] });
      return;
    }
    if (role && user.role !== role) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [user, loading, role, navigation, redirectTo]);

  const authorized = Boolean(user && (!role || user.role === role));

  return { user, loading, authorized };
}
