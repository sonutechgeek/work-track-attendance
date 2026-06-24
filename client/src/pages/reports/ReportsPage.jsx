import { useEffect, useState } from 'react';
import { getAttendanceSummary, getLeaveSummary } from '../../api/report.api';
import Card, { CardHeader } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#6366f1','#22d3ee','#f59e0b','#f43f5e','#10b981'];

export default function ReportsPage() {
  const [attendance, setAttendance] = useState(null);
  const [leaves, setLeaves] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    setLoading(true);
    const [year, m] = month.split('-');
    Promise.all([
      getAttendanceSummary({ year: +year, month: +m }),
      getLeaveSummary({ year: +year }),
    ]).then(([a, l]) => {
      setAttendance(a.data?.data);
      setLeaves(l.data?.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [month]);

  const attData = attendance?.daily ?? [];
  const leaveData = leaves?.byType
    ? Object.entries(leaves.byType).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Analytics and summaries</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary-600" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance chart */}
          <Card>
            <CardHeader title="Daily Attendance" subtitle="Present vs Absent per day" />
            {attData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={attData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="present" name="Present" fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="absent"  name="Absent"  fill="#f43f5e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-400 py-8 text-sm">No data for this period</p>
            )}
          </Card>

          {/* Leave chart */}
          <Card>
            <CardHeader title="Leaves by Type" subtitle={`Year ${month.split('-')[0]}`} />
            {leaveData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={leaveData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                    {leaveData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-400 py-8 text-sm">No leave data</p>
            )}
          </Card>

          {/* Summary stats */}
          {attendance?.summary && (
            <Card>
              <CardHeader title="Attendance Summary" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(attendance.summary).map(([k, v]) => (
                  <div key={k} className="text-center">
                    <p className="text-2xl font-bold text-slate-800 tabular-nums">{v}</p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">{k.replace(/_/g,' ')}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {leaves?.summary && (
            <Card>
              <CardHeader title="Leave Summary" />
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(leaves.summary).map(([k, v]) => (
                  <div key={k} className="text-center">
                    <p className="text-2xl font-bold text-slate-800 tabular-nums">{v}</p>
                    <p className="text-xs text-slate-500 mt-0.5 capitalize">{k.replace(/_/g,' ')}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
