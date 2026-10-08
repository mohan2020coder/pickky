import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Gradient, Screen, Entrance, EntranceTop, Stagger } from '../../components';
import { AuthStackParamList } from '../../navigation/types';

export const DEMO_ACCOUNTS = [
  { label: 'Customer', phone: '9000000001', password: 'pass1234' },
  { label: 'Rider', phone: '9000000002', password: 'pass1234' },
  { label: 'Admin', phone: '9000000003', password: 'pass1234' },
  { label: 'Support', phone: '9000000004', password: 'pass1234' },
] as const;

const TOOLS = [
  { icon: 'location' as const, label: 'Live tracking' },
  { icon: 'shield-checkmark' as const, label: 'Verified riders' },
  { icon: 'chatbubbles' as const, label: 'In-app chat' },
] as const;

export const WelcomeScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Welcome'>>();
  const onPrimary = theme.colors.onPrimary;

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.xl }} bounces={false} showsVerticalScrollIndicator={false}>
        <EntranceTop delay={0}>
          <Gradient preset="hero" style={styles.hero}>
            <Gradient
              preset="cta"
              style={{
                width: 96,
                height: 96,
                borderRadius: 30,
                alignItems: 'center',
                justifyContent: 'center',
                ...theme.shadows.glow,
              }}
            >
              <Ionicons name="cube" size={48} color={onPrimary} />
            </Gradient>
            <AppText variant="display" weight="800" center color={onPrimary} style={{ marginTop: theme.spacing.xl }}>
              Pickky
            </AppText>
            <AppText variant="heading2" weight="700" center color={onPrimary} style={{ marginTop: theme.spacing.xs, opacity: 0.98 }}>
              You need it. Pickky gets it.
            </AppText>
            <AppText variant="bodyLarge" center color={onPrimary} style={{ marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.xxl, opacity: 0.88 }}>
              Documents, keys, parcels, groceries, forgotten items — tell us what to pick up, where, and where it goes. One app handles it all.
            </AppText>
          </Gradient>
        </EntranceTop>

        <View style={[styles.body, { paddingHorizontal: theme.spacing.xl }]}>
          <Stagger step={90} initialDelay={180}>
            <View style={styles.tools}>
              {TOOLS.map((tool) => (
                <Card key={tool.label} variant="glass" padded style={styles.tool}>
                  <Gradient
                    preset="primary"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...theme.shadows.low,
                    }}
                  >
                    <Ionicons name={tool.icon} size={22} color={onPrimary} />
                  </Gradient>
                  <AppText variant="bodySmall" tone="secondary" style={{ marginTop: theme.spacing.md }} center>
                    {tool.label}
                  </AppText>
                </Card>
              ))}
            </View>
            <Entrance delay={450}>
              <Button label="Get Started" iconRight="arrow-forward" onPress={() => navigation.navigate('Register')} style={{ marginTop: theme.spacing.xl }} />
            </Entrance>
            <Entrance delay={540}>
              <Button label="I already have an account" variant="secondary" onPress={() => navigation.navigate('Login')} style={{ marginTop: theme.spacing.md }} />
            </Entrance>
          </Stagger>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  body: { marginTop: 24 },
  tools: { flexDirection: 'row', gap: 12 },
  tool: { flex: 1, paddingVertical: 20, paddingHorizontal: 10, alignItems: 'center' },
});
