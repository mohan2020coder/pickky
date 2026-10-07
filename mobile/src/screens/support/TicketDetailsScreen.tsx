import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SupportHomeStackParamList, SupportTicketsStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Badge, ChatBubble, Screen, ScreenHeader } from '../../components';
import { useCurrentUser, useSendTicketMessage, useTicket, useTicketMessages } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import { formatRelativeTime } from '../../utils/format';
import { Message, SupportTicket, TicketMessage } from '../../types';

type TicketDetailsParamLists = SupportHomeStackParamList & SupportTicketsStackParamList;

type Props = NativeStackScreenProps<TicketDetailsParamLists, 'TicketDetails'>;

const STATUS_TONE: Record<SupportTicket['status'], 'neutral' | 'primary' | 'success' | 'warning'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'primary',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

const asMessage = (ticketId: string, m: TicketMessage): Message => ({
  id: m.id,
  conversation_id: ticketId,
  sender_id: m.sender_id,
  body: m.body,
  created_at: m.created_at,
});

export const TicketDetailsScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const ticketId = route.params?.ticketId;
  const listRef = useRef<FlatList>(null);
  const [draft, setDraft] = useState('');

  const { data: user } = useCurrentUser();
  const { data: ticket } = useTicket(ticketId);
  const { data: messages = [] } = useTicketMessages(ticketId);
  const send = useSendTicketMessage(ticketId ?? '');

  useEffect(() => {
    if (messages.length) listRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || !ticketId) return;
    send.mutate(body, {
      onSuccess: () => setDraft(''),
      onError: () => toast('Message failed to send.', { tone: 'error' }),
    });
  };

  return (
    <Screen>
      <ScreenHeader
        title={ticket?.subject ?? 'Ticket'}
        subtitle={ticket ? `${ticket.reference ?? 'Ticket'} · ${formatRelativeTime(ticket.created_at)}` : 'Loading…'}
        onBack={() => navigation.goBack()}
        right={ticket ? <Badge label={ticket.status.replace('_', ' ')} tone={STATUS_TONE[ticket.status]} /> : undefined}
      />
      <FlatList
        ref={listRef}
        data={messages}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: theme.spacing.md }}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <AppText variant="body" tone="muted" center style={{ marginTop: theme.spacing.xl }}>
            {ticket ? 'No messages yet. Start the conversation below.' : 'Loading ticket…'}
          </AppText>
        }
        renderItem={({ item }) =>
          item.is_internal ? (
            <View
              style={{
                alignSelf: 'stretch',
                backgroundColor: theme.colors.warningSoft,
                borderRadius: theme.radius.large,
                borderWidth: 1,
                borderColor: theme.colors.warning,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
              }}
            >
              <Badge label="Internal note" tone="warning" />
              <AppText variant="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
                {item.body}
              </AppText>
            </View>
          ) : (
            <View>
              {item.sender_id !== user?.id && item.sender_name ? (
                <AppText variant="caption" tone="muted" style={{ marginBottom: 4, marginLeft: 4 }}>
                  {item.sender_name} · {formatRelativeTime(item.created_at)}
                </AppText>
              ) : null}
              <ChatBubble message={asMessage(ticketId ?? '', item)} isMine={item.sender_id === user?.id} />
            </View>
          )
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.bottom}>
        <View style={[styles.composer, { borderTopColor: theme.colors.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a reply…"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[
              styles.input,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary },
            ]}
            accessibilityLabel="Reply message"
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim() || !ticketId || send.isPending}
            accessibilityRole="button"
            accessibilityLabel="Send reply"
            accessibilityState={{ disabled: !draft.trim() || !ticketId, busy: send.isPending }}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: draft.trim() && ticketId ? theme.colors.primary : theme.colors.border,
                opacity: pressed ? 0.85 : 1,
              },
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
