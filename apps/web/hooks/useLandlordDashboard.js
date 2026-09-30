import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import {
  getMyListings, getLandlordBookings, createProperty, updateProperty, uploadPropertyImages,
  deletePropertyImage, submitLandlordVerification, getLandlordProfile, submitPropertyForReview,
  getLandlordReleased,
} from '../lib/api';
import { getImageId } from '../lib/images';
import { getActionableError, getApiErrorMessage } from '../lib/userFeedback';
import { validateVerificationFile } from '../lib/verificationUpload';
import { scrollToSection } from '../lib/scrollToSection';
import { useRefetchOnFocus } from '../lib/useRefetchOnFocus';
import { validateNrcNumber } from '@resisure/shared';
import { validateListingAccommodation } from '../lib/propertyAccommodation';

const EMPTY_FORM = {
  title: '', description: '', address: '', area: '', rent_per_month: '', total_rooms: 1,
  property_type: 'room', amenities: [], latitude: null, longitude: null,
  accommodation_gender: '', female_rooms_available: '', male_rooms_available: '',
};

export function useLandlordDashboard(authorized) {
  const router = useRouter();
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [released, setReleased] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const fileInputRef = useRef(null);
  const formPanelRef = useRef(null);
  const photosPanelRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [locating, setLocating] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ nrc_number: '', nrc_document: null, land_document: null });
  const [profile, setProfile] = useState(null);
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [verifyErrors, setVerifyErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    if (!authorized) return;
    if (!silent) setLoading(true);
    try {
      const [listRes, bookRes, profileRes, releasedRes] = await Promise.all([
        getMyListings(),
        getLandlordBookings(),
        getLandlordProfile().catch(() => null),
        getLandlordReleased().catch(() => ({ data: { data: { transactions: [] } } })),
      ]);
      setListings(listRes.data.data.properties);
      setBookings(bookRes.data.data.bookings);
      setReleased(releasedRes.data.data.transactions || []);
      if (profileRes?.data?.data?.profile) {
        setProfile(profileRes.data.data.profile);
        setVerifyForm((prev) => ({
          ...prev,
          nrc_number: profileRes.data.data.profile.nrc_number || '',
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [authorized]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useRefetchOnFocus(() => loadDashboard({ silent: true }), authorized);

  useEffect(() => {
    if (!router.isReady || loading) return;
    const hash = router.asPath.split('#')[1];
    if (hash) window.requestAnimationFrame(() => scrollToSection(hash));
    const editId = router.query.edit;
    if (editId && listings.length) {
      const listing = listings.find((item) => item.id === editId);
      if (listing) {
        setEditingId(listing.id);
        setShowForm(true);
        setSelectedProperty(null);
        setForm({
          title: listing.title || '',
          description: listing.description || '',
          address: listing.address || '',
          area: listing.area || '',
          rent_per_month: listing.rent_per_month || '',
          total_rooms: listing.total_rooms || 1,
          property_type: listing.property_type || 'room',
          amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
          latitude: listing.latitude ?? null,
          longitude: listing.longitude ?? null,
        });
        window.requestAnimationFrame(() => scrollToSection('landlord-listing-form', { focusSelector: 'input, textarea, select' }));
      }
    }
  }, [router.isReady, router.asPath, router.query.edit, listings, loading]);

  const scrollToForm = () => {
    window.requestAnimationFrame(() => scrollToSection('landlord-listing-form', { focusSelector: 'input, textarea, select' }));
  };

  const scrollToPhotos = () => {
    window.requestAnimationFrame(() => scrollToSection('landlord-photos', { focusSelector: 'input[type="file"], button' }));
  };

  const openCreateForm = (verificationStatus) => {
    if (verificationStatus && verificationStatus !== 'verified') {
      toast.error('Your landlord account must be verified before you can create listings.');
      scrollToSection('landlord-verification');
      return;
    }
    setShowForm(true);
    setSelectedProperty(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
    scrollToForm();
  };

  const startEdit = (listing) => {
    setEditingId(listing.id);
    setShowForm(true);
    setSelectedProperty(null);
    setForm({
      title: listing.title || '',
      description: listing.description || '',
      address: listing.address || '',
      area: listing.area || '',
      rent_per_month: listing.rent_per_month || '',
      total_rooms: listing.total_rooms || 1,
      property_type: listing.property_type || 'room',
      amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
      latitude: listing.latitude ?? null,
      longitude: listing.longitude ?? null,
      accommodation_gender: listing.accommodation_gender || '',
      female_rooms_available: listing.female_rooms_available ?? '',
      male_rooms_available: listing.male_rooms_available ?? '',
    });
    scrollToForm();
  };

  const openPhotoUpload = (listing) => {
    setSelectedProperty(listing);
    setShowForm(false);
    setEditingId(null);
    scrollToPhotos();
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Your browser does not support location services');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        toast.success('Live location captured');
        setLocating(false);
      },
      (error) => {
        toast.error(error.message || 'Could not get your location. Check browser permissions.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    const accommodationError = validateListingAccommodation(form);
    if (accommodationError) {
      toast.error(accommodationError);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        rent_per_month: Number(form.rent_per_month),
        total_rooms: Number(form.total_rooms),
        female_rooms_available: form.accommodation_gender === 'both'
          ? parseInt(form.female_rooms_available, 10)
          : undefined,
        male_rooms_available: form.accommodation_gender === 'both'
          ? parseInt(form.male_rooms_available, 10)
          : undefined,
      };
      if (editingId) {
        const res = await updateProperty(editingId, payload);
        setListings(listings.map((item) => item.id === editingId ? { ...item, ...res.data.data.property } : item));
        toast.success(res.data.message || 'Listing updated successfully.');
        setShowForm(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        scrollToSection('landlord-listings');
        return;
      }
      const res = await createProperty(payload);
      const newProperty = res.data.data.property;
      setListings([{ ...newProperty, images: [] }, ...listings]);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      toast.success(res.data.message || 'Listing published successfully. It is now visible to students and awaiting listing verification.');
      setSelectedProperty({ ...newProperty, images: [] });
      await loadDashboard({ silent: true });
      scrollToSection('landlord-photos');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'We could not save your listing. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const existingCount = Array.isArray(selectedProperty?.images) ? selectedProperty.images.length : 0;
    const valid = [];
    for (const file of files) {
      if (!allowed.includes(file.type)) {
        toast.error(`${file.name} is not a JPG, PNG or WebP image`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB`);
        continue;
      }
      valid.push(file);
    }
    if (existingCount + valid.length > 5) {
      toast.error(`You can only have 5 photos per property. ${existingCount} already uploaded.`);
      valid.splice(Math.max(0, 5 - existingCount));
    }
    setPreviewImages(valid.map((file) => ({ file, url: URL.createObjectURL(file), name: file.name })));
  };

  const handleImageUpload = async () => {
    if (!previewImages.length || !selectedProperty) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      previewImages.forEach((p) => formData.append('images', p.file));
      const res = await uploadPropertyImages(selectedProperty.id, formData);
      const updatedProperty = { ...selectedProperty, images: res.data.data.images };
      setSelectedProperty(updatedProperty);
      setListings(listings.map((l) => l.id === selectedProperty.id ? updatedProperty : l));
      setPreviewImages([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(res.data.message || 'Photos uploaded successfully.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'We could not upload your photos. Please try again.'));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteImage = async (image) => {
    if (!selectedProperty) return;
    const imageId = getImageId(image);
    if (!imageId) {
      toast.error('This photo cannot be deleted from here');
      return;
    }
    try {
      await deletePropertyImage(selectedProperty.id, imageId);
      const remaining = (selectedProperty.images || []).filter((img) => getImageId(img) !== imageId);
      const updatedProperty = { ...selectedProperty, images: remaining };
      setSelectedProperty(updatedProperty);
      setListings(listings.map((listing) => listing.id === selectedProperty.id ? updatedProperty : listing));
      toast.success('Photo deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'We could not delete that photo. Please try again.'));
    }
  };

  const handleSubmitReview = async (listing) => {
    try {
      const res = await submitPropertyForReview(listing.id);
      setListings(listings.map((item) => item.id === listing.id ? { ...item, ...res.data.data.property } : item));
      toast.success('Submitted for admin review');
    } catch (err) {
      const info = getActionableError(err, 'Could not submit listing');
      toast.error(info.message);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    const nrcError = validateNrcNumber(verifyForm.nrc_number);
    if (nrcError) {
      nextErrors.nrc_number = nrcError;
    }
    const nrcFileError = validateVerificationFile(verifyForm.nrc_document, 'NRC document');
    if (nrcFileError) nextErrors.nrc_document = nrcFileError;
    const landError = validateVerificationFile(verifyForm.land_document, 'Title deed document');
    if (landError) nextErrors.land_document = landError;

    if (Object.keys(nextErrors).length) {
      setVerifyErrors(nextErrors);
      toast.error('Please fix the highlighted document issues before submitting.');
      return;
    }

    setVerifyErrors({});
    setSubmittingVerify(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append('nrc_number', verifyForm.nrc_number.trim());
      formData.append('nrc_document', verifyForm.nrc_document);
      formData.append('land_document', verifyForm.land_document);
      const res = await submitLandlordVerification(formData, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.min(99, Math.round((event.loaded * 100) / event.total)));
        },
      });
      setUploadProgress(100);
      setProfile(res.data.data.profile);
      setVerifyForm((prev) => ({ ...prev, nrc_document: null, land_document: null }));
      toast.success(res.data.message || 'Verification documents submitted successfully. We will notify you when review is complete.');
      await loadDashboard({ silent: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'We could not submit your documents. Please try again.'));
    } finally {
      setSubmittingVerify(false);
      setUploadProgress(0);
    }
  };

  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const activeBookings = bookings.filter((b) =>
    ['accepted', 'escrow_held', 'move_in_window', 'disputed'].includes(b.status)
  );
  const protectedPayments = bookings.filter((b) => ['escrow_held', 'move_in_window', 'disputed'].includes(b.status));
  const completedBookings = bookings.filter((b) =>
    ['completed', 'confirmed', 'timed_out', 'rejected', 'cancelled', 'refunded'].includes(b.status)
  );
  const activeListings = listings.filter((l) => l.status !== 'unlisted');

  return {
    loading,
    listings,
    bookings,
    released,
    editingId,
    showForm,
    submitting,
    selectedProperty,
    uploadingImages,
    previewImages,
    setPreviewImages,
    fileInputRef,
    formPanelRef,
    photosPanelRef,
    form,
    setForm,
    locating,
    verifyForm,
    setVerifyForm,
    profile,
    submittingVerify,
    verifyErrors,
    uploadProgress,
    pendingBookings,
    activeBookings,
    protectedPayments,
    completedBookings,
    activeListings,
    openCreateForm,
    startEdit,
    openPhotoUpload,
    handleUseCurrentLocation,
    handleCreateProperty,
    handleFileSelect,
    handleImageUpload,
    handleDeleteImage,
    handleSubmitReview,
    handleVerificationSubmit,
    setShowForm,
    setSelectedProperty,
  };
}
