import { Skeleton } from '../../ui/Skeleton';

export default function LandlordDashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading landlord dashboard">
      <Skeleton className="mb-2 h-4 w-40" label="" />
      <Skeleton className="mb-6 h-9 w-72" label="" />
      <Skeleton className="mb-8 h-4 w-full max-w-xl" label="" />
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-24" label="" />)}
      </div>
      <Skeleton className="mb-8 h-56 w-full" label="" />
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2].map((key) => <Skeleton key={key} className="h-48" label="" />)}
      </div>
      <Skeleton className="mb-4 h-7 w-48" label="" />
      <div className="space-y-3">
        {[1, 2, 3].map((key) => <Skeleton key={key} className="h-28 w-full" label="" />)}
      </div>
    </div>
  );
}
