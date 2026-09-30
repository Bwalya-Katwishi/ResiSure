import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext';
import {
  getLandlordProfile, getLandlordReleased, getMyTransactions, submitLandlordVerification, updateMe,
} from '../lib/api';
import { money, shared } from '../theme';

export default function AccountScreen() {
  const { user, logout, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [released, setReleased] = useState([]);
  const [profile, setProfile] = useState(null);
  const [nrc, setNrc] = useState('');
  const [document, setDocument] = useState(null);

  const load = async () => {
    try {
      if (user?.role === 'student') {
        const res = await getMyTransactions();
        setTransactions(res.data.data.transactions || []);
      }
      if (user?.role === 'landlord') {
        const [releasedRes, profileRes] = await Promise.all([
          getLandlordReleased(),
          getLandlordProfile(),
        ]);
        setReleased(releasedRes.data.data.transactions || []);
        const next = profileRes.data.data.profile;
        setProfile(next);
        setNrc(next?.nrc_number || '');
      }
    } catch (err) {
      console.warn(err.message);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, [user?.role]));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await updateMe({ full_name: fullName, phone });
      setUser(res.data.data.user);
      Alert.alert('Saved', 'Profile updated');
    } catch (err) {
      Alert.alert('Update failed', err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    setDocument(result.assets[0]);
  };

  const submitVerification = async () => {
    if (!nrc.trim() || !document) {
      Alert.alert('Missing details', 'NRC number and a document are required.');
      return;
    }
    const form = new FormData();
    form.append('nrc_number', nrc.trim());
    form.append('document', {
      uri: document.uri,
      name: document.name || 'verification.pdf',
      type: document.mimeType || 'application/pdf',
    });
    try {
      const res = await submitLandlordVerification(form);
      setProfile(res.data.data.profile);
      setDocument(null);
      Alert.alert('Submitted', 'An admin will review your documents.');
    } catch (err) {
      Alert.alert('Submit failed', err.response?.data?.message || err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.name}>{user?.full_name}</Text>
      <Text style={shared.meta}>{user?.email}</Text>
      <Text style={shared.meta}>Role: {user?.role}</Text>
      <Text style={styles.note}>
        Payments use a development mock provider. No live MTN MoMo or Airtel Money transaction is created.
      </Text>

      <Text style={styles.section}>Profile</Text>
      <TextInput style={shared.input} value={fullName} onChangeText={setFullName} placeholder="Full name" />
      <TextInput style={shared.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
      <TouchableOpacity style={shared.button} onPress={saveProfile} disabled={saving}>
        <Text style={shared.buttonText}>{saving ? 'Updating...' : 'Update profile'}</Text>
      </TouchableOpacity>

      {user?.role === 'student' && (
        <>
          <Text style={styles.section}>Transactions</Text>
          {transactions.length === 0 ? (
            <Text style={shared.meta}>No escrow transactions yet.</Text>
          ) : transactions.map((tx) => (
            <View key={tx.id} style={shared.card}>
              <Text style={shared.title}>{tx.type} · {money(tx.amount)}</Text>
              <Text style={shared.meta}>{tx.status} · {tx.reference}</Text>
            </View>
          ))}
        </>
      )}

      {user?.role === 'landlord' && (
        <>
          <Text style={styles.section}>Verification</Text>
          <Text style={shared.meta}>Status: {profile?.verification_status || 'unknown'}</Text>
          <TextInput style={shared.input} value={nrc} onChangeText={setNrc} placeholder="NRC number" />
          <TouchableOpacity style={[shared.button, { backgroundColor: '#0f172a', marginBottom: 8 }]} onPress={pickDocument}>
            <Text style={shared.buttonText}>{document ? document.name : 'Choose NRC / ownership document'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={shared.button} onPress={submitVerification}>
            <Text style={shared.buttonText}>Submit for review</Text>
          </TouchableOpacity>

          <Text style={styles.section}>Released funds</Text>
          {released.length === 0 ? (
            <Text style={shared.meta}>No released payments yet.</Text>
          ) : released.map((tx) => (
            <View key={tx.id} style={shared.card}>
              <Text style={shared.title}>{money(tx.amount)}</Text>
              <Text style={shared.meta}>{tx.status} · {tx.reference}</Text>
            </View>
          ))}
        </>
      )}

      <TouchableOpacity style={styles.out} onPress={logout}>
        <Text style={styles.outText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#f8fafc', paddingBottom: 48 },
  name: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  note: { color: '#475569', marginTop: 16, lineHeight: 20 },
  section: { marginTop: 24, marginBottom: 8, fontWeight: '800', color: '#0f172a' },
  out: {
    marginTop: 28,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outText: { color: '#fff', fontWeight: '700' },
});
