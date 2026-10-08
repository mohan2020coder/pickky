import { useEffect, useState } from 'react';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animates a number from its previous value to the target with an ease-out curve.
 * Ideal for dashboard stat tiles. Returns the current display value.
 */
export const useCountUp = (target: number, duration = 800): number => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const from = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const next = from + (target - from) * easeOutCubic(progress);
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
};
