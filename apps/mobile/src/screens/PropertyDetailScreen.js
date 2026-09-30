import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { addFavorite, createBooking, getProperty, removeFavorite } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { money, shared } from '../theme';

export default function PropertyDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => getProperty(id).then((res) => setProperty(res.data.data.property));

  useEffect(() => {
    load()
      .catch(() => Alert.alert('Error', 'Property not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleFavorite = async () => {
    if (user?.role !== 'student') return;
    const next = !property.is_favorite;
    setProperty({ ...property, is_favorite: next });
    try {
      if (next) await addFavorite(id);
      else await removeFavorite(id);
    } catch (err) {
      setProperty({ ...property, is_favorite: !next });
      Alert.alert('Could not update', err.response?.data?.message || err.message);
    }
  };

  const book = async () => {
    if (user?.role !== 'student') {
      Alert.alert('Students only', 'Log in as a student to book.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createBooking({ property_id: id, move_in_date: moveInDate });
      Alert.alert('Booking submitted', 'Waiting for landlord acceptance.');
      navigation.navigate('Bookings', {
        screen: 'BookingDetail',
        params: { id: res.data.data.booking.id },
      });
    } catch (err) {
      Alert.alert('Booking failed', err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !property) {
    return <View style={shared.center}><ActivityIndicator color="#2563eb" /></View>;
  }

  const verified = property.verification_status === 'verified';
  const landlordVerified = property.landlord_verification_status === 'verified';
  const bookable = property.verification_status !== 'rejected'
    && property.verification_status !== 'suspended'
    && landlordVerified;
  const isOwner = Boolean(property.is_owner);
  const amenities = Array.isArray(property.amenities) ? property.amenities : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>{property.title}</Text>
        {user?.role === 'student' && !isOwner && (
          <TouchableOpacity onPress={toggleFavorite}>
            <Text style={{ fontSize: 26, color: property.is_favorite ? '#e11d48' : '#94a3b8' }}>
              {property.is_favorite ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={shared.meta}>{property.address}</Text>
      <Text style={styles.price}>{money(property.rent_per_month)}/month</Text>
      <Text style={verified ? shared.badge : styles.warn}>
        {verified ? 'Verified listing' : 'Unverified listing'}
      </Text>
      <Text style={styles.body}>{property.description || 'No description provided.'}</Text>
      <Text style={styles.meta}>Type: {property.property_type || 'room'} · {property.available_rooms} of {property.total_rooms} rooms</Text>
      {amenities.length > 0 && (
        <Text style={styles.meta}>Amenities: {amenities.join(', ')}</Text>
      )}

      {isOwner ? (
        <View style={styles.ownerBox}>
          <Text style={styles.ownerTitle}>Your listing</Text>
          <Text style={shared.meta}>Manage this property from your landlord listings screen.</Text>
          <TouchableOpacity
            style={[shared.button, { marginTop: 12 }]}
            onPress={() => navigation.navigate('Listings', { screen: 'ListingForm', params: { listing: property } })}
          >
            <Text style={shared.buttonText}>Edit listing</Text>
          </TouchableOpacity>
        </View>
      ) : user?.role === 'student' && bookable && property.available_rooms > 0 ? (
        <>
          <Text style={styles.label}>Move-in date (YYYY-MM-DD)</Text>
          <TextInput style={shared.input} value={moveInDate} onChangeText={setMoveInDate} />
          <TouchableOpacity style={shared.button} onPress={book} disabled={submitting}>
            <Text style={shared.buttonText}>{submitting ? 'Submitting...' : 'Request booking'}</Text>
          </TouchableOpacity>
        </>
      ) : user?.role === 'landlord' ? (
        <Text style={shared.meta}>Landlord accounts cannot book rooms. Browse your dashboard to manage your own listings.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8fafc' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: '#0f172a' },
  price: { color: '#2563eb', fontWeight: '800', fontSize: 18, marginVertical: 12 },
  body: { color: '#334155', lineHeight: 20, marginBottom: 12 },
  meta: { color: '#64748b', marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 16 },
  warn: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 12,
  },
  ownerBox: {
    marginTop: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 14,
  },
  ownerTitle: { fontWeight: '700', color: '#1e3a8a', marginBottom: 4 },
});
