export default function Badge({ type = 'default', children }) {
  const styles = {
    verified: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    escrow: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    disputed: 'bg-amber-50 text-amber-800 border-amber-200',
    default: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[type] || styles.default}`}>
      {children}
    </span>
  );
}
