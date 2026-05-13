import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/layout/Layout';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { getMyBookings } from '../../lib/api';
import { BookOpen, Search, Shield, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pending Landlord', color: 'pending', icon: Clock },
  rejected: { label: 'Rejected', color: 'rejected', icon: AlertTriangle },
  escrow_held: { label: 'Payment in Escrow', color: 'escrow', icon: Shield },
  move_in_window: { label: 'Confirm Move-In', color: 'pending', icon: Clock },
  timed_out: { label: 'Auto Released', color: 'default', icon: CheckCircle },
  confirmed: { label: 'Confirmed', color: 'verified', icon: CheckCircle },
  disputed: { label: 'Disputed', color: 'disputed', icon: AlertTriangle },
  completed: { label: 'Completed', color: 'completed', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'rejected', icon: AlertTriangle },
  refunded: { label: 'Refunded', color: 'verified', icon: CheckCircle },
};

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
    if (!authLoading && user?.role !== 'student') router.push('/');
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === 'student') {
      getMyBookings()
        .then(res => setBookings(res.data.data.bookings))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  const activeBookings = bookings.filter(b =>
    ['pending', 'escrow_held', 'move_in_window', 'disputed'].includes(b.status)
  );
  const completedBookings = bookings.filter(b =>
    ['completed', 'confirmed', 'timed_out'].includes(b.status)
  );

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Welcome back, {user?.full_name.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500">Manage your accommodation bookings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Bookings', value: bookings.length, icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
          { label: 'Active', value: activeBookings.length, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Completed', value: completedBookings.length, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">Looking for accommodation?</h3>
          <p className="text-blue-600 text-sm">Browse verified listings with escrow protection</p>
        </div>
        <Link href="/properties" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Search size={14} />
          Browse Listings
        </Link>
      </div>

      {/* Bookings */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Your Bookings</h2>

        {bookings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <BookOpen size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No bookings yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">Find accommodation and make your first booking</p>
            <Link href="/properties" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => {
              const config = statusConfig[booking.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div key={booking.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{booking.property_title}</h3>
                      <p className="text-gray-500 text-sm mb-2">{booking.property_address}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Move-in: {new Date(booking.move_in_date).toLocaleDateString()}</span>
                        <span className="font-medium text-blue-600">
                          ZMW {Number(booking.amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <Badge type={config.color}>
                        <span className="flex items-center gap-1">
                          <StatusIcon size={10} />
                          {config.label}
                        </span>
                      </Badge>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>

                  {/* Move-in window alert */}
                  {booking.status === 'move_in_window' && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-yellow-700 text-sm">
                        <AlertTriangle size={14} />
                        <span>Please confirm your move-in or raise a dispute within 72 hours</span>
                      </div>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="text-xs bg-yellow-600 text-white px-3 py-1 rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Take Action
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}