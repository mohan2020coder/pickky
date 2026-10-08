import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, TextInput, View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { AppText, Avatar, ChatBubble, Gradient, Screen, ScreenHeader } from '../../components';
import { useConversations, useMessages, useMarkConversationRead, useSendMessage, useCurrentUser } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import type { CustomerFlowStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CustomerFlowStackParamList, 'Chat'>;

const dayKey = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (dayKey(iso) === dayKey(now.toISOString())) return 'Today';
  if (d.getFullYear() === yesterday.getFullYear() && d.getMonth() === yesterday.getMonth() && d.getDate() === yesterday.getDate()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ChatScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = (route.params ?? {}) as NonNullable<Props['route']['params']>;
  const { conversationId: paramConversationId, deliveryId } = params;
  const listRef = useRef<FlatList>(null);
  const [draft, setDraft] = useState('');

  const { data: user } = useCurrentUser();
  const { data: conversations } = useConversations(deliveryId);

  const resolvedConversationId = useMemo(() => {
    if (deliveryId) {
      const conv = (conversations ?? []).find((c) => c.delivery_id === deliveryId);
      return conv?.id ?? conversations?.[0]?.id;
    }
    return paramConversationId;
  }, [deliveryId, conversations, paramConversationId]);

  const { data: messages = [] } = useMessages(resolvedConversationId);
  const send = useSendMessage(resolvedConversationId ?? '');
  const markRead = useMarkConversationRead(resolvedConversationId ?? '');

  useEffect(() => {
    if (resolvedConversationId) markRead.mutate();
  }, [resolvedConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length) listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const title = params.title ?? conversations?.[0]?.title ?? deliveryId ?? 'Chat';

  const handleSend = () => {
    const body = draft.trim();
    if (!body || !resolvedConversationId) return;
    send.mutate(body, {
      onSuccess: () => setDraft(''),
      onError: () => toast('Message failed to send.', { tone: 'error' }),
    });
  };

  const canSend = !!draft.trim() && !!resolvedConversationId;

  return (
    <Screen>
      <ScreenHeader
        title={title}
        subtitle="Live chat"
        onBack={() => navigation.goBack()}
        right={<Avatar name={title} size={36} ring />}
      />
      <FlatList
        ref={listRef}
        data={messages}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: theme.spacing.md }}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const prev = index > 0 ? messages[index - 1] : undefined;
          const showDay = !prev || dayKey(prev.created_at) !== dayKey(item.created_at);
          return (
            <View>
              {showDay ? (
                <View style={{ alignItems: 'center', marginVertical: theme.spacing.sm }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.surfaceSunken,
                      borderRadius: theme.radius.pill,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: 5,
                      borderWidth: 1,
                      borderColor: theme.colors.divider,
                    }}
                  >
                    <AppText variant="caption" tone="secondary" weight="700">
                      {dayLabel(item.created_at)}
                    </AppText>
                  </View>
                </View>
              ) : null}
              <ChatBubble message={item} isMine={item.sender_id === user?.id} />
            </View>
          );
        }}
        ListEmptyComponent={
          <AppText variant="body" tone="muted" center style={{ marginTop: theme.spacing.xl }}>
            No messages yet. Say hi to your rider!
          </AppText>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.bottom}>
        <View style={[styles.composer, { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.surface }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[styles.input, { backgroundColor: theme.colors.surfaceSunken, borderColor: canSend ? theme.colors.primary : 'transparent', color: theme.colors.textPrimary }]}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Enter') {
                handleSend();
              }
            }}
            accessibilityLabel="Message"
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: canSend ? theme.colors.primary : theme.colors.surfaceSunken, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {canSend ? <Gradient preset="cta" style={StyleSheet.absoluteFill} /> : null}
            <Ionicons name="arrow-up" size={20} color={canSend ? theme.colors.onPrimary : theme.colors.textMuted} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  composer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, maxHeight: 110, fontSize: 16 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
