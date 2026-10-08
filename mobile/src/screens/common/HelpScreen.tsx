import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, GradientPreset } from '../../theme';
import { AppText, Button, Card, Entrance, Gradient, Screen, ScreenHeader } from '../../components';
import { config } from '../../config';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Help'>;

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

const FAQ: Array<{ q: string; a: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { q: 'How fast is pickup?', a: 'Most pickups in demo mode get a rider within 5 seconds and arrive at your location within about a minute.', icon: 'flash-outline' },
  { q: 'What can I get picked up?', a: 'Documents, keys, parcels, groceries, medicines, clothes, gifts, returns, office files — basically anything that fits in a vehicle.', icon: 'cube-outline' },
  { q: 'How does OTP verification work?', a: 'You and your rider share a 4-digit code at pickup and handover. Only the correct code completes each step.', icon: 'keypad-outline' },
  { q: 'Can I track my rider live?', a: 'Yes. Open the active delivery to watch the rider move on the map in real time, no refresh needed.', icon: 'navigate-outline' },
  { q: 'Is pricing fixed on the server?', a: 'Yes. The app asks the server for a quote and your card only confirms that price. The client can never change it.', icon: 'pricetag-outline' },
  { q: 'Do you have manual refresh?', a: 'No — updates stream over a live connection with automatic reconnection and recovery, so you never miss a status change.', icon: 'sync-outline' },
];

export const HelpScreen = ({ navigation }: Props) => {
  const theme = useTheme();

  return (
    <Screen>
      <ScreenHeader title="Help & FAQ" subtitle="Everything you need to know" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Entrance delay={0}>
          <Card variant="gradient" gradientPreset="hero" accessibilityLabel="Contact support">
            <AppText variant="eyebrow" color={theme.colors.textOnGradient} style={{ opacity: 0.85 }}>
              HELP CENTER
            </AppText>
            <AppText variant="heading1" color={theme.colors.textOnGradient} style={{ marginTop: theme.spacing.sm }}>
              Talk to a human
            </AppText>
            <AppText variant="bodySmall" color={theme.colors.textOnGradient} style={{ opacity: 0.88, marginTop: theme.spacing.xs }}>
              Raise a support ticket from your profile and a real person (in demo mode, the mock server) will get back to you shortly.
            </AppText>
            <View style={{ marginTop: theme.spacing.lg }}>
              <Button
                label="My support tickets"
                variant="secondary"
                size="md"
                icon="chatbubbles-outline"
                fullWidth={false}
                onPress={() => navigation.navigate('SupportTickets')}
                accessibilityLabel="Open my support tickets"
              />
            </View>
          </Card>
        </Entrance>

        <View style={{ marginTop: theme.spacing.xl }}>
          <AppText variant="eyebrow" tone="muted" style={{ marginBottom: theme.spacing.md }}>
            POPULAR QUESTIONS
          </AppText>
          {FAQ.map((item, index) => (
            <Entrance key={item.q} delay={80 + index * 60}>
              <Card style={{ marginBottom: theme.spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Medallion icon={item.icon} preset={index % 2 === 0 ? 'primary' : 'ocean'} size={38} />
                  <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                    <AppText variant="label" weight="700">
                      {item.q}
                    </AppText>
                    <AppText variant="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
                      {item.a}
                    </AppText>
                  </View>
                </View>
              </Card>
            </Entrance>
          ))}
        </View>

        <Entrance delay={80 + FAQ.length * 60}>
          <Card variant="soft">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} style={{ marginRight: theme.spacing.sm }} />
              <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                Still need help? Raise a support ticket from the profile tab — it lands straight in our support queue.
              </AppText>
            </View>
          </Card>
        </Entrance>

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
