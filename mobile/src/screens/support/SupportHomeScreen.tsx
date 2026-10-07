import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SupportHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Badge, Card, Screen, ScreenHeader } from '../../components';
import { useTickets } from '../../hooks/queries';
import { formatRelativeTime } from '../../utils/format';

type Props = NativeStackScreenProps<SupportHomeStackParamList, 'SupportHome'>;

export const SupportHomeScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: tickets = [] } = useTickets();

  const openCount = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const recent = tickets.slice(0, 3);

  const openTicketsTab = () => {
    navigation.getParent()?.navigate('TicketsTab', { screen: 'TicketList' });
  };

  const openFaqTab = () => {
    navigation.getParent()?.navigate('FaqTab');
  };

  return (
    <Screen>
      <ScreenHeader large title="Support" subtitle="How can we help today?" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <AppText variant="caption" tone="secondary">
                Open tickets
              </AppText>
              <AppText variant="price" color={theme.colors.primary} style={{ marginTop: theme.spacing.xxs }}>
                {openCount}
              </AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" tone="muted">
                {tickets.length} total
              </AppText>
              <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {openCount === 0 ? 'All caught up' : 'Waiting on a reply'}
              </AppText>
            </View>
          </View>
        </Card>

        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
          <Card onPress={openTicketsTab} accessibilityLabel="View tickets">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="chatbubbles-outline" size={22} color={theme.colors.primary} />
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <AppText variant="label">View tickets</AppText>
                <AppText variant="caption" tone="muted">
                  Track every conversation with the team
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>
          </Card>

          <Card onPress={() => navigation.navigate('CreateTicket')} accessibilityLabel="Create a new ticket">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="add-circle-outline" size={22} color={theme.colors.success} />
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <AppText variant="label">New ticket</AppText>
                <AppText variant="caption" tone="muted">
                  Report a delivery, payment or account issue
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>
          </Card>

          <Card onPress={openFaqTab} accessibilityLabel="Open frequently asked questions">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="library-outline" size={22} color={theme.colors.info} />
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <AppText variant="label">FAQ</AppText>
                <AppText variant="caption" tone="muted">
                  Quick answers to the most common questions
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>
          </Card>
        </View>

        <AppText variant="heading3" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.md }}>
          Recent tickets
        </AppText>
        {recent.length === 0 ? (
          <AppText variant="body" tone="muted">
            No tickets yet. Create one whenever something goes wrong.
          </AppText>
        ) : (
          recent.map((ticket) => (
            <Card
              key={ticket.id}
              style={{ marginBottom: theme.spacing.md }}
              onPress={() => navigation.navigate('TicketDetails', { ticketId: ticket.id })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                  <AppText variant="label" numberOfLines={1}>
                    {ticket.subject}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    {ticket.reference} · {formatRelativeTime(ticket.created_at)}
                  </AppText>
                </View>
                <Badge label={ticket.status.replace('_', ' ')} tone={ticket.status === 'OPEN' ? 'warning' : ticket.status === 'RESOLVED' ? 'success' : 'neutral'} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
});
