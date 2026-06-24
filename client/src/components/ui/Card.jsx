export default function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, sub, color = 'indigo', trend }) {
  const palettes = {
    indigo:  { bg: 'bg-indigo-50',   text: 'text-indigo-600',  ring: 'ring-indigo-100'  },
    emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber:   { bg: 'bg-amber-50',    text: 'text-amber-600',   ring: 'ring-amber-100'   },
    rose:    { bg: 'bg-rose-50',     text: 'text-rose-600',    ring: 'ring-rose-100'    },
    cyan:    { bg: 'bg-cyan-50',     text: 'text-cyan-600',    ring: 'ring-cyan-100'    },
    violet:  { bg: 'bg-violet-50',   text: 'text-violet-600',  ring: 'ring-violet-100'  },
  };
  const p = palettes[color] ?? palettes.indigo;
  return (
    <Card className="flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ring-4 ${p.bg} ${p.text} ${p.ring}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {trend != null && (
        <div className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </div>
      )}
    </Card>
  );
}

export function GradientCard({ children, className = '', from = 'from-indigo-600', to = 'to-violet-700' }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${from} ${to} shadow-lg overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
