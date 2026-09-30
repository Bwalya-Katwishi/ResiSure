import { formatKwacha } from '../../../lib/bookingStatus';

export default function LandlordReleasedFunds({ released }) {
  if (!released.length) return null;

  return (
    <div className="mb-10">
      <h2 className="mb-4 text-xl font-bold text-slate-900">Payments</h2>
      <div className="card divide-y divide-slate-100">
        {released.map((tx) => (
          <div key={tx.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{tx.property_title}</p>
              <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString()}</p>
            </div>
            <p className="text-sm font-bold text-green-700">{formatKwacha(tx.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
