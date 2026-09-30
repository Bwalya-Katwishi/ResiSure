import Link from 'next/link';

export default function EmptyState({ icon: Icon, title, body, actionHref, actionLabel, onAction }) {
  return (
    <div className="card px-4 py-10 text-center sm:px-6 sm:py-16">
      {Icon && <Icon size={36} className="mx-auto mb-4 text-slate-300" aria-hidden="true" />}
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {body && <p className="mt-1 text-sm text-slate-500">{body}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn-primary mt-6">
          {actionLabel}
        </Link>
      )}
      {!actionHref && onAction && actionLabel && (
        <button type="button" onClick={onAction} className="btn-primary mt-6">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
