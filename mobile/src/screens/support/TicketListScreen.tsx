import React, { useMemo, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SupportTicketsStackParamList } from '../../navigation/types';
import { useTheme, GradientPreset } from '../../theme';
import { AppText, Badge, Button, Card, Chip, EmptyView, Entrance, Gradient, Screen, ScreenHeader } from '../../components';
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

const PRIORITY_TONE: Record<SupportTicket['priority'], 'neutral' | 'warning' | 'error'> = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'error',
};

const CATEGORY_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  general: 'chatbubble-outline',
  delivery: 'cube-outline',
  payment: 'card-outline',
  rider: 'bicycle-outline',
  refund: 'cash-outline',
};

const CATEGORY_GRADIENT: Record<string, GradientPreset> = {
  general: 'primary',
  delivery: 'ocean',
  payment: 'sunset',
  rider: 'hero',
  refund: 'success',
};

type Filter = 'ALL' | SupportTicket['status'];

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

export const TicketListScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: tickets = [], isPending } = useTickets();
  const [filter, setFilter] = useState<Filter>('ALL');

  const filtered = useMemo(() => (filter === 'ALL' ? tickets : tickets.filter((t) => t.status === filter)), [tickets, filter]);

  return (
    <Screen>
      <ScreenHeader
        title="Tickets"
        subtitle="Every conversation with support"
        right={<Button label="New" variant="ghost" size="sm" icon="add" onPress={() => navigation.navigate('CreateTicket')} />}
      />
      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Chip key={f.value} small label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />
        ))}
      </View>
      <FlatList
        data={filtered}
        contentContainerStyle={[styles.list, filtered.length === 0 && !isPending ? styles.listEmpty : null]}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isPending ? null : (
            <EmptyView
              icon="chatbubbles-outline"
              title="No tickets yet"
              message="If anything went wrong with a pickup, create a ticket and we will help."
              actionLabel="New ticket"
              onAction={() => navigation.navigate('CreateTicket')}
            />
          )
        }
        renderItem={({ item, index }) => {
          const category = item.category ?? 'general';
          return (
            <Entrance delay={Math.min(index, 8) * 60}>
              <Card
                style={{ marginBottom: theme.spacing.md }}
                onPress={() => navigation.navigate('TicketDetails', { ticketId: item.id })}
                accessibilityLabel={`Ticket ${item.subject}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Gradient
                    preset={CATEGORY_GRADIENT[category] ?? 'primary'}
                    style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md }}
                  >
                    <Ionicons name={CATEGORY_ICON[category] ?? 'chatbubble-outline'} size={20} color="#FFFFFF" />
                  </Gradient>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <AppText variant="label" weight="800" numberOfLines={1} style={{ flex: 1, paddingRight: theme.spacing.sm }}>
                        {item.subject}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        {formatRelativeTime(item.created_at)}
                      </AppText>
                    </View>
                    <AppText variant="bodySmall" tone="secondary" numberOfLines={2} style={{ marginTop: theme.spacing.xs }}>
                      {item.last_message ?? 'No messages yet.'}
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                      <Badge dot label={item.status.replace('_', ' ')} tone={STATUS_TONE[item.status]} />
                      <Badge label={item.priority} tone={PRIORITY_TONE[item.priority]} />
                      {item.unread_count ? <Badge dot label={`${item.unread_count} new`} tone="error" /> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' }}>
                        <Ionicons name="pricetag-outline" size={12} color={theme.colors.textMuted} style={{ marginRight: 4 }} />
                        <AppText variant="caption" tone="muted">
                          {category} · {item.reference}
                        </AppText>
                      </View>
                    </View>
                  </View>
                </View>
              </Card>
            </Entrance>
          );
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
});
