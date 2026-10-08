import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Button, IconName } from './Button';
import { Gradient } from './Gradient';

export const LoadingView = ({ label = 'Loading…' }: { label?: string }) => {
  const theme = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <AppText variant="body" tone="secondary" style={{ marginTop: theme.spacing.md }}>
        {label}
      </AppText>
    </View>
  );
};

export const InlineLoader = ({ label }: { label?: string }) => {
  const theme = useTheme();
  return (
    <View style={styles.inline} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      <ActivityIndicator size="small" color={theme.colors.primary} />
      {label ? (
        <AppText variant="bodySmall" tone="secondary" style={{ marginLeft: theme.spacing.sm }}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
};

type ErrorViewProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: IconName;
  compact?: boolean;
};

export const ErrorView = ({
  title = 'Something went wrong',
  message = "We couldn't load this right now. Please try again.",
  onRetry,
  retryLabel = 'Try Again',
  compact = false,
}: ErrorViewProps) => {
  const theme = useTheme();
  return (
    <View
      style={[styles.center, compact && { paddingVertical: theme.spacing.xxl, backgroundColor: 'transparent' }]}
      accessibilityRole="alert"
    >
      <Gradient
        preset="danger"
        style={{
          width: 72,
          height: 72,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.lg,
          ...theme.shadows.medium,
        }}
      >
        <Ionicons name="alert" size={32} color="#FFFFFF" />
      </Gradient>
      <AppText variant="heading3" center>
        {title}
      </AppText>
      <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm, maxWidth: 300 }}>
        {message}
      </AppText>
      {onRetry ? (
        <Button label={retryLabel} onPress={onRetry} fullWidth={false} style={{ marginTop: theme.spacing.xl }} icon="refresh" />
      ) : null}
    </View>
  );
};

type EmptyViewProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
};

export const EmptyView = ({ title, message, actionLabel, onAction, icon = 'file-tray-outline' }: EmptyViewProps) => {
  const theme = useTheme();
  return (
    <View style={styles.center} accessibilityRole="text">
      <Gradient
        preset="sheen"
        style={{
          width: 84,
          height: 84,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.lg,
        }}
      >
        <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={30} color={theme.colors.primary} />
        </View>
      </Gradient>
      <AppText variant="heading3" center>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm, maxWidth: 300 }}>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} style={{ marginTop: theme.spacing.xl }} icon="add" />
      ) : null}
    </View>
  );
};

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export const Skeleton = ({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) => {
  const theme = useTheme();
  const translate = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translate, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [translate]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius, backgroundColor: theme.colors.skeleton, overflow: 'hidden' }, style]}
    >
      <Animated.View
        style={{
          width: '60%',
          height: '100%',
          backgroundColor: theme.colors.skeletonHighlight,
          transform: [{ translateX: translate.interpolate({ inputRange: [-1, 1], outputRange: [-120, 220] }) }],
        }}
      />
    </View>
  );
};

export const SkeletonList = ({ rows = 3 }: { rows?: number }) => {
  const theme = useTheme();
  return (
    <View style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={`sk-${index}`} style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.large, padding: theme.spacing.lg, gap: theme.spacing.sm }}>
          <Skeleton width="45%" height={14} />
          <Skeleton width="80%" height={12} />
          <Skeleton width="30%" height={12} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
});
