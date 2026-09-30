import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../../lib/useEscapeKey';

export default function AccountDetailPanel({ title, onClose, children }) {
  const closeRef = useRef(null);
  const titleId = 'account-detail-title';

  useEffect(() => {
    closeRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      closeRef.current?.focus?.();
    };
  }, []);

  const handleClose = useCallback(() => onClose(), [onClose]);
  useEscapeKey(handleClose, true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={handleClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 pb-4 pt-3 sm:px-5 sm:py-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="-ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close"
            >
              <X size={22} aria-hidden="true" />
            </button>
            <h2 id={titleId} className="min-w-0 flex-1 text-lg font-semibold text-slate-900">{title}</h2>
          </div>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
