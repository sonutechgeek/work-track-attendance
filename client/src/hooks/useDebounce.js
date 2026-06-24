import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after
 * the component has not received a new value for `delay` ms.
 * Use for text search inputs to avoid an API call on every keystroke.
 */
export default function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
