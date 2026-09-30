import { useEffect, useMemo, useRef } from 'react';
import { X, Download } from 'lucide-react';
import { useEscapeKey } from '../../lib/useEscapeKey';

export default function DocumentViewerModal({ blob, contentType, title = 'Document', filename = 'document', onClose }) {
  const closeRef = useRef(null);
  const objectUrl = useMemo(() => URL.createObjectURL(blob), [blob]);
  const isPdf = contentType?.includes('pdf');
  const isImage = contentType?.startsWith('image/');

  useEffect(() => {
    closeRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      URL.revokeObjectURL(objectUrl);
      closeRef.current?.focus?.();
    };
  }, [objectUrl]);

  useEscapeKey(onClose, true);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="-ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close document"
          >
            <X size={22} aria-hidden="true" />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            <Download size={16} aria-hidden="true" />
            Download
          </button>
        </div>
        <div className="min-h-[50vh] flex-1 overflow-auto bg-slate-100 p-3 sm:min-h-[60vh]">
          {isImage && (
            <img
              src={objectUrl}
              alt={title}
              className="mx-auto max-h-[75vh] w-full object-contain"
            />
          )}
          {isPdf && (
            <iframe
              src={objectUrl}
              title={title}
              className="h-[75vh] w-full rounded-lg border-0 bg-white"
            />
          )}
          {!isImage && !isPdf && (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
              <p className="text-sm text-slate-600">This file type cannot be previewed in the browser.</p>
              <button type="button" onClick={handleDownload} className="btn-primary">
                Download file
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
