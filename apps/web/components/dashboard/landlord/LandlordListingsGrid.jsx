import Link from 'next/link';
import { Home, Upload, ChevronRight } from 'lucide-react';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import { formatKwacha, listingVerificationLabel } from '../../../lib/bookingStatus';
import { getPrimaryImage } from '../../../lib/images';

export default function LandlordListingsGrid({
  listings,
  openCreateForm,
  startEdit,
  openPhotoUpload,
  landlordVerified,
}) {
  return (
    <div id="landlord-listings" className="mb-10 scroll-mt-24">
      <h2 className="mb-4 text-xl font-bold text-slate-900">My properties</h2>
      {!landlordVerified && (
        <p className="mb-4 text-sm text-amber-700">
          Complete landlord verification before creating new listings.
        </p>
      )}
      {listings.length === 0 ? (
        <EmptyState
          icon={Home}
          title="You haven't posted any properties yet."
          body="Create a listing so students can find your accommodation and book with payment protection."
          actionLabel="Add property"
          onAction={openCreateForm}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {listings.map((listing) => {
            const primaryImage = getPrimaryImage(listing.images);
            return (
              <div key={listing.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow hover:shadow-md">
                <div className="relative h-36 bg-gradient-to-br from-blue-100 to-blue-200">
                  {primaryImage ? (
                    <img src={primaryImage} alt={listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Home size={32} className="text-blue-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">{listing.title}</span>
                    <Badge type={listing.available_rooms > 0 ? 'verified' : 'default'}>
                      {listing.available_rooms > 0 ? 'Available' : 'Fully booked'}
                    </Badge>
                  </div>
                </div>

                <div className="p-4">
                  <p className="font-bold text-slate-900">{formatKwacha(listing.rent_per_month)} / month</p>
                  <p className="mt-0.5 text-xs text-gray-400">{listing.area} · {listing.available_rooms}/{listing.total_rooms} rooms available</p>
                  <p className="mb-3 mt-2 break-words text-xs text-slate-500">
                    Listing status: {listingVerificationLabel(listing.verification_status || 'pending')}
                    {listing.rejection_reason ? ` — ${listing.rejection_reason}` : ''}
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button type="button" onClick={() => startEdit(listing)} className="btn-secondary w-full py-2.5 text-sm">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openPhotoUpload(listing)}
                      className="btn-secondary w-full py-2.5 text-sm"
                    >
                      <Upload size={14} />
                      {Array.isArray(listing.images) && listing.images.length > 0
                        ? `${listing.images.length} photo${listing.images.length > 1 ? 's' : ''}` : 'Add photos'}
                    </button>
                    <Link href={`/properties/${listing.id}`} className="btn-primary w-full py-2.5 text-sm">
                      View <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
