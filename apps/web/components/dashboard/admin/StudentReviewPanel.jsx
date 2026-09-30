import Badge from '../../ui/Badge';
import AccountDetailPanel from './AccountDetailPanel';
import DocLink from './DocLink';
import { verificationLabel } from '../../../lib/bookingStatus';

export default function StudentReviewPanel({
  student,
  onClose,
  openDoc,
  verifyStudent,
}) {
  if (!student) return null;

  return (
    <AccountDetailPanel title="Review student" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-slate-900">{student.full_name}</p>
          <p className="text-sm text-slate-500">{student.email}</p>
          {student.phone && <p className="text-sm text-slate-500">{student.phone}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">NRC number</p>
          <p className="text-sm text-slate-900">{student.nrc_number || 'Not provided'}</p>
        </div>
        <div className="space-y-2 rounded-xl border border-slate-100 p-4">
          <p className="text-sm font-medium text-slate-900">Verification documents</p>
          <DocLink label="NRC document" url={student.nrc_doc_url} onOpen={openDoc} />
          <DocLink label="University confirmation slip (or equivalent)" url={student.university_slip_url} onOpen={openDoc} />
        </div>
        <Badge type={
          student.verification_status === 'verified' ? 'verified'
            : student.verification_status === 'rejected' ? 'rejected' : 'pending'
        }>
          {verificationLabel(student.verification_status)}
        </Badge>
        {student.verification_status === 'pending' && (
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => verifyStudent(student.user_id, 'verified')}
              className="btn-primary flex-1 bg-green-600 hover:bg-green-700"
            >
              Verify student
            </button>
            <button
              type="button"
              onClick={() => verifyStudent(student.user_id, 'rejected')}
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
