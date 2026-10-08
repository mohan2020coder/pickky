import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SupportFaqStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Chip, Entrance, Screen, ScreenHeader, Stagger } from '../../components';

type Props = NativeStackScreenProps<SupportFaqStackParamList, 'Faq'>;

type FaqCategory = 'get-started' | 'tracking' | 'pricing' | 'issues';

const CATEGORY_LABELS: Record<FaqCategory, string> = {
  'get-started': 'Getting started',
  tracking: 'Live tracking',
  pricing: 'Pricing',
  issues: 'Issues',
};

const FAQS: Array<{ question: string; answer: string; category: FaqCategory }> = [
  {
    question: 'How do I request a pickup?',
    answer:
      'Tell Pickky what needs to be picked up, where it is and where it should go. We price it instantly, a nearby rider accepts the job and you can watch the whole trip live.',
    category: 'get-started',
  },
  {
    question: 'Where is my rider right now?',
    answer:
      'Open the active delivery screen. The rider location refreshes live on the map, together with every status change from assignment to delivery.',
    category: 'tracking',
  },
  {
    question: 'How does pickup and delivery verification work?',
    answer:
      'Every delivery has two codes. Share the pickup code when the rider collects the item and the delivery code at drop-off. Both codes are shown on the active delivery screen.',
    category: 'get-started',
  },
  {
    question: 'How is the price calculated?',
    answer:
      'Pricing is calculated on our servers from distance, pickup type and current demand. The final price is always shown before you confirm — riders and customers cannot change it.',
    category: 'pricing',
  },
  {
    question: 'Can I chat with my rider?',
    answer:
      'Yes. Every active delivery has an in-app chat so you can coordinate without sharing phone numbers. Messages are saved to the delivery.',
    category: 'tracking',
  },
  {
    question: 'What happens if a delivery fails or is cancelled?',
    answer:
      'Failed and cancelled deliveries are reviewed by our operations team. If something went wrong, create a ticket with the delivery reference and we will sort it out.',
    category: 'issues',
  },
];

const FILTERS: Array<{ value: 'all' | FaqCategory; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'get-started', label: CATEGORY_LABELS['get-started'] },
  { value: 'tracking', label: CATEGORY_LABELS.tracking },
  { value: 'pricing', label: CATEGORY_LABELS.pricing },
  { value: 'issues', label: CATEGORY_LABELS.issues },
];

export const FaqScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [filter, setFilter] = useState<'all' | FaqCategory>('all');

  const visibleFaqs = useMemo(() => (filter === 'all' ? FAQS : FAQS.filter((f) => f.category === filter)), [filter]);

  return (
    <Screen>
      <ScreenHeader large title="FAQ" subtitle="Quick answers to common questions" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Entrance delay={0}>
          <View style={styles.chips}>
            {FILTERS.map((f) => (
              <Chip
                key={f.value}
                small
                label={f.label}
                selected={filter === f.value}
                onPress={() => {
                  setFilter(f.value);
                  setOpenIndex(0);
                }}
              />
            ))}
          </View>
        </Entrance>

        <Stagger step={70} initialDelay={40} style={{ marginTop: theme.spacing.sm }}>
          {visibleFaqs.map((item, index) => {
            const open = openIndex === index;
            return (
              <Card key={item.question} style={{ marginBottom: theme.spacing.md }} onPress={() => setOpenIndex(open ? null : index)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: open ? theme.colors.primary : theme.colors.surfaceSunken,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: theme.spacing.md,
                      }}
                    >
                      <Ionicons name="help-outline" size={17} color={open ? theme.colors.onPrimary : theme.colors.primary} />
                    </View>
                    <AppText variant="label" weight="700" style={{ flex: 1, paddingRight: theme.spacing.md }}>
                      {item.question}
                    </AppText>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
                  </View>
                  {open ? (
                    <View style={{ marginTop: theme.spacing.md, paddingLeft: 48 }}>
                      <AppText variant="bodySmall" tone="secondary">
                        {item.answer}
                      </AppText>
                      <AppText variant="eyebrow" tone="primary" style={{ marginTop: theme.spacing.sm }}>
                        {CATEGORY_LABELS[item.category]}
                      </AppText>
                    </View>
                  ) : null}
              </Card>
            );
          })}
        </Stagger>

        <Entrance delay={visibleFaqs.length * 60}>
          <View style={{ marginTop: theme.spacing.sm }}>
            <AppText variant="body" tone="secondary" center style={{ marginBottom: theme.spacing.md }}>
              Still stuck? Our support team is one message away.
            </AppText>
            <Button label="Create a new ticket" icon="create-outline" onPress={() => navigation.navigate('CreateTicket')} />
          </View>
        </Entrance>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
