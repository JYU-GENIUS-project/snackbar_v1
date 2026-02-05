import { useEffect, useState } from 'react';

export const useDebouncedValue = <T>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
};
