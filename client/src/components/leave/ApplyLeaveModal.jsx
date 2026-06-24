import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { applyLeaveAsync, fetchMyLeaves, fetchMyBalance } from '../../store/slices/leave.slice';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input, { Select, Textarea } from '../ui/Input';
import { LEAVE_TYPES } from '../../utils/constants';
import toast from 'react-hot-toast';

export default function ApplyLeaveModal({ open, onClose }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.leave);

  const {
    register, handleSubmit, reset,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    const result = await dispatch(applyLeaveAsync(data));
    if (applyLeaveAsync.fulfilled.match(result)) {
      toast.success('Leave application submitted!');
      dispatch(fetchMyLeaves({ page: 1, limit: 10 }));
      dispatch(fetchMyBalance());
      reset();
      onClose();
    } else {
      toast.error(result.payload ?? 'Failed to apply for leave');
    }
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title="Apply for Leave">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Leave Type"
          error={errors.type?.message}
          {...register('type', { required: 'Select a leave type' })}
        >
          <option value="">Select type…</option>
          {Object.entries(LEAVE_TYPES).map(([k]) => (
            <option key={k} value={k}>{k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, ' ')}</option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Start Date"
            error={errors.startDate?.message}
            {...register('startDate', { required: 'Required' })}
          />
          <Input
            type="date"
            label="End Date"
            error={errors.endDate?.message}
            {...register('endDate', { required: 'Required' })}
          />
        </div>

        <Textarea
          label="Reason"
          rows={3}
          placeholder="Brief reason for leave…"
          error={errors.reason?.message}
          {...register('reason', { required: 'Please provide a reason', minLength: { value: 10, message: 'At least 10 characters' } })}
        />

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Submit Application
          </Button>
        </div>
      </form>
    </Modal>
  );
}
