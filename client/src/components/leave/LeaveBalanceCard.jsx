import { useSelector } from 'react-redux';
import Card from '../ui/Card';

// Backend returns: casualTotal/casualUsed, sickTotal/sickUsed, halfDayTotal/halfDayUsed, wfhTotal/wfhUsed
const TYPES = [
  { totalKey: 'casualTotal',  usedKey: 'casualUsed',  label: 'Casual',   color: '#4f46e5', bg: 'bg-indigo-500'  },
  { totalKey: 'sickTotal',    usedKey: 'sickUsed',    label: 'Sick',     color: '#d97706', bg: 'bg-amber-500'   },
  { totalKey: 'halfDayTotal', usedKey: 'halfDayUsed', label: 'Half Day', color: '#0891b2', bg: 'bg-cyan-500'    },
  { totalKey: 'wfhTotal',     usedKey: 'wfhUsed',     label: 'WFH',      color: '#7c3aed', bg: 'bg-violet-500'  },
];

function BalanceBar({ label, used, total, barColor }) {
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: barColor }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-slate-600">{label}</span>
          <span className="text-xs tabular-nums text-slate-400">
            <span className="font-semibold text-slate-700">{remaining}</span> / {total} left
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
      </div>
    </div>
  );
}

export default function LeaveBalanceCard() {
  const { balance } = useSelector((s) => s.leave);

  const totalRemaining = balance
    ? TYPES.reduce((sum, t) => sum + Math.max(0, (balance[t.totalKey] ?? 0) - (balance[t.usedKey] ?? 0)), 0)
    : null;

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Leave Balance</h3>
          <p className="text-xs text-slate-400 mt-0.5">Remaining days this year</p>
        </div>
        {totalRemaining !== null && (
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-800 leading-tight">{totalRemaining}</p>
            <p className="text-xs text-slate-400">days left</p>
          </div>
        )}
      </div>

      <div className="space-y-3.5">
        {TYPES.map(({ totalKey, usedKey, label, color }) => {
          const total = balance?.[totalKey] ?? 0;
          const used  = balance?.[usedKey]  ?? 0;
          return (
            <BalanceBar key={label} label={label} used={used} total={total} barColor={color} />
          );
        })}
      </div>

      {!balance && (
        <p className="text-sm text-slate-400 text-center py-4">Loading balance…</p>
      )}
    </Card>
  );
}
