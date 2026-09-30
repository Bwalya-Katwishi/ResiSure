import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import PropertiesScreen from '../screens/PropertiesScreen';
import PropertyDetailScreen from '../screens/PropertyDetailScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import BookingsScreen from '../screens/BookingsScreen';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import AccountScreen from '../screens/AccountScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import LandlordListingsScreen from '../screens/LandlordListingsScreen';
import LandlordListingFormScreen from '../screens/LandlordListingFormScreen';
import AdminHomeScreen from '../screens/AdminHomeScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function tabIcon(emoji) {
  return ({ color }) => <Text style={{ color, fontSize: 16 }}>{emoji}</Text>;
}

function BrowseStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Listings" component={PropertiesScreen} options={{ title: 'Find Housing' }} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property' }} />
    </Stack.Navigator>
  );
}

function SavedStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="SavedList" component={FavoritesScreen} options={{ title: 'Saved' }} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property' }} />
    </Stack.Navigator>
  );
}

function BookingsStack({ route }) {
  const mode = route?.params?.mode || 'student';
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MyBookings"
        component={BookingsScreen}
        options={{ title: mode === 'landlord' ? 'Requests' : mode === 'admin' ? 'Bookings' : 'My Bookings' }}
        initialParams={{ mode }}
      />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} options={{ title: 'Booking' }} />
    </Stack.Navigator>
  );
}

function LandlordListingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MyListings" component={LandlordListingsScreen} options={{ title: 'My listings' }} />
      <Stack.Screen name="ListingForm" component={LandlordListingFormScreen} options={{ title: 'Listing' }} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property' }} />
    </Stack.Navigator>
  );
}

function StudentTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#0047AB' }}>
      <Tab.Screen name="Browse" component={BrowseStack} options={{ tabBarLabel: 'Browse', tabBarIcon: tabIcon('🏠') }} />
      <Tab.Screen name="Saved" component={SavedStack} options={{ tabBarLabel: 'Saved', tabBarIcon: tabIcon('♥') }} />
      <Tab.Screen name="Bookings" component={BookingsStack} options={{ tabBarLabel: 'Bookings', tabBarIcon: tabIcon('📋') }} />
      <Tab.Screen name="Inbox" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications', tabBarIcon: tabIcon('🔔') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ headerShown: true, title: 'Account', tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}

function LandlordTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#0047AB' }}>
      <Tab.Screen name="Listings" component={LandlordListingsStack} options={{ tabBarLabel: 'Listings', tabBarIcon: tabIcon('🏠') }} />
      <Tab.Screen
        name="Requests"
        component={BookingsStack}
        initialParams={{ mode: 'landlord' }}
        options={{ tabBarLabel: 'Requests', tabBarIcon: tabIcon('📋') }}
      />
      <Tab.Screen name="Inbox" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications', tabBarIcon: tabIcon('🔔') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ headerShown: true, title: 'Account', tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#0047AB' }}>
      <Tab.Screen name="Review" component={AdminHomeScreen} options={{ headerShown: true, title: 'Admin', tabBarIcon: tabIcon('🛡') }} />
      <Tab.Screen
        name="Bookings"
        component={BookingsStack}
        initialParams={{ mode: 'admin' }}
        options={{ tabBarLabel: 'Bookings', tabBarIcon: tabIcon('📋') }}
      />
      <Tab.Screen name="Inbox" component={NotificationsScreen} options={{ headerShown: true, title: 'Notifications', tabBarIcon: tabIcon('🔔') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ headerShown: true, title: 'Account', tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user } = useAuth();
  if (user?.role === 'landlord') return <LandlordTabs />;
  if (user?.role === 'admin') return <AdminTabs />;
  return <StudentTabs />;
}
