import { forwardRef } from 'react';

// forwardRef is required so React Hook Form's register() ref reaches the DOM input
const Input = forwardRef(function Input({ label, error, hint, className = '', ...props }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <input
        ref={ref}
        {...props}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          disabled:bg-slate-50 disabled:text-slate-500
          ${error ? 'border-rose-400 focus:ring-rose-400' : 'border-slate-300'}
          ${className}`}
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

export default Input;

export const Select = forwardRef(function Select({ label, error, children, className = '', ...props }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <select
        ref={ref}
        {...props}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          ${error ? 'border-rose-400' : 'border-slate-300'} ${className}`}
      >
        {children}
      </select>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, className = '', ...props }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      <textarea
        ref={ref}
        {...props}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 resize-none
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          ${error ? 'border-rose-400' : 'border-slate-300'} ${className}`}
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
});
