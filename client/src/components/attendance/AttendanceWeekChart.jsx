import { useMemo } from 'react';

const STATUS_COLORS = {
  PRESENT:     '#4f46e5',
  WFH:         '#0891b2',
  FIELD_VISIT: '#7c3aed',
  HALF_DAY:    '#d97706',
  ABSENT:      '#f43f5e',
  LEAVE:       '#9333ea',
};

const STATUS_LABELS = {
  PRESENT:     'Present',
  WFH:         'WFH',
  FIELD_VISIT: 'Field Visit',
  HALF_DAY:    'Half Day',
  ABSENT:      'Absent',
  LEAVE:       'On Leave',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDays() {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const LEGEND = [
  { status: 'PRESENT',  color: '#4f46e5' },
  { status: 'WFH',      color: '#0891b2' },
  { status: 'HALF_DAY', color: '#d97706' },
  { status: 'ABSENT',   color: '#f43f5e' },
];

export default function AttendanceWeekChart({ records = [] }) {
  const weekDays = useMemo(() => getWeekDays(), []);

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  const dayData = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return weekDays.map((d, i) => {
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const rec = records.find((r) => r.date?.startsWith(ds));
      return {
        day:      DAY_LABELS[i],
        dateStr:  ds,
        isToday:  ds === todayStr,
        isFuture: d > now,
        hours:    rec?.workingHours ?? 0,
        status:   rec?.status ?? null,
      };
    });
  }, [weekDays, records, todayStr]);

  const CHART_H = 96; // px — max bar height
  const MAX_H   = 9;  // hours at 100%

  return (
    <div>
      {/* Bars */}
      <div className="flex items-end gap-2 sm:gap-3">
        {dayData.map(({ day, hours, status, isToday, isFuture }) => {
          const barPx = status
            ? Math.max(Math.round((Math.min(hours, MAX_H) / MAX_H) * CHART_H), 6)
            : 0;
          const trackColor = isFuture ? '#f8fafc' : '#f1f5f9';
          const barColor   = isFuture ? '#e2e8f0' : (STATUS_COLORS[status] ?? '#e2e8f0');

          return (
            <div key={day} className="flex flex-col items-center flex-1 min-w-0 group">
              {/* Hour label */}
              <div className="h-5 flex items-center mb-1">
                <span className="text-[10px] tabular-nums text-slate-400 group-hover:text-slate-600 transition-colors">
                  {hours > 0 ? `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h` : ''}
                </span>
              </div>

              {/* Track + bar */}
              <div
                className="w-full relative rounded-md overflow-hidden transition-all duration-200 group-hover:scale-x-105"
                style={{ height: `${CHART_H}px`, backgroundColor: trackColor }}
              >
                {/* Filled bar — rises from bottom */}
                <div
                  className="absolute bottom-0 w-full rounded-md transition-all duration-700 ease-out"
                  style={{ height: `${barPx}px`, backgroundColor: barColor }}
                />

                {/* Tooltip on hover */}
                {status && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span
                      className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded leading-tight text-center max-w-full overflow-hidden"
                      style={{ backgroundColor: barColor }}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                )}
              </div>

              {/* Day label */}
              <div className="mt-1.5 flex flex-col items-center gap-0.5">
                <span className={`text-[11px] font-semibold ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {day}
                </span>
                {isToday && <div className="w-1 h-1 rounded-full bg-indigo-500" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100">
        {LEGEND.map(({ status, color }) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            {STATUS_LABELS[status]}
          </div>
        ))}
      </div>
    </div>
  );
}
