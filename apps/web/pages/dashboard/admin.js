import Layout from '../../components/layout/Layout';
import { Skeleton } from '../../components/ui/Skeleton';
import AdminTabNav from '../../components/dashboard/admin/AdminTabNav';
import AdminOverviewTab from '../../components/dashboard/admin/AdminOverviewTab';
import AdminLandlordsTab from '../../components/dashboard/admin/AdminLandlordsTab';
import AdminStudentsTab from '../../components/dashboard/admin/AdminStudentsTab';
import AdminPropertiesTab from '../../components/dashboard/admin/AdminPropertiesTab';
import AdminBookingsTab from '../../components/dashboard/admin/AdminBookingsTab';
import AdminDisputesTab from '../../components/dashboard/admin/AdminDisputesTab';
import AdminAuditTab from '../../components/dashboard/admin/AdminAuditTab';
import LandlordReviewPanel from '../../components/dashboard/admin/LandlordReviewPanel';
import StudentReviewPanel from '../../components/dashboard/admin/StudentReviewPanel';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';

export default function AdminDashboard() {
  const { loading: authLoading, authorized } = useRequireAuth({ role: 'admin' });
  const {
    tab,
    setTab,
    landlords,
    students,
    disputes,
    properties,
    bookings,
    users,
    logs,
    loading,
    rejectReason,
    setRejectReason,
    selectedLandlord,
    setSelectedLandlord,
    selectedStudent,
    setSelectedStudent,
    openDoc,
    verifyLandlord,
    verifyStudent,
    verifyProperty,
    resolveDispute,
    protectedCount,
    pendingLandlords,
    pendingStudents,
  } = useAdminDashboard(authorized);

  if (authLoading || loading) {
    return (
      <Layout>
        <Skeleton className="mb-6 h-8 w-56" />
        <div className="hide-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5, 6, 7].map((key) => <Skeleton key={key} className="h-10 w-24 shrink-0" />)}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-24" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="page-heading mb-1">Admin dashboard</h1>
        <p className="page-subheading">Review landlord and student accounts, listings, bookings, and issues.</p>
      </div>

      <AdminTabNav
        tab={tab}
        setTab={setTab}
        pendingLandlords={pendingLandlords}
        pendingStudents={pendingStudents}
      />

      {tab === 'Overview' && (
        <AdminOverviewTab
          users={users}
          properties={properties}
          bookings={bookings}
          disputes={disputes}
          protectedCount={protectedCount}
          pendingLandlords={pendingLandlords}
          pendingStudents={pendingStudents}
        />
      )}

      {tab === 'Landlords' && (
        <AdminLandlordsTab
          landlords={landlords}
          onSelectLandlord={setSelectedLandlord}
        />
      )}

      {tab === 'Students' && (
        <AdminStudentsTab
          students={students}
          onSelectStudent={setSelectedStudent}
        />
      )}

      {tab === 'Properties' && (
        <AdminPropertiesTab
          properties={properties}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          verifyProperty={verifyProperty}
        />
      )}

      {tab === 'Bookings' && <AdminBookingsTab bookings={bookings} />}

      {tab === 'Disputes' && (
        <AdminDisputesTab disputes={disputes} resolveDispute={resolveDispute} />
      )}

      {tab === 'Audit' && <AdminAuditTab logs={logs} />}

      <LandlordReviewPanel
        landlord={selectedLandlord}
        onClose={() => setSelectedLandlord(null)}
        openDoc={openDoc}
        verifyLandlord={verifyLandlord}
      />

      <StudentReviewPanel
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        openDoc={openDoc}
        verifyStudent={verifyStudent}
      />
    </Layout>
  );
}
