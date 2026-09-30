import React, { useCallback, useState } from 'react';

import { Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, View, Alert } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { deleteProperty, getMyListings } from '../lib/api';

import { money, shared } from '../theme';



export default function LandlordListingsScreen({ navigation }) {

  const [listings, setListings] = useState([]);

  const [loading, setLoading] = useState(true);



  const load = async () => {

    try {

      const res = await getMyListings();

      setListings(res.data.data.properties || []);

    } catch (err) {

      console.warn(err.message);

    } finally {

      setLoading(false);

    }

  };



  useFocusEffect(useCallback(() => { load(); }, []));



  const remove = async (id) => {

    try {

      await deleteProperty(id);

      load();

    } catch (err) {

      Alert.alert('Could not delete', err.response?.data?.message || err.message);

    }

  };



  if (loading) {

    return <View style={shared.center}><ActivityIndicator color="#2563eb" /></View>;

  }



  return (

    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>

      <FlatList

        contentContainerStyle={shared.list}

        data={listings}

        keyExtractor={(item) => item.id}

        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}

        ListHeaderComponent={

          <TouchableOpacity

            style={[shared.button, { marginBottom: 16 }]}

            onPress={() => navigation.navigate('ListingForm')}

          >

            <Text style={shared.buttonText}>New listing</Text>

          </TouchableOpacity>

        }

        ListEmptyComponent={<Text style={shared.empty}>You haven't posted any properties yet.</Text>}

        renderItem={({ item }) => (

          <View style={shared.card}>

            <Text style={shared.title}>{item.title}</Text>

            <Text style={shared.meta}>

              {item.area} · {item.verification_status === 'verified' ? 'Verified' : 'Unverified'}

            </Text>

            <Text style={shared.price}>{money(item.rent_per_month)}/mo</Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>

              <TouchableOpacity onPress={() => navigation.navigate('ListingForm', { listing: item })}>

                <Text style={{ color: '#2563eb', fontWeight: '700' }}>Edit</Text>

              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('PropertyDetail', { id: item.id })}>

                <Text style={{ color: '#2563eb', fontWeight: '700' }}>View</Text>

              </TouchableOpacity>

              <TouchableOpacity onPress={() => remove(item.id)}>

                <Text style={{ color: '#dc2626', fontWeight: '700' }}>Delete</Text>

              </TouchableOpacity>

            </View>

          </View>

        )}

      />

    </View>

  );

}

