import { useState } from 'react';
import { useSelector } from 'react-redux';
import { updateMyProfile } from '../../api/user.api';
import { changePassword } from '../../api/auth.api';
import Card, { CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { fmtName, fmtDate } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useSelector((s) => s.auth);
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const profileForm = useForm({ defaultValues: { name: user?.name, phone: user?.phone ?? '' } });
  const pwForm = useForm();

  const onSaveProfile = async (vals) => {
    setSaving(true);
    try {
      await updateMyProfile(vals);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (vals) => {
    if (vals.newPassword !== vals.confirmPassword) {
      pwForm.setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    setChangingPw(true);
    try {
      await changePassword({ currentPassword: vals.currentPassword, newPassword: vals.newPassword });
      toast.success('Password changed successfully');
      pwForm.reset();
    } catch (e) {
      toast.error(e?.response?.data?.message ?? 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your account details</p>
      </div>

      {/* Avatar + info */}
      <Card className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {fmtName(user?.name)}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{user?.name}</h2>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span className="capitalize">{user?.role?.toLowerCase()}</span>
            {user?.department?.name && (
              <>
                <span>·</span>
                <span>{user.department.name}</span>
              </>
            )}
            {user?.joinDate && (
              <>
                <span>·</span>
                <span>Joined {fmtDate(user.joinDate)}</span>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Edit Profile */}
      <Card>
        <CardHeader title="Edit Profile" />
        <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
          <Input
            label="Full Name"
            error={profileForm.formState.errors.name?.message}
            {...profileForm.register('name', { required: 'Name is required' })}
          />
          <Input
            label="Phone"
            placeholder="+91 98765 43210"
            {...profileForm.register('phone')}
          />
          <Input
            label="Email"
            value={user?.email ?? ''}
            disabled
            hint="Email cannot be changed"
          />
          <Button type="submit" loading={saving}>Save Changes</Button>
        </form>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader title="Change Password" />
        <form onSubmit={pwForm.handleSubmit(onChangePassword)} className="space-y-4">
          <Input
            type="password"
            label="Current Password"
            error={pwForm.formState.errors.currentPassword?.message}
            {...pwForm.register('currentPassword', { required: 'Required' })}
          />
          <Input
            type="password"
            label="New Password"
            error={pwForm.formState.errors.newPassword?.message}
            {...pwForm.register('newPassword', {
              required: 'Required',
              minLength: { value: 8, message: 'Min 8 characters' },
            })}
          />
          <Input
            type="password"
            label="Confirm New Password"
            error={pwForm.formState.errors.confirmPassword?.message}
            {...pwForm.register('confirmPassword', { required: 'Required' })}
          />
          <Button type="submit" loading={changingPw} variant="outline">Change Password</Button>
        </form>
      </Card>
    </div>
  );
}
