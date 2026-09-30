import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { resetPassword } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/userFeedback';
import AuthShell from '../../components/auth/AuthShell';
import StatusBanner from '../../components/ui/StatusBanner';
import { Skeleton } from '../../components/ui/Skeleton';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = typeof router.query.token === 'string' ? router.query.token : '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (password !== confirm) {
      const message = 'Passwords do not match';
      setFormError(message);
      toast.error(message);
      return;
    }
    if (password.length < 8) {
      const message = 'Password must be at least 8 characters';
      setFormError(message);
      toast.error(message);
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword({ token, password });
      setDone(true);
      toast.success(res.data.message);
    } catch (err) {
      const message = getApiErrorMessage(err, 'We could not reset your password. Please try again.');
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!router.isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-50 p-4 sm:p-6">
        <div className="card w-full max-w-md p-5 sm:p-8" aria-busy="true" aria-label="Loading">
          <Skeleton className="mb-4 h-8 w-2/3" />
          <Skeleton className="mb-6 h-4 w-full" />
          <Skeleton className="mb-4 h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Choose new password — ResiSure</title>
      </Head>
      <AuthShell
        title="Choose a new password"
        subtitle="Use at least 8 characters."
        error={token && !done ? formError : ''}
        footer={
          !done ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link href="/auth/login" className="font-medium text-blue-700 hover:underline">
                Back to sign in
              </Link>
            </p>
          ) : null
        }
      >
        {!token && (
          <StatusBanner type="error" title="Invalid reset link">
            Request a new password reset from the sign-in page.
          </StatusBanner>
        )}

        {done ? (
          <StatusBanner type="success" title="Password updated">
            You can now sign in with your new password.
            <Link href="/auth/login" className="mt-3 inline-block text-sm font-semibold underline">
              Go to sign in
            </Link>
          </StatusBanner>
        ) : token ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="password">New password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFormError(''); }}
                  className="input pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setFormError(''); }}
                className="input"
                required
                minLength={8}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        ) : null}
      </AuthShell>
    </>
  );
}
