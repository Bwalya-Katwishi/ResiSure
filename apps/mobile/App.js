import React from 'react';

import { StatusBar } from 'expo-status-bar';

import { NavigationContainer } from '@react-navigation/native';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';

import AuthNavigator from './src/navigation/AuthNavigator';

import AppNavigator from './src/navigation/AppNavigator';

import { ActivityIndicator, View, Text } from 'react-native';



function Root() {

  const { user, loading } = useAuth();



  if (loading) {

    return (

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} accessible accessibilityRole="progressbar" accessibilityLabel="Loading ResiSure">

        <ActivityIndicator size="large" color="#0047AB" />

        <Text style={{ marginTop: 12, color: '#64748b' }}>Loading…</Text>

      </View>

    );

  }



  return (

    <NavigationContainer>

      {user ? <AppNavigator /> : <AuthNavigator />}

      <StatusBar style="dark" />

    </NavigationContainer>

  );

}



export default function App() {

  return (

    <SafeAreaProvider>

      <AuthProvider>

        <Root />

      </AuthProvider>

    </SafeAreaProvider>

  );

}

