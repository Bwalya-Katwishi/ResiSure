import toast from 'react-hot-toast';
import { FileText } from 'lucide-react';
import { openAuthenticatedDocument } from '../../lib/api';

export default function VerificationDocLinks({ docs, className = '' }) {
  const items = (docs || []).filter((doc) => doc?.url);

  if (!items.length) return null;

  const handleOpen = async (doc) => {
    try {
      await openAuthenticatedDocument(doc.url, { title: doc.label });
    } catch {
      toast.error('Could not open document. Please try again.');
    }
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 ${className}`.trim()}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Your uploaded documents</p>
      <div className="flex flex-wrap gap-2">
        {items.map((doc) => (
          <button
            key={doc.label}
            type="button"
            onClick={() => handleOpen(doc)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            <FileText size={14} aria-hidden="true" />
            {doc.label}
          </button>
        ))}
      </div>
    </div>
  );
}
