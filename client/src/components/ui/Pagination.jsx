export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total, limit } = pagination;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm text-slate-600">
      <span>
        Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ‹ Prev
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = Math.max(1, page - 2) + i;
          if (p > totalPages) return null;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1 rounded-lg border ${p === page ? 'bg-primary-600 border-primary-600 text-white' : 'border-slate-200 hover:bg-slate-50'}`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next ›
        </button>
      </div>
    </div>
  );
}
