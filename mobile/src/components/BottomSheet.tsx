import React, { useEffect, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { AppText } from './AppText';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  scroll?: boolean;
  maxHeightRatio?: number;
  footer?: React.ReactNode;
};

export const BottomSheet = ({ visible, onClose, title, children, scroll = true, maxHeightRatio = 0.85, footer }: BottomSheetProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const translate = useRef(new Animated.Value(600)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translate, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 4 }),
        Animated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      translate.setValue(600);
      backdrop.setValue(0);
    }
  }, [visible, translate, backdrop]);

  const body = (
    <View style={{ paddingBottom: insets.bottom + theme.spacing.lg }}>
      {title ? (
        <View style={{ alignItems: 'center', paddingBottom: theme.spacing.md }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border }} />
          <AppText variant="heading3" style={{ marginTop: theme.spacing.md }}>
            {title}
          </AppText>
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay, opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrapper} pointerEvents="box-none">
        <Animated.View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.lg,
            maxHeight: `${maxHeightRatio * 100}%`,
            transform: [{ translateY: translate }],
          }}
        >
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {body}
            </ScrollView>
          ) : (
            body
          )}
          {footer ? <View style={{ paddingTop: theme.spacing.md }}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 5 }).start();
    }
  }, [visible, scale]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Animated.View
          accessibilityViewIsModal
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.xl,
            padding: theme.spacing.xxl,
            width: '100%',
            maxWidth: 380,
            transform: [{ scale }],
          }}
        >
          <AppText variant="heading3">{title}</AppText>
          {message ? (
            <AppText variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
              {message}
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              style={({ pressed }) => [
                {
                  flex: 1,
                  minHeight: 48,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <AppText variant="label">{cancelLabel}</AppText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              style={({ pressed }) => [
                {
                  flex: 1,
                  minHeight: 48,
                  borderRadius: theme.radius.pill,
                  backgroundColor: destructive ? theme.colors.error : theme.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText variant="label" color="#FFFFFF">
                {confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: 'flex-end' },
});
