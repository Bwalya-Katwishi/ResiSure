export default function DocumentStatusRow({ label, uploaded, accountStatus }) {
  let statusText = 'Not uploaded';
  let statusClass = 'bg-slate-100 text-slate-600';

  if (accountStatus === 'verified') {
    statusText = 'Verified';
    statusClass = 'bg-green-100 text-green-800';
  } else if (accountStatus === 'rejected' && uploaded) {
    statusText = 'Rejected — upload again';
    statusClass = 'bg-red-100 text-red-800';
  } else if (uploaded) {
    statusText = 'Uploaded — pending review';
    statusClass = 'bg-amber-100 text-amber-800';
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass}`}>{statusText}</span>
    </div>
  );
}
