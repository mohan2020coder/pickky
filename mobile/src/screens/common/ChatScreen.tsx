import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, TextInput, View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { AppText, ChatBubble, Screen, ScreenHeader } from '../../components';
import { useConversations, useMessages, useMarkConversationRead, useSendMessage, useCurrentUser } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import type { CustomerFlowStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CustomerFlowStackParamList, 'Chat'>;

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

  return (
    <Screen>
      <ScreenHeader title={title} subtitle="Live chat" onBack={() => navigation.goBack()} />
      <FlatList
        ref={listRef}
        data={messages}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: theme.spacing.md }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} isMine={item.sender_id === user?.id} />}
        ListEmptyComponent={
          <AppText variant="body" tone="muted" center style={{ marginTop: theme.spacing.xl }}>
            No messages yet. Say hi to your rider!
          </AppText>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.bottom}>
        <View style={[styles.composer, { borderTopColor: theme.colors.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary }]}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Enter') {
                handleSend();
              }
            }}
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim() || !resolvedConversationId}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: draft.trim() ? theme.colors.primary : theme.colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  composer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, maxHeight: 110, fontSize: 16 },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});