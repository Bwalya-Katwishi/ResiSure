import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import {
  acceptBooking, cancelBooking, completePendingPayment, confirmMoveIn, getBooking,
  payBooking, raiseDispute, rejectBooking, resolveDispute, getPaymentMethods, getBookingPaymentStatus,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { money, shared } from '../theme';

export default function BookingDetailScreen({ route }) {
  const { id } = route.params;
  const { authorized } = useRequireAuth();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState('success');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [paymentMethods, setPaymentMethods] = useState({ mode: 'mock', demo: true, networks: [] });
  const [paymentPolling, setPaymentPolling] = useState(false);
  const pollRef = useRef(null);

  const isStudent = user?.role === 'student';
  const isLandlord = user?.role === 'landlord';
  const isAdmin = user?.role === 'admin';
  const hasPendingCapture = (booking?.transactions || []).some((tx) => tx.type === 'capture' && tx.status === 'pending');
  const bookingRef = booking ? `RS-${String(booking.id).slice(0, 8).toUpperCase()}` : '';

  const load = async () => {
    const res = await getBooking(id);
    const next = res.data.data.booking;
    setBooking(next);
    setPhone(next.student_phone || user?.phone || '');
  };

  useEffect(() => {
    if (!authorized) return;
    Promise.all([
      load(),
      getPaymentMethods()
        .then((res) => {
          const methods = res.data.data;
          setPaymentMethods(methods);
          const firstConfigured = methods.networks?.find((n) => n.configured);
          if (firstConfigured) setProvider(firstConfigured.id);
        })
        .catch(() => {}),
    ])
      .catch(() => Alert.alert('Error', 'Could not load booking'))
      .finally(() => setLoading(false));
  }, [id, authorized]);

  useEffect(() => {
    if (!authorized || !hasPendingCapture || paymentMethods.mode !== 'live') return undefined;
    setPaymentPolling(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await getBookingPaymentStatus(id);
        if (res.data.data.booking_status !== 'accepted') {
          await load();
          setPaymentPolling(false);
          clearInterval(pollRef.current);
        }
      } catch {
        /* ignore transient poll errors */
      }
      if (attempts >= 24) {
        setPaymentPolling(false);
        clearInterval(pollRef.current);
      }
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [id, authorized, hasPendingCapture, paymentMethods.mode]);

  const run = async (fn, success) => {
    setBusy(true);
    try {
      await fn();
      await load();
      Alert.alert('Success', success);
    } catch (err) {
      Alert.alert('Action failed', err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !booking) {
    return <View style={shared.center}><ActivityIndicator color="#2563eb" /></View>;
  }

  const configuredNetworks = (paymentMethods.networks || []).filter((n) => n.configured);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{booking.property_title}</Text>
      <Text style={shared.meta}>Status: {booking.status}</Text>
      <Text style={styles.price}>{money(booking.amount)}</Text>
      <Text style={shared.meta}>Ref {bookingRef}</Text>

      {isStudent && booking.property_location && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Exact property location</Text>
          <Text style={shared.meta}>
            Your payment is protected. Open Google Maps to navigate for your move-in on{' '}
            {new Date(booking.move_in_date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}.
          </Text>
          <TouchableOpacity
            style={[shared.button, { marginTop: 12 }]}
            onPress={() => Linking.openURL(booking.property_location.maps_url)}
          >
            <Text style={shared.buttonText}>Open in Google Maps</Text>
          </TouchableOpacity>
        </View>
      )}

      {(booking.transactions || []).map((tx) => (
        <View key={tx.id} style={styles.tx}>
          <Text style={styles.txTitle}>{tx.type.toUpperCase()} · {money(tx.amount)}</Text>
          <Text style={styles.txMeta}>
            {tx.reference} · {tx.status}
            {tx.payment_provider ? ` · ${tx.payment_provider}` : ''}
          </Text>
        </View>
      ))}

      {isLandlord && booking.status === 'pending' && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Booking request</Text>
          <TouchableOpacity
            style={[shared.button, { backgroundColor: '#16a34a', marginBottom: 8 }]}
            disabled={busy}
            onPress={() => run(() => acceptBooking(id), 'Booking accepted')}
          >
            <Text style={shared.buttonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[shared.button, { backgroundColor: '#dc2626' }]}
            disabled={busy}
            onPress={() => run(() => rejectBooking(id), 'Booking declined')}
          >
            <Text style={shared.buttonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}

      {isStudent && ['pending', 'accepted'].includes(booking.status) && (
        <TouchableOpacity
          disabled={busy}
          onPress={() => run(() => cancelBooking(id), 'Booking cancelled')}
          style={{ marginVertical: 8 }}
        >
          <Text style={{ color: '#dc2626', textAlign: 'center', fontWeight: '600' }}>Cancel unpaid booking</Text>
        </TouchableOpacity>
      )}

      {isStudent && booking.status === 'accepted' && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Make your payment</Text>
          <Text style={shared.meta}>Your payment is protected until you confirm your move-in.</Text>

          {paymentMethods.demo && (
            <View style={styles.demoBanner}>
              <Text style={styles.demoBannerTitle}>Demo payment mode</Text>
              <Text style={styles.demoBannerText}>
                Payments use the ResiSure mock provider — not real MTN, Airtel, or Zamtel debits.
              </Text>
            </View>
          )}

          {paymentMethods.mode === 'live' && configuredNetworks.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Payment method</Text>
              <View style={styles.row}>
                {configuredNetworks.map((network) => (
                  <TouchableOpacity
                    key={network.id}
                    style={[styles.chip, provider === network.id && styles.chipActive]}
                    onPress={() => setProvider(network.id)}
                  >
                    <Text style={[styles.chipText, provider === network.id && styles.chipTextActive]}>
                      {network.label}
                    </Text>
                    <Text style={[styles.chipSub, provider === network.id && styles.chipTextActive]}>
                      {network.prefixes.join(', ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {paymentMethods.demo && (
            <>
              <Text style={styles.fieldLabel}>Demo outcome</Text>
              <View style={styles.row}>
                {['success', 'failed', 'pending'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, outcome === p && styles.chipActive]}
                    onPress={() => setOutcome(p)}
                  >
                    <Text style={[styles.chipText, outcome === p && styles.chipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {hasPendingCapture && (
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingBannerText}>
                {paymentPolling
                  ? 'Waiting for mobile-money confirmation…'
                  : 'Payment pending provider confirmation.'}
              </Text>
            </View>
          )}

          <Text style={styles.fieldLabel}>
            {paymentMethods.mode === 'live' ? 'Mobile money number' : 'Phone number'}
          </Text>
          <TextInput
            style={shared.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="096 / 097 / 095…"
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={shared.button}
            disabled={busy}
            onPress={() => {
              if (!phone.trim()) {
                Alert.alert('Missing number', 'Enter your mobile money number.');
                return;
              }
              const payload = paymentMethods.demo
                ? { outcome, phone }
                : { phone, provider: provider || configuredNetworks[0]?.id };
              run(() => payBooking(id, payload), 'Payment submitted');
            }}
          >
            <Text style={shared.buttonText}>
              {busy ? 'Processing...' : paymentMethods.demo ? 'Run demo payment' : 'Pay with mobile money'}
            </Text>
          </TouchableOpacity>
          {paymentMethods.demo && hasPendingCapture && (
            <TouchableOpacity
              style={[shared.button, { backgroundColor: '#d97706', marginTop: 8 }]}
              disabled={busy}
              onPress={() => run(() => completePendingPayment(id, { outcome: 'success' }), 'Pending payment completed')}
            >
              <Text style={shared.buttonText}>Confirm pending payment</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isStudent && booking.status === 'escrow_held' && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Payment in escrow</Text>
          <Text style={shared.meta}>Funds are held until your move-in window opens.</Text>
        </View>
      )}

      {isStudent && booking.status === 'move_in_window' && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Confirm move-in or dispute</Text>
          <TouchableOpacity
            style={[shared.button, { backgroundColor: '#16a34a' }]}
            disabled={busy}
            onPress={() => run(() => confirmMoveIn(id), 'Funds released to landlord')}
          >
            <Text style={shared.buttonText}>Confirm move-in</Text>
          </TouchableOpacity>
          <TextInput
            style={[shared.input, { marginTop: 12 }]}
            value={disputeReason}
            onChangeText={setDisputeReason}
            placeholder="Dispute reason"
          />
          <TouchableOpacity
            style={[shared.button, { backgroundColor: '#dc2626' }]}
            disabled={busy}
            onPress={() => run(() => raiseDispute(id, disputeReason), 'Dispute raised')}
          >
            <Text style={shared.buttonText}>Raise dispute</Text>
          </TouchableOpacity>
        </View>
      )}

      {isAdmin && booking.status === 'disputed' && (
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Resolve dispute</Text>
          <TouchableOpacity
            style={[shared.button, { backgroundColor: '#16a34a', marginBottom: 8 }]}
            disabled={busy}
            onPress={() => run(() => resolveDispute(id, 'release'), 'Funds released to landlord')}
          >
            <Text style={shared.buttonText}>Release to landlord</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[shared.button, { backgroundColor: '#dc2626' }]}
            disabled={busy}
            onPress={() => run(() => resolveDispute(id, 'refund'), 'Refunded to student')}
          >
            <Text style={shared.buttonText}>Refund student</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  price: { color: '#2563eb', fontWeight: '800', fontSize: 18, marginVertical: 10 },
  tx: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  txTitle: { fontWeight: '700', color: '#0f172a' },
  txMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  box: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 40,
  },
  boxTitle: { fontWeight: '700', marginBottom: 10, color: '#0f172a' },
  fieldLabel: { fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 8, fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    flex: 1,
    minWidth: '30%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { color: '#475569', fontWeight: '600', fontSize: 12 },
  chipSub: { color: '#94a3b8', fontSize: 10, marginTop: 2 },
  chipTextActive: { color: '#1d4ed8' },
  demoBanner: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  demoBannerTitle: { fontWeight: '700', color: '#92400e', marginBottom: 4 },
  demoBannerText: { color: '#92400e', fontSize: 12 },
  pendingBanner: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
  },
  pendingBannerText: { color: '#1e40af', fontSize: 12 },
});
