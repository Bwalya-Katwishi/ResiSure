import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from '@resisure/shared/api/endpoints';

const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: apiUrl,
  timeout: 20000,
});

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('resisure_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data && typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/api/auth/login')
        || error.config?.url?.includes('/api/auth/register');
      if (!isAuthRoute && onUnauthorized) {
        await onUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);

export const registerUser = (data) => api.post(API.auth.register, data);
export const loginUser = (data) => api.post(API.auth.login, data);
export const forgotPassword = (email) => api.post(API.auth.forgotPassword, { email });
export const resetPassword = (data) => api.post(API.auth.resetPassword, data);
export const getMe = () => api.get(API.auth.me);
export const updateMe = (data) => api.patch(API.auth.me, data);

export const getProperties = (params = {}) => api.get(API.properties.list, { params });
export const getProperty = (id) => api.get(API.properties.one(id));
export const createProperty = (data) => api.post(API.properties.list, data);
export const updateProperty = (id, data) => api.put(API.properties.one(id), data);
export const submitPropertyForReview = (id) => api.put(API.properties.submitReview(id));
export const deleteProperty = (id) => api.delete(API.properties.one(id));
export const getMyListings = () => api.get(API.properties.mine);
export const uploadPropertyImages = (id, formData) => api.post(API.properties.images(id), formData);
export const deletePropertyImage = (id, imageId) => api.delete(API.properties.image(id, imageId));

export const getFavorites = () => api.get(API.favorites.list);
export const addFavorite = (propertyId) => api.post(API.favorites.add, { property_id: propertyId });
export const removeFavorite = (propertyId) => api.delete(API.favorites.remove(propertyId));

export const createBooking = (data) => api.post(API.bookings.create, data);
export const getMyBookings = () => api.get(API.bookings.mine);
export const getMyTransactions = () => api.get(API.bookings.myTransactions);
export const getLandlordBookings = () => api.get(API.bookings.landlord);
export const getLandlordReleased = () => api.get(API.bookings.landlordReleased);
export const getBooking = (id) => api.get(API.bookings.one(id));
export const acceptBooking = (id) => api.put(API.bookings.accept(id));
export const rejectBooking = (id) => api.put(API.bookings.reject(id));
export const payBooking = (id, data) => api.put(API.bookings.pay(id), data);
export const completePendingPayment = (id, data) => api.put(API.bookings.completePendingPayment(id), data);
export const getPaymentMethods = () => api.get(API.payments.methods);
export const getBookingPaymentStatus = (bookingId) => api.get(API.payments.bookingStatus(bookingId));
export const reconcileBookingPayment = (bookingId) => api.post(API.payments.reconcile(bookingId));
export const cancelBooking = (id) => api.put(API.bookings.cancel(id));
export const confirmMoveIn = (id) => api.put(API.bookings.confirm(id));
export const raiseDispute = (id, reason) => api.put(API.bookings.dispute(id), { reason });
export const resolveDispute = (id, resolution) => api.put(API.bookings.resolve(id), { resolution });

export const getLandlordProfile = () => api.get(API.landlords.me);
export const submitLandlordVerification = (formData) => api.post(API.landlords.verification, formData);

export const getNotifications = () => api.get(API.notifications.list);
export const markNotificationRead = (id) => api.put(API.notifications.read(id));
export const markAllNotificationsRead = () => api.put(API.notifications.readAll);

export const getAdminStats = () => api.get(API.admin.stats);
export const getAdminProperties = () => api.get(API.admin.properties);
export const getAdminLandlords = () => api.get(API.admin.landlords);
export const getAdminDisputes = () => api.get(API.admin.disputes);
export const getAdminBookings = () => api.get(API.admin.bookings);
export const getAdminAuditLogs = (params = {}) => api.get(API.admin.auditLogs, { params });
export const verifyAdminProperty = (id, data) => api.put(API.admin.verifyProperty(id), data);
export const verifyAdminLandlord = (userId, status) =>
  api.put(API.admin.verifyLandlord(userId), { status });

export default api;
