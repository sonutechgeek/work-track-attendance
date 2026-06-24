import { useEffect, useState, useRef, useCallback } from 'react';
import { getUsers, createUser, updateUser, deleteUser, assignManager } from '../../api/user.api';
import { getDepartments } from '../../api/department.api';
import FilterBar from '../../components/ui/FilterBar';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Select } from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import { ROLE_CONFIG, ROLES } from '../../utils/constants';
import { fmtName } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import useThrottle from '../../hooks/useThrottle';
import { HiPencil, HiTrash, HiPlus, HiUsers, HiViewList, HiUserGroup, HiLink } from 'react-icons/hi';

// Avatar circle
function Avatar({ name, size = 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold flex-shrink-0`}>
      {fmtName(name)}
    </div>
  );
}

// ─── Hierarchy view ──────────────────────────────────────────────────────────
function HierarchyView({ allUsers, onAssign }) {
  const managers   = allUsers.filter((u) => u.role === ROLES.MANAGER);
  const employees  = allUsers.filter((u) => u.role === ROLES.EMPLOYEE);
  const managerIds = new Set(managers.map((m) => m.id));
  // Backend returns manager as nested {id,name}, not a flat managerId field
  const unassigned = employees.filter((e) => !e.manager?.id || !managerIds.has(e.manager.id));

  return (
    <div className="space-y-5">
      {managers.map((mgr) => {
        const team = employees.filter((e) => e.manager?.id === mgr.id);
        return (
          <Card key={mgr.id} padding={false} className="overflow-hidden">
            {/* Manager header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Avatar name={mgr.name} />
                <div>
                  <p className="font-semibold text-slate-800">{mgr.name}</p>
                  <p className="text-xs text-slate-500">{mgr.email} · {mgr.department?.name ?? 'No dept'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="warning">Manager</Badge>
                <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                  {team.length} member{team.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Team members */}
            {team.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400 italic">No employees assigned yet</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {team.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 pl-6">
                      {/* Tree line visual */}
                      <div className="w-4 h-px bg-slate-200 -ml-6 mr-2" />
                      <Avatar name={emp.name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">Employee</Badge>
                      <button
                        onClick={() => onAssign(emp)}
                        className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        Reassign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {/* Unassigned employees */}
      {unassigned.length > 0 && (
        <Card padding={false} className="border-dashed border-amber-300">
          <div className="flex items-center justify-between px-5 py-4 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <HiUserGroup className="w-5 h-5 text-amber-500" />
              <p className="font-semibold text-amber-700">Unassigned Employees</p>
            </div>
            <Badge variant="warning">{unassigned.length} unassigned</Badge>
          </div>
          <div className="divide-y divide-slate-50">
            {unassigned.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={emp.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{emp.name}</p>
                    <p className="text-xs text-slate-400">{emp.email}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onAssign(emp)}>
                  <HiLink className="w-4 h-4" /> Assign Manager
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {managers.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          No managers found. Create a manager first.
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [allUsers, setAllUsers]   = useState([]);
  const [data, setData]           = useState(null);
  const [departments, setDepts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [tab, setTab]             = useState('list');   // 'list' | 'hierarchy'

  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [deleting, setDeleting]     = useState(null);
  const [assigning, setAssigning]   = useState(null);
  const [assignMgrId, setAssignMgrId] = useState('');

  const filtersRef = useRef({});

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = useCallback(async (p = 1, filters = filtersRef.current) => {
    setLoading(true);
    // Safety net: if API calls hang (e.g. interceptor deadlock), stop spinner after 20 s
    const safetyTimer = setTimeout(() => setLoading(false), 20_000);
    try {
      const usersRes = await getUsers({ page: p, limit: 15, ...filters });
      const deptsRes = await getDepartments();
      const allRes   = await getUsers({ limit: 200 });
      setData(usersRes.data?.data);
      setDepts(deptsRes.data?.data ?? []);
      setAllUsers(allRes.data?.data?.users ?? []);
      setPage(p);
    } catch (err) {
      // Use a fixed ID so repeated failures collapse to one toast, not a stack
      toast.error(err?.response?.data?.message ?? 'Failed to load users', { id: 'users-load-error' });
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFilter = (filters) => {
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    filtersRef.current = clean;
    load(1, clean);
  };

  // Throttle pagination to prevent rapid-click floods
  const handlePage = useThrottle(
    useCallback((p) => load(p), [load]),
    300,
  );

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true); };
  const openEdit   = (u) => {
    setEditing(u);
    reset({ name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ?? '' });
    setModalOpen(true);
  };
  const openAssign = (emp) => {
    setAssigning(emp);
    setAssignMgrId(emp.manager?.id ? String(emp.manager.id) : '');
  };

  const onSubmit = async (vals) => {
    const payload = {
      ...vals,
      departmentId: vals.departmentId ? Number(vals.departmentId) : null,
    };
    try {
      if (editing) {
        await updateUser(editing.id, payload);
        toast.success('User updated');
      } else {
        await createUser(payload);
        toast.success('User created');
      }
      setModalOpen(false);
      load(page);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Error');
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteUser(deleting.id);
      toast.success('User deleted');
      setDeleting(null);
      load(page);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Error');
    }
  };

  const confirmAssign = async () => {
    try {
      await assignManager(assigning.id, { managerId: assignMgrId ? Number(assignMgrId) : null });
      toast.success('Manager assigned successfully');
      setAssigning(null);
      load(page);
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Error');
    }
  };

  const managers   = allUsers.filter((u) => u.role === ROLES.MANAGER);
  const managerIds = new Set(managers.map((m) => m.id));

  const roleOptions = [
    { value: '',          label: 'All Roles' },
    { value: 'ADMIN',     label: 'Admin'     },
    { value: 'MANAGER',   label: 'Manager'   },
    { value: 'EMPLOYEE',  label: 'Employee'  },
  ];
  const deptOptions = [
    { value: '', label: 'All Depts' },
    ...departments.map((d) => ({ value: String(d.id), label: d.name })),
  ];
  const filterFields = [
    { type: 'search', name: 'search',       placeholder: 'Search by name, email, ID…' },
    { type: 'select', name: 'role',         label: 'Role',       options: roleOptions  },
    { type: 'select', name: 'departmentId', label: 'Department', options: deptOptions  },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage members and assign managers</p>
        </div>
        <Button onClick={openCreate}><HiPlus className="w-4 h-4" /> Add User</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('list')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${tab === 'list' ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <HiViewList className="w-4 h-4" /> All Users
        </button>
        <button
          onClick={() => setTab('hierarchy')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${tab === 'hierarchy' ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <HiUsers className="w-4 h-4" /> Team Hierarchy
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary-600" /></div>
      ) : tab === 'hierarchy' ? (
        <HierarchyView allUsers={allUsers} onAssign={openAssign} />
      ) : (
        /* ── List view ── */
        <Card padding={false}>
          {/* Filter bar */}
          <div className="px-6 pt-4 pb-3">
            <FilterBar fields={filterFields} onFilter={handleFilter} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-slate-100">
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-6 py-3">Role</th>
                  <th className="text-left px-6 py-3">Department</th>
                  <th className="text-left px-6 py-3">Reports To</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-right px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(data?.users ?? []).map((u) => {
                  const rcfg = ROLE_CONFIG[u.role] ?? {};
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size="sm" />
                          <span className="font-medium text-slate-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-500">{u.email}</td>
                      <td className="px-6 py-3">
                        <Badge variant={rcfg.badgeVariant ?? 'default'}>{u.role}</Badge>
                      </td>
                      <td className="px-6 py-3 text-slate-500">{u.department?.name ?? '—'}</td>
                      <td className="px-6 py-3">
                        {u.manager && managerIds.has(u.manager.id) ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={u.manager.name} size="sm" />
                            <span className="text-slate-600 text-xs">{u.manager.name}</span>
                          </div>
                        ) : u.role === ROLES.EMPLOYEE ? (
                          <button
                            onClick={() => openAssign(u)}
                            className="text-xs text-amber-600 hover:text-amber-700 hover:underline font-medium"
                          >
                            + Assign Manager
                          </button>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant={u.isActive ? 'success' : 'danger'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="inline-flex gap-1">
                          {u.role === ROLES.EMPLOYEE && (
                            <button
                              onClick={() => openAssign(u)}
                              title="Assign Manager"
                              className="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors"
                            >
                              <HiLink className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary-600 transition-colors">
                            <HiPencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleting(u)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors">
                            <HiTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!data?.users?.length && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination pagination={data?.pagination} onPageChange={handlePage} />
        </Card>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Full Name" placeholder="John Doe" error={errors.name?.message}
            {...register('name', { required: 'Name is required' })} />
          <Input type="email" label="Email" placeholder="user@company.com" error={errors.email?.message}
            {...register('email', { required: 'Email is required' })} />
          {!editing && (
            <Input
              type="password"
              label="Password"
              placeholder="e.g. Admin@123"
              hint="Min 8 chars · must include uppercase, lowercase & a number"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Min 8 characters' },
                pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Must have uppercase, lowercase and a number' },
              })}
            />
          )}
          <Select label="Role" error={errors.role?.message} {...register('role', { required: 'Select a role' })}>
            <option value="">Select role…</option>
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
            ))}
          </Select>
          <Select label="Department" {...register('departmentId')}>
            <option value="">No department</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Assign Manager Modal ── */}
      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Assign Manager" size="sm">
        {assigning && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Avatar name={assigning.name} />
              <div>
                <p className="font-medium text-slate-800">{assigning.name}</p>
                <p className="text-xs text-slate-500">{assigning.email}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Assign to Manager</label>
              <select
                value={assignMgrId}
                onChange={(e) => setAssignMgrId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">— Remove assignment —</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.department?.name ? `(${m.department.name})` : ''}
                  </option>
                ))}
              </select>
              {managers.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No managers found. Create a manager first.</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setAssigning(null)}>Cancel</Button>
              <Button className="flex-1" onClick={confirmAssign}>Save Assignment</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete User" size="sm">
        <p className="text-sm text-slate-600 mb-5">
          Are you sure you want to delete <strong>{deleting?.name}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
