import { useState, useEffect } from "react";

/**
 * Debounces a value by the given delay (ms).
 * Returns the debounced value which only updates after the delay elapses.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
