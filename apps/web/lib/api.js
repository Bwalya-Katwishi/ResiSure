import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('resisure_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auth
export const registerUser = (data) => api.post('/api/auth/register', data);
export const loginUser = (data) => api.post('/api/auth/login', data);
export const getMe = () => api.get('/api/auth/me');

// Properties
export const getProperties = (filters = {}) => api.get('/api/properties', { params: filters });
export const getProperty = (id) => api.get(`/api/properties/${id}`);
export const createProperty = (data) => api.post('/api/properties', data);
export const updateProperty = (id, data) => api.put(`/api/properties/${id}`, data);
export const deleteProperty = (id) => api.delete(`/api/properties/${id}`);
export const getMyListings = () => api.get('/api/properties/my/listings');

// Bookings
export const createBooking = (data) => api.post('/api/bookings', data);
export const getMyBookings = () => api.get('/api/bookings/my');
export const getLandlordBookings = () => api.get('/api/bookings/landlord');
export const getBooking = (id) => api.get(`/api/bookings/${id}`);
export const acceptBooking = (id) => api.put(`/api/bookings/${id}/accept`);
export const rejectBooking = (id) => api.put(`/api/bookings/${id}/reject`);
export const payBooking = (id) => api.put(`/api/bookings/${id}/pay`);
export const confirmMoveIn = (id) => api.put(`/api/bookings/${id}/confirm`);
export const raiseDispute = (id, reason) => api.put(`/api/bookings/${id}/dispute`, { reason });
export const resolveDispute = (id, resolution) => api.put(`/api/bookings/${id}/resolve`, { resolution });

export default api;