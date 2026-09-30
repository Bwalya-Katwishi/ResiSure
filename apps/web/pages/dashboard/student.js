import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/layout/Layout';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { getMyBookings, getMyTransactions, getProperties, getStudentProfile, submitStudentVerification } from '../../lib/api';
import PropertyCard from '../../components/properties/PropertyCard';
import ProfileForm from '../../components/account/ProfileForm';
import { BookOpen, Search, Heart, Clock, CheckCircle, AlertTriangle, Shield, FileText } from 'lucide-react';
import { bookingCopy, formatKwacha, transactionLabel } from '../../lib/bookingStatus';
import toast from 'react-hot-toast';
import StatusBanner from '../../components/ui/StatusBanner';
import { getActionableError, getApiErrorMessage } from '../../lib/userFeedback';
import DashboardSectionNav from '../../components/dashboard/DashboardSectionNav';
import { scrollToSection } from '../../lib/scrollToSection';
import { useRefetchOnFocus } from '../../lib/useRefetchOnFocus';
import { validateNrcNumber, NRC_FORMAT_MESSAGE } from '@resisure/shared';
import VerificationDocLinks from '../../components/dashboard/VerificationDocLinks';

export default function StudentDashboard() {
  const { user, loading: authLoading, authorized } = useRequireAuth({ role: 'student' });
  const [bookings, setBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [profile, setProfile] = useState(null);
  const [verifyForm, setVerifyForm] = useState({ nrc_number: '', nrc_document: null, university_slip: null });
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!authorized) return;
    if (!silent) setLoading(true);
    try {
      const [bookRes, txRes, propRes, profileRes] = await Promise.all([
        getMyBookings(),
        getMyTransactions().catch(() => ({ data: { data: { transactions: [] } } })),
        getProperties({ page: 1, sort: 'recommended' }).catch(() => ({ data: { data: { properties: [] } } })),
        getStudentProfile().catch(() => null),
      ]);
      setBookings(bookRes.data.data.bookings);
      setTransactions(txRes.data.data.transactions || []);
      setRecommended((propRes.data.data.properties || []).slice(0, 3));
      if (profileRes?.data?.data?.profile) {
        setProfile(profileRes.data.data.profile);
        setVerifyForm((prev) => ({
          ...prev,
          nrc_number: profileRes.data.data.profile.nrc_number || '',
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [authorized]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useRefetchOnFocus(() => loadDashboard({ silent: true }), authorized);

  useEffect(() => {
    if (!router.isReady || loading) return;
    const hash = router.asPath.split('#')[1];
    if (hash) {
      window.requestAnimationFrame(() => scrollToSection(hash));
    }
  }, [router.isReady, router.asPath, loading]);

  const studentDocLinks = [
    profile?.nrc_doc_url ? { label: 'NRC document', url: profile.nrc_doc_url } : null,
    profile?.university_slip_url ? { label: 'University confirmation slip', url: profile.university_slip_url } : null,
  ].filter(Boolean);

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    const nrcError = validateNrcNumber(verifyForm.nrc_number);
    if (nrcError) {
      toast.error(nrcError);
      return;
    }
    if (!verifyForm.nrc_document) {
      toast.error('Upload your NRC document');
      return;
    }
    if (!verifyForm.university_slip) {
      toast.error('Upload your university confirmation slip or equivalent');
      return;
    }
    setSubmittingVerify(true);
    try {
      const formData = new FormData();
      formData.append('nrc_number', verifyForm.nrc_number.trim());
      formData.append('nrc_document', verifyForm.nrc_document);
      formData.append('university_slip', verifyForm.university_slip);
      const res = await submitStudentVerification(formData);
      setProfile(res.data.data.profile);
      setVerifyForm((prev) => ({ ...prev, nrc_document: null, university_slip: null }));
      toast.success(res.data.message || 'Verification documents submitted successfully. We will notify you when review is complete.');
      await loadDashboard({ silent: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'We could not submit your documents. Please try again.'));
    } finally {
      setSubmittingVerify(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div aria-busy="true" aria-label="Loading student dashboard">
          <Skeleton className="mb-2 h-4 w-40" label="" />
          <Skeleton className="mb-6 h-9 w-72" label="" />
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((key) => <Skeleton key={key} className="h-24" label="" />)}
          </div>
          <Skeleton className="mb-8 h-44 w-full" label="" />
          <Skeleton className="mb-4 h-7 w-40" label="" />
          <div className="space-y-3">
            {[1, 2].map((key) => <Skeleton key={key} className="h-28 w-full" label="" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const activeBookings = bookings.filter((b) =>
    ['pending', 'accepted', 'escrow_held', 'move_in_window', 'disputed'].includes(b.status)
  );
  const completedBookings = bookings.filter((b) =>
    ['completed', 'confirmed', 'timed_out'].includes(b.status)
  );
  const nextBooking = bookings.find((b) => b.status === 'move_in_window')
    || bookings.find((b) => b.status === 'accepted')
    || bookings.find((b) => b.status === 'pending')
    || bookings.find((b) => b.status === 'escrow_held')
    || bookings.find((b) => b.status === 'disputed');
  const nextCopy = nextBooking ? bookingCopy(nextBooking.status) : null;

  return (
    <Layout>
      <div id="student-overview" className="mb-6 scroll-mt-24">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700">Student accommodation</p>
        <h1 className="page-heading mb-1">
          Welcome back, {user?.full_name.split(' ')[0]}
        </h1>
        <p className="page-subheading">Browse rooms, track bookings, and manage your verification documents.</p>
      </div>

      <DashboardSectionNav
        ariaLabel="Student dashboard sections"
        items={[
          { id: 'student-overview', label: 'Dashboard' },
          { id: 'student-bookings', label: 'My bookings', badge: activeBookings.length },
          { id: 'student-verification', label: 'Verification' },
          { id: 'student-profile', label: 'Profile' },
        ]}
      />

      {nextBooking ? (
        <div className="card mb-8 border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">What you need to do next</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{nextBooking.property_title}</h2>
          <p className="mt-1 text-sm text-slate-600">{nextCopy.description}</p>
          <p className="mt-2 text-sm font-medium text-blue-800">{nextCopy.next}</p>
          <Link href={`/bookings/${nextBooking.id}`} className="btn-primary mt-4">
            {nextBooking.status === 'accepted' ? 'Make your payment' :
              nextBooking.status === 'move_in_window' ? 'Confirm move-in' : 'View booking'}
          </Link>
        </div>
      ) : (
        <div className="card mb-8 flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">Looking for a room?</h2>
            <p className="text-sm text-slate-500">Browse verified listings with payment protection.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link href="/properties" className="btn-primary">
              <Search size={14} />
              Browse rooms
            </Link>
            <Link href="/favorites" className="btn-secondary">
              <Heart size={14} />
              Saved rooms
            </Link>
          </div>
        </div>
      )}

      {user?.verification_status !== 'verified' && user?.verification_status !== 'rejected' && (
        <StatusBanner
          type="info"
          title="Verification unlocks booking"
          className="mb-8"
          actionHref="#student-verification"
          actionLabel="Jump to verification form"
        >
          Upload your NRC and university confirmation slip below. Once an admin approves your account, you can book rooms with payment protection.
        </StatusBanner>
      )}

      {studentDocLinks.length > 0 && (
        <VerificationDocLinks docs={studentDocLinks} className="mb-8" />
      )}

      {user?.verification_status === 'verified' ? (
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle size={18} className="flex-shrink-0 text-green-600" />
          <div>
            <p className="text-sm font-semibold text-green-800">Student account verified</p>
            <p className="mt-0.5 text-xs text-green-600">Your NRC and university documents have been confirmed.</p>
          </div>
        </div>
      ) : user?.verification_status === 'rejected' ? (
        <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="mb-3 flex items-center gap-3">
            <Shield size={18} className="flex-shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">Verification rejected</p>
              <p className="mt-0.5 text-xs text-red-600">Re-submit your NRC and university confirmation documents.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-yellow-200 bg-yellow-50 p-4" id="student-verification">
          <div className="mb-3 flex items-center gap-3">
            <Shield size={18} className="flex-shrink-0 text-yellow-600" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">
                {profile?.has_nrc_doc && profile?.has_university_slip
                  ? 'Documents submitted — awaiting admin review'
                  : 'Student verification required'}
              </p>
              <p className="mt-0.5 text-xs text-yellow-600">
                Upload your NRC details and university confirmation slip so admins can verify your student status.
              </p>
            </div>
          </div>
          <form onSubmit={handleVerificationSubmit} className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-yellow-800" htmlFor="student-nrc">NRC number</label>
              <input
                id="student-nrc"
                type="text"
                inputMode="numeric"
                value={verifyForm.nrc_number}
                onChange={(e) => setVerifyForm({ ...verifyForm, nrc_number: e.target.value })}
                className="input"
                placeholder="123456/78/1"
                pattern="\d{6}/\d{2}/\d{1}"
                title={NRC_FORMAT_MESSAGE}
                required
              />
              <p className="mt-1 text-xs text-yellow-700">Format: 123456/78/1</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-yellow-800" htmlFor="student-nrc-doc">NRC document</label>
              <input
                id="student-nrc-doc"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setVerifyForm({ ...verifyForm, nrc_document: e.target.files?.[0] || null })}
                className="input py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-yellow-800" htmlFor="student-slip">University confirmation slip</label>
              <input
                id="student-slip"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setVerifyForm({ ...verifyForm, university_slip: e.target.files?.[0] || null })}
                className="input py-2"
              />
            </div>
            <button
              type="submit"
              disabled={submittingVerify}
              className="btn-primary w-full bg-yellow-600 hover:bg-yellow-700 sm:col-span-2"
            >
              <FileText size={14} />
              {submittingVerify ? 'Uploading…' : 'Submit for verification'}
            </button>
          </form>
        </div>
      )}

      {(user?.verification_status === 'rejected') && (
        <form onSubmit={handleVerificationSubmit} className="card mb-8 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="resubmit-nrc">NRC number</label>
            <input
              id="resubmit-nrc"
              type="text"
              inputMode="numeric"
              value={verifyForm.nrc_number}
              onChange={(e) => setVerifyForm({ ...verifyForm, nrc_number: e.target.value })}
              className="input"
              placeholder="123456/78/1"
              pattern="\d{6}/\d{2}/\d{1}"
              title={NRC_FORMAT_MESSAGE}
              required
            />
            <p className="mt-1 text-xs text-slate-500">Format: 123456/78/1</p>
          </div>
          <div>
            <label className="label" htmlFor="resubmit-nrc-doc">NRC document</label>
            <input
              id="resubmit-nrc-doc"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => setVerifyForm({ ...verifyForm, nrc_document: e.target.files?.[0] || null })}
              className="input py-2"
            />
          </div>
          <div>
            <label className="label" htmlFor="resubmit-slip">University confirmation slip</label>
            <input
              id="resubmit-slip"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => setVerifyForm({ ...verifyForm, university_slip: e.target.files?.[0] || null })}
              className="input py-2"
            />
          </div>
          <button
            type="submit"
            disabled={submittingVerify}
            className="btn-primary w-full sm:col-span-2"
          >
            {submittingVerify ? 'Uploading…' : 'Re-submit documents'}
          </button>
        </form>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Current bookings', value: activeBookings.length, icon: Clock, color: 'bg-amber-50 text-amber-700' },
          { label: 'Completed', value: completedBookings.length, icon: CheckCircle, color: 'bg-green-50 text-green-700' },
          { label: 'All bookings', value: bookings.length, icon: BookOpen, color: 'bg-blue-50 text-blue-700' },
        ].map((stat) => (
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

      {transactions.length > 0 && (
        <div className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Payment status</h2>
          <div className="card divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{transactionLabel(tx.type)} · {tx.property_title}</p>
                  <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{formatKwacha(tx.amount)}</p>
                  <p className="text-xs capitalize text-slate-500">
                    {tx.status === 'completed' ? 'Completed' : tx.status === 'pending' ? 'Waiting for confirmation' : tx.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div id="student-bookings" className="scroll-mt-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Your bookings</h2>
          <Link href="/favorites" className="text-sm font-medium text-blue-700 hover:underline">Saved rooms</Link>
        </div>

        {bookings.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No bookings yet."
            body="Browse rooms and submit a booking request when you find accommodation that fits."
            actionHref="/properties"
            actionLabel="Browse rooms"
          />
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const config = bookingCopy(booking.status);
              return (
                <div key={booking.id} className="card p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 font-semibold text-slate-900">{booking.property_title}</h3>
                      <p className="mb-2 break-words text-sm text-slate-500">{booking.property_address}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>Move-in: {new Date(booking.move_in_date).toLocaleDateString()}</span>
                        <span className="font-medium text-slate-700">{formatKwacha(booking.amount)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <Badge type={config.color}>{config.label}</Badge>
                      <Link href={`/bookings/${booking.id}`} className="text-sm font-medium text-blue-700 hover:underline">
                        View booking
                      </Link>
                    </div>
                  </div>

                  {booking.status === 'move_in_window' && (
                    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2 text-sm text-amber-800">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>Confirm your move-in after checking the room.</span>
                      </div>
                      <Link href={`/bookings/${booking.id}`} className="btn-primary shrink-0 bg-amber-600 px-4 py-2 text-sm hover:bg-amber-700">
                        Confirm move-in
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {recommended.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recommended rooms</h2>
            <Link href="/properties?verified=true" className="text-sm font-medium text-blue-700 hover:underline">Browse verified landlords</Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {recommended.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      )}

      <ProfileForm showPhoto sectionId="student-profile" />
    </Layout>
  );
}
