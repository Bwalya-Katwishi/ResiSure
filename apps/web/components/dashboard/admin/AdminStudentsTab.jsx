import { GraduationCap } from 'lucide-react';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import { verificationLabel } from '../../../lib/bookingStatus';

function statusType(status) {
  if (status === 'verified') return 'verified';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

export default function AdminStudentsTab({ students, onSelectStudent }) {
  if (students.length === 0) {
    return <EmptyState icon={GraduationCap} title="No students to review." body="Student verification documents will appear here." />;
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {students.map((student) => (
          <button
            key={student.user_id}
            type="button"
            onClick={() => onSelectStudent(student)}
            className="card w-full p-4 text-left transition-shadow hover:shadow-lift"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{student.full_name}</p>
                <p className="truncate text-sm text-slate-500">{student.email}</p>
              </div>
              <Badge type={statusType(student.verification_status)}>
                {verificationLabel(student.verification_status)}
              </Badge>
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              <p>NRC: {student.nrc_number || '—'}</p>
              <p className="text-xs text-slate-500">
                {student.has_nrc_doc ? 'NRC ✓' : 'NRC —'}
                {' · '}
                {student.has_university_slip ? 'Confirmation slip ✓' : 'Slip —'}
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
              <th className="p-3 font-medium">Student</th>
              <th className="p-3 font-medium">NRC</th>
              <th className="p-3 font-medium">Documents</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                key={student.user_id}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                onClick={() => onSelectStudent(student)}
              >
                <td className="p-3">
                  <p className="font-medium text-slate-900">{student.full_name}</p>
                  <p className="text-xs text-slate-500">{student.email}</p>
                  <p className="mt-1 text-xs text-blue-700">Click to review</p>
                </td>
                <td className="p-3 text-slate-600">{student.nrc_number || '—'}</td>
                <td className="p-3 text-xs text-slate-500">
                  {student.has_nrc_doc ? 'NRC ✓' : 'NRC —'}
                  {' · '}
                  {student.has_university_slip ? 'Confirmation slip ✓' : 'Slip —'}
                </td>
                <td className="p-3">
                  <Badge type={statusType(student.verification_status)}>
                    {verificationLabel(student.verification_status)}
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
