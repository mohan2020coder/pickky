import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SupportFaqStackParamList, SupportHomeStackParamList, SupportTicketsStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppInput, AppText, Button, Card, Chip, Entrance, Screen, ScreenFooter, ScreenHeader, SectionHeader } from '../../components';
import { useCreateTicket } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';

type CreateTicketParamLists = SupportHomeStackParamList & SupportTicketsStackParamList & SupportFaqStackParamList;

type Props = NativeStackScreenProps<CreateTicketParamLists, 'CreateTicket'>;

const CATEGORIES = ['general', 'delivery', 'payment', 'rider', 'refund'];

const CATEGORY_BLURB: Record<string, string> = {
  general: 'Anything that does not fit below',
  delivery: 'Pickup, drop-off or rider issues',
  payment: 'Charges, receipts and refunds',
  rider: 'Behaviour or assignment problems',
  refund: 'Money you are expecting back',
};

export const CreateTicketScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const create = useCreateTicket();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');

  const submit = () => {
    if (!subject.trim() || !body.trim()) {
      toast('Add a subject and a short description.', { tone: 'error' });
      return;
    }
    create.mutate(
      { subject: subject.trim(), body: body.trim(), category, delivery_id: undefined },
      {
        onSuccess: () => {
          toast('Ticket created — we will get back to you shortly.', { tone: 'success' });
          navigation.goBack();
        },
        onError: () => toast('Could not create the ticket.', { tone: 'error' }),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title="New ticket" subtitle="Tell us what went wrong" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Entrance delay={0}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: theme.spacing.md,
                }}
              >
                <Ionicons name="pricetags-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="heading3">What is this about?</AppText>
                <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  Pick the closest category so we route it faster.
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.lg }}>
              {CATEGORIES.map((c) => (
                <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} small />
              ))}
            </View>
            <AppText variant="caption" tone="secondary" style={{ marginTop: theme.spacing.md }}>
              {CATEGORY_BLURB[category]}
            </AppText>
          </Card>
        </Entrance>

        <Entrance delay={90}>
          <Card style={{ marginTop: theme.spacing.lg }}>
            <SectionHeader title="Details" subtitle="Subject and a short description" />
            <AppInput
              label="Subject"
              placeholder="e.g. Delivery was never completed"
              leftIcon="create-outline"
              value={subject}
              onChangeText={setSubject}
              containerStyle={{ marginBottom: theme.spacing.md }}
            />
            <AppInput
              label="Description"
              placeholder="What happened? Include delivery references and times."
              leftIcon="document-text-outline"
              multiline
              numberOfLines={5}
              value={body}
              onChangeText={setBody}
              hint="The more detail you give us, the faster we can help."
              containerStyle={{ marginBottom: 0 }}
            />
          </Card>
        </Entrance>

        <Entrance delay={160}>
          <Card variant="soft" style={{ marginTop: theme.spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles-outline" size={16} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
              <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                Include the delivery reference and approximate times — it cuts our reply time in half.
              </AppText>
            </View>
          </Card>
        </Entrance>
      </ScrollView>

      <ScreenFooter>
        <Button label="Submit ticket" icon="paper-plane-outline" loading={create.isPending} onPress={submit} />
      </ScreenFooter>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24 },
});
