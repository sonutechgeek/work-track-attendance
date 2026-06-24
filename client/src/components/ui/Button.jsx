import Spinner from './Spinner';

const variants = {
  primary:   'bg-primary-600 hover:bg-primary-700 text-white',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
  danger:    'bg-rose-600 hover:bg-rose-700 text-white',
  success:   'bg-emerald-600 hover:bg-emerald-700 text-white',
  ghost:     'hover:bg-slate-100 text-slate-600',
  outline:   'border border-primary-600 text-primary-600 hover:bg-primary-50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, className = '', ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Spinner size="sm" color="inherit" />}
      {children}
    </button>
  );
}
