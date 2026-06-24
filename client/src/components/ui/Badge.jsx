const variants = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100   text-amber-700',
  danger:  'bg-rose-100    text-rose-700',
  info:    'bg-sky-100     text-sky-700',
  purple:  'bg-purple-100  text-purple-700',
  cyan:    'bg-cyan-100    text-cyan-700',
  orange:  'bg-orange-100  text-orange-700',
  default: 'bg-slate-100   text-slate-600',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
