import { useState, useCallback, useRef } from 'react';

/**
 * Custom Hook for managing toast banner notifications in GatherAround.
 */
export function useToast() {
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((msg, duration = 3500) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToastMessage(msg);

    // Sanitize duration argument: if non-number (e.g. 'error' or 'info'), default to 3500ms
    const timeoutMs = (typeof duration === 'number' && duration > 0) ? duration : 3500;

    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, timeoutMs);
  }, []);

  const clearToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setToastMessage(null);
  }, []);

  return { toastMessage, showToast, clearToast };
}
