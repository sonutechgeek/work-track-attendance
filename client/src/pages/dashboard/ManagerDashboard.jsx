import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchToday, fetchLiveTimer } from '../../store/slices/attendance.slice';
import { fetchMyBalance, fetchPending, approveLeaveAsync, rejectLeaveAsync } from '../../store/slices/leave.slice';
import { getMyTeam } from '../../api/user.api';
import CheckInOutCard from '../../components/attendance/CheckInOutCard';
import Card, { CardHeader, StatCard } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { LEAVE_STATUS_CONFIG } from '../../utils/constants';
import { fmtDate } from '../../utils/formatters';
import { HiUsers, HiCalendar, HiClock, HiMail, HiOfficeBuilding } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function ManagerDashboard() {
  const dispatch = useDispatch();
  const { pending, balance } = useSelector((s) => s.leave);
  const { user } = useSelector((s) => s.auth);

  const [team, setTeam]           = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchToday());
    dispatch(fetchLiveTimer());
    dispatch(fetchMyBalance());
    dispatch(fetchPending());

    getMyTeam({ limit: 50 })
      .then((r) => setTeam(r.data?.data?.members ?? []))
      .catch(() => {})
      .finally(() => setTeamLoading(false));
  }, [dispatch]);

  const handleApprove = async (id) => {
    const r = await dispatch(approveLeaveAsync({ id, comments: 'Approved' }));
    if (approveLeaveAsync.fulfilled.match(r)) toast.success('Leave approved');
    else toast.error('Failed to approve');
  };

  const handleReject = async (id) => {
    const r = await dispatch(rejectLeaveAsync({ id, comments: 'Rejected by manager' }));
    if (rejectLeaveAsync.fulfilled.match(r)) toast.success('Leave rejected');
    else toast.error('Failed to reject');
  };

  const leavesUsed = balance
    ? (balance.casualUsed ?? 0) + (balance.sickUsed ?? 0) + (balance.halfDayUsed ?? 0) + (balance.wfhUsed ?? 0)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Manager Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Welcome back, {user?.name?.split(' ')[0]}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<HiUsers />}    label="My Team"           value={teamLoading ? '…' : team.length}       color="indigo" />
        <StatCard icon={<HiCalendar />} label="Pending Approvals" value={pending?.length ?? 0}                  color="amber" />
        <StatCard icon={<HiClock />}    label="My Leaves Used"    value={leavesUsed ?? '—'}                     color="cyan" />
      </div>

      {/* Check-in + Pending Leaves */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <CheckInOutCard />
        </div>

        <Card padding={false} className="xl:col-span-2">
          <div className="p-6 pb-4">
            <CardHeader title="Pending Leave Requests" subtitle={`${pending?.length ?? 0} awaiting your approval`} />
          </div>
          {!pending?.length ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">
              No pending requests — all clear!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                    <th className="text-left px-6 py-2">Employee</th>
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
                        <td className="px-6 py-3 font-medium text-slate-700">{l.employee?.name ?? '—'}</td>
                        <td className="px-6 py-3 text-slate-600 capitalize">
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

      {/* My Team */}
      <Card padding={false}>
        <div className="p-6 pb-4">
          <CardHeader
            title="My Team"
            subtitle={teamLoading ? 'Loading…' : `${team.length} employee${team.length !== 1 ? 's' : ''} assigned to you`}
          />
        </div>

        {teamLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" className="text-primary-600" />
          </div>
        ) : !team.length ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">
            No employees assigned to you yet. Ask an admin to assign employees.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6 pt-2">
            {team.map((member) => (
              <div
                key={member.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-3 hover:border-primary-200 hover:bg-primary-50 transition-colors"
              >
                {/* Avatar */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm shrink-0">
                    {member.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{member.name}</p>
                    <p className="text-xs text-slate-500 truncate">{member.employeeId ?? `#${member.id}`}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <HiMail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.department?.name && (
                    <div className="flex items-center gap-1.5">
                      <HiOfficeBuilding className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{member.department.name}</span>
                    </div>
                  )}
                </div>

                {/* Role badge */}
                <div className="pt-1 border-t border-slate-100">
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 capitalize">
                    {member.role?.toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
