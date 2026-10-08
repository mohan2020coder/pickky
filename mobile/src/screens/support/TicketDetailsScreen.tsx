import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SupportHomeStackParamList, SupportTicketsStackParamList } from '../../navigation/types';
import { useTheme, GradientPreset } from '../../theme';
import { AppText, Badge, Card, ChatBubble, Divider, Entrance, Gradient, Screen, ScreenHeader } from '../../components';
import { useCurrentUser, useSendTicketMessage, useTicket, useTicketMessages } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import { formatDateTime, formatRelativeTime } from '../../utils/format';
import { Message, SupportTicket, TicketMessage } from '../../types';

type TicketDetailsParamLists = SupportHomeStackParamList & SupportTicketsStackParamList;

type Props = NativeStackScreenProps<TicketDetailsParamLists, 'TicketDetails'>;

const STATUS_TONE: Record<SupportTicket['status'], 'neutral' | 'primary' | 'success' | 'warning'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'primary',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

const STATUS_GRADIENT: Record<SupportTicket['status'], GradientPreset> = {
  OPEN: 'sunset',
  IN_PROGRESS: 'ocean',
  RESOLVED: 'success',
  CLOSED: 'charcoal',
};

const PRIORITY_TONE: Record<SupportTicket['priority'], 'neutral' | 'warning' | 'error'> = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'error',
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

  const canSend = !!draft.trim() && !!ticketId && !send.isPending;

  const renderHeader = () => {
    if (!ticket) return null;
    return (
      <View>
        <Entrance delay={0}>
          <Card variant="gradient" gradientPreset={STATUS_GRADIENT[ticket.status]} accessibilityLabel={`Ticket ${ticket.subject}`}>
            <AppText variant="eyebrow" color={theme.colors.textOnGradient} style={{ opacity: 0.85 }}>
              {ticket.reference ?? 'TICKET'}
            </AppText>
            <AppText variant="heading2" color={theme.colors.textOnGradient} style={{ marginTop: theme.spacing.xs }}>
              {ticket.subject}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.45)',
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: 5,
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF', marginRight: 6 }} />
                <AppText variant="caption" color={theme.colors.textOnGradient} weight="800">
                  {ticket.status.replace('_', ' ')}
                </AppText>
              </View>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.45)',
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: 5,
                }}
              >
                <AppText variant="caption" color={theme.colors.textOnGradient} weight="800">
                  {ticket.priority} priority
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color={theme.colors.textOnGradient} style={{ opacity: 0.8, marginTop: theme.spacing.md }}>
              Opened {formatDateTime(ticket.created_at)}
            </AppText>
          </Card>
        </Entrance>

        <Entrance delay={90}>
          <Card style={{ marginTop: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                <AppText variant="eyebrow" tone="muted">
                  Ticket ID
                </AppText>
                <AppText variant="label" weight="700" style={{ marginTop: 2 }}>
                  {ticket.reference ?? ticket.id}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="eyebrow" tone="muted">
                  Priority
                </AppText>
                <View style={{ marginTop: 4 }}>
                  <Badge dot label={ticket.priority} tone={PRIORITY_TONE[ticket.priority]} />
                </View>
              </View>
            </View>
            <Divider style={{ marginVertical: theme.spacing.md }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                <AppText variant="eyebrow" tone="muted">
                  Category
                </AppText>
                <AppText variant="label" weight="600" style={{ marginTop: 2 }}>
                  {ticket.category ?? 'general'}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="eyebrow" tone="muted">
                  Last update
                </AppText>
                <AppText variant="label" weight="600" style={{ marginTop: 2 }}>
                  {formatRelativeTime(ticket.updated_at ?? ticket.created_at)}
                </AppText>
              </View>
            </View>
          </Card>
        </Entrance>

        <AppText variant="eyebrow" tone="muted" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
          Conversation
        </AppText>
      </View>
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title={ticket?.subject ?? 'Ticket'}
        subtitle={ticket ? `${ticket.reference ?? 'Ticket'} · ${formatRelativeTime(ticket.created_at)}` : 'Loading…'}
        onBack={() => navigation.goBack()}
        right={ticket ? <Badge dot label={ticket.status.replace('_', ' ')} tone={STATUS_TONE[ticket.status]} /> : undefined}
      />
      <FlatList
        ref={listRef}
        data={messages}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md }}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <AppText variant="body" tone="muted" center style={{ marginTop: theme.spacing.xl }}>
            {ticket ? 'No messages yet. Start the conversation below.' : 'Loading ticket…'}
          </AppText>
        }
        renderItem={({ item }) =>
          item.is_internal ? (
            <Entrance delay={0}>
              <Card variant="soft" style={{ alignSelf: 'stretch', marginBottom: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Badge dot label="Internal note" tone="warning" />
                  <AppText variant="caption" tone="muted">
                    {formatRelativeTime(item.created_at)}
                  </AppText>
                </View>
                <AppText variant="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
                  {item.body}
                </AppText>
              </Card>
            </Entrance>
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
        <View style={[styles.composer, { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.background }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a reply…"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[
              styles.input,
              { backgroundColor: theme.colors.surfaceSunken, borderColor: canSend ? theme.colors.primary : 'transparent', color: theme.colors.textPrimary },
            ]}
            accessibilityLabel="Reply message"
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send reply"
            accessibilityState={{ disabled: !draft.trim() || !ticketId, busy: send.isPending }}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: canSend ? theme.colors.primary : theme.colors.surfaceSunken,
                opacity: pressed ? 0.85 : 1,
              },
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
