import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { fmtElapsed } from '../utils/formatters';

// Reads timer from Redux, seeds elapsed from DB, ticks every second
export default function useLiveTimer() {
  const timer = useSelector((s) => s.attendance.timer);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    clearInterval(intervalRef.current);

    if (!timer?.active || !timer?.checkInTime) {
      setElapsed(0);
      return;
    }

    const seed = timer.elapsedMs ?? (Date.now() - new Date(timer.checkInTime).getTime());
    setElapsed(seed);

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1000);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [timer?.active, timer?.checkInTime]);

  return fmtElapsed(elapsed);
}
