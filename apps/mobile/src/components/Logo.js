import React from 'react';
import { Image, StyleSheet } from 'react-native';

const SIZES = {
  sm: { width: 120, height: 40 },
  md: { width: 160, height: 53 },
  lg: { width: 200, height: 67 },
  auth: { width: 180, height: 60 },
};

export default function Logo({ size = 'md', style }) {
  const dims = SIZES[size] || SIZES.md;
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={[styles.logo, { width: dims.width, height: dims.height }, style]}
      accessibilityRole="image"
      accessibilityLabel="ResiSure"
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
  },
});
