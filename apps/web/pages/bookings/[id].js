import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import {
  getBooking, acceptBooking, rejectBooking,
  payBooking, confirmMoveIn, raiseDispute
} from '../../lib/api';
import toast from 'react-hot-toast';
import { Shield, CheckCircle, AlertTriangle, Clock, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const statusConfig = {
  pending: { label: 'Pending Landlord Approval', color: 'pending', description: 'Waiting for the landlord to accept your booking request.' },
  accepted: { label: 'Awaiting Payment', color: 'pending', description: 'Your landlord has accepted. Pay into escrow on your move-in date to secure the room.' },
  rejected: { label: 'Booking Rejected', color: 'rejected', description: 'The landlord has declined this booking request.' },
  escrow_held: { label: 'Payment in Escrow', color: 'escrow', description: 'Your payment is safely held in escrow. Funds will be released only after you confirm move-in.' },
  move_in_window: { label: 'Confirm Your Move-In', color: 'pending', description: 'You have 72 hours to confirm move-in or raise a dispute. If no action is taken, funds are auto-released.' },
  timed_out: { label: 'Auto-Released', color: 'default', description: 'No move-in confirmation was received. Funds were automatically released to the landlord.' },
  confirmed: { label: 'Move-In Confirmed', color: 'verified', description: 'You confirmed move-in. Funds have been released to the landlord.' },
  disputed: { label: 'Under Dispute', color: 'disputed', description: 'This booking is under admin review. Funds are frozen until resolved.' },
  completed: { label: 'Completed', color: 'completed', description: 'This booking has been completed successfully.' },
  refunded: { label: 'Refunded', color: 'verified', description: 'The dispute was resolved in your favour. Funds have been refunded.' },
};

export default function BookingDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading]);

  useEffect(() => {
    if (id && user) {
      getBooking(id)
        .then(res => setBooking(res.data.data.booking))
        .catch(() => toast.error('Booking not found'))
        .finally(() => setLoading(false));
    }
  }, [id, user]);

  const handleAction = async (action, successMsg) => {
    setActionLoading(true);
    try {
      let res;
      if (action === 'accept') res = await acceptBooking(id);
      else if (action === 'reject') res = await rejectBooking(id);
      else if (action === 'pay') res = await payBooking(id);
      else if (action === 'confirm') res = await confirmMoveIn(id);
      else if (action === 'dispute') {
        if (!disputeReason.trim()) { toast.error('Please provide a reason'); return; }
        res = await raiseDispute(id, disputeReason);
        setShowDisputeForm(false);
      }
      setBooking(res.data.data.booking);
      toast.success(successMsg);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (!booking) return null;

  const config = statusConfig[booking.status] || statusConfig.pending;
  const isStudent = user?.role === 'student';
  const isLandlord = user?.role === 'landlord';

  return (
    <Layout>
      {/* Back */}
      <Link href={isStudent ? '/dashboard/student' : '/dashboard/landlord'} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main */}
        <div className="lg:col-span-2 space-y-6">

          {/* Status card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">Booking Details</h1>
              <Badge type={config.color}>{config.label}</Badge>
            </div>

            <div className={`rounded-lg p-4 mb-6 ${
              booking.status === 'move_in_window' ? 'bg-yellow-50 border border-yellow-200' :
              booking.status === 'disputed' ? 'bg-red-50 border border-red-200' :
              booking.status === 'completed' || booking.status === 'confirmed' ? 'bg-green-50 border border-green-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <p className="text-sm text-gray-700">{config.description}</p>
            </div>

            {/* Property info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Home size={16} className="text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-900">{booking.property_title}</p>
                  <p className="text-gray-500 text-sm">{booking.property_address}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-50">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Move-in Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(booking.move_in_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Monthly Rent</p>
                  <p className="text-sm font-bold text-blue-600">
                    ZMW {Number(booking.amount).toLocaleString()}
                  </p>
                </div>
                {isLandlord && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Student</p>
                    <p className="text-sm font-medium text-gray-900">{booking.student_name}</p>
                    <p className="text-xs text-gray-400">{booking.student_phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Escrow Timeline */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Shield size={16} className="text-blue-600" />
              Escrow Timeline
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Booking Created', done: true, time: booking.created_at },
                { label: 'Landlord Accepted', done: ['accepted','escrow_held','move_in_window','confirmed','completed','disputed','timed_out'].includes(booking.status), time: null },
                { label: 'Payment Captured into Escrow', done: !!booking.escrow_held_at, time: booking.escrow_held_at },
                { label: 'Move-in Window Opened', done: !!booking.move_in_window_opens_at, time: booking.move_in_window_opens_at },
                { label: 'Student Confirmed Move-in', done: !!booking.confirmed_at, time: booking.confirmed_at },
                { label: 'Funds Released to Landlord', done: booking.status === 'completed', time: booking.confirmed_at },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.done ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {step.done
                      ? <CheckCircle size={14} className="text-green-600" />
                      : <Clock size={14} className="text-gray-400" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${step.done ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {step.done && step.time && (
                      <p className="text-xs text-gray-400">
                        {new Date(step.time).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-4">

          {/* Landlord actions */}
          {isLandlord && booking.status === 'pending' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Booking Request</h3>
              <p className="text-gray-500 text-sm mb-4">
                {booking.student_name} wants to book this property. Accept or decline their request.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleAction('accept', 'Booking accepted!')}
                  disabled={actionLoading}
                  className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={14} />
                  Accept Booking
                </button>
                <button
                  onClick={() => handleAction('reject', 'Booking rejected')}
                  disabled={actionLoading}
                  className="w-full bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Student — pay into escrow */}
          {isStudent && booking.status === 'accepted' && (() => {
            const moveInDate = new Date(booking.move_in_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            moveInDate.setHours(0, 0, 0, 0);
            const canPay = moveInDate <= today;

            return (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-2">Pay into Escrow</h3>
              {canPay ? (
                <>
                  <p className="text-gray-500 text-sm mb-4">
                    Your move-in date has arrived. Pay now to secure your room. Funds are held safely until you confirm move-in.
                  </p>
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-600 font-medium">Amount to pay</p>
                    <p className="text-2xl font-bold text-blue-700">ZMW {Number(booking.amount).toLocaleString()}</p>
                    <p className="text-xs text-blue-400 mt-1">Held in escrow — safe until move-in confirmed</p>
                  </div>
                  <button
                    onClick={() => handleAction('pay', 'Payment captured into escrow!')}
                    disabled={actionLoading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Shield size={14} />
                    {actionLoading ? 'Processing...' : 'Pay into Escrow'}
                  </button>
                </>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 font-medium mb-1">Payment opens on move-in date</p>
                  <p className="text-xs text-yellow-700">
                    You can pay on {new Date(booking.move_in_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    Your booking is secured once the landlord has accepted.
                  </p>
                </div>
              )}
            </div>
            );
          })()}

          {/* Legacy escrow_held — awaiting move-in window */}
          {isStudent && booking.status === 'escrow_held' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-2">Payment in Escrow</h3>
              <p className="text-gray-500 text-sm">
                Your payment is held securely. The move-in confirmation window will open on your move-in date.
              </p>
            </div>
          )}

          {/* Student — confirm or dispute */}
          {isStudent && booking.status === 'move_in_window' && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 mb-2">Move-In Confirmation</h3>
              <p className="text-gray-500 text-sm mb-4">
                Have you moved in and the property matches its listing?
              </p>

              <button
                onClick={() => handleAction('confirm', 'Move-in confirmed! Funds released to landlord.')}
                disabled={actionLoading}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-2"
              >
                <CheckCircle size={14} />
                {actionLoading ? 'Processing...' : 'Confirm Move-In'}
              </button>

              <button
                onClick={() => setShowDisputeForm(!showDisputeForm)}
                className="w-full bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle size={14} />
                Raise a Dispute
              </button>

              {showDisputeForm && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe the issue
                  </label>
                  <textarea
                    value={disputeReason}
                    onChange={e => setDisputeReason(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-2"
                    rows={3}
                    placeholder="e.g. Property does not match photos, no water supply..."
                  />
                  <button
                    onClick={() => handleAction('dispute', 'Dispute raised. Funds frozen pending admin review.')}
                    disabled={actionLoading}
                    className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? 'Submitting...' : 'Submit Dispute'}
                  </button>
                </div>
              )}

              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-700">
                  ⏰ Auto-release in 72 hours if no action is taken. Funds go to landlord automatically.
                </p>
              </div>
            </div>
          )}

          {/* Completed state */}
          {['completed', 'confirmed', 'refunded'].includes(booking.status) && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
              <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-800">
                {booking.status === 'refunded' ? 'Refund Processed' : 'Booking Complete'}
              </p>
              <p className="text-green-600 text-xs mt-1">
                {booking.status === 'refunded'
                  ? 'Funds have been returned to the student'
                  : 'Funds have been released to the landlord'}
              </p>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}