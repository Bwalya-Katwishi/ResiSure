import { useEffect, useRef } from 'react';

/**
 * Refetch authoritative server state when the user returns via refresh, tab focus, or back/forward.
 */
export function useRefetchOnFocus(refetch, enabled = true) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (!enabled) return undefined;

    const run = () => {
      refetchRef.current?.();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };

    window.addEventListener('pageshow', run);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('pageshow', run);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);
}
