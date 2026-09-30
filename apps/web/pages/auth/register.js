import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { registerUser } from '../../lib/api';
import { getApiErrorMessage } from '../../lib/userFeedback';
import { getDashboardPath } from '../../hooks/useRequireAuth';
import AuthShell from '../../components/auth/AuthShell';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role: 'student', phone: '', accepted_terms: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (router.isReady && router.query.role === 'landlord') {
      setForm((current) => ({ ...current, role: 'landlord' }));
    }
  }, [router.isReady, router.query.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      const message = 'Password must be at least 8 characters';
      setError(message);
      toast.error(message);
      return;
    }
    if (!form.accepted_terms) {
      const message = 'Please accept the Terms of Use and Privacy Policy';
      setError(message);
      toast.error(message);
      return;
    }
    setLoading(true);
    try {
      const res = await registerUser({
        ...form,
        email: form.email.trim(),
        full_name: form.full_name.trim(),
      });
      const { token, user } = res.data.data;
      login(token, user);
      toast.success('Account created');
      router.push(getDashboardPath(user.role));
    } catch (err) {
      const message = getApiErrorMessage(err, 'We could not create your account. Please try again.');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create account — ResiSure</title>
      </Head>
      <AuthShell
        title="Create an account"
        subtitle="Students book verified rooms. Landlords list properties with payment protection."
        error={error}
        footer={(
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-blue-700 hover:underline">
              Sign in
            </Link>
          </p>
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="full_name">Full name</label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              value={form.full_name}
              onChange={(e) => { setForm({ ...form, full_name: e.target.value }); setError(''); }}
              className="input"
              placeholder="Bwalya Katwishi"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(''); }}
              className="input"
              placeholder="you@unza.zm"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="phone">Phone number <span className="font-normal text-slate-400">(optional)</span></label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
              placeholder="0971234567"
            />
          </div>

          <div>
            <label className="label" htmlFor="role">I am a</label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="input"
            >
              <option value="student">Student looking for a room</option>
              <option value="landlord">Landlord listing a property</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(''); }}
                className="input pr-10"
                placeholder="At least 8 characters"
                required
                minLength={8}
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

          <div className="flex items-start gap-3 text-sm text-slate-600">
            <input
              id="accepted_terms"
              name="accepted_terms"
              type="checkbox"
              checked={form.accepted_terms}
              onChange={(e) => { setForm({ ...form, accepted_terms: e.target.checked }); setError(''); }}
              className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              required
            />
            <label htmlFor="accepted_terms">
              I agree to the{' '}
              <Link href="/legal/terms" className="text-blue-700 hover:underline" target="_blank" rel="noopener noreferrer">
                Terms of Use<span className="sr-only"> (opens in new tab)</span>
              </Link>{' '}
              and{' '}
              <Link href="/legal/privacy" className="text-blue-700 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy<span className="sr-only"> (opens in new tab)</span>
              </Link>
              . Payments are protected until move-in is confirmed.
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Creating account…' : 'Create an account'}
          </button>
        </form>
      </AuthShell>
    </>
  );
}
