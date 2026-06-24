import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchToday } from '../../store/slices/attendance.slice';
import { fetchPending, approveLeaveAsync, rejectLeaveAsync } from '../../store/slices/leave.slice';
import Card, { CardHeader, StatCard } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { LEAVE_STATUS_CONFIG } from '../../utils/constants';
import { fmtDate } from '../../utils/formatters';
import { HiUsers, HiCalendar, HiOfficeBuilding, HiCheck, HiClock } from 'react-icons/hi';
import { getDashboard } from '../../api/report.api';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const { pending } = useSelector((s) => s.leave);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    dispatch(fetchToday());
    dispatch(fetchPending());
    getDashboard()
      .then((d) => setStats(d.data?.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [dispatch]);

  const handleApprove = async (id) => {
    const r = await dispatch(approveLeaveAsync({ id, comments: 'Approved by admin' }));
    if (approveLeaveAsync.fulfilled.match(r)) toast.success('Leave approved');
    else toast.error('Failed');
  };

  const handleReject = async (id) => {
    const r = await dispatch(rejectLeaveAsync({ id, comments: 'Rejected by admin' }));
    if (rejectLeaveAsync.fulfilled.match(r)) toast.success('Leave rejected');
    else toast.error('Failed');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Organisation overview</p>
      </div>

      {loadingStats ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<HiUsers />}
            label="Total Employees"
            value={stats?.totals?.totalEmployees ?? '—'}
            color="indigo"
          />
          <StatCard
            icon={<HiOfficeBuilding />}
            label="Departments"
            value={stats?.totals?.totalDepartments ?? '—'}
            color="cyan"
          />
          <StatCard
            icon={<HiCalendar />}
            label="Pending Leaves"
            value={pending?.length ?? 0}
            color="amber"
          />
          <StatCard
            icon={<HiCheck />}
            label="Present Today"
            value={stats?.today?.presentToday ?? 0}
            color="emerald"
          />
        </div>
      )}

      <Card padding={false}>
        <div className="p-6 pb-4">
          <CardHeader
            title="Pending Leave Requests"
            subtitle={`${pending?.length ?? 0} awaiting approval`}
          />
        </div>
        {!pending?.length ? (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">
            <HiClock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No pending leave requests
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="text-left px-6 py-2">Employee</th>
                  <th className="text-left px-6 py-2">Dept</th>
                  <th className="text-left px-6 py-2">Type</th>
                  <th className="text-left px-6 py-2">Dates</th>
                  <th className="text-left px-6 py-2">Status</th>
                  <th className="text-right px-6 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pending.map((l) => {
                  const cfg = LEAVE_STATUS_CONFIG[l.status] ?? {};
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      {/* Fixed: was l.user?.name — backend returns l.employee */}
                      <td className="px-6 py-3 font-medium text-slate-700">{l.employee?.name ?? '—'}</td>
                      <td className="px-6 py-3 text-slate-500">{l.employee?.department?.name ?? '—'}</td>
                      {/* Fixed: was l.leaveType — field is l.type */}
                      <td className="px-6 py-3 capitalize text-slate-600">
                        {l.type?.toLowerCase().replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                        {fmtDate(l.startDate)} – {fmtDate(l.endDate)}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={cfg.variant ?? 'default'}>{cfg.label ?? l.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Button size="sm" variant="success" onClick={() => handleApprove(l.id)}>Approve</Button>
                          <Button size="sm" variant="danger"  onClick={() => handleReject(l.id)}>Reject</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
