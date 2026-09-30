import { Home } from 'lucide-react';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import { verificationLabel } from '../../../lib/bookingStatus';

function statusType(status) {
  if (status === 'verified') return 'verified';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

export default function AdminPropertiesTab({
  properties,
  rejectReason,
  setRejectReason,
  verifyProperty,
}) {
  return (
    <div>
      <div className="mb-4">
        <label className="label" htmlFor="reject-reason">Rejection reason</label>
        <input
          id="reject-reason"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Required when rejecting a listing"
          className="input"
        />
      </div>
      {properties.length === 0 ? (
        <EmptyState icon={Home} title="No listings in the queue." body="Submitted properties will appear here for review." />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {properties.map((property) => (
              <div key={property.id} className="card p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{property.title}</p>
                    <p className="text-xs capitalize text-slate-500">{property.area} · {property.property_type}</p>
                    {property.rejection_reason && <p className="mt-1 break-words text-xs text-red-600">{property.rejection_reason}</p>}
                  </div>
                  <Badge type={statusType(property.verification_status)}>
                    {verificationLabel(property.verification_status)}
                  </Badge>
                </div>
                <p className="mb-3 text-sm text-slate-600">Landlord: {property.landlord_name}</p>
                {['pending', 'under_review'].includes(property.verification_status) && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => verifyProperty(property.id, 'verified')} className="btn-primary py-2.5 text-sm">Approve</button>
                    <button type="button" onClick={() => verifyProperty(property.id, 'rejected')} className="btn-danger py-2.5 text-sm">Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="p-3 font-medium">Listing</th>
                  <th className="p-3 font-medium">Landlord</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => (
                  <tr key={property.id} className="border-b border-slate-100">
                    <td className="p-3">
                      <p className="font-medium text-slate-900">{property.title}</p>
                      <p className="text-xs capitalize text-slate-500">{property.area} · {property.property_type}</p>
                      {property.rejection_reason && <p className="mt-1 text-xs text-red-600">{property.rejection_reason}</p>}
                    </td>
                    <td className="p-3 text-slate-600">{property.landlord_name}</td>
                    <td className="p-3">
                      <Badge type={statusType(property.verification_status)}>
                        {verificationLabel(property.verification_status)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {['pending', 'under_review'].includes(property.verification_status) && (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => verifyProperty(property.id, 'verified')} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white">Approve</button>
                          <button type="button" onClick={() => verifyProperty(property.id, 'rejected')} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
