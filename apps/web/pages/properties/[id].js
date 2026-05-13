import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { getProperty, createBooking } from '../../lib/api';
import toast from 'react-hot-toast';
import { MapPin, BedDouble, Shield, Phone, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PropertyDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [moveInDate, setMoveInDate] = useState('');

  useEffect(() => {
    if (id) {
      getProperty(id)
        .then(res => setProperty(res.data.data.property))
        .catch(() => toast.error('Property not found'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleBook = async () => {
    if (!user) {
      toast.error('Please login to book this property');
      router.push('/auth/login');
      return;
    }
    if (user.role !== 'student') {
      toast.error('Only students can book properties');
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
      toast.success('Booking request submitted successfully!');
      router.push(`/bookings/${res.data.data.booking.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-gray-500">Property not found</p>
          <Link href="/properties" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Back to listings
          </Link>
        </div>
      </Layout>
    );
  }

  const isVerified = property.verification_status === 'verified';

  return (
    <Layout>
      {/* Back */}
      <Link href="/properties" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-6 transition-colors">
        <ArrowLeft size={16} />
        Back to listings
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main content */}
        <div className="lg:col-span-2">

          {/* Image */}
          <div className="h-64 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mb-6">
            <BedDouble size={60} className="text-blue-400" />
          </div>

          {/* Title and badges */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
            <Badge type={isVerified ? 'verified' : 'pending'}>
              {isVerified ? '✓ Verified Landlord' : 'Pending Verification'}
            </Badge>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-gray-500 mb-6">
            <MapPin size={16} />
            <span>{property.address}</span>
          </div>

          {/* Description */}
          {property.description && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
              <h2 className="font-semibold text-gray-900 mb-3">About this property</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{property.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Property Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Area', value: property.area },
                { label: 'Available Rooms', value: `${property.available_rooms} of ${property.total_rooms}` },
                { label: 'Monthly Rent', value: `ZMW ${Number(property.rent_per_month).toLocaleString()}` },
                { label: 'Status', value: property.status },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <p className="text-sm font-medium text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Landlord info */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Landlord Information</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{property.landlord_name}</p>
                <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                  <Phone size={12} />
                  <span>{property.landlord_phone || 'Not provided'}</span>
                </div>
              </div>
              <Badge type={isVerified ? 'verified' : 'pending'}>
                {property.verification_status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Booking sidebar */}
        <div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-24">

            {/* Price */}
            <div className="mb-6">
              <p className="text-3xl font-bold text-blue-600">
                ZMW {Number(property.rent_per_month).toLocaleString()}
              </p>
              <p className="text-gray-400 text-sm">per month</p>
            </div>

            {/* Escrow badge */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center gap-2">
              <Shield size={16} className="text-green-600" />
              <div>
                <p className="text-xs font-semibold text-green-800">Escrow Protected</p>
                <p className="text-xs text-green-600">Payment held until you confirm move-in</p>
              </div>
            </div>

            {/* Availability */}
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle size={16} className={property.available_rooms > 0 ? 'text-green-500' : 'text-red-400'} />
              <span className="text-sm text-gray-600">
                {property.available_rooms > 0
                  ? `${property.available_rooms} room(s) available`
                  : 'No rooms available'}
              </span>
            </div>

            {/* Move-in date */}
            {property.available_rooms > 0 && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Move-in Date
                  </label>
                  <input
                    type="date"
                    value={moveInDate}
                    onChange={e => setMoveInDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handleBook}
                  disabled={booking}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Shield size={16} />
                  {booking ? 'Submitting...' : 'Book with Escrow Protection'}
                </button>

                {!user && (
                  <p className="text-center text-xs text-gray-400 mt-3">
                    <Link href="/auth/login" className="text-blue-600 hover:underline">
                      Login
                    </Link>{' '}
                    to book this property
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}