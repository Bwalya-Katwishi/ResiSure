import Link from 'next/link';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const styles = {
  info: {
    wrap: 'border-blue-200 bg-blue-50 text-blue-900',
    icon: 'text-blue-700',
    Icon: Info,
    role: 'status',
  },
  success: {
    wrap: 'border-green-200 bg-green-50 text-green-900',
    icon: 'text-green-700',
    Icon: CheckCircle,
    role: 'status',
  },
  warning: {
    wrap: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: 'text-amber-700',
    Icon: AlertTriangle,
    role: 'alert',
  },
  error: {
    wrap: 'border-red-200 bg-red-50 text-red-900',
    icon: 'text-red-700',
    Icon: AlertCircle,
    role: 'alert',
  },
};

export default function StatusBanner({
  type = 'info',
  title,
  children,
  actionHref,
  actionLabel,
  className = '',
}) {
  const config = styles[type] || styles.info;
  const Icon = config.Icon;

  return (
    <div
      role={config.role}
      className={`rounded-xl border p-4 ${config.wrap} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} className={`mt-0.5 flex-shrink-0 ${config.icon}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {title && <p className="text-sm font-semibold">{title}</p>}
          {children && <div className={`text-sm leading-relaxed ${title ? 'mt-1' : ''}`}>{children}</div>}
          {actionHref && actionLabel && (
            <Link href={actionHref} className="mt-3 inline-block text-sm font-semibold underline underline-offset-2">
              {actionLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
