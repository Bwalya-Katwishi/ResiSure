import { Home, Clock, Shield, CheckCircle } from 'lucide-react';

export default function LandlordStats({
  activeListings,
  listings,
  pendingBookings,
  protectedPayments,
  completedBookings,
}) {
  const stats = [
    { label: 'Active listings', value: activeListings.length || listings.length, icon: Home, color: 'bg-blue-50 text-blue-700' },
    { label: 'Pending bookings', value: pendingBookings.length, icon: Clock, color: 'bg-amber-50 text-amber-700' },
    { label: 'Protected payments', value: protectedPayments.length, icon: Shield, color: 'bg-blue-50 text-blue-700' },
    { label: 'Completed bookings', value: completedBookings.length, icon: CheckCircle, color: 'bg-green-50 text-green-700' },
  ];

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card flex items-center gap-4 p-5">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
            <stat.icon size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
