import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HiLocationMarker, HiCheckCircle } from 'react-icons/hi';
import { checkInAsync, checkOutAsync } from '../../store/slices/attendance.slice';
import LiveTimer from './LiveTimer';
import { fmtTime, fmtHours } from '../../utils/formatters';
import toast from 'react-hot-toast';

function PulseDot({ color = 'bg-emerald-400' }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  );
}

export default function CheckInOutCard() {
  const dispatch = useDispatch();
  const { timer, today, loading } = useSelector((s) => s.attendance);
  const [getting, setGetting] = useState(false);

  const getCoords = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      setGetting(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => { setGetting(false); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        ()    => { setGetting(false); resolve({}); },
        { timeout: 8000, maximumAge: 60000 }
      );
    });

  const handleCheckIn = async () => {
    const coords = await getCoords();
    const result = await dispatch(checkInAsync(coords));
    if (checkInAsync.fulfilled.match(result)) toast.success('Checked in successfully!');
    else toast.error(result.payload ?? 'Check-in failed');
  };

  const handleCheckOut = async () => {
    const coords = await getCoords();
    const result = await dispatch(checkOutAsync(coords));
    if (checkOutAsync.fulfilled.match(result)) toast.success('Great work today!');
    else toast.error(result.payload ?? 'Check-out failed');
  };

  const isActive  = timer?.active;
  const isDone    = !isActive && !!today?.checkOutTime;
  const isIdle    = !isActive && !today?.checkOutTime;
  const isBusy    = loading || getting;

  // ── Done state ─────────────────────────────────────────────────────────
  if (isDone) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg p-6 text-white flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-xs uppercase tracking-widest font-semibold">Today&rsquo;s Attendance</p>
            <p className="text-white font-bold text-lg mt-0.5">Day Complete</p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
            <HiCheckCircle className="w-4 h-4" />
            <span className="text-xs font-semibold">Done</span>
          </div>
        </div>

        <div className="flex flex-col items-center py-4 gap-1">
          <p className="text-emerald-200 text-xs uppercase tracking-widest">Total hours</p>
          <p className="text-5xl font-bold font-mono tabular-nums mt-1">
            {fmtHours(today?.workingHours)}
          </p>
        </div>

        <div className="flex justify-between text-sm bg-white/15 rounded-xl px-4 py-3">
          <div className="text-center">
            <p className="text-emerald-200 text-xs uppercase tracking-wide mb-0.5">Check In</p>
            <p className="font-semibold">{fmtTime(today?.checkInTime)}</p>
          </div>
          <div className="w-px bg-white/25" />
          <div className="text-center">
            <p className="text-emerald-200 text-xs uppercase tracking-wide mb-0.5">Check Out</p>
            <p className="font-semibold">{fmtTime(today?.checkOutTime)}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Active state (checked in) ───────────────────────────────────────────
  if (isActive) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-lg p-6 text-white flex flex-col gap-4 h-full">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-xs uppercase tracking-widest font-semibold">Today&rsquo;s Attendance</p>
            <p className="text-white font-bold text-lg mt-0.5">Currently Working</p>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-400/20 rounded-full px-3 py-1 border border-emerald-400/30">
            <PulseDot />
            <span className="text-xs font-semibold text-emerald-300">Active</span>
          </div>
        </div>

        <div className="flex flex-col items-center py-3 gap-1">
          <p className="text-indigo-200 text-xs uppercase tracking-widest">Working time</p>
          <LiveTimer className="text-5xl font-bold font-mono tabular-nums mt-1 drop-shadow-lg" />
        </div>

        <div className="text-center text-sm text-indigo-200 bg-white/10 rounded-xl px-4 py-2.5">
          Checked in at <span className="text-white font-semibold">{fmtTime(today?.checkInTime)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-indigo-300">
          <HiLocationMarker className="w-3.5 h-3.5" />
          Location recorded at check-in
        </div>

        <button
          disabled={isBusy}
          onClick={handleCheckOut}
          className="w-full py-3 rounded-xl bg-white text-indigo-700 font-semibold text-sm hover:bg-indigo-50 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {isBusy ? 'Please wait…' : 'Check Out'}
        </button>
      </div>
    );
  }

  // ── Idle state (not started) ────────────────────────────────────────────
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg p-6 text-white flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Today&rsquo;s Attendance</p>
          <p className="text-white font-bold text-lg mt-0.5">Not Started</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-600/50 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-slate-400" />
          <span className="text-xs font-semibold text-slate-400">Idle</span>
        </div>
      </div>

      <div className="flex flex-col items-center py-5 gap-3 text-slate-400">
        <div className="w-16 h-16 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 7v5l3 3" />
          </svg>
        </div>
        <p className="text-sm text-slate-300">Ready to start your day?</p>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <HiLocationMarker className="w-3.5 h-3.5" />
        Location will be recorded on check-in
      </div>

      <button
        disabled={isBusy}
        onClick={handleCheckIn}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
      >
        {isBusy ? 'Getting location…' : 'Check In'}
      </button>
    </div>
  );
}
