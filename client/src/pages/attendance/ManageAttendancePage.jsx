import { useEffect, useState, useCallback, useRef } from 'react';
import { getTeam, getAll } from '../../api/attendance.api';
import { getDepartments } from '../../api/department.api';
import FilterBar from '../../components/ui/FilterBar';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { ATTENDANCE_STATUS_CONFIG } from '../../utils/constants';
import { fmtDate, fmtTime, fmtHours } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import useAuth from '../../hooks/useAuth';
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

export default function ManageAttendancePage() {
  const { isAdmin } = useAuth();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [departments, setDepts]   = useState([]);

  // Active filters kept in a ref so the throttled loadData always reads latest
  const filtersRef = useRef({});

  const loadData = useCallback(async (p = 1, filters = filtersRef.current) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20, ...filters };
      const res = isAdmin ? await getAll(params) : await getTeam(params);
      setData(res.data?.data);
      setPage(p);
    } catch (err) {
      console.error('Attendance load error:', err?.response?.data?.message ?? err.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData(1);
    if (isAdmin) {
      getDepartments().then((r) => setDepts(r.data?.data ?? []));
    }
  }, [loadData, isAdmin]);

  // Throttle pagination to prevent rapid-click request floods
  const handlePage = useThrottle(
    useCallback((p) => loadData(p), [loadData]),
    300,
  );

  const handleFilter = (filters) => {
    // Remove empty strings so the backend doesn't receive them as empty params
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    filtersRef.current = clean;
    loadData(1, clean);
  };

  const deptOptions = [
    { value: '', label: 'All Depts' },
    ...departments.map((d) => ({ value: String(d.id), label: d.name })),
  ];

  const filterFields = [
    { type: 'search', name: 'search', placeholder: 'Search employee…' },
    { type: 'select', name: 'status', label: 'Status', options: STATUS_OPTIONS },
    ...(isAdmin ? [{ type: 'select', name: 'departmentId', label: 'Department', options: deptOptions }] : []),
    { type: 'date', name: 'from', label: 'From' },
    { type: 'date', name: 'to',   label: 'To'   },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {isAdmin ? 'All Attendance' : 'Team Attendance'}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isAdmin ? 'Organisation-wide records' : "Your team's attendance"}
        </p>
      </div>

      <Card padding={false}>
        <div className="p-6 pb-3">
          <CardHeader
            title="Attendance Records"
            subtitle={data?.pagination ? `${data.pagination.total} records total` : ''}
          />
        </div>

        {/* Filter bar */}
        <div className="px-6 pb-4">
          <FilterBar fields={filterFields} onFilter={handleFilter} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-600" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                    <th className="text-left px-6 py-2">Employee</th>
                    {isAdmin && <th className="text-left px-6 py-2">Dept</th>}
                    <th className="text-left px-6 py-2">Date</th>
                    <th className="text-left px-6 py-2">Status</th>
                    <th className="text-left px-6 py-2">In</th>
                    <th className="text-left px-6 py-2">Out</th>
                    <th className="text-right px-6 py-2">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(data?.records ?? []).map((r) => {
                    const cfg = ATTENDANCE_STATUS_CONFIG[r.status] ?? {};
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-700">{r.employee?.name ?? '—'}</td>
                        {isAdmin && <td className="px-6 py-3 text-slate-500">{r.employee?.department?.name ?? '—'}</td>}
                        <td className="px-6 py-3 text-slate-600">{fmtDate(r.date)}</td>
                        <td className="px-6 py-3">
                          <Badge variant={cfg.variant ?? 'default'}>{cfg.label ?? r.status}</Badge>
                        </td>
                        <td className="px-6 py-3 tabular-nums text-slate-600">
                          {r.checkInTime ? fmtTime(r.checkInTime) : '—'}
                        </td>
                        <td className="px-6 py-3 tabular-nums text-slate-600">
                          {r.checkOutTime ? fmtTime(r.checkOutTime) : '—'}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-slate-600">
                          {r.workingHours ? fmtHours(r.workingHours) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {!data?.records?.length && (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-slate-400">
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination pagination={data?.pagination} onPageChange={handlePage} />
          </>
        )}
      </Card>
    </div>
  );
}
