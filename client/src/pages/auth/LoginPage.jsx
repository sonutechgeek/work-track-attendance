import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { loginAsync } from '../../store/slices/auth.slice';
import AuthLayout from '../../layouts/AuthLayout';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, token } = useSelector((s) => s.auth);

  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

  const onSubmit = async ({ email, password }) => {
    const result = await dispatch(loginAsync({ email, password }));
    if (loginAsync.fulfilled.match(result)) {
      navigate('/dashboard', { replace: true });
    } else {
      toast.error(result.payload ?? 'Login failed');
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Welcome back</h2>
      <p className="text-sm text-slate-500 mb-6">Sign in to your account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          type="email"
          label="Email"
          placeholder="you@company.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
          })}
        />

        <Input
          type="password"
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Password is required' })}
        />

        <Button type="submit" loading={loading} className="w-full mt-2">
          Sign In
        </Button>
      </form>

      <p className="text-xs text-slate-400 text-center mt-4">
        WorkTrack · Attendance &amp; Leave Management
      </p>
    </AuthLayout>
  );
}
