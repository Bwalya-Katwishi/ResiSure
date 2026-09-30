import axios from 'axios';
import { showDocumentViewer } from './documentViewerRegistry';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
});

let onUnauthorized = null;

/** Register a callback for expired/invalid sessions (set from AuthContext). */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('resisure_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const url = error.config?.url || '';
      const isAuthRoute = url.includes('/api/auth/login') || url.includes('/api/auth/register');
      const isVerificationDoc = url.includes('/verification/document') || url.includes('/verification-document');
      if (!isAuthRoute && !isVerificationDoc && onUnauthorized) {
        onUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const registerUser = (data) => api.post('/api/auth/register', data);
export const loginUser = (data) => api.post('/api/auth/login', data);
export const forgotPassword = (email) => api.post('/api/auth/forgot-password', { email });
export const resetPassword = (data) => api.post('/api/auth/reset-password', data);
export const getMe = () => api.get('/api/auth/me');
export const updateMe = (data) => api.patch('/api/auth/me', data);
export const uploadProfilePhoto = (formData) => api.post('/api/auth/me/photo', formData);

// Properties
export const getProperties = (filters = {}) => api.get('/api/properties', { params: filters });
export const getProperty = (id) => api.get(`/api/properties/${id}`);
export const createProperty = (data) => api.post('/api/properties', data);
export const updateProperty = (id, data) => api.put(`/api/properties/${id}`, data);
export const submitPropertyForReview = (id) => api.put(`/api/properties/${id}/submit-review`);
export const deleteProperty = (id) => api.delete(`/api/properties/${id}`);
export const getMyListings = () => api.get('/api/properties/my/listings');
export const uploadPropertyImages = (id, formData) =>
  api.post(`/api/properties/${id}/images`, formData);
export const deletePropertyImage = (id, imageId) =>
  api.delete(`/api/properties/${id}/images/${imageId}`);

// Bookings
export const createBooking = (data) => api.post('/api/bookings', data);
export const getMyBookings = () => api.get('/api/bookings/my');
export const getMyTransactions = () => api.get('/api/bookings/my/transactions');
export const getLandlordBookings = () => api.get('/api/bookings/landlord');
export const getLandlordReleased = () => api.get('/api/bookings/landlord/released');
export const getBooking = (id) => api.get(`/api/bookings/${id}`);
export const acceptBooking = (id) => api.put(`/api/bookings/${id}/accept`);
export const rejectBooking = (id) => api.put(`/api/bookings/${id}/reject`);
export const payBooking = (id, data) => api.put(`/api/bookings/${id}/pay`, data);
export const completePendingPayment = (id, data) => api.put(`/api/bookings/${id}/complete-pending-payment`, data);
export const cancelBooking = (id) => api.put(`/api/bookings/${id}/cancel`);
export const confirmMoveIn = (id) => api.put(`/api/bookings/${id}/confirm`);
export const raiseDispute = (id, reason) => api.put(`/api/bookings/${id}/dispute`, { reason });
export const resolveDispute = (id, resolution) => api.put(`/api/bookings/${id}/resolve`, { resolution });

// Landlord verification
export const getLandlordProfile = () => api.get('/api/landlords/me');
export const submitLandlordVerification = (formData, config = {}) =>
  api.post('/api/landlords/me/verification', formData, config);

// Student verification
export const getStudentProfile = () => api.get('/api/students/me');
export const submitStudentVerification = (formData) =>
  api.post('/api/students/me/verification', formData);

function filenameFromPath(pathOrUrl) {
  if (!pathOrUrl) return 'document';
  try {
    const type = new URL(pathOrUrl, 'http://local').searchParams.get('type');
    if (type) return `${type}-document`;
  } catch {
    /* ignore */
  }
  return 'document';
}

function resolveDocumentRequestUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (api.defaults.baseURL || '').replace(/\/$/, '');
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}

async function parseApiErrorMessage(response) {
  let message = 'Could not open document';
  try {
    const clone = response.clone();
    const contentType = clone.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await clone.json();
      return body.message || body.error || message;
    }
    const text = (await clone.text()).trim();
    if (text.startsWith('{')) {
      const body = JSON.parse(text);
      return body.message || body.error || message;
    }
    if (text) return text.slice(0, 200);
  } catch {
    /* ignore */
  }
  return message;
}

