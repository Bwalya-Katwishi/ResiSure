import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginUser } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '@resisure/shared/validation/auth';
import Logo from '../components/Logo';
import { brand } from '../theme';

export default function LoginScreen({ navigation, route }) {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (route.params?.reason === 'session_expired' || sessionExpired) {
      Alert.alert('Session expired', 'Please sign in again.');
      clearSessionExpired();
    }
  }, [route.params?.reason, sessionExpired, clearSessionExpired]);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await loginUser({ email: email.trim(), password });
      await login(res.data.data.token, res.data.data.user);
    } catch (err) {
      Alert.alert('Login failed', getApiErrorMessage(err, 'We could not sign you in.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Logo size="auth" style={styles.logo} />
        <Text style={styles.sub}>Escrow-protected student housing</Text>

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
          returnKeyType="next"
        />
        <Text nativeID="password-label" style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          placeholder="Your password"
          value={password}
          onChangeText={setPassword}
          accessibilityLabel="Password"
          accessibilityLabelledBy="password-label"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />

        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          accessibilityRole="link"
          style={styles.forgotWrap}
        >
          <Text style={styles.forgotLink}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading, busy: loading }}
          accessibilityLabel={loading ? 'Signing in' : 'Sign in'}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          accessibilityRole="link"
          accessibilityLabel="Create student or landlord account"
          style={styles.linkWrap}
        >
          <Text style={styles.link}>Create student or landlord account</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  logo: { marginBottom: 8 },
  sub: { color: '#64748b', marginBottom: 28, marginTop: 4, textAlign: 'center' },
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
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 4, minHeight: 44, justifyContent: 'center' },
  forgotLink: { color: brand.primary, fontSize: 13, fontWeight: '600' },
  button: {
    backgroundColor: brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
  linkWrap: { paddingVertical: 12, minHeight: 44, justifyContent: 'center' },
  link: { textAlign: 'center', color: brand.primary, marginTop: 6, fontWeight: '600' },
});
