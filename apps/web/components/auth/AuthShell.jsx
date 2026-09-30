import Logo from '../brand/Logo';
import { AlertCircle } from 'lucide-react';

/**
 * Shared auth page layout — consistent presentation for login/register flows.
 */
export default function AuthShell({ title, subtitle, error, children, footer }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 p-4 sm:p-6">
      <div className="card w-full max-w-md p-5 sm:p-8">
        <div className="mb-8 flex justify-center">
          <Logo size="auth" priority />
        </div>

        <h1 className="font-brand text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mb-8 mt-1 text-sm text-slate-500">{subtitle}</p>}

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700"
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {children}
        {footer}
      </div>
    </main>
  );
}
