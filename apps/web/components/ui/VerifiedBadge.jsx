import { CheckCircle } from 'lucide-react';

export default function VerifiedBadge({ compact = false }) {
  const label = compact ? 'Verified listing' : 'Verified listing — reviewed by ResiSure';

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-green-700 shadow-sm"
      aria-label={label}
    >
      <CheckCircle size={12} aria-hidden="true" />
      {compact ? 'Verified' : 'Verified listing'}
    </span>
  );
}
