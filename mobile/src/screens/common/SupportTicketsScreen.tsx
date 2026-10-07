import React, { useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { AppText, AppInput, BottomSheet, Button, Card, Chip, Screen, ScreenHeader } from '../../components';
import { useTickets, useCreateTicket } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import type { ProfileStackParamList } from '../../navigation/types';
import { formatRelativeTime } from '../../utils/format';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SupportTickets'>;

const CATEGORIES = ['general', 'delivery', 'payment', 'rider', 'refund'];

const TONE: Record<string, 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'primary',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

const TicketBadge = ({ status }: { status: string }) => {
  const theme = useTheme();
  const palette: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: theme.colors.divider, fg: theme.colors.textSecondary },
    primary: { bg: theme.colors.primarySoft, fg: theme.colors.primary },
    success: { bg: theme.colors.successSoft, fg: theme.colors.success },
    warning: { bg: theme.colors.warningSoft, fg: theme.colors.warning },
    error: { bg: theme.colors.errorSoft, fg: theme.colors.error },
    info: { bg: theme.colors.infoSoft, fg: theme.colors.info },
  };
  const c = palette[TONE[status] ?? 'neutral'];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.md, paddingVertical: 5, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.fg, marginRight: 6 }} />
      <AppText variant="caption" color={c.fg} weight="700">
        {status.replace('_', ' ')}
      </AppText>
    </View>
  );
};

export const SupportTicketsScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: tickets = [] } = useTickets();
  const create = useCreateTicket();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');

  const submitTicket = () => {
    if (!subject.trim() || !body.trim()) {
      toast('Add a subject and a short description.', { tone: 'error' });
      return;
    }
    create.mutate(
      { subject: subject.trim(), body: body.trim(), category },
      {
        onSuccess: () => {
          toast('Ticket created — we will get back to you shortly.', { tone: 'success' });
          setSheetOpen(false);
          setSubject('');
          setBody('');
          setCategory('general');
        },
        onError: () => toast('Could not create the ticket.', { tone: 'error' }),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Support tickets"
        subtitle="Reach a human when something goes wrong"
        onBack={() => navigation.goBack()}
        right={<Button label="New" variant="ghost" size="sm" icon="add" onPress={() => setSheetOpen(true)} />}
      />
      <FlatList
        data={tickets}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl * 2 }}>
            <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.textMuted} />
            <AppText variant="heading3" center style={{ marginTop: theme.spacing.md }}>No tickets yet</AppText>
            <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
              If anything went wrong with a pickup, create a ticket and we will help.
            </AppText>
          </View>
        }
        renderItem={({ item }) => {
          return (
            <Card style={{ marginBottom: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                  <AppText variant="label" numberOfLines={1}>{item.subject}</AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    {item.reference} · {formatRelativeTime(item.created_at)}
                  </AppText>
                </View>
                <TicketBadge status={item.status} />
              </View>
              <AppText variant="bodySmall" tone="secondary" numberOfLines={2} style={{ marginTop: theme.spacing.sm }}>
                {item.last_message ?? 'No messages yet.'}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md }}>
                <Ionicons name="flag-outline" size={14} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
                <AppText variant="caption" tone="muted">
                  {item.category ?? 'general'} · {item.priority}
                </AppText>
              </View>
            </Card>
          );
        }}
      />

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="New support ticket"
        footer={
          <Button label="Submit ticket" loading={create.isPending} onPress={() => submitTicket()} />
        }
      >
        <AppText variant="label" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>What is this about?</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: theme.spacing.md }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} small />
          ))}
        </View>
        <AppInput label="Subject" placeholder="e.g. Delivery was late" value={subject} onChangeText={setSubject} />
        <AppInput label="Describe the problem" placeholder="What happened? When? Any order IDs?" multiline numberOfLines={4} value={body} onChangeText={setBody} />
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});