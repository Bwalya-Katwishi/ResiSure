import { Users } from 'lucide-react';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import { verificationLabel } from '../../../lib/bookingStatus';

function statusType(status) {
  if (status === 'verified') return 'verified';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

export default function AdminLandlordsTab({ landlords, onSelectLandlord }) {
  if (landlords.length === 0) {
    return <EmptyState icon={Users} title="No landlords to review." body="New landlord documents will appear here." />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {landlords.map((landlord) => (
          <button
            key={landlord.user_id}
            type="button"
            onClick={() => onSelectLandlord(landlord)}
            className="card w-full p-4 text-left transition-shadow hover:shadow-lift"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{landlord.full_name}</p>
                <p className="truncate text-sm text-slate-500">{landlord.email}</p>
              </div>
              <Badge type={statusType(landlord.verification_status)}>
                {verificationLabel(landlord.verification_status)}
              </Badge>
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              <p>NRC: {landlord.nrc_number || '—'}</p>
              <p className="text-xs text-slate-500">
                {landlord.has_nrc_doc ? 'NRC ✓' : 'NRC —'}
                {' · '}
                {landlord.has_land_doc ? 'Land doc ✓' : 'Land doc —'}
              </p>
            </div>
            <p className="mt-3 text-sm font-medium text-blue-700">Review documents</p>
          </button>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="p-3 font-medium">Landlord</th>
              <th className="p-3 font-medium">NRC</th>
              <th className="p-3 font-medium">Documents</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {landlords.map((landlord) => (
              <tr
                key={landlord.user_id}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                onClick={() => onSelectLandlord(landlord)}
              >
                <td className="p-3">
                  <p className="font-medium text-slate-900">{landlord.full_name}</p>
                  <p className="text-xs text-slate-500">{landlord.email}</p>
                  <p className="mt-1 text-xs text-blue-700">Click to review</p>
                </td>
                <td className="p-3 text-slate-600">{landlord.nrc_number || '—'}</td>
                <td className="p-3 text-xs text-slate-500">
                  {landlord.has_nrc_doc ? 'NRC ✓' : 'NRC —'}
                  {' · '}
                  {landlord.has_land_doc ? 'Land doc ✓' : 'Land doc —'}
                </td>
                <td className="p-3">
                  <Badge type={statusType(landlord.verification_status)}>
                    {verificationLabel(landlord.verification_status)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
