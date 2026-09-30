import React, { useCallback, useState } from 'react';

import {

  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, TextInput, ScrollView, Alert,

} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { addFavorite, getProperties, removeFavorite } from '../lib/api';

import { useAuth } from '../context/AuthContext';

import { money, shared } from '../theme';



const AMENITIES = ['wifi', 'water', 'electricity', 'security', 'furnished', 'kitchen'];



export default function PropertiesScreen({ navigation }) {

  const { user } = useAuth();

  const [properties, setProperties] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [fetchError, setFetchError] = useState('');

  const [filters, setFilters] = useState({

    area: '', min_price: '', max_price: '', property_type: '', available: '', sort: 'newest', amenities: [],

  });



  const load = useCallback(async (isRefresh = false) => {

    if (isRefresh) setRefreshing(true);

    else setLoading(true);

    setFetchError('');

    try {

      const params = Object.fromEntries(

        Object.entries(filters).filter(([key, value]) => {

          if (key === 'amenities') return value.length > 0;

          return value !== '';

        }).map(([key, value]) => [key, key === 'amenities' ? value.join(',') : value])

      );

      const res = await getProperties(params);

      setProperties(res.data.data.properties || []);

    } catch (err) {

      setFetchError('Could not load listings. Pull down to try again.');

      console.warn(err.message);

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  }, [filters]);



  useFocusEffect(useCallback(() => { load(); }, [load]));



  const toggleAmenity = (item) => {

    setFilters((current) => ({

      ...current,

      amenities: current.amenities.includes(item)

        ? current.amenities.filter((value) => value !== item)

        : [...current.amenities, item],

    }));

  };



  const toggleFavorite = async (item, event) => {

    event?.stopPropagation?.();

    if (user?.role !== 'student') return;

    const next = !item.is_favorite;

    setProperties((current) => current.map((p) => (p.id === item.id ? { ...p, is_favorite: next } : p)));

    try {

      if (next) await addFavorite(item.id);

      else await removeFavorite(item.id);

    } catch {

      setProperties((current) => current.map((p) => (p.id === item.id ? { ...p, is_favorite: !next } : p)));

      Alert.alert('Could not update', 'Your saved listing could not be updated. Please try again.');

    }

  };



  return (

    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>

      <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.filters}>

        <TextInput

          style={styles.filterInput}

          placeholder="Area"

          accessibilityLabel="Filter by area"

          value={filters.area}

          onChangeText={(area) => setFilters({ ...filters, area })}

        />

        <TextInput

          style={styles.filterInput}

          placeholder="Min ZMW"

          keyboardType="numeric"

          accessibilityLabel="Minimum price"

          value={filters.min_price}

          onChangeText={(min_price) => setFilters({ ...filters, min_price })}

        />

        <TextInput

          style={styles.filterInput}

          placeholder="Max ZMW"

          keyboardType="numeric"

          accessibilityLabel="Maximum price"

          value={filters.max_price}

          onChangeText={(max_price) => setFilters({ ...filters, max_price })}

        />

        {['', 'room', 'shared', 'studio', 'apartment'].map((type) => (

          <TouchableOpacity

            key={type || 'all'}

            style={[styles.chip, filters.property_type === type && styles.chipOn]}

            onPress={() => setFilters({ ...filters, property_type: type })}

            accessibilityRole="button"

            accessibilityState={{ selected: filters.property_type === type }}

            accessibilityLabel={type ? `Filter by ${type}` : 'All property types'}

          >

            <Text style={[styles.chipText, filters.property_type === type && styles.chipTextOn]}>

              {type || 'All types'}

            </Text>

          </TouchableOpacity>

        ))}

        <TouchableOpacity

          style={[styles.chip, filters.available === 'true' && styles.chipOn]}

          onPress={() => setFilters({ ...filters, available: filters.available === 'true' ? '' : 'true' })}

          accessibilityRole="button"

          accessibilityState={{ selected: filters.available === 'true' }}

          accessibilityLabel="Available listings only"

        >

          <Text style={[styles.chipText, filters.available === 'true' && styles.chipTextOn]}>Available</Text>

        </TouchableOpacity>

        {AMENITIES.map((item) => (

          <TouchableOpacity

            key={item}

            style={[styles.chip, filters.amenities.includes(item) && styles.chipOn]}

            onPress={() => toggleAmenity(item)}

            accessibilityRole="button"

            accessibilityState={{ selected: filters.amenities.includes(item) }}

            accessibilityLabel={`Amenity ${item}`}

          >

            <Text style={[styles.chipText, filters.amenities.includes(item) && styles.chipTextOn]}>{item}</Text>

          </TouchableOpacity>

        ))}

        <TouchableOpacity

          style={styles.searchBtn}

          onPress={() => load()}

          accessibilityRole="button"

          accessibilityLabel="Search listings"

        >

          <Text style={styles.searchText}>Search</Text>

        </TouchableOpacity>

      </ScrollView>



      {fetchError ? (

        <Text style={styles.error} accessibilityRole="alert">{fetchError}</Text>

      ) : null}



      {loading && !refreshing ? (

        <View style={shared.center} accessible accessibilityLabel="Loading listings">

          <ActivityIndicator color="#2563eb" />

        </View>

      ) : (

        <FlatList

          contentContainerStyle={shared.list}

          data={properties}

          keyExtractor={(item) => item.id}

          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}

          ListEmptyComponent={<Text style={shared.empty}>No properties match your current search and filters.</Text>}

          renderItem={({ item }) => (

            <TouchableOpacity

              style={shared.card}

              onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}

              accessibilityRole="button"

              accessibilityLabel={`${item.title}, ${money(item.rent_per_month)} per month`}

            >

              <View style={styles.row}>

                <Text style={[shared.title, { flex: 1 }]}>{item.title}</Text>

                {user?.role === 'student' && (

                  <TouchableOpacity

                    onPress={(e) => toggleFavorite(item, e)}

                    hitSlop={12}

                    accessibilityRole="button"

                    accessibilityLabel={item.is_favorite ? 'Remove from saved' : 'Save listing'}

                    accessibilityState={{ selected: item.is_favorite }}

                  >

                    <Text style={{ fontSize: 20, color: item.is_favorite ? '#e11d48' : '#94a3b8' }} accessible={false}>

                      {item.is_favorite ? '♥' : '♡'}

                    </Text>

                  </TouchableOpacity>

                )}

              </View>

              <Text style={shared.meta}>{item.area || item.address}</Text>

              <Text style={shared.price}>{money(item.rent_per_month)}/mo</Text>

              {item.verification_status === 'verified' && (

                <Text style={shared.badge}>Verified listing</Text>

              )}

            </TouchableOpacity>

          )}

        />

      )}

    </View>

  );

}



const styles = StyleSheet.create({

  filters: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },

  filterInput: {

    backgroundColor: '#fff',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    borderRadius: 10,

    paddingHorizontal: 10,

    paddingVertical: 10,

    minWidth: 90,

    minHeight: 44,

  },

  chip: {

    borderWidth: 1,

    borderColor: '#cbd5e1',

    borderRadius: 999,

    paddingHorizontal: 12,

    paddingVertical: 10,

    minHeight: 44,

    justifyContent: 'center',

  },

  chipOn: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },

  chipText: { color: '#475569', fontSize: 13, fontWeight: '600' },

  chipTextOn: { color: '#1d4ed8' },

  searchBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },

  searchText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },

  error: { color: '#b91c1c', textAlign: 'center', paddingHorizontal: 16, paddingBottom: 8, fontSize: 13 },

});

