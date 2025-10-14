import { useRef, useEffect } from 'react';

export function useForwardedRef<T>(forwardedRef: React.ForwardedRef<T>): React.RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!forwardedRef) return;
    if (typeof forwardedRef === 'function') {
      forwardedRef(ref.current);
    } else {
      forwardedRef.current = ref.current;
    }
  });

  return ref;
}
