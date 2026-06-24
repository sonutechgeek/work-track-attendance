import { useEffect, useState } from 'react';
import {
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
} from '../../api/department.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input, { Textarea } from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { useForm } from 'react-hook-form';
import { HiPencil, HiTrash, HiPlus, HiOfficeBuilding, HiUsers } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDepartments();
      setDepartments(res.data?.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true); };
  const openEdit   = (d) => { setEditing(d); reset({ name: d.name, description: d.description }); setModalOpen(true); };

  const onSubmit = async (vals) => {
    try {
      if (editing) {
        await updateDepartment(editing.id, vals);
        toast.success('Department updated');
      } else {
        await createDepartment(vals);
        toast.success('Department created');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Error');
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteDepartment(deleting.id);
      toast.success('Department deleted');
      setDeleting(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Departments</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage organisation departments</p>
        </div>
        <Button onClick={openCreate}><HiPlus className="w-4 h-4" /> Add Department</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-primary-600" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => (
            <Card key={d.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                  <HiOfficeBuilding className="w-5 h-5" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-primary-600 transition-colors">
                    <HiPencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleting(d)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors">
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{d.name}</h3>
                {d.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{d.description}</p>}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 pt-1 border-t border-slate-100">
                <HiUsers className="w-4 h-4" />
                <span>{d._count?.users ?? 0} members</span>
                {d.head?.name && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="truncate">Head: {d.head.name}</span>
                  </>
                )}
              </div>
            </Card>
          ))}
          {!departments.length && (
            <div className="col-span-3 py-16 text-center text-slate-400">No departments yet</div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Department Name" placeholder="e.g. Engineering" error={errors.name?.message}
            {...register('name', { required: 'Name is required' })} />
          <Textarea label="Description" rows={3} placeholder="What does this department do?"
            {...register('description')} />
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete Department" size="sm">
        <p className="text-sm text-slate-600 mb-5">
          Delete <strong>{deleting?.name}</strong>? Members won't be deleted but will lose their department.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
