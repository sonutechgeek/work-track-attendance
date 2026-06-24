import useLiveTimer from '../../hooks/useLiveTimer';

export default function LiveTimer({ className = '' }) {
  const elapsed = useLiveTimer();

  return (
    <span className={`font-mono tabular-nums ${className}`}>{elapsed}</span>
  );
}
