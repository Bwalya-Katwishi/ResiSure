import { ScrollText } from 'lucide-react';

export default function AdminAuditTab({ logs }) {
  if (logs.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-center text-slate-400">
        <ScrollText size={16} /> No review events yet
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {logs.map((log) => (
          <div key={log.id} className="card p-4">
            <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</p>
            <p className="mt-1 font-medium text-slate-900">{log.action}</p>
            <p className="mt-1 text-sm text-slate-600">{log.actor_name || 'System'}</p>
            <p className="mt-1 text-xs capitalize text-slate-500">{log.entity_type}</p>
          </div>
        ))}
      </div>

      <div className="card hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="p-3 font-medium">Time</th>
              <th className="p-3 font-medium">Actor</th>
              <th className="p-3 font-medium">Action</th>
              <th className="p-3 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-50">
                <td className="whitespace-nowrap p-3 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-3">{log.actor_name || 'System'}</td>
                <td className="p-3 font-medium">{log.action}</td>
                <td className="p-3 text-slate-500">{log.entity_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
