import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SupportFaqStackParamList, SupportHomeStackParamList, SupportTicketsStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppInput, AppText, Button, Chip, Screen, ScreenHeader } from '../../components';
import { useCreateTicket } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';

type CreateTicketParamLists = SupportHomeStackParamList & SupportTicketsStackParamList & SupportFaqStackParamList;

type Props = NativeStackScreenProps<CreateTicketParamLists, 'CreateTicket'>;

const CATEGORIES = ['general', 'delivery', 'payment', 'rider', 'refund'];

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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AppText variant="label" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
          Category
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} small />
          ))}
        </View>

        <AppInput
          label="Subject"
          placeholder="e.g. Delivery was never completed"
          value={subject}
          onChangeText={setSubject}
          containerStyle={{ marginTop: theme.spacing.xl }}
        />
        <AppInput
          label="Description"
          placeholder="What happened? Include delivery references and times."
          multiline
          numberOfLines={5}
          value={body}
          onChangeText={setBody}
          hint="The more detail you give us, the faster we can help."
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Submit ticket" loading={create.isPending} onPress={submit} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});
