import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { DELIVERY_FLOW, STATUS_META } from '../constants/delivery';
import { DeliveryStatus } from '../types';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';

export const StatusBadge = ({ status, style }: { status: DeliveryStatus; style?: StyleProp<ViewStyle> }) => {
  const theme = useTheme();
  const meta = STATUS_META[status];
  const toneColors: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: theme.colors.divider, fg: theme.colors.textSecondary },
    primary: { bg: theme.colors.primarySoft, fg: theme.colors.primary },
    success: { bg: theme.colors.successSoft, fg: theme.colors.success },
    warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
    error: { bg: theme.colors.errorSoft, fg: theme.colors.error },
    info: { bg: theme.colors.infoSoft, fg: theme.colors.info },
  };
  const palette = toneColors[meta.tone];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Delivery status: ${meta.label}`}
      style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.bg, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.md, paddingVertical: 5, alignSelf: 'flex-start' }, style]}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.fg, marginRight: 6 }} />
      <AppText variant="caption" color={palette.fg} weight="700">
        {meta.shortLabel}
      </AppText>
    </View>
  );
};

export const StatusTimeline = ({ status, compact = false }: { status: DeliveryStatus; compact?: boolean }) => {
  const theme = useTheme();
  const meta = STATUS_META[status];
  const isTerminalError = status === 'CANCELLED' || status === 'FAILED';

  const steps = isTerminalError
    ? [status]
    : DELIVERY_FLOW;
  const currentIndex = isTerminalError ? 0 : meta.stepIndex;

  return (
    <View accessibilityRole="list" accessibilityLabel="Delivery progress">
      {steps.map((step, index) => {
        const stepStatus = isTerminalError ? status : step;
        const stepMeta = STATUS_META[stepStatus];
        const done = !isTerminalError && index < currentIndex;
        const active = index === currentIndex;
        const isLast = index === steps.length - 1;
        const color = done
          ? theme.colors.success
          : active
            ? theme.colors.primary
            : theme.colors.border;

        if (compact && !done && !active && !isLast) return null;

        return (
          <View key={stepStatus} style={styles.row} accessibilityRole="text" accessibilityLabel={`${stepMeta.label} ${done ? 'completed' : active ? 'in progress' : 'pending'}`}>
            <View style={styles.gutter}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: done || active ? color : theme.colors.surface,
                  borderWidth: done || active ? 0 : 2,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : active ? (
                  <ActiveDot />
                ) : null}
              </View>
              {!isLast ? <View style={{ width: 2, flex: 1, backgroundColor: done ? theme.colors.success : theme.colors.border, minHeight: 22 }} /> : null}
            </View>
            <View style={[styles.content, { paddingBottom: isLast ? 0 : theme.spacing.lg }]}>
              <AppText variant="body" weight={active ? '700' : '500'} tone={done || active ? 'default' : 'muted'}>
                {stepMeta.label}
              </AppText>
              {active && stepMeta.description ? (
                <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 2 }}>
                  {stepMeta.description}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const ActiveDot = () => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);
  return <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF', transform: [{ scale }] }} />;
};

export const ProgressIndicator = ({ progress, label }: { progress: number; label?: string }) => {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      {label ? (
        <AppText variant="caption" tone="secondary" style={{ marginBottom: 6 }}>
          {label}
        </AppText>
      ) : null}
      <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.divider, overflow: 'hidden' }}>
        <View style={{ width: `${clamped * 100}%`, height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  gutter: { width: 24, alignItems: 'center' },
  content: { flex: 1, paddingLeft: 12 },
});
