import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import BookingStepper from '../../components/ui/BookingStepper';
import { Skeleton } from '../../components/ui/Skeleton';
import StatusBanner from '../../components/ui/StatusBanner';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import {
  getBooking, acceptBooking, rejectBooking,
  payBooking, completePendingPayment, cancelBooking, confirmMoveIn, raiseDispute, getPaymentMethods,
  getBookingPaymentStatus,
} from '../../lib/api';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../../lib/userFeedback';
import { Shield, CheckCircle, AlertTriangle, Home, ArrowLeft, MapPin, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { bookingCopy, formatKwacha, transactionLabel } from '../../lib/bookingStatus';
import { useRefetchOnFocus } from '../../lib/useRefetchOnFocus';

const providerLabel = {
  mock: 'Protected payment',
  mtn_momo: 'MTN MoMo',
  airtel_money: 'Airtel Money',
  zamtel_kwacha: 'Zamtel Kwacha',
};

export default function BookingDetailPage() {
  const { user, loading: authLoading, authorized } = useRequireAuth();
  const router = useRouter();
  const { id } = router.query;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    outcome: 'success',
    phone: '',
    provider: '',
  });
  const [paymentMethods, setPaymentMethods] = useState({ mode: 'mock', demo: true, networks: [] });
  const [paymentPolling, setPaymentPolling] = useState(false);

  const loadBooking = useCallback(async ({ silent = false } = {}) => {
    if (!id || !authorized) return;
    if (!silent) setLoading(true);
    try {
      const res = await getBooking(id);
      const b = res.data.data.booking;
      setBooking(b);
      setPaymentForm((prev) => ({
        ...prev,
        phone: b.student_phone || user?.phone || '',
      }));
    } catch {
      if (!silent) toast.error('We could not find that booking.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, authorized, user?.phone]);

  useEffect(() => {
    if (id && authorized) {
      loadBooking();
      getPaymentMethods()
        .then((res) => setPaymentMethods(res.data.data))
        .catch(() => {});
    }
  }, [id, authorized, loadBooking]);

  useRefetchOnFocus(() => loadBooking({ silent: true }), Boolean(id && authorized));

  const hasPendingCapture = (booking?.transactions || []).some(
    (tx) => tx.type === 'capture' && tx.status === 'pending'
  );

  useEffect(() => {
    if (!id || !authorized || !hasPendingCapture || paymentMethods.mode !== 'live') return undefined;
    setPaymentPolling(true);
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      try {
        const res = await getBookingPaymentStatus(id);
        if (res.data.data.booking_status !== 'accepted') {
          await loadBooking({ silent: true });
          setPaymentPolling(false);
          clearInterval(timer);
        }
      } catch {
        /* ignore transient poll errors */
      }
      if (attempts >= 24) {
        setPaymentPolling(false);
        clearInterval(timer);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [id, authorized, hasPendingCapture, paymentMethods.mode, loadBooking]);

  useEffect(() => {
    if (!router.isReady || !authorized || !id) return undefined;
    const onRoute = (url) => {
      if (url.includes(`/bookings/${id}`)) {
        loadBooking({ silent: true });
      }
    };
    router.events.on('routeChangeComplete', onRoute);
    return () => router.events.off('routeChangeComplete', onRoute);
  }, [router, authorized, id, loadBooking]);

  const ACTION_SUCCESS = {
    accept: 'Booking request accepted. The student has been notified.',
    reject: 'Booking request declined. The student has been notified.',
    pay: 'Payment recorded successfully. Your rent is now protected in escrow.',
    'complete-pending': 'Payment completed successfully.',
    cancel: 'Booking cancelled.',
    confirm: 'Move-in confirmed successfully.',
    dispute: 'Your dispute has been submitted and is under review.',
  };

  const handleAction = async (action) => {
    if (action === 'cancel' && !window.confirm('Cancel this unpaid booking? This cannot be undone.')) {
      return;
    }
    if (action === 'reject' && !window.confirm('Decline this booking request?')) {
      return;
    }
    setActionLoading(true);
    try {
      let res;
      if (action === 'accept') res = await acceptBooking(id);
      else if (action === 'reject') res = await rejectBooking(id);
      else if (action === 'pay') {
        if (!paymentForm.phone.trim()) {
          toast.error('Enter your MTN or Airtel number');
          setActionLoading(false);
          return;
        }
        res = await payBooking(id, paymentMethods.mode === 'live'
          ? { phone: paymentForm.phone, provider: paymentForm.provider || undefined }
          : paymentForm);
      }
      else if (action === 'complete-pending') {
        res = await completePendingPayment(id, { outcome: 'success' });
      }
      else if (action === 'cancel') {
        res = await cancelBooking(id);
      }
      else if (action === 'confirm') res = await confirmMoveIn(id);
      else if (action === 'dispute') {
        if (!disputeReason.trim()) { toast.error('Please provide a reason'); setActionLoading(false); return; }
        res = await raiseDispute(id, disputeReason);
        setShowDisputeForm(false);
      }
      await loadBooking({ silent: true });
      toast.success(res.data.message || ACTION_SUCCESS[action] || 'Done.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'We could not complete that request. Please try again.'));
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!booking) {
    return (
      <Layout>
        <Head>
          <title>Booking not found — ResiSure</title>
        </Head>
        <EmptyState
          icon={Home}
          title="Booking not found"
          body="This booking may have been removed or you may not have access to it."
          actionHref={user?.role === 'landlord' ? '/dashboard/landlord' : '/dashboard/student'}
          actionLabel="Back to dashboard"
        />
      </Layout>
    );
  }

  const config = bookingCopy(booking.status);
  const isStudent = user?.role === 'student';
  const isLandlord = user?.role === 'landlord';
  const transactions = booking.transactions || [];
  const dashboardHref = isStudent ? '/dashboard/student' : isLandlord ? '/dashboard/landlord' : '/dashboard/admin';
  const bookingRef = `RS-${String(booking.id).slice(0, 8).toUpperCase()}`;

  return (
    <Layout>
      <Head>
        <title>{booking.property_title} — Booking — ResiSure</title>
      </Head>
      <Link href={dashboardHref} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <div className="grid grid-cols-1 gap-6 pb-28 lg:grid-cols-3 lg:pb-0">
        <div className="order-2 space-y-6 lg:order-1 lg:col-span-2">
          <div className="card p-4 sm:p-6">
            <p className="mb-1 text-sm font-medium text-slate-500">Your booking</p>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{booking.property_title}</h1>
              <Badge type={config.color}>{config.label}</Badge>
            </div>

            <BookingStepper status={booking.status} />

            <div className={`mt-6 rounded-xl p-4 ${
              booking.status === 'move_in_window' ? 'border border-amber-200 bg-amber-50' :
              booking.status === 'disputed' ? 'border border-amber-200 bg-amber-50' :
              booking.status === 'completed' || booking.status === 'confirmed' ? 'border border-green-200 bg-green-50' :
              booking.status === 'rejected' || booking.status === 'cancelled' ? 'border border-red-200 bg-red-50' :
              'border border-blue-100 bg-blue-50'
            }`}>
              <p className="text-sm text-slate-700">{config.description}</p>
              {config.next && <p className="mt-2 text-sm font-medium text-slate-800">Next step: {config.next}</p>}
              {booking.status === 'move_in_window' && booking.auto_release_at && (
                <p className="mt-2 text-xs text-amber-800">
                  Confirm by {new Date(booking.auto_release_at).toLocaleString('en-GB')} or the payment will be released.
                </p>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <Home size={16} className="text-slate-400" />
                <div>
                  <p className="font-semibold text-slate-900">{booking.property_title}</p>
                  <p className="text-sm text-slate-500">{booking.property_address}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs text-slate-400">Move-in by</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(booking.move_in_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-400">Amount</p>
                  <p className="text-sm font-bold text-slate-900">{formatKwacha(booking.amount)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-400">Booking reference</p>
                  <p className="text-sm font-medium text-slate-900">{bookingRef}</p>
                </div>
                {isLandlord && (
                  <div>
                    <p className="mb-1 text-xs text-slate-400">Student</p>
                    <p className="text-sm font-medium text-slate-900">{booking.student_name}</p>
                    <p className="text-xs text-slate-400">{booking.student_phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {isStudent && booking.property_location && (
            <div className="card p-6">
              <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                <MapPin size={16} className="text-blue-600" />
                Exact property location
              </h2>
              <p className="mb-4 text-sm text-slate-500">
                Your payment is protected. Open Google Maps to navigate to the property for your move-in on{' '}
                {new Date(booking.move_in_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
              </p>
              <a
                href={booking.property_location.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <ExternalLink size={14} />
                Open in Google Maps
              </a>
            </div>
          )}

          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
              <Shield size={16} className="text-blue-600" />
              Payment protection
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              Your payment is protected until you confirm your move-in. If something is not right, it can be held while the issue is reviewed.
            </p>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Booking requested', done: true },
                { label: 'Landlord accepted', done: !['pending', 'rejected', 'cancelled'].includes(booking.status) },
                { label: 'Payment protected', done: !!booking.escrow_held_at },
                { label: 'Move-in window open', done: !!booking.move_in_window_opens_at },
                { label: 'Move-in confirmed', done: !!booking.confirmed_at },
                { label: 'Landlord paid', done: booking.status === 'completed' || booking.status === 'timed_out' },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-green-100' : 'bg-slate-100'}`}>
                    <CheckCircle size={14} className={step.done ? 'text-green-600' : 'text-slate-300'} />
                  </div>
                  <p className={step.done ? 'font-medium text-slate-900' : 'text-slate-400'}>{step.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-1 font-semibold text-slate-900">Payment history</h2>
            <p className="mb-4 text-xs text-slate-500">A record of payments, releases, and refunds for this booking.</p>
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-400">No payments yet.</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{transactionLabel(tx.type)}</p>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          Ref: {tx.reference}
                          {tx.payment_provider && (
                            <> · {providerLabel[tx.payment_provider] || tx.payment_provider}</>
                          )}
                          {tx.payer_phone && <> · {tx.payer_phone}</>}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(tx.created_at).toLocaleString('en-GB')}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-sm font-bold text-slate-900">{formatKwacha(tx.amount)}</p>
                        <p className="mt-1 text-xs capitalize text-green-700">
                          {tx.status === 'completed' ? 'Completed' : tx.status === 'pending' ? 'Waiting for confirmation' : tx.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="order-1 space-y-4 lg:order-2">
          {isLandlord && booking.status === 'pending' && (
            <div className="card p-5">
              <h3 className="mb-2 font-semibold text-slate-900">Booking request</h3>
              <p className="mb-4 text-sm text-slate-500">
                {booking.student_name} wants to book this room. Accept or decline their request.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleAction('accept')}
                  disabled={actionLoading}
                  className="btn-primary w-full"
                >
                  <CheckCircle size={14} />
                  {actionLoading ? 'Accepting…' : 'Accept booking'}
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading}
                  className="btn-danger w-full"
                >
                  {actionLoading ? 'Declining…' : 'Decline'}
                </button>
              </div>
            </div>
          )}

          {isStudent && ['pending', 'accepted'].includes(booking.status) && (
            <button
              type="button"
              onClick={() => handleAction('cancel')}
              disabled={actionLoading}
              className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {actionLoading ? 'Cancelling…' : 'Cancel unpaid booking'}
            </button>
          )}

          {isStudent && booking.status === 'accepted' && (
            <div className="card p-5">
              <h3 className="mb-1 text-lg font-semibold text-slate-900">Make your payment</h3>
              <p className="mb-4 text-sm text-slate-500">
                Your payment is protected until you confirm your move-in.
              </p>
              <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Amount</p>
                <p className="text-2xl font-bold text-slate-900">{formatKwacha(booking.amount)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {booking.property_title}
                  {booking.landlord_name ? ` · ${booking.landlord_name}` : ''}
                </p>
                <p className="mt-1 text-xs text-slate-400">Ref {bookingRef}</p>
              </div>

              {paymentMethods.demo && (
                <StatusBanner type="warning" title="Demo payment mode" className="mb-4">
                  Payments use the ResiSure mock provider — not real MTN, Airtel, or Zamtel debits. Configure live credentials to enable mobile money.
                </StatusBanner>
              )}

              {paymentMethods.mode === 'live' && (
                <div className="mb-4">
                  <span className="label">Payment method</span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {paymentMethods.networks.filter((n) => n.configured).map((network) => (
                      <button
                        key={network.id}
                        type="button"
                        onClick={() => setPaymentForm({ ...paymentForm, provider: network.id })}
                        className={`rounded-xl border px-3 py-2 text-left text-sm ${
                          paymentForm.provider === network.id || (!paymentForm.provider && network.id === paymentMethods.networks.find((x) => x.configured)?.id)
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="font-medium">{network.label}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{network.prefixes.join(', ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {paymentMethods.demo && (
                <>
                  <p className="mb-2 text-xs text-slate-500">
                    Choose a demo outcome below. This does not contact a mobile-money network.
                  </p>
                  <span id="payment-outcome-label" className="label">Payment result</span>
                  <div
                    role="radiogroup"
                    aria-labelledby="payment-outcome-label"
                    className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
                  >
                    {[
                      { id: 'success', label: 'Success' },
                      { id: 'failed', label: 'Failed' },
                      { id: 'pending', label: 'Pending' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={paymentForm.outcome === p.id}
                        onClick={() => setPaymentForm({ ...paymentForm, outcome: p.id })}
                        className={`rounded-xl border px-3 py-2 text-center text-sm ${
                          paymentForm.outcome === p.id
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {hasPendingCapture && (
                <StatusBanner type="info" title="Payment pending" className="mb-4">
                  {paymentPolling
                    ? 'Waiting for mobile-money confirmation… This page refreshes automatically.'
                    : 'Your payment is pending provider confirmation. You can refresh this page or try again if it expires.'}
                </StatusBanner>
              )}

              <label className="label" htmlFor="pay-phone">
                {paymentMethods.mode === 'live' ? 'Mobile money number' : 'Phone number'}
              </label>
              <input
                id="pay-phone"
                type="tel"
                value={paymentForm.phone}
                onChange={(e) => setPaymentForm({ ...paymentForm, phone: e.target.value })}
                className="input mb-3"
                placeholder="096 / 097 / 095…"
              />

              <button
                onClick={() => handleAction('pay')}
                disabled={actionLoading}
                className="btn-primary w-full py-3"
              >
                <Shield size={14} />
                {actionLoading ? 'Processing…' : paymentMethods.demo ? 'Run demo payment' : 'Pay with mobile money'}
              </button>

              {paymentMethods.mode !== 'live' && (booking.transactions || []).some((tx) => tx.type === 'capture' && tx.status === 'pending') && (
                <button
                  onClick={() => handleAction('complete-pending')}
                  disabled={actionLoading}
                  className="btn-secondary mt-2 w-full"
                >
                  Confirm pending payment
                </button>
              )}
            </div>
          )}

          {isStudent && booking.status === 'escrow_held' && (
            <div className="card p-5">
              <h3 className="mb-2 font-semibold text-slate-900">Payment protected</h3>
              <p className="text-sm text-slate-500">
                Your payment is held securely. Confirm your move-in after checking the room on your move-in date.
              </p>
            </div>
          )}

          {isStudent && booking.status === 'move_in_window' && (
            <div className="card p-5">
              <h3 className="mb-2 font-semibold text-slate-900">Confirm your move-in</h3>
              <p className="mb-4 text-sm text-slate-500">
                Check the room. If it matches the listing, confirm so the landlord can be paid.
              </p>

              <button
                onClick={() => handleAction('confirm')}
                disabled={actionLoading}
                className="btn-primary mb-2 w-full"
              >
                <CheckCircle size={14} />
                {actionLoading ? 'Processing…' : 'Confirm move-in'}
              </button>

              <button
                onClick={() => setShowDisputeForm(!showDisputeForm)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                <AlertTriangle size={14} />
                Something is not right
              </button>

              {showDisputeForm && (
                <div className="mt-4">
                  <label className="label" htmlFor="dispute-reason">Describe the issue</label>
                  <textarea
                    id="dispute-reason"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="input mb-2"
                    rows={3}
                    placeholder="e.g. The room does not match the photos"
                  />
                  <button
                    onClick={() => handleAction('dispute')}
                    disabled={actionLoading}
                    className="btn-danger w-full"
                  >
                    {actionLoading ? 'Submitting…' : 'Submit issue'}
                  </button>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  If no action is taken, the payment is released after 72 hours. You will get a reminder in the last 24 hours.
                </p>
              </div>
            </div>
          )}

          {['completed', 'confirmed', 'refunded', 'timed_out'].includes(booking.status) && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-600" />
              <p className="font-semibold text-green-800">
                {booking.status === 'refunded' ? 'Refund processed' : 'Booking complete'}
              </p>
              <p className="mt-1 text-xs text-green-700">
                {booking.status === 'refunded'
                  ? 'The payment was returned to the student.'
                  : 'The landlord has been paid.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {isStudent && booking.status === 'accepted' && (
        <div className="mobile-action-bar p-3 lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{formatKwacha(booking.amount)}</p>
              <p className="truncate text-xs text-slate-500">Ready for payment</p>
            </div>
            <button
              type="button"
              onClick={() => handleAction('pay')}
              disabled={actionLoading}
              className="btn-primary shrink-0"
            >
              <Shield size={14} />
              {actionLoading ? 'Processing…' : 'Pay now'}
            </button>
          </div>
        </div>
      )}

      {isStudent && booking.status === 'move_in_window' && (
        <div className="mobile-action-bar p-3 lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">Move-in window open</p>
              <p className="truncate text-xs text-slate-500">Confirm after visiting the room</p>
            </div>
            <button
              type="button"
              onClick={() => handleAction('confirm')}
              disabled={actionLoading}
              className="btn-primary shrink-0"
            >
              <CheckCircle size={14} />
              {actionLoading ? 'Processing…' : 'Confirm move-in'}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
