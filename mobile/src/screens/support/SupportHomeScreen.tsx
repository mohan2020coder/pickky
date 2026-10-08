import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SupportHomeStackParamList } from '../../navigation/types';
import { useTheme, GradientPreset } from '../../theme';
import { AppText, Badge, Card, Entrance, EntranceTop, Gradient, Screen, ScreenHeader, SectionHeader, StatCard, Stagger } from '../../components';
import { useTickets } from '../../hooks/queries';
import { formatRelativeTime } from '../../utils/format';

type Props = NativeStackScreenProps<SupportHomeStackParamList, 'SupportHome'>;

type MedallionProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  preset?: GradientPreset;
  size?: number;
};

const Medallion = ({ icon, preset = 'primary', size = 40 }: MedallionProps) => (
  <Gradient preset={preset} style={{ width: size, height: size, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={icon} size={size * 0.48} color="#FFFFFF" />
  </Gradient>
);

export const SupportHomeScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: tickets = [] } = useTickets();

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const pendingCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;
  const recent = tickets.slice(0, 3);

  const openTicketsTab = () => {
    navigation.getParent()?.navigate('TicketsTab', { screen: 'TicketList' });
  };

  const openFaqTab = () => {
    navigation.getParent()?.navigate('FaqTab');
  };

  return (
    <Screen>
      <ScreenHeader transparent title="Support" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <EntranceTop delay={0}>
          <Card variant="gradient" gradientPreset="hero" accessibilityLabel="Support home">
            <AppText variant="eyebrow" color={theme.colors.textOnGradient} style={{ opacity: 0.85 }}>
              SUPPORT
            </AppText>
            <AppText variant="heading1" color={theme.colors.textOnGradient} style={{ marginTop: theme.spacing.sm }}>
              How can we help today?
            </AppText>
            <AppText variant="bodySmall" color={theme.colors.textOnGradient} style={{ marginTop: theme.spacing.xs, opacity: 0.85 }}>
              {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} · we usually reply within a few hours.
            </AppText>
          </Card>
        </EntranceTop>

        <Entrance delay={120}>
          <View style={[styles.statRow, { marginTop: theme.spacing.lg }]}>
            <StatCard
              label="Open"
              value={openCount}
              icon="mail-unread-outline"
              accent
              gradient="hero"
              hint={openCount === 0 ? 'All caught up' : 'Needs a reply'}
              style={{ flex: 1 }}
              onPress={openTicketsTab}
            />
            <StatCard
              label="Pending"
              value={pendingCount}
              icon="time-outline"
              gradient="ocean"
              hint="In progress"
              style={{ flex: 1 }}
              onPress={openTicketsTab}
            />
            <StatCard
              label="Resolved"
              value={resolvedCount}
              icon="checkmark-done-outline"
              gradient="success"
              hint="Closed by team"
              style={{ flex: 1 }}
              onPress={openTicketsTab}
            />
          </View>
        </Entrance>

        <View style={{ marginTop: theme.spacing.xl }}>
          <SectionHeader title="Quick actions" subtitle="Everything support, one tap away" />
          <Stagger step={80} initialDelay={160}>
            <Card
              variant="gradient"
              gradientPreset="cta"
              style={{ marginBottom: theme.spacing.md }}
              onPress={() => navigation.navigate('CreateTicket')}
              accessibilityLabel="Create a new ticket"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Medallion icon="add" preset="charcoal" />
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <AppText variant="heading3" color={theme.colors.textOnGradient}>
                    New ticket
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textOnGradient} style={{ opacity: 0.85, marginTop: 2 }}>
                    Report a delivery, payment or account issue
                  </AppText>
                </View>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.textOnGradient} />
              </View>
            </Card>

            <Card onPress={openTicketsTab} accessibilityLabel="View tickets">
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Medallion icon="chatbubbles-outline" preset="primary" />
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <AppText variant="label" weight="700">
                    View tickets
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    Track every conversation with the team
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </View>
            </Card>

            <Card onPress={openFaqTab} accessibilityLabel="Open frequently asked questions">
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Medallion icon="library-outline" preset="ocean" />
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <AppText variant="label" weight="700">
                    FAQ
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    Quick answers to the most common questions
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </View>
            </Card>
          </Stagger>
        </View>

        <View style={{ marginTop: theme.spacing.xl }}>
          <SectionHeader title="Recent tickets" subtitle="Your latest conversations" actionLabel="View all" onAction={openTicketsTab} />
          {recent.length === 0 ? (
            <Card variant="soft">
              <AppText variant="body" tone="secondary">
                No tickets yet. Create one whenever something goes wrong.
              </AppText>
            </Card>
          ) : (
            recent.map((ticket, i) => (
              <Entrance key={ticket.id} delay={i * 70}>
                <Card style={{ marginBottom: theme.spacing.md }} onPress={() => navigation.navigate('TicketDetails', { ticketId: ticket.id })}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                      <AppText variant="label" weight="700" numberOfLines={1}>
                        {ticket.subject}
                      </AppText>
                      <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                        {ticket.reference} · {formatRelativeTime(ticket.created_at)}
                      </AppText>
                    </View>
                    <Badge
                      dot
                      label={ticket.status.replace('_', ' ')}
                      tone={ticket.status === 'OPEN' ? 'warning' : ticket.status === 'RESOLVED' ? 'success' : ticket.status === 'IN_PROGRESS' ? 'primary' : 'neutral'}
                    />
                  </View>
                </Card>
              </Entrance>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  statRow: { flexDirection: 'row', gap: 10 },
});
