import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppText } from '../../components';
import { config } from '../../config';

export const SplashScreen = () => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <View style={[styles.logo, { backgroundColor: theme.colors.primarySoft }]}>
          <Ionicons name="cube" size={40} color={theme.colors.primary} />
        </View>
        <AppText variant="heading1" weight="800" style={{ marginTop: theme.spacing.lg }}>
          {config.appName}
        </AppText>
        <AppText variant="body" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
          You need it. Pickky gets it.
        </AppText>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 84, height: 84, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});