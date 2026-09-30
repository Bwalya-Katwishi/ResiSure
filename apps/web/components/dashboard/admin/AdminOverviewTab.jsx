import { Users, Home, BookOpen, AlertTriangle } from 'lucide-react';

export default function AdminOverviewTab({
  users,
  properties,
  bookings,
  disputes,
  protectedCount,
  pendingLandlords,
  pendingStudents,
}) {
  const stats = [
    { label: 'Users', value: users.length, icon: Users, color: 'bg-blue-50 text-blue-700' },
    { label: 'Listings', value: properties.length, icon: Home, color: 'bg-slate-100 text-slate-700' },
    { label: 'Bookings', value: bookings.length, icon: BookOpen, color: 'bg-blue-50 text-blue-700' },
    { label: 'Open issues', value: disputes.length, icon: AlertTriangle, color: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="card p-5 text-sm text-slate-600 sm:col-span-2 lg:col-span-4">
        {protectedCount} protected payment{protectedCount === 1 ? '' : 's'} are currently held until move-in is confirmed or an admin decision is made.
        {' '}{pendingLandlords} landlord{pendingLandlords === 1 ? '' : 's'} and {pendingStudents} student{pendingStudents === 1 ? '' : 's'} awaiting verification.
      </div>
    </div>
  );
}
