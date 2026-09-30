import Badge from '../../ui/Badge';
import AccountDetailPanel from './AccountDetailPanel';
import DocLink from './DocLink';
import { verificationLabel } from '../../../lib/bookingStatus';

export default function LandlordReviewPanel({
  landlord,
  onClose,
  openDoc,
  verifyLandlord,
}) {
  if (!landlord) return null;

  return (
    <AccountDetailPanel title="Review landlord" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-slate-900">{landlord.full_name}</p>
          <p className="text-sm text-slate-500">{landlord.email}</p>
          {landlord.phone && <p className="text-sm text-slate-500">{landlord.phone}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">NRC number</p>
          <p className="text-sm text-slate-900">{landlord.nrc_number || 'Not provided'}</p>
        </div>
        <div className="space-y-2 rounded-xl border border-slate-100 p-4">
          <p className="text-sm font-medium text-slate-900">Verification documents</p>
          <DocLink label="NRC document" url={landlord.nrc_doc_url} onOpen={openDoc} />
          <DocLink label="Land title / ownership document" url={landlord.land_doc_url} onOpen={openDoc} />
        </div>
        <Badge type={
          landlord.verification_status === 'verified' ? 'verified'
            : landlord.verification_status === 'rejected' ? 'rejected' : 'pending'
        }>
          {verificationLabel(landlord.verification_status)}
        </Badge>
        {landlord.verification_status === 'pending' && (
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => verifyLandlord(landlord.user_id, 'verified')}
              className="btn-primary flex-1 bg-green-600 hover:bg-green-700"
            >
              Verify landlord
            </button>
            <button
              type="button"
              onClick={() => verifyLandlord(landlord.user_id, 'rejected')}
              className="btn-danger flex-1"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </AccountDetailPanel>
  );
}
