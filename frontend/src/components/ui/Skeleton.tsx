export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-6 py-4">
            {Array.from({ length: columns }).map((__, c) => (
              <div key={c} className="h-4 flex-1 animate-pulse rounded bg-neutral-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}