import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SupportFaqStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Screen, ScreenHeader } from '../../components';

type Props = NativeStackScreenProps<SupportFaqStackParamList, 'Faq'>;

const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: 'How do I request a pickup?',
    answer:
      'Tell Pickky what needs to be picked up, where it is and where it should go. We price it instantly, a nearby rider accepts the job and you can watch the whole trip live.',
  },
  {
    question: 'Where is my rider right now?',
    answer:
      'Open the active delivery screen. The rider location refreshes live on the map, together with every status change from assignment to delivery.',
  },
  {
    question: 'How does pickup and delivery verification work?',
    answer:
      'Every delivery has two codes. Share the pickup code when the rider collects the item and the delivery code at drop-off. Both codes are shown on the active delivery screen.',
  },
  {
    question: 'How is the price calculated?',
    answer:
      'Pricing is calculated on our servers from distance, pickup type and current demand. The final price is always shown before you confirm — riders and customers cannot change it.',
  },
  {
    question: 'Can I chat with my rider?',
    answer:
      'Yes. Every active delivery has an in-app chat so you can coordinate without sharing phone numbers. Messages are saved to the delivery.',
  },
  {
    question: 'What happens if a delivery fails or is cancelled?',
    answer:
      'Failed and cancelled deliveries are reviewed by our operations team. If something went wrong, create a ticket with the delivery reference and we will sort it out.',
  },
];

export const FaqScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Screen>
      <ScreenHeader large title="FAQ" subtitle="Quick answers to common questions" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {FAQS.map((item, index) => {
          const open = openIndex === index;
          return (
            <Card key={item.question} style={{ marginBottom: theme.spacing.md }} onPress={() => setOpenIndex(open ? null : index)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="label" style={{ flex: 1, paddingRight: theme.spacing.md }}>
                  {item.question}
                </AppText>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
              </View>
              {open ? (
                <AppText variant="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
                  {item.answer}
                </AppText>
              ) : null}
            </Card>
          );
        })}

        <View style={{ marginTop: theme.spacing.sm }}>
          <AppText variant="body" tone="secondary" center style={{ marginBottom: theme.spacing.md }}>
            Still stuck? Our support team is one message away.
          </AppText>
          <Button label="Create a new ticket" icon="create-outline" onPress={() => navigation.navigate('CreateTicket')} />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
});
