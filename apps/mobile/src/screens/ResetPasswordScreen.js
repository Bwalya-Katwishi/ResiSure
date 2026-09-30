import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetPassword } from '../lib/api';
import { getApiErrorMessage, MIN_PASSWORD_LENGTH } from '@resisure/shared/validation/auth';
import Logo from '../components/Logo';
import { brand } from '../theme';

export default function ResetPasswordScreen({ navigation, route }) {
  const token = route.params?.token || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!token) {
      Alert.alert('Invalid link', 'This reset link is missing a token. Request a new one.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      Alert.alert('Password too short', `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Confirm your new password.');
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword({ token, password });
      Alert.alert('Password updated', res.data.message, [
        { text: 'Sign in', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      Alert.alert('Reset failed', getApiErrorMessage(err, 'Could not reset password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Logo size="auth" style={styles.logo} />
        <Text style={styles.heading} accessibilityRole="header">Reset password</Text>
        <Text style={styles.sub}>Choose a new password for your account.</Text>

        <Text nativeID="password-label" style={styles.fieldLabel}>New password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={password}
          onChangeText={setPassword}
          accessibilityLabel="New password"
          accessibilityLabelledBy="password-label"
        />

        <Text nativeID="confirm-label" style={styles.fieldLabel}>Confirm password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder="Repeat password"
          value={confirm}
          onChangeText={setConfirm}
          accessibilityLabel="Confirm password"
          accessibilityLabelledBy="confirm-label"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{loading ? 'Updating…' : 'Update password'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
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
  sub: { color: '#64748b', marginBottom: 28, marginTop: 4, textAlign: 'center' },
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
