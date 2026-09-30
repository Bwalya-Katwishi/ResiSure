import React, { useCallback, useState } from 'react';
import { Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/api';
import { shared } from '../theme';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await getNotifications();
      setItems(res.data.data.notifications || []);
    } catch (err) {
      console.warn(err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const open = async (item) => {
    try {
      if (!item.is_read) await markNotificationRead(item.id);
    } catch (_) { /* still navigate */ }
    if (item.link?.includes('/bookings/')) {
      const id = item.link.split('/bookings/')[1];
      navigation.navigate('Bookings', { screen: 'BookingDetail', params: { id } });
    }
    load();
  };

  if (loading) {
    return <View style={shared.center}><ActivityIndicator color="#2563eb" /></View>;
  }

  return (
    <FlatList
      contentContainerStyle={shared.list}
      data={items}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
      ListHeaderComponent={
        items.length ? (
          <TouchableOpacity style={{ marginBottom: 12 }} onPress={() => markAllNotificationsRead().then(load)}>
            <Text style={{ color: '#2563eb', fontWeight: '700' }}>Mark all read</Text>
          </TouchableOpacity>
        ) : null
      }
      ListEmptyComponent={<Text style={shared.empty}>No notifications yet</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={[shared.card, !item.is_read && { borderColor: '#93c5fd' }]} onPress={() => open(item)}>
          <Text style={shared.title}>{item.message}</Text>
          <Text style={shared.meta}>{item.type} · {item.is_read ? 'Read' : 'Unread'}</Text>
        </TouchableOpacity>
      )}
    />
  );
}
