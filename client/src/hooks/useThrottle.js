import { useRef, useCallback } from 'react';

/**
 * Returns a throttled version of `fn` that fires at most once per `delay` ms.
 * Any call within the cooldown is silently ignored (leading-edge throttle).
 * Use for pagination handlers to prevent rapid-click request floods.
 */
export default function useThrottle(fn, delay = 300) {
  const lastRun = useRef(0);

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        return fn(...args);
      }
    },
    [fn, delay],
  );
}
