import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Layout from '../../components/layout/Layout';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { getMyListings, getLandlordBookings, createProperty } from '../../lib/api';
import api from '../../lib/api';
import {
  Home, Plus, BookOpen, Clock, X, Shield,
  Upload, Image, Trash2, ChevronRight, CheckCircle
} from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pending', color: 'pending' },
  escrow_held: { label: 'Escrow Held', color: 'escrow' },
  move_in_window: { label: 'Move-in Window', color: 'pending' },
  completed: { label: 'Completed', color: 'completed' },
  disputed: { label: 'Disputed', color: 'disputed' },
  rejected: { label: 'Rejected', color: 'rejected' },
};

export default function LandlordDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    title: '', description: '', address: '',
    area: '', rent_per_month: '', total_rooms: 1,
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
      const newProperty = res.data.data.property;
      setListings([{ ...newProperty, images: [] }, ...listings]);
      setShowForm(false);
      setForm({ title: '', description: '', address: '', area: '', rent_per_month: '', total_rooms: 1 });
      toast.success('Property listed successfully!');
      // Auto-open image upload for new property
      setSelectedProperty({ ...newProperty, images: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const previews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));
    setPreviewImages(previews);
  };

  const handleImageUpload = async () => {
    if (!previewImages.length || !selectedProperty) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      previewImages.forEach(p => formData.append('images', p.file));
      const res = await api.post(`/api/properties/${selectedProperty.id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedImages = res.data.data.images.map(img => img.image_url);
      const updatedProperty = { ...selectedProperty, images: uploadedImages };
      setSelectedProperty(updatedProperty);
      setListings(listings.map(l => l.id === selectedProperty.id ? updatedProperty : l));
      setPreviewImages([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Images uploaded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteImage = async (imageUrl) => {
    if (!selectedProperty) return;
    try {
      const pool_images = await api.get(`/api/properties/${selectedProperty.id}`);
      const allImages = pool_images.data.data.property.images;
      const imageIndex = allImages.indexOf(imageUrl);
      const imagesResult = await api.get(`/api/properties/${selectedProperty.id}`);
      const fullImages = imagesResult.data.data.property;
      toast.error('Image deletion coming soon — use Cloudinary dashboard for now');
    } catch (err) {
      toast.error('Failed to delete image');
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
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Landlord Dashboard</h1>
          <p className="text-gray-500">Manage your listings and incoming bookings</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSelectedProperty(null); }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          Add Listing
        </button>
      </div>

      {/* Verification banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-center gap-3">
        <Shield size={18} className="text-yellow-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-yellow-800">Verification Pending</p>
          <p className="text-xs text-yellow-600 mt-0.5">Your listings are visible to students but won't show the verified badge until an admin approves your account.</p>
        </div>
      </div>

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
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Add New Listing</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1">
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
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Spacious Self-Contained Room in Chelstone"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the property, amenities included, nearby facilities..."
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Chelstone, Emmasdale, Woodlands"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (ZMW)</label>
              <input
                type="number"
                value={form.rent_per_month}
                onChange={e => setForm({ ...form, rent_per_month: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                required
              />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? 'Creating...' : (
                  <><CheckCircle size={14} /> Create Listing</>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Image upload panel */}
      {selectedProperty && (
        <div className="bg-white rounded-2xl border border-blue-100 p-6 mb-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Upload Photos</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {selectedProperty.title} — up to 5 photos
              </p>
            </div>
            <button
              onClick={() => { setSelectedProperty(null); setPreviewImages([]); }}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Existing images */}
          {Array.isArray(selectedProperty.images) && selectedProperty.images.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Current photos</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {selectedProperty.images.map((img, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden h-24">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                        Main
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Upload size={28} className="text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600">Click to select photos</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG or WebP — max 5MB each</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Preview */}
          {previewImages.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Ready to upload ({previewImages.length} photo{previewImages.length > 1 ? 's' : ''})</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                {previewImages.map((p, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden h-24">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImages(previewImages.filter((_, idx) => idx !== i));
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={handleImageUpload}
                disabled={uploadingImages}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Upload size={14} />
                {uploadingImages ? 'Uploading to Cloudinary...' : `Upload ${previewImages.length} photo${previewImages.length > 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* My Listings */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Listings</h2>
        {listings.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Home size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No listings yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">Click "Add Listing" to post your first property</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map(listing => {
              const primaryImage = Array.isArray(listing.images) && listing.images.length > 0
                ? listing.images[0] : null;
              return (
                <div key={listing.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Property image */}
                  <div className="h-36 relative bg-gradient-to-br from-blue-100 to-blue-200">
                    {primaryImage ? (
                      <img src={primaryImage} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home size={32} className="text-blue-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="text-white font-semibold text-sm truncate">{listing.title}</span>
                      <Badge type={listing.status === 'available' ? 'verified' : 'default'}>
                        {listing.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-blue-600 font-bold">ZMW {Number(listing.rent_per_month).toLocaleString()}/mo</p>
                        <p className="text-xs text-gray-400 mt-0.5">{listing.area} · {listing.available_rooms}/{listing.total_rooms} rooms available</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedProperty(listing)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-gray-50 text-gray-700 border border-gray-200 py-2 rounded-lg text-xs font-medium hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
                      >
                        <Upload size={12} />
                        {Array.isArray(listing.images) && listing.images.length > 0
                          ? `${listing.images.length} photo${listing.images.length > 1 ? 's' : ''}` : 'Add photos'}
                      </button>
                      <Link
                        href={`/properties/${listing.id}`}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-100 py-2 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        View <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Incoming Bookings */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Incoming Bookings
          {pendingBookings.length > 0 && (
            <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {pendingBookings.length} pending
            </span>
          )}
        </h2>
        {bookings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <BookOpen size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No bookings yet</p>
            <p className="text-gray-400 text-sm mt-1">Bookings will appear here once students book your properties</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(booking => {
              const config = statusConfig[booking.status] || { label: booking.status, color: 'default' };
              return (
                <div key={booking.id} className={`bg-white rounded-xl border p-5 hover:shadow-sm transition-shadow ${booking.status === 'pending' ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{booking.property_title}</h3>
                      <p className="text-gray-500 text-sm mt-0.5">Student: {booking.student_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>Move-in: {new Date(booking.move_in_date).toLocaleDateString()}</span>
                        <span className="font-semibold text-blue-600">ZMW {Number(booking.amount).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge type={config.color}>{config.label}</Badge>
                      <Link
                        href={`/bookings/${booking.id}`}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Manage →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}