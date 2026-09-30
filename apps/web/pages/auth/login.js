import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { loginUser } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/userFeedback';
import { getDashboardPath } from '../../hooks/useRequireAuth';
import AuthShell from '../../components/auth/AuthShell';
import { Eye, EyeOff } from 'lucide-react';

function safeReturnUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  return value;
}

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(getDashboardPath(user.role));
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (router.isReady && router.query.reason === 'session_expired') {
      setError('Your session has expired. Please sign in again.');
    }
  }, [router.isReady, router.query.reason]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginUser({
        email: form.email.trim(),
        password: form.password,
      });
      const { token, user: signedInUser } = res.data.data;
      login(token, signedInUser);
      toast.success(`Welcome back, ${signedInUser.full_name.split(' ')[0]}`);
      const returnUrl = safeReturnUrl(router.query.returnUrl);
      router.push(returnUrl || getDashboardPath(signedInUser.role));
    } catch (err) {
      const message = getApiErrorMessage(err, 'We could not sign you in. Please try again.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in — ResiSure</title>
      </Head>
      <AuthShell
        title="Sign in"
        subtitle="Access your bookings, listings, and payments."
        error={error}
        footer={(
          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-medium text-blue-700 hover:underline">
              Create an account
            </Link>
          </p>
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }}
              className="input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="label mb-0" htmlFor="password">Password</label>
              <Link href="/auth/forgot-password" className="text-xs font-medium text-blue-700 hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
                className="input pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </AuthShell>
    </>
  );
}
