import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import Badge from '../../components/ui/Badge';
import VerifiedBadge from '../../components/ui/VerifiedBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { getProperty, createBooking } from '../../lib/api';
import toast from 'react-hot-toast';
import { getActionableError, getApiErrorMessage } from '../../lib/userFeedback';
import StatusBanner from '../../components/ui/StatusBanner';
import { MapPin, BedDouble, Shield, CheckCircle, ArrowLeft, Pencil, BookOpen, LayoutDashboard } from 'lucide-react';
import FavoriteButton from '../../components/properties/FavoriteButton';
import Link from 'next/link';
import { getImageUrl } from '../../lib/images';
import { formatKwacha } from '../../lib/bookingStatus';
import { accommodationLabel, accommodationAvailabilityText } from '../../lib/propertyAccommodation';
import { useRefetchOnFocus } from '../../lib/useRefetchOnFocus';
import AccountDetailPanel from '../../components/dashboard/admin/AccountDetailPanel';

function LandlordOwnerPanel({ property }) {
  const listingBookings = `/dashboard/landlord#landlord-booking-requests`;

  return (
    <>
      <div className="mb-5">
        <p className="text-3xl font-bold text-slate-900">
          {formatKwacha(property.rent_per_month)}
          <span className="ml-1 text-sm font-medium text-slate-500">/ month</span>
        </p>
      </div>

      <StatusBanner type="info" title="Your listing" className="mb-4">
        You are viewing your own property. Students book from the public listing page — manage it from your dashboard.
      </StatusBanner>

      <div className="mb-5 flex items-center gap-2">
        <CheckCircle size={16} className={property.available_rooms > 0 ? 'text-green-600' : 'text-red-500'} />
        <span className="text-sm text-slate-600">
          {property.available_rooms > 0
            ? `${property.available_rooms} of ${property.total_rooms} room(s) available`
            : 'Fully booked'}
        </span>
      </div>

      <div className="space-y-2">
        <Link
          href={`/dashboard/landlord?edit=${property.id}#landlord-listing-form`}
          className="btn-primary w-full py-3"
        >
          <Pencil size={16} />
          Edit listing
        </Link>
        <Link href={listingBookings} className="btn-secondary w-full py-3">
          <BookOpen size={16} />
          View bookings
        </Link>
        <Link href="/dashboard/landlord#landlord-listings" className="btn-secondary w-full py-3">
          <LayoutDashboard size={16} />
          Back to my listings
        </Link>
      </div>
    </>
  );
}

