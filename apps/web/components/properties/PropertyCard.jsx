import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { getPrimaryImage } from '../../lib/images';
import FavoriteButton from './FavoriteButton';
import VerifiedBadge from '../ui/VerifiedBadge';
import { formatKwacha } from '../../lib/bookingStatus';
import { accommodationLabel, accommodationAvailabilityText } from '../../lib/propertyAccommodation';

export default function PropertyCard({ property, onFavoriteChange }) {
  const isVerified = property.verification_status === 'verified';
  const isAvailable = property.available_rooms > 0;
  const primaryImage = getPrimaryImage(property.images);
  const amenities = Array.isArray(property.amenities) ? property.amenities.slice(0, 3) : [];

  return (
    <article className="card group overflow-hidden transition-shadow hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <Link href={`/properties/${property.id}`} className="block h-full">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={property.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">No photo yet</div>
          )}
        </Link>
        <div className="absolute left-3 top-3 flex gap-2">
          {isVerified ? (
            <VerifiedBadge compact />
          ) : (
            <span className="rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-amber-800 shadow-sm">
              Unverified
            </span>
          )}
          {!isAvailable && (
            <span className="rounded-full bg-slate-900/80 px-2 py-1 text-xs font-medium text-white">Fully booked</span>
          )}
        </div>
        <div className="absolute right-3 top-3">
          <FavoriteButton
            propertyId={property.id}
            isFavorite={property.is_favorite}
            onChange={onFavoriteChange}
            className="border-white"
          />
        </div>
      </div>
      <div className="p-4">
        <Link href={`/properties/${property.id}`} className="block">
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">{property.title}</h3>
          <p className="mt-1 flex items-start gap-1 text-sm text-slate-500">
            <MapPin size={13} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{property.area}{property.area ? ', Lusaka' : property.address}</span>
          </p>
          <p className="mt-3 text-lg font-bold text-slate-900">
            {formatKwacha(property.rent_per_month)} <span className="text-sm font-medium text-slate-500">/ month</span>
          </p>
          {amenities.length > 0 && (
            <p className="mt-2 text-xs capitalize text-slate-500">{amenities.join(' · ')}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">{accommodationLabel(property.accommodation_gender)}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {accommodationAvailabilityText(property)}
          </p>
          <span className="mt-4 inline-flex text-sm font-semibold text-blue-700">View room</span>
        </Link>
      </div>
    </article>
  );
}
