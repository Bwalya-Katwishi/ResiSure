import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgotPassword } from '../lib/api';
import { getApiErrorMessage } from '@resisure/shared/validation/auth';
import Logo from '../components/Logo';
import { brand } from '../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Enter the email linked to your account.');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setSent(true);
      Alert.alert('Check your email', res.data.message);
    } catch (err) {
      Alert.alert('Request failed', getApiErrorMessage(err, 'Could not send reset instructions.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Logo size="auth" style={styles.logo} />
        <Text style={styles.heading} accessibilityRole="header">Forgot password</Text>
        <Text style={styles.sub}>
          {sent
            ? 'If that email is registered, we sent reset instructions.'
            : 'Enter your email and we will send reset instructions.'}
        </Text>

        <Text nativeID="email-label" style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          accessibilityLabel="Email address"
          accessibilityLabelledBy="email-label"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading, busy: loading }}
        >
          <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send reset link'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          accessibilityRole="link"
          style={styles.linkWrap}
        >
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { marginBottom: 12 },
  heading: { fontSize: 22, fontWeight: '800', color: brand.primary, textAlign: 'center', marginBottom: 4 },
  sub: { color: '#64748b', marginBottom: 28, marginTop: 4, lineHeight: 20, textAlign: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, minHeight: 48,
  },
  button: {
    backgroundColor: brand.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 8, minHeight: 48, justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  linkWrap: { paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
  link: { textAlign: 'center', color: brand.primary, marginTop: 6, fontWeight: '600' },
});
