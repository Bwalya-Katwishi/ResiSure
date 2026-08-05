import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import Layout from '../../components/layout/Layout';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Shield, Users, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [landlords, setLandlords] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
    if (!authLoading && user?.role !== 'admin') router.push('/');
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === 'admin') {
      Promise.all([
        api.get('/api/admin/landlords'),
        api.get('/api/admin/disputes'),
      ])
        .then(([lRes, dRes]) => {
          setLandlords(lRes.data.data.landlords);
          setDisputes(dRes.data.data.disputes);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const verifyLandlord = async (userId, status) => {
    try {
      await api.put(`/api/admin/landlords/${userId}/verify`, { status });
      setLandlords(landlords.map(l =>
        l.user_id === userId ? { ...l, verification_status: status } : l
      ));
      toast.success(`Landlord ${status}`);
    } catch (err) {
      toast.error('Action failed');
    }
  };

  const resolveDispute = async (bookingId, resolution) => {
    try {
      await api.put(`/api/bookings/${bookingId}/resolve`, { resolution });
      setDisputes(disputes.filter(d => d.booking_id !== bookingId));
      toast.success(`Dispute resolved — ${resolution}`);
    } catch (err) {
      toast.error('Failed to resolve dispute');
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
        <p className="text-gray-500">Manage landlord verification and dispute resolution</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Total Landlords', value: landlords.length, icon: Users, color: 'bg-blue-50 text-blue-600' },
          { label: 'Pending Verification', value: landlords.filter(l => l.verification_status === 'pending').length, icon: Shield, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Open Disputes', value: disputes.length, icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Landlord Verification */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Landlord Verification</h2>
        {landlords.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <Users size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No landlords registered yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {landlords.map(landlord => (
              <div key={landlord.user_id} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{landlord.full_name}</h3>
                    <p className="text-gray-500 text-sm">{landlord.email}</p>
                    <p className="text-gray-400 text-xs mt-1">Phone: {landlord.phone || 'Not provided'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge type={
                      landlord.verification_status === 'verified' ? 'verified' :
                      landlord.verification_status === 'rejected' ? 'rejected' : 'pending'
                    }>
                      {landlord.verification_status}
                    </Badge>
                    {landlord.verification_status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => verifyLandlord(landlord.user_id, 'verified')}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle size={12} />
                          Verify
                        </button>
                        <button
                          onClick={() => verifyLandlord(landlord.user_id, 'rejected')}
                          className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disputes */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Open Disputes</h2>
        {disputes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <CheckCircle size={36} className="text-green-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No open disputes</p>
            <p className="text-gray-400 text-sm mt-1">All transactions are running smoothly</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map(dispute => (
              <div key={dispute.id} className="bg-white rounded-xl border border-red-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-red-500" />
                      <h3 className="font-semibold text-gray-900">Dispute on Booking</h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-1">
                      <span className="font-medium">Reason:</span> {dispute.reason}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Raised: {new Date(dispute.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-blue-600 text-sm font-medium mt-1">
                      Amount: ZMW {Number(dispute.amount).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolveDispute(dispute.booking_id, 'refunded')}
                      className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      Refund Student
                    </button>
                    <button
                      onClick={() => resolveDispute(dispute.booking_id, 'released')}
                      className="bg-green-50 text-green-600 border border-green-200 px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                    >
                      Release to Landlord
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}