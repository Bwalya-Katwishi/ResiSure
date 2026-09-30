export function Skeleton({ className = '', label = 'Loading' }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200 ${className}`}
      aria-busy="true"
      aria-label={label}
      role="status"
    />
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-busy="true" aria-label="Loading listing" role="status">
      <Skeleton className="h-52 rounded-none" label="" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" label="" />
        <Skeleton className="h-3 w-1/2" label="" />
        <Skeleton className="h-5 w-1/3" label="" />
      </div>
    </div>
  );
}
