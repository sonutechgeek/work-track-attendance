import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const fmtDate = (date) =>
  date ? format(parseISO(date), 'dd MMM yyyy') : '—';

export const fmtDateTime = (date) =>
  date ? format(parseISO(date), 'dd MMM yyyy, hh:mm a') : '—';

export const fmtTime = (date) =>
  date ? format(parseISO(date), 'hh:mm a') : '—';

export const fmtRelative = (date) =>
  date ? formatDistanceToNow(parseISO(date), { addSuffix: true }) : '—';

export const fmtHours = (hours) => {
  if (!hours) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const fmtElapsed = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const fmtName = (name = '') =>
  name.split(' ').map((n) => n[0]?.toUpperCase()).join('').slice(0, 2);
