import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme';
import { AppText, Card, Screen, ScreenHeader } from '../../components';
import { config } from '../../config';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Help'>;

const FAQ: Array<{ q: string; a: string }> = [
  { q: 'How fast is pickup?', a: 'Most pickups in demo mode get a rider within 5 seconds and arrive at your location within about a minute.' },
  { q: 'What can I get picked up?', a: 'Documents, keys, parcels, groceries, medicines, clothes, gifts, returns, office files — basically anything that fits in a vehicle.' },
  { q: 'How does OTP verification work?', a: 'You and your rider share a 4-digit code at pickup and handover. Only the correct code completes each step.' },
  { q: 'Can I track my rider live?', a: 'Yes. Open the active delivery to watch the rider move on the map in real time, no refresh needed.' },
  { q: 'Is pricing fixed on the server?', a: 'Yes. The app asks the server for a quote and your card only confirms that price. The client can never change it.' },
  { q: 'Do you have manual refresh?', a: 'No — updates stream over a live connection with automatic reconnection and recovery, so you never miss a status change.' },
];

export const HelpScreen = ({ navigation }: Props) => {
  const theme = useTheme();

  return (
    <Screen>
      <ScreenHeader title="Help & FAQ" subtitle="Everything you need to know" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {FAQ.map((item) => (
          <Card key={item.q} style={{ marginBottom: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="help-circle-outline" size={18} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="700">{item.q}</AppText>
                <AppText variant="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
                  {item.a}
                </AppText>
              </View>
            </View>
          </Card>
        ))}

        <Card style={{ marginTop: theme.spacing.sm }}>
          <AppText variant="label" tone="secondary">Still need help?</AppText>
          <AppText variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
            Raise a support ticket from the profile tab. A real person (in demo mode, the mock server) will get back to you shortly.
          </AppText>
        </Card>

        <AppText variant="caption" tone="muted" center style={{ marginTop: theme.spacing.xl }}>
          API mode: {config.apiMode === 'mock' ? 'Mock (demo)' : 'Live'} · Running in {config.isMock ? 'demo data' : 'production'}
        </AppText>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 4 },
});