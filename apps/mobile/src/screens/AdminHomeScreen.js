import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAdminAuditLogs, getAdminDisputes, getAdminLandlords, getAdminProperties, getAdminStats,
  resolveDispute, verifyAdminLandlord, verifyAdminProperty,
} from '../lib/api';
import { shared } from '../theme';

const TABS = ['Overview', 'Listings', 'Disputes', 'Landlords', 'Audit'];

export default function AdminHomeScreen() {
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [properties, setProperties] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [landlords, setLandlords] = useState([]);
  const [logs, setLogs] = useState([]);
  const [reason, setReason] = useState('');

  const load = async () => {
    try {
      const [statsRes, propsRes, disputesRes, landlordsRes, logsRes] = await Promise.all([
        getAdminStats(),
        getAdminProperties(),
        getAdminDisputes(),
        getAdminLandlords(),
        getAdminAuditLogs({ limit: 30 }),
      ]);
      setStats(statsRes.data.data.stats);
      setProperties(propsRes.data.data.properties || []);
      setDisputes(disputesRes.data.data.disputes || []);
      setLandlords(landlordsRes.data.data.landlords || []);
      setLogs(logsRes.data.data.logs || []);
    } catch (err) {
      Alert.alert('Admin load failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const verifyListing = async (id, status) => {
    try {
      await verifyAdminProperty(id, { status, rejection_reason: reason || undefined });
      setReason('');
      load();
    } catch (err) {
      Alert.alert('Update failed', err.response?.data?.message || err.message);
    }
  };

  if (loading) {
    return <View style={shared.center}><ActivityIndicator color="#2563eb" /></View>;
  }

  return (
    <ScrollView
      contentContainerStyle={shared.list}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((item) => (
          <TouchableOpacity key={item} style={[styles.tab, tab === item && styles.tabOn]} onPress={() => setTab(item)}>
            <Text style={[styles.tabText, tab === item && styles.tabTextOn]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'Overview' && Object.entries(stats || {}).map(([group, rows]) => (
        <View key={group} style={shared.card}>
          <Text style={shared.title}>{group}</Text>
          {(Array.isArray(rows) ? rows : [rows]).map((row, index) => (
            <Text key={`${group}-${index}`} style={shared.meta}>
              {Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(' · ')}
            </Text>
          ))}
        </View>
      ))}

      {tab === 'Listings' && properties.map((item) => (
        <View key={item.id} style={shared.card}>
          <Text style={shared.title}>{item.title}</Text>
          <Text style={shared.meta}>{item.verification_status} · {item.area}</Text>
          {item.verification_status !== 'verified' && (
            <>
              <TextInput
                style={shared.input}
                placeholder="Rejection reason (if rejecting)"
                value={reason}
                onChangeText={setReason}
              />
              <View style={styles.row}>
                <TouchableOpacity onPress={() => verifyListing(item.id, 'verified')}>
                  <Text style={{ color: '#16a34a', fontWeight: '700' }}>Verify</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => verifyListing(item.id, 'rejected')}>
                  <Text style={{ color: '#dc2626', fontWeight: '700' }}>Reject</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      ))}

      {tab === 'Disputes' && disputes.map((item) => (
        <View key={item.id} style={shared.card}>
          <Text style={shared.title}>{item.property_title || item.id}</Text>
          <Text style={shared.meta}>{item.resolution || item.status} · {item.reason || item.dispute_reason}</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={() => resolveDispute(item.booking_id, 'release').then(load)}>
              <Text style={{ color: '#16a34a', fontWeight: '700' }}>Release</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => resolveDispute(item.booking_id, 'refund').then(load)}>
              <Text style={{ color: '#dc2626', fontWeight: '700' }}>Refund</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {tab === 'Landlords' && landlords.map((item) => (
        <View key={item.id || item.user_id} style={shared.card}>
          <Text style={shared.title}>{item.full_name || item.email}</Text>
          <Text style={shared.meta}>{item.verification_status}</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={() => verifyAdminLandlord(item.user_id || item.id, 'verified').then(load)}>
              <Text style={{ color: '#16a34a', fontWeight: '700' }}>Verify</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => verifyAdminLandlord(item.user_id || item.id, 'rejected').then(load)}>
              <Text style={{ color: '#dc2626', fontWeight: '700' }}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {tab === 'Audit' && logs.map((item) => (
        <View key={item.id} style={shared.card}>
          <Text style={shared.title}>{item.action}</Text>
          <Text style={shared.meta}>{item.entity_type} · {item.created_at}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: 8, paddingBottom: 12 },
  tab: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tabOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tabText: { color: '#475569', fontWeight: '700', fontSize: 12 },
  tabTextOn: { color: '#fff' },
  row: { flexDirection: 'row', gap: 16, marginTop: 8 },
});
