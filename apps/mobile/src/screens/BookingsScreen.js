import React, { useCallback, useState } from 'react';
import { Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAdminBookings, getLandlordBookings, getMyBookings } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { money, shared } from '../theme';

export default function BookingsScreen({ navigation, route }) {
  const { user } = useAuth();
  const mode = route?.params?.mode || user?.role || 'student';
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = mode === 'landlord'
        ? await getLandlordBookings()
        : mode === 'admin'
          ? await getAdminBookings()
          : await getMyBookings();
      setBookings(res.data.data.bookings || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [mode]));

  if (loading) {
    return <View style={shared.center}><ActivityIndicator color="#2563eb" /></View>;
  }

  return (
    <FlatList
      contentContainerStyle={shared.list}
      data={bookings}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      ListEmptyComponent={<Text style={shared.empty}>No bookings yet</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={shared.card}
          onPress={() => navigation.navigate('BookingDetail', { id: item.id })}
        >
          <Text style={shared.title}>{item.property_title || item.title}</Text>
          <Text style={shared.meta}>Status: {item.status}</Text>
          <Text style={shared.price}>{money(item.amount || item.rent_per_month)}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