function BookingForm({
  property,
  isVerified,
  landlordVerified,
  user,
  moveInDate,
  setMoveInDate,
  booking,
  handleBook,
  bookingBlock,
}) {
  return (
    <>
      <div className="mb-5">
        <p className="text-3xl font-bold text-slate-900">
          {formatKwacha(property.rent_per_month)}
          <span className="ml-1 text-sm font-medium text-slate-500">/ month</span>
        </p>
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
        <Shield size={16} className="mt-0.5 flex-shrink-0 text-blue-700" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Payment protection</p>
          <p className="text-xs leading-relaxed text-blue-700">
            Your payment is protected until you confirm your move-in.
          </p>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <CheckCircle size={16} className={property.available_rooms > 0 ? 'text-green-600' : 'text-red-500'} />
        <span className="text-sm text-slate-600">
          {property.available_rooms > 0
            ? `${property.available_rooms} of ${property.total_rooms} room(s) available`
            : 'No rooms available'}
        </span>
      </div>

      {!isVerified && (
        <StatusBanner type="warning" title="Unverified listing" className="mb-4">
          This listing has not yet been reviewed by ResiSure. You can still book if the landlord is verified.
        </StatusBanner>
      )}

      {!landlordVerified && (
        <StatusBanner
          type="warning"
          title="Landlord verification pending"
          className="mb-4"
          actionHref="/properties?verified=true"
          actionLabel="Browse verified landlords"
        >
          This listing is visible, but the landlord account is not verified yet. For your safety, booking is disabled until admin approval.
        </StatusBanner>
      )}

      {bookingBlock && (
        <StatusBanner
          type="warning"
          title={bookingBlock.title}
          className="mb-4"
          actionHref={bookingBlock.actionHref}
          actionLabel={bookingBlock.actionLabel}
        >
          {bookingBlock.message}
        </StatusBanner>
      )}

      {property.verification_status !== 'rejected' && property.verification_status !== 'suspended' && landlordVerified && property.available_rooms > 0 && !bookingBlock && (
        <>
          <div className="mb-4">
            <label className="label" htmlFor="move-in-date">Move-in date</label>
            <input
              id="move-in-date"
              type="date"
              value={moveInDate}
              onChange={(e) => setMoveInDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="input"
              required
              aria-required="true"
            />
          </div>

          <button
            onClick={handleBook}
            disabled={booking}
            className="btn-primary w-full py-3"
          >
            <Shield size={16} />
            {booking ? 'Submitting request…' : 'Book this room'}
          </button>

          {!user && (
            <p className="mt-3 text-center text-xs text-slate-500">
              <Link href="/auth/login" className="font-medium text-blue-700 hover:underline">
                Sign in
              </Link>
              {' '}to complete your booking
            </p>
          )}
        </>
      )}
    </>
  );
}

export default function PropertyDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [moveInDate, setMoveInDate] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [showMobileBooking, setShowMobileBooking] = useState(false);
  const bookingRef = useRef(null);

  const loadProperty = useCallback(async ({ silent = false } = {}) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const res = await getProperty(id);
      setProperty(res.data.data.property);
    } catch {
      if (!silent) toast.error('We could not find that room.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadProperty();
  }, [id, loadProperty]);

  useRefetchOnFocus(() => loadProperty({ silent: true }), Boolean(id));

  const handleBook = async () => {
    if (!user) {
      toast.error('Please sign in to book this room');
      router.push('/auth/login');
      return;
    }
    if (user.role !== 'student') {
      toast.error('Only students can book rooms');
      return;
    }
    if (!moveInDate) {
      toast.error('Please select a move-in date');
      return;
    }
    setBooking(true);
    try {
      const res = await createBooking({
        property_id: id,
        move_in_date: moveInDate,
      });
      toast.success(res.data.message || 'Booking request submitted successfully. We will notify you when the landlord responds.');
      router.replace(`/bookings/${res.data.data.booking.id}`);
    } catch (err) {
      const info = getActionableError(err, getApiErrorMessage(err, 'We could not submit your booking. Please try again.'));
      toast.error(info.message);
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Skeleton className="mb-6 h-4 w-32" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-80 w-full rounded-2xl" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <EmptyState
          icon={BedDouble}
          title="Room not found"
          body="This listing may have been removed or is no longer available."
          actionHref="/properties"
          actionLabel="Browse rooms"
        />
      </Layout>
    );
  }

  const isVerified = property.verification_status === 'verified';
  const landlordVerified = property.landlord_verification_status === 'verified';
  const amenities = Array.isArray(property.amenities) ? property.amenities : [];
  const images = Array.isArray(property.images) ? property.images : [];

  let bookingBlock = null;
  if (user?.role === 'student' && user.verification_status !== 'verified') {
    bookingBlock = {
      title: 'Student verification required',
      message: 'Upload your NRC and university confirmation slip on your dashboard. Once an admin approves your account, you can book rooms here.',
      actionHref: '/dashboard/student',
      actionLabel: 'Complete verification',
    };
  }

  const isOwner = Boolean(property.is_owner);

  const formProps = {
    property,
    isVerified,
    landlordVerified,
    user,
    moveInDate,
    setMoveInDate,
    booking,
    handleBook,
    bookingBlock,
  };

  return (
    <Layout>
      <Link href="/properties" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} />
        Back to listings
      </Link>

      <div className="grid grid-cols-1 gap-8 pb-28 lg:grid-cols-3 lg:pb-0">
        <div className="lg:col-span-2">
          <div className="mb-6">
            {images.length > 0 ? (
              <div>
                <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
                  <img
                    src={getImageUrl(images[activeImage] || images[0])}
                    alt={property.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                {images.length > 1 && (
                  <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {images.slice(0, 5).map((img, i) => (
                      <button
                        key={img.id || i}
                        type="button"
                        onClick={() => setActiveImage(i)}
                        aria-label={`View photo ${i + 1} of ${Math.min(images.length, 5)}`}
                        aria-current={activeImage === i ? 'true' : undefined}
                        className={`overflow-hidden rounded-xl ${activeImage === i ? 'ring-2 ring-blue-600' : ''}`}
                      >
                        <img src={getImageUrl(img)} alt={`${property.title} photo ${i + 1}`} className="h-16 w-full object-cover sm:h-20" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-slate-100">
                <BedDouble size={48} className="text-slate-300" />
              </div>
            )}
          </div>

          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {isVerified ? <VerifiedBadge /> : <Badge type="pending">Unverified</Badge>}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{property.title}</h1>
            </div>
            {!isOwner && (
              <FavoriteButton
                propertyId={property.id}
                isFavorite={property.is_favorite}
                onChange={(_, saved) => setProperty({ ...property, is_favorite: saved })}
                className="border-slate-200"
              />
            )}
          </div>

          <div className="mb-6 flex items-start gap-2 text-slate-500">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            <span className="break-words text-sm sm:text-base">{property.address}{property.area ? ` · ${property.area}, Lusaka` : ''}</span>
          </div>

          {property.description && (
            <div className="card mb-6 p-5">
              <h2 className="mb-3 font-semibold text-slate-900">About this room</h2>
              <p className="text-sm leading-relaxed text-slate-600">{property.description}</p>
            </div>
          )}

          <div className="card mb-6 p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Area', value: property.area || 'Lusaka' },
                { label: 'Type', value: property.property_type || 'room' },
                { label: 'Suitable for', value: accommodationLabel(property.accommodation_gender) },
                { label: 'Availability', value: accommodationAvailabilityText(property) },
                { label: 'Monthly rent', value: `${formatKwacha(property.rent_per_month)} / month` },
              ].map((item) => (
                <div key={item.label}>
                  <p className="mb-1 text-xs text-slate-400">{item.label}</p>
                  <p className="text-sm font-medium capitalize text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {amenities.length > 0 && (
            <div className="card mb-6 p-5">
              <h2 className="mb-3 font-semibold text-slate-900">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {amenities.map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs capitalize text-slate-700">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card mb-6 p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Location</h2>
            <p className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin size={16} className="mt-0.5 flex-shrink-0 text-blue-600" />
              {property.address}
              {property.area ? `, ${property.area}, Lusaka` : ''}
            </p>
          </div>

          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Landlord</h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{property.landlord_name}</p>
                <p className="mt-1 text-xs text-slate-400">Contact details are shared after a booking is accepted.</p>
              </div>
              <Badge type={landlordVerified ? 'verified' : 'pending'}>
                {landlordVerified ? 'Verified landlord' : 'Under review'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <div ref={bookingRef} className="card sticky top-24 p-6">
            {isOwner ? <LandlordOwnerPanel property={property} /> : <BookingForm {...formProps} />}
          </div>
        </div>
      </div>

      <div className="mobile-action-bar p-3 lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{formatKwacha(property.rent_per_month)} / month</p>
            <p className="truncate text-xs text-slate-500">{isVerified ? 'Payment protected' : 'Unverified listing'}</p>
          </div>
          {isOwner ? (
            <Link href={`/dashboard/landlord?edit=${property.id}#landlord-listing-form`} className="btn-primary shrink-0">
              Manage listing
            </Link>
          ) : property.verification_status !== 'rejected' && property.verification_status !== 'suspended' && landlordVerified && property.available_rooms > 0 && !bookingBlock ? (
            <button
              type="button"
              onClick={() => setShowMobileBooking(true)}
              className="btn-primary shrink-0"
            >
              Book this room
            </button>
          ) : (
            <Link href="/properties" className="btn-secondary shrink-0">Browse rooms</Link>
          )}
        </div>
      </div>

      {showMobileBooking && !isOwner && (
        <AccountDetailPanel title="Book this room" onClose={() => setShowMobileBooking(false)}>
          <BookingForm {...formProps} />
        </AccountDetailPanel>
      )}
    </Layout>
  );
}
