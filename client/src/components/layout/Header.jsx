import { useEffect, useState } from 'react';
import { HiMenu, HiBell } from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';
import { fmtName } from '../../utils/formatters';

function useLiveClock() {
  const [dt, setDt] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setDt(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return dt;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatClock(dt) {
  const day  = DAY_NAMES[dt.getDay()];
  const date = dt.getDate();
  const mon  = MONTH_NAMES[dt.getMonth()];
  const h    = dt.getHours();
  const m    = String(dt.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return { date: `${day}, ${date} ${mon}`, time: `${h12}:${m} ${ampm}` };
}

export default function Header({ onMenuClick }) {
  const { user } = useAuth();
  const now = useLiveClock();
  const { date, time } = formatClock(now);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Left: hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        aria-label="Open menu"
      >
        <HiMenu className="w-5 h-5" />
      </button>

      {/* Centre: live clock (desktop) */}
      <div className="hidden lg:flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <span className="text-slate-500">{date}</span>
          <span className="text-slate-200">|</span>
          <span className="font-semibold text-slate-700 tabular-nums">{time}</span>
        </div>
      </div>

      {/* Right: bell + user */}
      <div className="flex items-center gap-3">
        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 relative transition-colors">
          <HiBell className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {fmtName(user?.name)}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize leading-tight">{user?.role?.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
