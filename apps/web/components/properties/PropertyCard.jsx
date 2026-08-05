import Link from 'next/link';
import Image from 'next/image';
import Badge from '../ui/Badge';
import { MapPin, BedDouble, Shield, CheckCircle } from 'lucide-react';

const gradients = [
  'from-blue-100 to-blue-200',
  'from-purple-100 to-purple-200',
  'from-green-100 to-green-200',
  'from-orange-100 to-orange-200',
  'from-pink-100 to-pink-200',
];

export default function PropertyCard({ property, index = 0 }) {
  const isVerified = property.verification_status === 'verified';
  const isAvailable = property.available_rooms > 0;
  const primaryImage = Array.isArray(property.images) && property.images.length > 0
    ? property.images[0]
    : null;
  const gradient = gradients[index % gradients.length];

  return (
    <Link href={`/properties/${property.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden group">

        {/* Image */}
        <div className={`h-48 relative overflow-hidden ${!primaryImage ? `bg-gradient-to-br ${gradient}` : ''}`}>
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BedDouble size={44} className="text-white opacity-50" />
            </div>
          )}

          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {isVerified && (
              <span className="bg-white text-green-600 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <CheckCircle size={10} />
                Verified
              </span>
            )}
            {!isAvailable && (
              <span className="bg-gray-900 bg-opacity-70 text-white text-xs font-semibold px-2 py-1 rounded-full">
                Fully Booked
              </span>
            )}
          </div>

          {/* Image count badge */}
          {Array.isArray(property.images) && property.images.length > 1 && (
            <span className="absolute bottom-3 right-3 bg-black bg-opacity-50 text-white text-xs px-2 py-0.5 rounded-full">
              +{property.images.length - 1} photos
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
            {property.title}
          </h3>
          <div className="flex items-center gap-1 text-gray-400 text-xs mb-3">
            <MapPin size={11} />
            <span>{property.area}</span>
          </div>
          <div className="border-t border-gray-50 pt-3 flex items-center justify-between">
            <div>
              <span className="text-blue-600 font-bold text-lg">
                ZMW {Number(property.rent_per_month).toLocaleString()}
              </span>
              <span className="text-gray-400 text-xs">/mo</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <Shield size={10} />
              <span>Escrow</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {property.available_rooms} of {property.total_rooms} room(s) available
          </div>
        </div>
      </div>
    </Link>
  );
}