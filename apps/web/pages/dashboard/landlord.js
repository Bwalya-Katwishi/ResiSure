import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Layout from '../../components/layout/Layout';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { getMyListings, getLandlordBookings, createProperty } from '../../lib/api';
import { Home, Plus, BookOpen, CheckCircle, Clock, X, Shield } from 'lucide-react';

export default function LandlordDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', address: '',
    area: '', rent_per_month: '', total_rooms: 1
  });
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
    if (!authLoading && user?.role !== 'landlord') router.push('/');
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === 'landlord') {
      Promise.all([getMyListings(), getLandlordBookings()])
        .then(([listRes, bookRes]) => {
          setListings(listRes.data.data.properties);
          setBookings(bookRes.data.data.bookings);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createProperty({
        ...form,
        rent_per_month: Number(form.rent_per_month),
        total_rooms: Number(form.total_rooms),
      });
      setListings([res.data.data.property, ...listings]);
      setShowForm(false);
      setForm({ title: '', description: '', address: '', area: '', rent_per_month: '', total_rooms: 1 });
      toast.success('Property listed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
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

  const pendingBookings = bookings.filter(b => b.status === 'pending');

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Landlord Dashboard
          </h1>
          <p className="text-gray-500">Manage your listings and bookings</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          Add Listing
        </button>
      </div>

      {/* Verification status banner */}
      {user && (
        <div className={`rounded-xl p-4 mb-8 flex items-center gap-3 ${
          true ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
        }`}>
          <Shield size={18} className="text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Verification Pending</p>
            <p className="text-xs text-yellow-600">Your listings are visible but won't show the verified badge until an admin approves your account.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'My Listings', value: listings.length, icon: Home, color: 'bg-blue-50 text-blue-600' },
          { label: 'Pending Bookings', value: pendingBookings.length, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Total Bookings', value: bookings.length, icon: BookOpen, color: 'bg-green-50 text-green-600' },
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

      {/* Add listing form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Add New Listing</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleCreateProperty} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Spacious Self-Contained Room in Chelstone"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the property, amenities included..."
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Plot 45, Chilimbulu Road, Chelstone"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area / Neighbourhood</label>
              <input
                type="text"
                value={form.area}
                onChange={e => setForm({ ...form, area: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Chelstone"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rent per Month (ZMW)</label>
              <input
                type="number"
                value={form.rent_per_month}
                onChange={e => setForm({ ...form, rent_per_month: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Rooms</label>
              <input
                type="number"
                value={form.total_rooms}
                onChange={e => setForm({ ...form, total_rooms: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                required
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Listing'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Listings */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Listings</h2>
        {listings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Home size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No listings yet</p>
            <p className="text-gray-400 text-sm mt-1">Click "Add Listing" to post your first property</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map(listing => (
              <div key={listing.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{listing.title}</h3>
                    <p className="text-gray-500 text-sm mb-2">{listing.area}</p>
                    <p className="text-blue-600 font-bold">ZMW {Number(listing.rent_per_month).toLocaleString()}/month</p>
                  </div>
                  <Badge type={listing.status === 'available' ? 'verified' : 'default'}>
                    {listing.status}
                  </Badge>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                  <span>{listing.available_rooms} of {listing.total_rooms} rooms available</span>
                  <Link href={`/properties/${listing.id}`} className="text-blue-600 hover:underline">
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bookings */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Incoming Bookings</h2>
        {bookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <BookOpen size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No bookings yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{booking.property_title}</h3>
                    <p className="text-gray-500 text-sm">Student: {booking.student_name}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Move-in: {new Date(booking.move_in_date).toLocaleDateString()} •{' '}
                      <span className="font-medium text-blue-600">ZMW {Number(booking.amount).toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge type={booking.status === 'completed' ? 'completed' : booking.status === 'pending' ? 'pending' : 'escrow'}>
                      {booking.status}
                    </Badge>
                    <Link href={`/bookings/${booking.id}`} className="text-xs text-blue-600 hover:underline">
                      Manage →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}