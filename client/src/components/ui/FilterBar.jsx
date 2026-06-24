import { useState, useEffect, useRef } from 'react';
import { HiSearch, HiX, HiFilter } from 'react-icons/hi';
import useDebounce from '../../hooks/useDebounce';

/**
 * Reusable filter bar — handles debounce on text/search fields internally.
 *
 * Props
 * ─────
 * fields      Array of field config objects (see types below).
 * onFilter    Called with { [name]: value } whenever any filter changes.
 *             For 'search' fields this fires after a 400 ms debounce.
 *             For 'select' and 'date' fields this fires immediately.
 * className   Optional extra Tailwind classes for the outer wrapper.
 *
 * Field config shapes
 * ───────────────────
 * { type: 'search', name: 'search', placeholder: '...' }
 * { type: 'select', name: 'status', label: 'Status', options: [{value:'', label:'All'},...] }
 * { type: 'date',   name: 'from',   label: 'From' }
 * { type: 'date',   name: 'to',     label: 'To' }
 */
export default function FilterBar({ fields = [], onFilter, className = '' }) {
  const initValues = Object.fromEntries(fields.map((f) => [f.name, '']));
  const [values, setValues] = useState(initValues);

  // Keep a separate raw value for the search field so the input is responsive
  const searchField = fields.find((f) => f.type === 'search');
  const [rawSearch, setRawSearch] = useState('');
  const debouncedSearch = useDebounce(rawSearch, 400);

  // Only fire onFilter when debouncedSearch actually changes value.
  // A mounted-ref guard breaks under React 18 StrictMode (effects run twice,
  // the second pass skips the guard and calls onFilter with empty values,
  // triggering an infinite load → unmount → remount cycle).
  const prevSearch = useRef(debouncedSearch);

  useEffect(() => {
    if (prevSearch.current === debouncedSearch) return;
    prevSearch.current = debouncedSearch;
    if (!searchField) return;
    const next = { ...values, [searchField.name]: debouncedSearch };
    setValues(next);
    onFilter(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleChange = (name, value) => {
    if (searchField && name === searchField.name) {
      setRawSearch(value);
      // onFilter will be called by the debouncedSearch effect
      return;
    }
    const next = { ...values, [name]: value };
    setValues(next);
    onFilter(next);
  };

  const handleReset = () => {
    setValues(initValues);
    setRawSearch('');
    onFilter(initValues);
  };

  const hasActiveFilter = Object.values(values).some(Boolean) || rawSearch !== '';
  const activeCount = [rawSearch !== '' ? 1 : 0, ...Object.values(values).map((v) => (v ? 1 : 0))].reduce((a, b) => a + b, 0);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {fields.map((field) => {
        if (field.type === 'search') {
          return (
            <div key={field.name} className="relative min-w-[220px] flex-1 max-w-xs">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={rawSearch}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder ?? 'Search…'}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
                           text-slate-700 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           transition"
              />
              {rawSearch && (
                <button
                  onClick={() => handleChange(field.name, '')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                >
                  <HiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        }

        if (field.type === 'select') {
          return (
            <div key={field.name} className="relative">
              <select
                value={values[field.name] ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white
                           text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           cursor-pointer transition"
                title={field.label}
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
            </div>
          );
        }

        if (field.type === 'date') {
          return (
            <div key={field.name} className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 whitespace-nowrap">{field.label}</label>
              <input
                type="date"
                value={values[field.name] ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="pl-2.5 pr-2 py-2 text-sm border border-slate-200 rounded-lg bg-white
                           text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           transition"
              />
            </div>
          );
        }

        return null;
      })}

      {/* Active filter count badge + clear button */}
      {hasActiveFilter && (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium">
            <HiFilter className="w-3 h-3" />
            {activeCount} active
          </span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors"
          >
            <HiX className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
