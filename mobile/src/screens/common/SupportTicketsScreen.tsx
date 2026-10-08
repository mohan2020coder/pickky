import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, GradientPreset } from '../../theme';
import { AppText, AppInput, Badge, BottomSheet, Button, Card, Chip, EmptyView, Entrance, Gradient, PressableScale, Screen, ScreenHeader } from '../../components';
import { useTickets, useCreateTicket } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';
import type { ProfileStackParamList } from '../../navigation/types';
import { formatRelativeTime } from '../../utils/format';
import { SupportTicket } from '../../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'SupportTickets'>;

const CATEGORIES = ['general', 'delivery', 'payment', 'rider', 'refund'];

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

export const SupportTicketsScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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

  const openNewTicket = () => setSheetOpen(true);

  return (
    <Screen>
      <ScreenHeader
        title="Support tickets"
        subtitle="Reach a human when something goes wrong"
        onBack={() => navigation.goBack()}
        right={<Button label="New" variant="ghost" size="sm" icon="add" onPress={openNewTicket} />}
      />
      <FlatList
        data={tickets}
        contentContainerStyle={[styles.list, tickets.length === 0 ? styles.listEmpty : null]}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyView
            icon="chatbubbles-outline"
            title="No tickets yet"
            message="If anything went wrong with a pickup, create a ticket and we will help."
            actionLabel="New ticket"
            onAction={openNewTicket}
          />
        }
        renderItem={({ item, index }) => {
          const itemCategory = item.category ?? 'general';
          return (
            <Entrance delay={Math.min(index, 8) * 60}>
              <Card style={{ marginBottom: theme.spacing.md }} accessibilityLabel={`Ticket ${item.subject}`}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Gradient
                    preset={CATEGORY_GRADIENT[itemCategory] ?? 'primary'}
                    style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md }}
                  >
                    <Ionicons name={CATEGORY_ICON[itemCategory] ?? 'chatbubble-outline'} size={20} color="#FFFFFF" />
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
                          {itemCategory} · {item.reference}
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

      <PressableScale
        onPress={openNewTicket}
        accessibilityRole="button"
        accessibilityLabel="Create a new support ticket"
        scaleTo={0.92}
        style={[styles.fab, { bottom: insets.bottom + theme.spacing.xl, ...theme.shadows.floating }]}
      >
        <Gradient preset="cta" style={StyleSheet.absoluteFill} />
        <Ionicons name="add" size={28} color={theme.colors.onPrimary} />
      </PressableScale>

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
  list: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 96 },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
