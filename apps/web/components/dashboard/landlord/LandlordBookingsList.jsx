import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import { bookingCopy, formatKwacha } from '../../../lib/bookingStatus';

function BookingRow({ booking }) {
  const config = bookingCopy(booking.status);
  return (
    <div className={`card p-4 sm:p-5 ${booking.status === 'pending' ? 'border-amber-200 bg-amber-50' : ''}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">{booking.property_title}</h3>
          <p className="mt-0.5 text-sm text-slate-500">Booked by {booking.student_name}</p>
          {booking.student_email && <p className="break-all text-xs text-slate-400">{booking.student_email}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>Requested: {new Date(booking.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span>Move-in: {new Date(booking.move_in_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span className="font-semibold text-slate-700">{formatKwacha(booking.amount)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
          <Badge type={config.color}>{config.label}</Badge>
          <Link href={`/bookings/${booking.id}`} className="text-sm font-medium text-blue-600 hover:underline">
            Manage booking
          </Link>
        </div>
      </div>
    </div>
  );
}

function BookingSection({ id, title, bookings, badge, emptyTitle, emptyBody }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-xl font-bold text-slate-900">
        {title}
        {badge > 0 && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {badge}
          </span>
        )}
      </h2>
      {bookings.length === 0 ? (
        <EmptyState icon={BookOpen} title={emptyTitle} body={emptyBody} />
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function LandlordBookingsList({ pendingBookings, activeBookings, completedBookings }) {
  return (
    <div className="space-y-10">
      <BookingSection
        id="landlord-booking-requests"
        title="Booking requests"
        bookings={pendingBookings}
        badge={pendingBookings.length}
        emptyTitle="No pending booking requests."
        emptyBody="When a student requests to book your property, it will appear here."
      />
      <BookingSection
        id="landlord-active-bookings"
        title="Active bookings"
        bookings={activeBookings}
        badge={0}
        emptyTitle="No active bookings."
        emptyBody="Accepted and in-progress bookings will appear here."
      />
      <BookingSection
        id="landlord-completed-bookings"
        title="Completed bookings"
        bookings={completedBookings}
        badge={0}
        emptyTitle="No completed bookings yet."
        emptyBody="Finished, cancelled, and refunded bookings will appear here."
      />
    </div>
  );
}
