import { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAllLeaves, fetchTeamLeaves, fetchPending,
  approveLeaveAsync, rejectLeaveAsync,
} from '../../store/slices/leave.slice';
import FilterBar from '../../components/ui/FilterBar';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Input';
import { LEAVE_STATUS_CONFIG } from '../../utils/constants';
import { fmtDate } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import useAuth from '../../hooks/useAuth';
import useThrottle from '../../hooks/useThrottle';
import toast from 'react-hot-toast';

const TYPE_OPTIONS = [
  { value: '',            label: 'All Types'   },
  { value: 'CASUAL',      label: 'Casual'      },
  { value: 'SICK',        label: 'Sick'        },
  { value: 'HALF_DAY',    label: 'Half Day'    },
  { value: 'WFH',         label: 'WFH'         },
  { value: 'EARLY_LEAVE', label: 'Early Leave' },
  { value: 'FIELD_VISIT', label: 'Field Visit' },
];

export default function ManageLeavesPage() {
  const dispatch = useDispatch();
  const { isAdmin, isManager } = useAuth();
  const { allLeaves, pending, loading } = useSelector((s) => s.leave);
  const [tab, setTab] = useState('pending');
  const [actionLeave, setActionLeave] = useState(null);
  const [comments, setComments] = useState('');

  // Keep latest filters so post-action refresh can include them
  const filtersRef = useRef({});

  const fetchAll = useCallback((extra = {}) => {
    const p = { page: 1, limit: 30, ...filtersRef.current, ...extra };
    if (isAdmin)   dispatch(fetchAllLeaves(p));
    if (isManager) dispatch(fetchTeamLeaves(p));
  }, [dispatch, isAdmin, isManager]);

  useEffect(() => {
    dispatch(fetchPending());
    fetchAll();
  }, [dispatch, fetchAll]);

  const handleTabChange = (t) => {
    setTab(t);
    if (t === 'all') fetchAll();
  };

  const handleFilter = (filters) => {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    filtersRef.current = clean;
    if (tab === 'all') fetchAll(clean);
  };

  const handleAction = async (type) => {
    if (type === 'reject' && !comments?.trim()) {
      toast.error('Please add a reason for rejection');
      return;
    }
    const action = type === 'approve' ? approveLeaveAsync : rejectLeaveAsync;
    const r = await dispatch(action({ id: actionLeave.id, comments: comments.trim() || 'Reviewed' }));
    if (action.fulfilled.match(r)) {
      toast.success(`Leave ${type === 'approve' ? 'approved' : 'rejected'}`);
      setActionLeave(null);
      setComments('');
      dispatch(fetchPending());
      fetchAll();
    } else {
      toast.error(r.payload ?? 'Action failed');
    }
  };

  // Throttle pagination: max 1 call per 300 ms
  const handlePage = useThrottle(
    useCallback((p) => {
      const params = { page: p, limit: 30, ...filtersRef.current };
      if (isAdmin)   dispatch(fetchAllLeaves(params));
      if (isManager) dispatch(fetchTeamLeaves(params));
    }, [dispatch, isAdmin, isManager]),
    300,
  );

  // Filter fields — search only on the "All Leaves" tab (pending list is small, no need)
  const filterFields = [
    ...(tab === 'all' ? [{ type: 'search', name: 'search', placeholder: 'Search employee…' }] : []),
    { type: 'select', name: 'type', label: 'Type', options: TYPE_OPTIONS },
  ];

  const records = tab === 'pending' ? (pending ?? []) : (allLeaves?.leaves ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {isAdmin ? 'All Leave Requests' : 'Team Leaves'}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Review and manage leave applications</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['pending', 'all'].map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize
              ${tab === t
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {t === 'pending' ? `Pending${pending?.length ? ` (${pending.length})` : ''}` : 'All Leaves'}
          </button>
        ))}
      </div>

      <Card padding={false}>
        <div className="p-6 pb-3">
          <CardHeader
            title={tab === 'pending' ? 'Pending Requests' : 'All Leaves'}
            subtitle={`${records?.length ?? 0} records`}
          />
        </div>

        {/* Filter bar */}
        <div className="px-6 pb-4">
          <FilterBar fields={filterFields} onFilter={handleFilter} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                  <th className="text-left px-6 py-2">Employee</th>
                  {isAdmin && <th className="text-left px-6 py-2">Dept</th>}
                  <th className="text-left px-6 py-2">Type</th>
                  <th className="text-left px-6 py-2">Dates</th>
                  <th className="text-left px-6 py-2">Days</th>
                  <th className="text-left px-6 py-2">Status</th>
                  <th className="text-right px-6 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map((l) => {
                  const cfg = LEAVE_STATUS_CONFIG[l.status] ?? {};
                  const isPending = l.status === 'PENDING';
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-700">{l.employee?.name ?? '—'}</td>
                      {isAdmin && <td className="px-6 py-3 text-slate-500">{l.employee?.department?.name ?? '—'}</td>}
                      <td className="px-6 py-3 capitalize text-slate-600">
                        {l.type?.toLowerCase().replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                        {fmtDate(l.startDate)} – {fmtDate(l.endDate)}
                      </td>
                      <td className="px-6 py-3 tabular-nums text-slate-600">{l.duration ?? '—'}</td>
                      <td className="px-6 py-3">
                        <Badge variant={cfg.variant ?? 'default'}>{cfg.label ?? l.status}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {isPending ? (
                          <Button size="sm" variant="success"
                            onClick={() => { setActionLeave(l); setComments(''); }}>
                            Review
                          </Button>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {!records.length && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-slate-400">
                      No leave requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'all' && allLeaves?.pagination && (
          <Pagination pagination={allLeaves.pagination} onPageChange={handlePage} />
        )}
      </Card>

      {/* Review Modal */}
      <Modal open={!!actionLeave} onClose={() => setActionLeave(null)} title="Review Leave Request">
        {actionLeave && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide">Employee</span>
                <p className="font-medium mt-0.5">{actionLeave.employee?.name}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide">Leave Type</span>
                <p className="font-medium mt-0.5 capitalize">
                  {actionLeave.type?.toLowerCase().replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide">From</span>
                <p className="font-medium mt-0.5">{fmtDate(actionLeave.startDate)}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wide">To</span>
                <p className="font-medium mt-0.5">{fmtDate(actionLeave.endDate)}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 text-xs uppercase tracking-wide">Reason</span>
                <p className="font-medium mt-0.5">{actionLeave.reason}</p>
              </div>
            </div>

            <Textarea
              label="Comments"
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add a note… (required for rejection)"
            />

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setActionLeave(null)}>Cancel</Button>
              <Button variant="danger"  className="flex-1" loading={loading} onClick={() => handleAction('reject')}>Reject</Button>
              <Button variant="success" className="flex-1" loading={loading} onClick={() => handleAction('approve')}>Approve</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
