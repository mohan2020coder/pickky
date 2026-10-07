import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Toast, useToastStore } from '../stores/uiStore';

export const ToastHost = () => {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </View>
  );
};

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) => {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [translateY, opacity]);

  const toneIcon =
    toast.tone === 'success' ? 'checkmark-circle' : toast.tone === 'error' ? 'alert-circle' : toast.tone === 'info' ? 'information-circle' : 'notifications';
  const toneColor =
    toast.tone === 'success' ? theme.colors.success : toast.tone === 'error' ? theme.colors.error : toast.tone === 'info' ? theme.colors.info : theme.colors.primary;

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity, marginBottom: 8 }}>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
        style={[
          styles.toast,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderLeftColor: toneColor,
            borderLeftWidth: 4,
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
        <Ionicons name={toneIcon} size={18} color={toneColor} style={{ marginRight: 10 }} />
        <AppText variant="bodySmall" style={{ flex: 1 }} weight="500">
          {toast.message}
        </AppText>
        {toast.actionLabel ? (
          <Pressable onPress={toast.onAction} hitSlop={8} accessibilityRole="button">
            <AppText variant="label" tone="primary" style={{ marginLeft: 12 }}>
              {toast.actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 10,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
