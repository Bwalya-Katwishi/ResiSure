import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath, ROLE_DASHBOARDS } from '@resisure/shared/constants/roles';

/**
 * Route guard hook (Controller pattern on the presentation layer).
 * Redirects unauthenticated users to login and wrong-role users to home.
 */
export function useRequireAuth({ role, redirectTo = '/auth/login' } = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const returnUrl = encodeURIComponent(router.asPath);
      router.replace(`${redirectTo}?returnUrl=${returnUrl}`);
      return;
    }
    if (role && user.role !== role) {
      router.replace(getDashboardPath(user.role));
    }
  }, [user, loading, role, router, redirectTo]);

  const authorized = Boolean(user && (!role || user.role === role));

  return { user, loading, authorized };
}

export { getDashboardPath, ROLE_DASHBOARDS };
