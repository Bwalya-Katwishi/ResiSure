import { AlertTriangle, CheckCircle } from 'lucide-react';
import EmptyState from '../../ui/EmptyState';
import { formatKwacha } from '../../../lib/bookingStatus';

export default function AdminDisputesTab({ disputes, resolveDispute }) {
  return (
    <div className="space-y-4">
      {disputes.length === 0 ? (
        <EmptyState icon={CheckCircle} title="No open issues." body="You're all caught up." />
      ) : disputes.map((dispute) => (
        <div key={dispute.id} className="card border-amber-100 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <h3 className="font-semibold text-slate-900">{dispute.property_title || 'Issue'}</h3>
              </div>
              <p className="mb-1 break-words text-sm text-slate-600"><span className="font-medium">Reason:</span> {dispute.reason}</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{formatKwacha(dispute.amount)}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => resolveDispute(dispute.booking_id, 'refunded')} className="btn-danger w-full py-2.5 text-sm">Refund student</button>
              <button type="button" onClick={() => resolveDispute(dispute.booking_id, 'released')} className="btn-primary w-full bg-green-600 py-2.5 text-sm hover:bg-green-700">Release to landlord</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
