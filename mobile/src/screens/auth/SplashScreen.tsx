import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppText, Gradient } from '../../components';
import { config } from '../../config';

export const SplashScreen = () => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Gradient preset="hero" style={StyleSheet.absoluteFill} />
      <Animated.View style={{ opacity, transform: [{ scale }], alignItems: 'center' }}>
        <Gradient
          preset="cta"
          style={{
            width: 96,
            height: 96,
            borderRadius: 30,
            alignItems: 'center',
            justifyContent: 'center',
            ...theme.shadows.glow,
          }}
        >
          <Ionicons name="cube" size={48} color={theme.colors.onPrimary} />
        </Gradient>
        <AppText variant="display" weight="800" color={theme.colors.onPrimary} center style={{ marginTop: theme.spacing.xl }}>
          {config.appName}
        </AppText>
        <AppText variant="heading3" weight="600" color={theme.colors.onPrimary} center style={{ marginTop: theme.spacing.xs, opacity: 0.95 }}>
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