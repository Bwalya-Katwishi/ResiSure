import { Plus } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import ProfileForm from '../../components/account/ProfileForm';
import DashboardSectionNav from '../../components/dashboard/DashboardSectionNav';
import LandlordStats from '../../components/dashboard/landlord/LandlordStats';
import LandlordVerificationPanel from '../../components/dashboard/landlord/LandlordVerificationPanel';
import LandlordListingsGrid from '../../components/dashboard/landlord/LandlordListingsGrid';
import LandlordListingForm from '../../components/dashboard/landlord/LandlordListingForm';
import LandlordPhotoUpload from '../../components/dashboard/landlord/LandlordPhotoUpload';
import LandlordReleasedFunds from '../../components/dashboard/landlord/LandlordReleasedFunds';
import LandlordBookingsList from '../../components/dashboard/landlord/LandlordBookingsList';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useLandlordDashboard } from '../../hooks/useLandlordDashboard';
import LandlordDashboardSkeleton from '../../components/dashboard/landlord/LandlordDashboardSkeleton';

export default function LandlordDashboard() {
  const { user, loading: authLoading, authorized } = useRequireAuth({ role: 'landlord' });
  const dashboard = useLandlordDashboard(authorized);

  if (authLoading || dashboard.loading) {
    return (
      <Layout>
        <LandlordDashboardSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div id="landlord-overview" className="dashboard-header">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700">Property management</p>
          <h1 className="page-heading mb-1">Landlord dashboard</h1>
          <p className="page-subheading">Manage your listings, bookings, verification documents, and profile.</p>
        </div>
        <button type="button" onClick={() => dashboard.openCreateForm(user?.verification_status)} className="btn-primary w-full shrink-0 sm:w-auto">
          <Plus size={16} />
          Add property
        </button>
      </div>

      <DashboardSectionNav
        ariaLabel="Landlord dashboard sections"
        items={[
          { id: 'landlord-overview', label: 'Overview' },
          { id: 'landlord-listings', label: 'My properties', badge: dashboard.listings.length },
          { id: 'landlord-booking-requests', label: 'Booking requests', badge: dashboard.pendingBookings.length },
          { id: 'landlord-active-bookings', label: 'Active bookings', badge: dashboard.activeBookings.length },
          { id: 'landlord-completed-bookings', label: 'Completed bookings' },
          { id: 'landlord-verification', label: 'Verification' },
          { id: 'landlord-profile', label: 'Profile' },
        ]}
      />

      <LandlordStats
        activeListings={dashboard.activeListings}
        listings={dashboard.listings}
        pendingBookings={dashboard.pendingBookings}
        protectedPayments={dashboard.protectedPayments}
        completedBookings={dashboard.completedBookings}
      />

      <LandlordVerificationPanel
        user={user}
        profile={dashboard.profile}
        verifyForm={dashboard.verifyForm}
        setVerifyForm={dashboard.setVerifyForm}
        verifyErrors={dashboard.verifyErrors}
        submittingVerify={dashboard.submittingVerify}
        uploadProgress={dashboard.uploadProgress}
        handleVerificationSubmit={dashboard.handleVerificationSubmit}
      />

      <LandlordListingsGrid
        listings={dashboard.listings}
        openCreateForm={() => dashboard.openCreateForm(user?.verification_status)}
        startEdit={dashboard.startEdit}
        openPhotoUpload={dashboard.openPhotoUpload}
        landlordVerified={user?.verification_status === 'verified'}
      />

      <LandlordListingForm
        showForm={dashboard.showForm}
        editingId={dashboard.editingId}
        formPanelRef={dashboard.formPanelRef}
        form={dashboard.form}
        setForm={dashboard.setForm}
        submitting={dashboard.submitting}
        handleCreateProperty={dashboard.handleCreateProperty}
        setShowForm={dashboard.setShowForm}
        locating={dashboard.locating}
        handleUseCurrentLocation={dashboard.handleUseCurrentLocation}
      />

      <LandlordPhotoUpload
        selectedProperty={dashboard.selectedProperty}
        photosPanelRef={dashboard.photosPanelRef}
        fileInputRef={dashboard.fileInputRef}
        previewImages={dashboard.previewImages}
        setPreviewImages={dashboard.setPreviewImages}
        handleFileSelect={dashboard.handleFileSelect}
        handleImageUpload={dashboard.handleImageUpload}
        handleDeleteImage={dashboard.handleDeleteImage}
        uploadingImages={dashboard.uploadingImages}
        setSelectedProperty={dashboard.setSelectedProperty}
      />

      <LandlordReleasedFunds released={dashboard.released} />

      <LandlordBookingsList
        pendingBookings={dashboard.pendingBookings}
        activeBookings={dashboard.activeBookings}
        completedBookings={dashboard.completedBookings}
      />

      <ProfileForm sectionId="landlord-profile" />
    </Layout>
  );
}
