import React from 'react';
import { Pressable, StyleProp, TextInput, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from './AppText';
import { Message } from '../types';
import { formatTime } from '../utils/format';

type ChatBubbleProps = {
  message: Message;
  isMine: boolean;
  showTime?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const ChatBubble = ({ message, isMine, showTime = true, style }: ChatBubbleProps) => {
  const theme = useTheme();
  const failed = message.delivery_status === 'failed';
  const sending = message.delivery_status === 'sending';

  return (
    <View
      style={[
        {
          alignSelf: isMine ? 'flex-end' : 'flex-start',
          maxWidth: '80%',
          marginBottom: theme.spacing.md,
        },
        style,
      ]}
    >
      <View
        accessibilityRole="text"
        accessibilityLabel={`${isMine ? 'You' : 'Them'} said: ${message.body}`}
        style={{
          backgroundColor: isMine ? theme.colors.primary : theme.colors.surface,
          borderWidth: isMine ? 0 : 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.large,
          borderBottomRightRadius: isMine ? theme.radius.small : theme.radius.large,
          borderBottomLeftRadius: isMine ? theme.radius.large : theme.radius.small,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        }}
      >
        <AppText variant="body" color={isMine ? '#FFFFFF' : theme.colors.textPrimary}>
          {message.body}
        </AppText>
      </View>
      {showTime ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: isMine ? 'flex-end' : 'flex-start', gap: 4 }}>
          <AppText variant="caption" tone="muted">
            {formatTime(message.created_at)}
          </AppText>
          {isMine ? (
            failed ? (
              <Ionicons name="alert-circle" size={12} color={theme.colors.error} />
            ) : sending ? (
              <Ionicons name="time" size={12} color={theme.colors.textMuted} />
            ) : (
              <Ionicons name="checkmark-done" size={12} color={message.read_at ? theme.colors.primary : theme.colors.textMuted} />
            )
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

type MessageInputProps = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export const MessageInput = ({ value, onChange, onSend, disabled = false, placeholder = 'Type a message…' }: MessageInputProps) => {
  const theme = useTheme();
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.divider,
        backgroundColor: theme.colors.surface,
        gap: theme.spacing.sm,
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          paddingHorizontal: theme.spacing.lg,
          minHeight: 46,
          justifyContent: 'center',
        }}
      >
        <AppInputInline value={value} onChange={onChange} placeholder={placeholder} editable={!disabled} />
      </View>
      <Pressable
        onPress={canSend ? onSend : undefined}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend }}
        style={({ pressed }) => ({
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: canSend ? theme.colors.primary : theme.colors.divider,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="send" size={18} color={canSend ? '#FFFFFF' : theme.colors.textMuted} />
      </Pressable>
    </View>
  );
};

const AppInputInline = ({ value, onChange, placeholder, editable }: { value: string; onChange: (t: string) => void; placeholder: string; editable: boolean }) => {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textMuted}
      editable={editable}
      multiline
      maxLength={1000}
      accessibilityLabel="Message"
      style={{
        color: theme.colors.textPrimary,
        fontSize: theme.typography.body.fontSize,
        paddingVertical: theme.spacing.sm,
        maxHeight: 110,
      }}
    />
  );
};
