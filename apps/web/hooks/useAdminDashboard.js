import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api, { openAuthenticatedDocument } from '../lib/api';

export function useAdminDashboard(authorized) {
  const [tab, setTab] = useState('Overview');
  const [landlords, setLandlords] = useState([]);
  const [students, setStudents] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedLandlord, setSelectedLandlord] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const load = () => {
    if (!authorized) return;
    Promise.all([
      api.get('/api/admin/landlords'),
      api.get('/api/admin/students'),
      api.get('/api/admin/disputes'),
      api.get('/api/admin/properties'),
      api.get('/api/admin/bookings'),
      api.get('/api/admin/users'),
      api.get('/api/admin/stats'),
      api.get('/api/admin/audit-logs'),
    ])
      .then(([lRes, sRes, dRes, pRes, bRes, uRes, stRes, aRes]) => {
        setLandlords(lRes.data.data.landlords);
        setStudents(sRes.data.data.students);
        setDisputes(dRes.data.data.disputes);
        setProperties(pRes.data.data.properties);
        setBookings(bRes.data.data.bookings);
        setUsers(uRes.data.data.users);
        setStats(stRes.data.data.stats);
        setLogs(aRes.data.data.logs);
      })
      .catch(() => toast.error('We could not load the review queue. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [authorized]);

  const openDoc = (url, title) => {
    openAuthenticatedDocument(url, { title: title || 'Document' }).catch((err) => {
      toast.error(err?.message || 'Could not open document');
    });
  };

  const verifyLandlord = async (userId, status) => {
    try {
      await api.put(`/api/admin/landlords/${userId}/verify`, { status });
      setLandlords(landlords.map((l) =>
        l.user_id === userId ? { ...l, verification_status: status } : l
      ));
      if (selectedLandlord?.user_id === userId) {
        setSelectedLandlord({ ...selectedLandlord, verification_status: status });
      }
      toast.success(status === 'verified' ? 'Landlord verified' : 'Landlord rejected');
    } catch (err) {
      toast.error(err.response?.data?.message || 'We could not complete that request. Please try again.');
    }
  };

  const verifyStudent = async (userId, status) => {
    try {
      await api.put(`/api/admin/students/${userId}/verify`, { status });
      setStudents(students.map((s) =>
        s.user_id === userId ? { ...s, verification_status: status } : s
      ));
      if (selectedStudent?.user_id === userId) {
        setSelectedStudent({ ...selectedStudent, verification_status: status });
      }
      toast.success(status === 'verified' ? 'Student verified' : 'Student rejected');
    } catch (err) {
      toast.error(err.response?.data?.message || 'We could not complete that request. Please try again.');
    }
  };

  const verifyProperty = async (id, status) => {
    try {
      await api.put(`/api/admin/properties/${id}/verify`, {
        status,
        rejection_reason: status === 'rejected' ? rejectReason : undefined,
      });
      toast.success(status === 'verified' ? 'Listing approved' : 'Listing rejected');
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'We could not complete that request. Please try again.');
    }
  };

  const resolveDispute = async (bookingId, resolution) => {
    try {
      await api.put(`/api/bookings/${bookingId}/resolve`, { resolution });
      setDisputes(disputes.filter((d) => d.booking_id !== bookingId));
      toast.success(resolution === 'refunded' ? 'Refunded to student' : 'Released to landlord');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'We could not resolve that issue. Please try again.');
    }
  };

  const protectedCount = stats?.escrow?.reduce((sum, row) => sum + Number(row.count), 0)
    || bookings.filter((b) => ['escrow_held', 'move_in_window', 'disputed'].includes(b.status)).length;
  const pendingLandlords = landlords.filter((l) => l.verification_status === 'pending').length;
  const pendingStudents = students.filter((s) => s.verification_status === 'pending').length;

  return {
    tab,
    setTab,
    landlords,
    students,
    disputes,
    properties,
    bookings,
    users,
    stats,
    logs,
    loading,
    rejectReason,
    setRejectReason,
    selectedLandlord,
    setSelectedLandlord,
    selectedStudent,
    setSelectedStudent,
    load,
    openDoc,
    verifyLandlord,
    verifyStudent,
    verifyProperty,
    resolveDispute,
    protectedCount,
    pendingLandlords,
    pendingStudents,
  };
}
