import { BookOpen } from 'lucide-react';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import { bookingCopy, formatKwacha } from '../../../lib/bookingStatus';

export default function AdminBookingsTab({ bookings }) {
  if (bookings.length === 0) {
    return <EmptyState icon={BookOpen} title="No bookings yet." />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {bookings.map((booking) => {
          const copy = bookingCopy(booking.status);
          return (
            <div key={booking.id} className="card p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="font-semibold text-slate-900">{booking.property_title}</p>
                <Badge type={copy.color}>{copy.label}</Badge>
              </div>
              <p className="break-words text-sm text-slate-600">{booking.student_name} → {booking.landlord_name}</p>
              <p className="mt-2 text-sm font-bold text-slate-900">{formatKwacha(booking.amount)}</p>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="p-3 font-medium">Room</th>
              <th className="p-3 font-medium">Parties</th>
              <th className="p-3 font-medium">Amount</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const copy = bookingCopy(booking.status);
              return (
                <tr key={booking.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium text-slate-900">{booking.property_title}</td>
                  <td className="p-3 text-slate-600">{booking.student_name} → {booking.landlord_name}</td>
                  <td className="p-3">{formatKwacha(booking.amount)}</td>
                  <td className="p-3"><Badge type={copy.color}>{copy.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