async function normalizeDocumentBlob(blob, filename) {
  if (!blob || blob.size === 0) {
    throw new Error('Document file is empty or missing on the server.');
  }
  const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  const startsWithPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
  const isJson = head[0] === 0x7b; // {
  if (isJson) {
    const text = await blob.text();
    try {
      const body = JSON.parse(text);
      throw new Error(body.message || body.error || 'Could not open document');
    } catch (err) {
      if (err instanceof Error && err.message !== 'Could not open document') throw err;
      throw new Error('Could not open document');
    }
  }
  let type = blob.type || 'application/octet-stream';
  if (startsWithPdf && !type.includes('pdf')) {
    type = 'application/pdf';
  } else if (/\.(jpe?g|png|webp)$/i.test(filename) && !type.startsWith('image/')) {
    type = 'image/jpeg';
  }
  if (type === blob.type) return blob;
  return new Blob([await blob.arrayBuffer()], { type });
}

/** Open an authenticated API document (Bearer token) in the in-app viewer or a new tab */
export async function openAuthenticatedDocument(pathOrUrl, { title } = {}) {
  if (!pathOrUrl) return;
  if (/^https?:\/\//i.test(pathOrUrl) && !pathOrUrl.includes('/api/')) {
    window.open(pathOrUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  const url = resolveDocumentRequestUrl(pathOrUrl);
  const token = typeof window !== 'undefined' ? localStorage.getItem('resisure_token') : null;
  const response = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(await parseApiErrorMessage(response));
  }

  const rawBlob = await response.blob();
  const filename = filenameFromPath(pathOrUrl);
  const blob = await normalizeDocumentBlob(rawBlob, filename);
  const contentType = response.headers.get('content-type') || blob.type || 'application/octet-stream';
  const displayTitle = title || filename.replace(/-/g, ' ');

  if (showDocumentViewer({
    blob,
    contentType,
    title: displayTitle,
    filename,
  })) {
    return;
  }

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export const getPaymentMethods = () => api.get('/api/payments/methods');
export const getBookingPaymentStatus = (bookingId) =>
  api.get(`/api/payments/bookings/${bookingId}/status`);
export const reconcileBookingPayment = (bookingId) =>
  api.post(`/api/payments/bookings/${bookingId}/reconcile`);

// Favorites (students)
export const getFavorites = () => api.get('/api/favorites');
export const addFavorite = (propertyId) => api.post('/api/favorites', { property_id: propertyId });
export const removeFavorite = (propertyId) => api.delete(`/api/favorites/${propertyId}`);

// Admin
export const getAdminStats = () => api.get('/api/admin/stats');
export const getAdminProperties = () => api.get('/api/admin/properties');
export const getAdminLandlords = () => api.get('/api/admin/landlords');
export const getAdminDisputes = () => api.get('/api/admin/disputes');
export const getAdminBookings = () => api.get('/api/admin/bookings');
export const getAdminAuditLogs = (params = {}) => api.get('/api/admin/audit-logs', { params });
export const verifyAdminProperty = (id, data) => api.put(`/api/admin/properties/${id}/verify`, data);
export const verifyAdminLandlord = (userId, status) =>
  api.put(`/api/admin/landlords/${userId}/verify`, { status });
export const getAdminStudents = () => api.get('/api/admin/students');
export const getAdminLandlord = (userId) => api.get(`/api/admin/landlords/${userId}`);
export const getAdminStudent = (userId) => api.get(`/api/admin/students/${userId}`);
export const verifyAdminStudent = (userId, status) =>
  api.put(`/api/admin/students/${userId}/verify`, { status });

// Notifications
export const getNotifications = () => api.get('/api/notifications');
export const markNotificationRead = (id) => api.put(`/api/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/api/notifications/read-all');

export default api;