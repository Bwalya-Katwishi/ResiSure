import Link from 'next/link';
import Badge from '../ui/Badge';
import { MapPin, BedDouble, Shield } from 'lucide-react';

export default function PropertyCard({ property }) {
  const isVerified = property.verification_status === 'verified';

  return (
    <Link href={`/properties/${property.id}`}>
      <div className="bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
          <BedDouble size={40} className="text-blue-400" />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
              {property.title}
            </h3>
            <Badge type={isVerified ? 'verified' : 'pending'}>
              {isVerified ? '✓ Verified' : 'Pending'}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
            <MapPin size={12} />
            <span>{property.area}</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-blue-600 font-bold text-lg">
                ZMW {Number(property.rent_per_month).toLocaleString()}
              </span>
              <span className="text-gray-400 text-xs">/month</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Shield size={12} />
              <span>Escrow Protected</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}