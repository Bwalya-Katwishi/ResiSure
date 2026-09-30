import { useCallback, useEffect, useState } from 'react';
import DocumentViewerModal from '../components/ui/DocumentViewerModal';
import { registerDocumentViewer } from '../lib/documentViewerRegistry';

export default function DocumentViewerProvider({ children }) {
  const [view, setView] = useState(null);

  const show = useCallback((payload) => {
    setView(payload);
  }, []);

  const close = useCallback(() => {
    setView(null);
  }, []);

  useEffect(() => {
    registerDocumentViewer(show);
    return () => registerDocumentViewer(null);
  }, [show]);

  return (
    <>
      {children}
      {view && (
        <DocumentViewerModal
          blob={view.blob}
          contentType={view.contentType}
          title={view.title}
          filename={view.filename}
          onClose={close}
        />
      )}
    </>
  );
}
