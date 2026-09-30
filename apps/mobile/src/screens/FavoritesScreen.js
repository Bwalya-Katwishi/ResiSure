import React, { useCallback, useState } from 'react';

import { Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, View, Alert } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { getFavorites, removeFavorite } from '../lib/api';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { money, shared } from '../theme';

export default function FavoritesScreen({ navigation }) {
  const { authorized } = useRequireAuth({ role: 'student' });

  const [properties, setProperties] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);



  const load = useCallback(async (isRefresh = false) => {

    if (isRefresh) setRefreshing(true);

    else setLoading(true);

    try {

      const res = await getFavorites();

      setProperties(res.data.data.properties || []);

    } catch (err) {

      Alert.alert('Could not load', 'Your saved rooms could not be loaded. Pull down to try again.');

      console.warn(err.message);

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  }, []);



  useFocusEffect(useCallback(() => {
    if (authorized) load();
  }, [load, authorized]));



  const unsave = async (id) => {

    setProperties((current) => current.filter((item) => item.id !== id));

    try {

      await removeFavorite(id);

    } catch {

      Alert.alert('Could not remove', 'Please try again.');

      load();

    }

  };



  if (loading && !refreshing) {

    return (

      <View style={shared.center} accessible accessibilityLabel="Loading saved rooms">

        <ActivityIndicator color="#2563eb" />

      </View>

    );

  }



  return (

    <FlatList

      contentContainerStyle={shared.list}

      data={properties}

      keyExtractor={(item) => item.id}

      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}

      ListEmptyComponent={<Text style={shared.empty}>No saved properties yet. Save accommodation you're interested in and they'll appear here.</Text>}

      renderItem={({ item }) => (

        <TouchableOpacity

          style={shared.card}

          onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}

          accessibilityRole="button"

          accessibilityLabel={`${item.title}, saved listing`}

        >

          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>

            <Text style={[shared.title, { flex: 1 }]}>{item.title}</Text>

            <TouchableOpacity

              onPress={() => unsave(item.id)}

              hitSlop={12}

              accessibilityRole="button"

              accessibilityLabel="Remove from saved"

            >

              <Text style={{ color: '#e11d48', fontSize: 20 }} accessible={false}>♥</Text>

            </TouchableOpacity>

          </View>

          <Text style={shared.meta}>{item.area || item.address}</Text>

          <Text style={shared.price}>{money(item.rent_per_month)}/mo</Text>

        </TouchableOpacity>

      )}

    />

  );

}

