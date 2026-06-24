import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyHistory } from '../../store/slices/attendance.slice';
import CheckInOutCard from '../../components/attendance/CheckInOutCard';
import FilterBar from '../../components/ui/FilterBar';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { ATTENDANCE_STATUS_CONFIG } from '../../utils/constants';
import { fmtDate, fmtTime, fmtHours } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import useThrottle from '../../hooks/useThrottle';

const STATUS_OPTIONS = [
  { value: '',            label: 'All Statuses' },
  { value: 'PRESENT',     label: 'Present'      },
  { value: 'ABSENT',      label: 'Absent'       },
  { value: 'HALF_DAY',    label: 'Half Day'     },
  { value: 'LEAVE',       label: 'On Leave'     },
  { value: 'WFH',         label: 'WFH'          },
  { value: 'FIELD_VISIT', label: 'Field Visit'  },
];

const FILTER_FIELDS = [
  { type: 'select', name: 'status', label: 'Status', options: STATUS_OPTIONS },
  { type: 'date',   name: 'from',   label: 'From' },
  { type: 'date',   name: 'to',     label: 'To'   },
];

export default function AttendancePage() {
  const dispatch = useDispatch();
  const { history, loading } = useSelector((s) => s.attendance);

  useEffect(() => {
    dispatch(fetchMyHistory({ page: 1, limit: 20 }));
  }, [dispatch]);

  // Throttle pagination: max 1 page change per 300 ms
  const handlePage = useThrottle(
    useCallback((p) => dispatch(fetchMyHistory({ page: p, limit: 20 })), [dispatch]),
    300,
  );

  const handleFilter = (filters) => {
    dispatch(fetchMyHistory({ ...filters, page: 1, limit: 20 }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Attendance</h1>
        <p className="text-slate-500 text-sm mt-0.5">Track your daily check-in/out</p>
      </div>

      <div className="max-w-sm">
        <CheckInOutCard />
      </div>

      <Card padding={false}>
        <div className="p-6 pb-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Attendance History" subtitle="All your past records" />
        </div>

        {/* Filter bar */}
        <div className="px-6 pb-4">
          <FilterBar fields={FILTER_FIELDS} onFilter={handleFilter} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-600" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                    <th className="text-left px-6 py-2">Date</th>
                    <th className="text-left px-6 py-2">Status</th>
                    <th className="text-left px-6 py-2">Check In</th>
                    <th className="text-left px-6 py-2">Check Out</th>
                    <th className="text-right px-6 py-2">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(history?.records ?? []).map((r) => {
                    const cfg = ATTENDANCE_STATUS_CONFIG[r.status] ?? {};
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-700">{fmtDate(r.date)}</td>
                        <td className="px-6 py-3">
                          <Badge variant={cfg.variant ?? 'default'}>{cfg.label ?? r.status}</Badge>
                        </td>
                        <td className="px-6 py-3 text-slate-600 tabular-nums">
                          {r.checkInTime ? fmtTime(r.checkInTime) : '—'}
                        </td>
                        <td className="px-6 py-3 text-slate-600 tabular-nums">
                          {r.checkOutTime ? fmtTime(r.checkOutTime) : '—'}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-slate-600">
                          {r.workingHours ? fmtHours(r.workingHours) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {!history?.records?.length && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination pagination={history?.pagination} onPageChange={handlePage} />
          </>
        )}
      </Card>
    </div>
  );
}
