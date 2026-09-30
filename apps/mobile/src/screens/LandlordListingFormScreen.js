import React, { useState } from 'react';
import {
  Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, View, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { createProperty, updateProperty, uploadPropertyImages } from '../lib/api';
import { shared } from '../theme';

const TYPES = ['room', 'shared', 'studio', 'apartment'];
const AMENITIES = ['wifi', 'water', 'electricity', 'security', 'furnished', 'kitchen'];
const ACCOMMODATION = [
  { value: 'female', label: 'Female students only' },
  { value: 'male', label: 'Male students only' },
  { value: 'both', label: 'Female and male students' },
];

export default function LandlordListingFormScreen({ route, navigation }) {
  const listing = route.params?.listing;
  const [form, setForm] = useState({
    title: listing?.title || '',
    description: listing?.description || '',
    address: listing?.address || '',
    area: listing?.area || '',
    rent_per_month: listing?.rent_per_month ? String(listing.rent_per_month) : '',
    total_rooms: listing?.total_rooms ? String(listing.total_rooms) : '1',
    property_type: listing?.property_type || 'room',
    amenities: Array.isArray(listing?.amenities) ? listing.amenities : [],
    latitude: listing?.latitude ?? null,
    longitude: listing?.longitude ?? null,
    accommodation_gender: listing?.accommodation_gender || '',
    female_rooms_available: listing?.female_rooms_available != null ? String(listing.female_rooms_available) : '',
    male_rooms_available: listing?.male_rooms_available != null ? String(listing.male_rooms_available) : '',
  });
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const captureCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to pin your property on the map.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setForm((current) => ({
        ...current,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }));
      Alert.alert('Location captured', 'Students will see this only after they pay and set a move-in date.');
    } catch (err) {
      Alert.alert('Location failed', err.message || 'Could not get your current location.');
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!form.accommodation_gender) {
      Alert.alert('Required', 'Select who this listing is for (female, male, or both).');
      return;
    }
    if (form.accommodation_gender === 'both') {
      const f = parseInt(form.female_rooms_available, 10);
      const m = parseInt(form.male_rooms_available, 10);
      const total = parseInt(form.total_rooms, 10) || 1;
      if (!Number.isFinite(f) || f < 0 || !Number.isFinite(m) || m < 0 || f + m !== total) {
        Alert.alert('Room split', 'Female and male room counts must add up to total rooms.');
        return;
      }
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        rent_per_month: Number(form.rent_per_month),
        total_rooms: parseInt(form.total_rooms, 10) || 1,
        female_rooms_available: form.accommodation_gender === 'both'
          ? parseInt(form.female_rooms_available, 10)
          : undefined,
        male_rooms_available: form.accommodation_gender === 'both'
          ? parseInt(form.male_rooms_available, 10)
          : undefined,
      };
      if (listing?.id) {
        await updateProperty(listing.id, payload);
        Alert.alert('Updated', 'Listing saved');
      } else {
        await createProperty(payload);
        Alert.alert('Created', 'Listing is pending review');
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save failed', err.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const addPhotos = async () => {
    if (!listing?.id) {
      Alert.alert('Save first', 'Create the listing before adding photos.');
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload listing images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.7,
      mediaTypes: ['images'],
    });
    if (result.canceled) return;
    const data = new FormData();
    result.assets.slice(0, 5).forEach((asset, index) => {
      data.append('images', {
        uri: asset.uri,
        name: asset.fileName || `photo-${index}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
    });
    try {
      await uploadPropertyImages(listing.id, data);
      Alert.alert('Uploaded', 'Photos added to this listing');
    } catch (err) {
      Alert.alert('Upload failed', err.response?.data?.message || err.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {[
        ['title', 'Title'],
        ['description', 'Description'],
        ['address', 'Address'],
        ['area', 'Area'],
        ['rent_per_month', 'Monthly rent (ZMW)'],
        ['total_rooms', 'Total rooms'],
      ].map(([key, placeholder]) => (
        <TextInput
          key={key}
          style={shared.input}
          placeholder={placeholder}
          value={form[key]}
          keyboardType={key.includes('rent') || key.includes('rooms') ? 'numeric' : 'default'}
          onChangeText={(value) => set(key, value)}
        />
      ))}

      <Text style={styles.label}>Who is this listing for? *</Text>
      <View style={styles.row}>
        {ACCOMMODATION.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, form.accommodation_gender === opt.value && styles.chipOn]}
            onPress={() => setForm((current) => ({
              ...current,
              accommodation_gender: opt.value,
              female_rooms_available: '',
              male_rooms_available: '',
            }))}
          >
            <Text style={[styles.chipText, form.accommodation_gender === opt.value && styles.chipTextOn]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {form.accommodation_gender === 'both' && (
        <View style={{ marginBottom: 16, gap: 8 }}>
          <TextInput
            style={shared.input}
            placeholder="Rooms for female students"
            keyboardType="numeric"
            value={form.female_rooms_available}
            onChangeText={(value) => set('female_rooms_available', value)}
          />
          <TextInput
            style={shared.input}
            placeholder="Rooms for male students"
            keyboardType="numeric"
            value={form.male_rooms_available}
            onChangeText={(value) => set('male_rooms_available', value)}
          />
        </View>
      )}

      <View style={styles.locationBox}>
        <Text style={styles.label}>Live location</Text>
        <Text style={styles.locationHint}>
          Pin the exact property location. Students only see this after they pay and choose a move-in date.
        </Text>
        <TouchableOpacity
          style={[styles.locationButton, locating && styles.locationButtonDisabled]}
          onPress={captureCurrentLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color="#1d4ed8" />
          ) : (
            <Text style={styles.locationButtonText}>Use my current location</Text>
          )}
        </TouchableOpacity>
        {form.latitude != null && form.longitude != null && (
          <Text style={styles.locationSet}>
            Location set ({Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)})
          </Text>
        )}
        {(form.latitude != null || form.longitude != null) && (
          <TouchableOpacity onPress={() => setForm((current) => ({ ...current, latitude: null, longitude: null }))}>
            <Text style={styles.clearLocation}>Clear location</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        {TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, form.property_type === type && styles.chipOn]}
            onPress={() => set('property_type', type)}
          >
            <Text style={[styles.chipText, form.property_type === type && styles.chipTextOn]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Amenities</Text>
      <View style={styles.row}>
        {AMENITIES.map((item) => {
          const on = form.amenities.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => set(
                'amenities',
                on ? form.amenities.filter((value) => value !== item) : [...form.amenities, item]
              )}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {listing?.id && (
        <TouchableOpacity style={[shared.button, { backgroundColor: '#0f172a', marginBottom: 10 }]} onPress={addPhotos}>
          <Text style={shared.buttonText}>Add photos</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={shared.button} onPress={save} disabled={busy}>
        <Text style={shared.buttonText}>{busy ? 'Saving...' : listing?.id ? 'Save changes' : 'Create listing'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#f8fafc', paddingBottom: 40 },
  label: { fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  chipText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: '#1d4ed8' },
  locationBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 14,
    marginBottom: 16,
  },
  locationHint: { color: '#475569', fontSize: 12, marginBottom: 12, lineHeight: 18 },
  locationButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  locationButtonDisabled: { opacity: 0.6 },
  locationButtonText: { color: '#1d4ed8', fontWeight: '700' },
  locationSet: { color: '#15803d', fontSize: 12, fontWeight: '600', marginTop: 10 },
  clearLocation: { color: '#64748b', fontSize: 12, fontWeight: '600', marginTop: 8 },
});
