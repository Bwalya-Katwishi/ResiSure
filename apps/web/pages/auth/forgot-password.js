import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { forgotPassword } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/userFeedback';
import AuthShell from '../../components/auth/AuthShell';
import StatusBanner from '../../components/ui/StatusBanner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setSent(true);
      toast.success(res.data.message);
    } catch (err) {
      const message = getApiErrorMessage(err, 'We could not send reset instructions. Please try again.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset password — ResiSure</title>
      </Head>
      <AuthShell
        title="Reset your password"
        subtitle="Enter the email linked to your account. We will send reset instructions if it exists."
        error={error}
        footer={
          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/auth/login" className="font-medium text-blue-700 hover:underline">
              Back to sign in
            </Link>
          </p>
        }
      >
        {sent ? (
          <StatusBanner type="success" title="Check your email">
            If an account exists for that address, reset instructions were sent. The link expires in one hour.
          </StatusBanner>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </AuthShell>
    </>
  );
}
