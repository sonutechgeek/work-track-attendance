import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchToday, fetchLiveTimer, fetchMyHistory } from '../../store/slices/attendance.slice';
import { fetchMyBalance, fetchMyLeaves } from '../../store/slices/leave.slice';
import CheckInOutCard from '../../components/attendance/CheckInOutCard';
import LeaveBalanceCard from '../../components/leave/LeaveBalanceCard';
import AttendanceWeekChart from '../../components/attendance/AttendanceWeekChart';
import ApplyLeaveModal from '../../components/leave/ApplyLeaveModal';
import Card, { CardHeader, StatCard } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { LEAVE_STATUS_CONFIG, ATTENDANCE_STATUS_CONFIG } from '../../utils/constants';
import { fmtDate, fmtHours } from '../../utils/formatters';
import { HiClock, HiCalendar, HiTrendingUp, HiStar } from 'react-icons/hi';
import useAuth from '../../hooks/useAuth';

function getWeekDayStrings() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

export default function EmployeeDashboard() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { history } = useSelector((s) => s.attendance);
  const { leaves, balance } = useSelector((s) => s.leave);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchToday());
    dispatch(fetchLiveTimer());
    dispatch(fetchMyBalance());
    dispatch(fetchMyHistory({ page: 1, limit: 30 }));
    dispatch(fetchMyLeaves({ page: 1, limit: 5 }));
  }, [dispatch]);

  // ── Compute attendance stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const records = history?.records ?? [];
    const weekDayStrs = new Set(getWeekDayStrings());

    const weekRecords = records.filter((r) => weekDayStrs.has(r.date?.split('T')[0]));
    const weekHours = weekRecords.reduce((s, r) => s + (r.workingHours ?? 0), 0);
    const weekPresent = weekRecords.filter((r) =>
      ['PRESENT', 'WFH', 'FIELD_VISIT'].includes(r.status)
    ).length;

    const total   = records.length;
    const present = records.filter((r) =>
      ['PRESENT', 'WFH', 'FIELD_VISIT', 'HALF_DAY'].includes(r.status)
    ).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    // Streak: consecutive present days from the most recent record
    let streak = 0;
    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const r of sorted) {
      if (['PRESENT', 'WFH', 'FIELD_VISIT'].includes(r.status)) streak++;
      else break;
    }

    const leaveLeft = balance
      ? Math.max(0, (balance.casualTotal ?? 0) - (balance.casualUsed ?? 0)) +
        Math.max(0, (balance.sickTotal   ?? 0) - (balance.sickUsed   ?? 0)) +
        Math.max(0, (balance.halfDayTotal ?? 0) - (balance.halfDayUsed ?? 0)) +
        Math.max(0, (balance.wfhTotal    ?? 0) - (balance.wfhUsed    ?? 0))
      : null;

    return { weekHours, weekPresent, rate, streak, leaveLeft };
  }, [history, balance]);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Good {getGreeting()}, {firstName}!
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Here's your overview for today</p>
        </div>
        <Button onClick={() => setApplyOpen(true)} className="hidden sm:inline-flex">
          + Apply Leave
        </Button>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<HiClock />}
          label="Hours This Week"
          value={stats.weekHours > 0 ? `${stats.weekHours.toFixed(1)}h` : '—'}
          sub={`${stats.weekPresent} day${stats.weekPresent !== 1 ? 's' : ''} worked`}
          color="indigo"
        />
        <StatCard
          icon={<HiStar />}
          label="Current Streak"
          value={stats.streak > 0 ? `${stats.streak}d` : '—'}
          sub="Consecutive days"
          color="violet"
        />
        <StatCard
          icon={<HiTrendingUp />}
          label="Attendance Rate"
          value={stats.rate > 0 ? `${stats.rate}%` : '—'}
          sub="Last 30 days"
          color={stats.rate >= 90 ? 'emerald' : stats.rate >= 75 ? 'amber' : 'rose'}
        />
        <StatCard
          icon={<HiCalendar />}
          label="Leaves Remaining"
          value={stats.leaveLeft ?? '—'}
          sub="Days available"
          color="cyan"
        />
      </div>

      {/* ── Check-in + Balance ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CheckInOutCard />
        <LeaveBalanceCard />
      </div>

      {/* ── Weekly attendance chart ─────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="This Week's Attendance"
          subtitle="Daily breakdown — hover bars for status"
        />
        <AttendanceWeekChart records={history?.records ?? []} />
      </Card>

      {/* ── Tables ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <Card padding={false}>
          <div className="p-6 pb-4">
            <CardHeader title="Recent Attendance" subtitle="Last 7 days" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="text-left px-6 py-2">Date</th>
                  <th className="text-left px-6 py-2">Status</th>
                  <th className="text-right px-6 py-2">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(history?.records ?? []).slice(0, 7).map((r) => {
                  const cfg = ATTENDANCE_STATUS_CONFIG[r.status] ?? {};
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-slate-700 font-medium">{fmtDate(r.date)}</td>
                      <td className="px-6 py-3">
                        <Badge variant={cfg.variant ?? 'default'}>{cfg.label ?? r.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-600">
                        {r.workingHours ? fmtHours(r.workingHours) : '—'}
                      </td>
                    </tr>
                  );
                })}
                {!history?.records?.length && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">No records yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Leaves */}
        <Card padding={false}>
          <div className="p-6 pb-4 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Recent Leaves</h3>
              <p className="text-sm text-slate-400 mt-0.5">Your latest applications</p>
            </div>
            <Button size="sm" onClick={() => setApplyOpen(true)}>+ Apply</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="text-left px-6 py-2">Type</th>
                  <th className="text-left px-6 py-2">Dates</th>
                  <th className="text-left px-6 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(leaves?.leaves ?? []).map((l) => {
                  const cfg = LEAVE_STATUS_CONFIG[l.status] ?? {};
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-700 capitalize">
                        {l.type?.toLowerCase().replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-3 text-slate-500 whitespace-nowrap text-xs">
                        {fmtDate(l.startDate)} – {fmtDate(l.endDate)}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={cfg.variant ?? 'default'}>{cfg.label ?? l.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {!leaves?.leaves?.length && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">No leave applications</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
