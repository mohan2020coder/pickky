import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SupportTicketsStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Badge, Button, Card, Screen, ScreenHeader } from '../../components';
import { useTickets } from '../../hooks/queries';
import { formatRelativeTime } from '../../utils/format';
import { SupportTicket } from '../../types';

type Props = NativeStackScreenProps<SupportTicketsStackParamList, 'TicketList'>;

const STATUS_TONE: Record<SupportTicket['status'], 'neutral' | 'primary' | 'success' | 'warning'> = {
  OPEN: 'warning',
  IN_PROGRESS: 'primary',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export const TicketListScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: tickets = [], isPending } = useTickets();

  return (
    <Screen>
      <ScreenHeader
        title="Tickets"
        subtitle="Every conversation with support"
        right={<Button label="New" variant="ghost" size="sm" icon="add" onPress={() => navigation.navigate('CreateTicket')} />}
      />
      <FlatList
        data={tickets}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isPending ? null : (
            <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl * 2 }}>
              <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.textMuted} />
              <AppText variant="heading3" center style={{ marginTop: theme.spacing.md }}>
                No tickets yet
              </AppText>
              <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
                If anything went wrong with a pickup, create a ticket and we will help.
              </AppText>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: theme.spacing.md }} onPress={() => navigation.navigate('TicketDetails', { ticketId: item.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                <AppText variant="label" numberOfLines={1}>
                  {item.subject}
                </AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {item.reference} · {formatRelativeTime(item.created_at)}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Badge label={item.status.replace('_', ' ')} tone={STATUS_TONE[item.status]} />
                {item.unread_count ? <Badge label={`${item.unread_count} new`} tone="error" /> : null}
              </View>
            </View>
            <AppText variant="bodySmall" tone="secondary" numberOfLines={2} style={{ marginTop: theme.spacing.sm }}>
              {item.last_message ?? 'No messages yet.'}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.md }}>
              <Ionicons name="pricetag-outline" size={14} color={theme.colors.textMuted} style={{ marginRight: 6 }} />
              <AppText variant="caption" tone="muted">
                {item.category ?? 'general'} · {item.priority}
              </AppText>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});
