import React, { useState } from 'react';

import {

  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Switch, ScrollView, KeyboardAvoidingView, Platform,

} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { registerUser } from '../lib/api';

import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { brand } from '../theme';



export default function RegisterScreen({ navigation }) {

  const { login } = useAuth();

  const [form, setForm] = useState({

    full_name: '',

    email: '',

    phone: '',

    password: '',

    role: 'student',

    accepted_terms: false,

  });

  const [loading, setLoading] = useState(false);



  const onSubmit = async () => {

    if (!form.accepted_terms) {

      Alert.alert('Consent required', 'Accept the Terms and Privacy Policy to continue.');

      return;

    }

    if (form.password.length < 8) {

      Alert.alert('Password too short', 'Use at least 8 characters.');

      return;

    }

    setLoading(true);

    try {

      const res = await registerUser(form);

      await login(res.data.data.token, res.data.data.user);

    } catch (err) {

      Alert.alert('Registration failed', err.response?.data?.message || err.message);

    } finally {

      setLoading(false);

    }

  };



  return (

    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <Logo size="auth" style={styles.logo} />
          <Text style={styles.heading} accessibilityRole="header">Create your account</Text>
          <Text style={styles.sub}>Student or landlord — payment protection included</Text>



          <View style={styles.roleRow} accessibilityRole="radiogroup" accessibilityLabel="Account type">

            {['student', 'landlord'].map((role) => (

              <TouchableOpacity

                key={role}

                style={[styles.role, form.role === role && styles.roleOn]}

                onPress={() => setForm({ ...form, role })}

                accessibilityRole="radio"

                accessibilityState={{ selected: form.role === role }}

                accessibilityLabel={role === 'student' ? 'Student account' : 'Landlord account'}

              >

                <Text style={[styles.roleText, form.role === role && styles.roleTextOn]}>

                  {role}

                </Text>

              </TouchableOpacity>

            ))}

          </View>



          {[

            ['full_name', 'Full name', false],

            ['email', 'Email', false],

            ['phone', 'Phone (optional)', false],

            ['password', 'Password (min 8)', true],

          ].map(([key, label, secure]) => (

            <View key={key}>

              <Text nativeID={`${key}-label`} style={styles.fieldLabel}>{label}</Text>

              <TextInput

                style={styles.input}

                secureTextEntry={secure}

                autoCapitalize={key === 'email' ? 'none' : 'sentences'}

                keyboardType={key === 'email' ? 'email-address' : key === 'phone' ? 'phone-pad' : 'default'}

                placeholder={label}

                value={form[key]}

                onChangeText={(v) => setForm({ ...form, [key]: v })}

                accessibilityLabel={label}

                accessibilityLabelledBy={`${key}-label`}

              />

            </View>

          ))}



          <View style={styles.row}>

            <Switch

              value={form.accepted_terms}

              onValueChange={(v) => setForm({ ...form, accepted_terms: v })}

              accessibilityLabel="Accept Terms of Use and Privacy Policy"

              accessibilityState={{ checked: form.accepted_terms }}

            />

            <Text style={styles.consent}>I accept Terms of Use & Privacy Policy</Text>

          </View>



          <TouchableOpacity

            style={[styles.button, loading && styles.buttonDisabled]}

            onPress={onSubmit}

            disabled={loading}

            accessibilityRole="button"

            accessibilityState={{ disabled: loading, busy: loading }}

          >

            <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Create account'}</Text>

          </TouchableOpacity>



          <TouchableOpacity

            onPress={() => navigation.goBack()}

            accessibilityRole="link"

            accessibilityLabel="Already have an account? Sign in"

            style={styles.linkWrap}

          >

            <Text style={styles.link}>Already have an account? Sign in</Text>

          </TouchableOpacity>

        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>

  );

}



const styles = StyleSheet.create({

  safe: { flex: 1, backgroundColor: '#f8fafc' },

  container: { padding: 24, paddingBottom: 40 },

  logo: { marginBottom: 12 },
  heading: { fontSize: 22, fontWeight: '800', color: brand.primary, textAlign: 'center' },
  sub: { color: '#64748b', marginBottom: 24, marginTop: 4, textAlign: 'center' },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },

  input: {

    backgroundColor: '#fff',

    borderWidth: 1,

    borderColor: '#e2e8f0',

    borderRadius: 12,

    paddingHorizontal: 14,

    paddingVertical: 12,

    marginBottom: 12,

    minHeight: 48,

  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, minHeight: 44 },

  consent: { flex: 1, color: '#475569', fontSize: 13 },

  button: {

    backgroundColor: brand.primary,

    borderRadius: 12,

    paddingVertical: 14,

    alignItems: 'center',

    minHeight: 48,

    justifyContent: 'center',

  },

  buttonDisabled: { opacity: 0.6 },

  buttonText: { color: '#fff', fontWeight: '700' },

  linkWrap: { paddingVertical: 12, minHeight: 44, justifyContent: 'center' },

  link: { textAlign: 'center', color: brand.primary, marginTop: 6, fontWeight: '600' },

  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  role: {

    flex: 1,

    borderWidth: 1,

    borderColor: '#cbd5e1',

    borderRadius: 12,

    paddingVertical: 12,

    alignItems: 'center',

    minHeight: 44,

    justifyContent: 'center',

  },

  roleOn: { backgroundColor: brand.light, borderColor: brand.primary },

  roleText: { color: '#475569', fontWeight: '700', textTransform: 'capitalize' },

  roleTextOn: { color: brand.primary },

});

