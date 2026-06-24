import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyLeaves, fetchMyBalance } from '../../store/slices/leave.slice';
import LeaveBalanceCard from '../../components/leave/LeaveBalanceCard';
import ApplyLeaveModal from '../../components/leave/ApplyLeaveModal';
import FilterBar from '../../components/ui/FilterBar';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import { LEAVE_STATUS_CONFIG } from '../../utils/constants';
import { fmtDate } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import useThrottle from '../../hooks/useThrottle';
import { useState } from 'react';

const TYPE_OPTIONS = [
  { value: '',            label: 'All Types'   },
  { value: 'CASUAL',      label: 'Casual'      },
  { value: 'SICK',        label: 'Sick'        },
  { value: 'HALF_DAY',    label: 'Half Day'    },
  { value: 'WFH',         label: 'WFH'         },
  { value: 'EARLY_LEAVE', label: 'Early Leave' },
  { value: 'FIELD_VISIT', label: 'Field Visit' },
];

const STATUS_OPTIONS = [
  { value: '',          label: 'All Statuses' },
  { value: 'PENDING',   label: 'Pending'      },
  { value: 'APPROVED',  label: 'Approved'     },
  { value: 'REJECTED',  label: 'Rejected'     },
];

const FILTER_FIELDS = [
  { type: 'select', name: 'type',   label: 'Type',   options: TYPE_OPTIONS   },
  { type: 'select', name: 'status', label: 'Status', options: STATUS_OPTIONS },
];

export default function MyLeavesPage() {
  const dispatch = useDispatch();
  const { leaves, loading } = useSelector((s) => s.leave);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchMyBalance());
    dispatch(fetchMyLeaves({ page: 1, limit: 10 }));
  }, [dispatch]);

  // Throttle pagination: max 1 page change per 300 ms
  const handlePage = useThrottle(
    useCallback((p) => dispatch(fetchMyLeaves({ page: p, limit: 10 })), [dispatch]),
    300,
  );

  const handleFilter = (filters) => {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    dispatch(fetchMyLeaves({ ...clean, page: 1, limit: 10 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Leaves</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your leave applications</p>
        </div>
        <Button onClick={() => setApplyOpen(true)}>+ Apply Leave</Button>
      </div>

      <div className="max-w-md">
        <LeaveBalanceCard />
      </div>

      <Card padding={false}>
        <div className="p-6 pb-3">
          <CardHeader title="Leave History" />
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
                    <th className="text-left px-6 py-2">Type</th>
                    <th className="text-left px-6 py-2">From</th>
                    <th className="text-left px-6 py-2">To</th>
                    <th className="text-left px-6 py-2">Days</th>
                    <th className="text-left px-6 py-2">Status</th>
                    <th className="text-left px-6 py-2">Reason</th>
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
                        <td className="px-6 py-3 text-slate-600">{fmtDate(l.startDate)}</td>
                        <td className="px-6 py-3 text-slate-600">{fmtDate(l.endDate)}</td>
                        <td className="px-6 py-3 tabular-nums text-slate-600">{l.duration ?? '—'}</td>
                        <td className="px-6 py-3">
                          <Badge variant={cfg.variant ?? 'default'}>{cfg.label ?? l.status}</Badge>
                        </td>
                        <td className="px-6 py-3 text-slate-500 max-w-xs truncate">{l.reason}</td>
                      </tr>
                    );
                  })}
                  {!leaves?.leaves?.length && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No leave applications found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination pagination={leaves?.pagination} onPageChange={handlePage} />
          </>
        )}
      </Card>

      <ApplyLeaveModal open={applyOpen} onClose={() => setApplyOpen(false)} />
    </div>
  );
}
