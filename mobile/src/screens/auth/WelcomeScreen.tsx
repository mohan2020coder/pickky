import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppText, Button, Screen } from '../../components';
import { AuthStackParamList } from '../../navigation/types';

export const DEMO_ACCOUNTS = [
  { label: 'Customer', phone: '9000000001', password: 'pass1234' },
  { label: 'Rider', phone: '9000000002', password: 'pass1234' },
  { label: 'Admin', phone: '9000000003', password: 'pass1234' },
  { label: 'Support', phone: '9000000004', password: 'pass1234' },
] as const;

export const WelcomeScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Welcome'>>();

  return (
    <Screen style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.xl }]} bounces={false}>
        <View style={[styles.hero, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radius.large }]}>
          <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="cube" size={40} color="#FFFFFF" />
          </View>
          <AppText variant="heading1" weight="800" center style={{ marginTop: theme.spacing.lg }}>
            {`${'Pickky'}\n`}
            <AppText variant="heading1" weight="800" tone="primary">
              You need it. We get it.
            </AppText>
          </AppText>
          <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.xl }}>
            Documents, keys, parcels, groceries, forgotten items — tell us what to pick up, where, and where it goes. One app handles it all.
          </AppText>
        </View>

        <View style={styles.tools}>
          <View style={[styles.tool, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="location" size={22} color={theme.colors.primary} />
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 6 }} center>
              Live tracking
            </AppText>
          </View>
          <View style={[styles.tool, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="shield-checkmark" size={22} color={theme.colors.primary} />
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 6 }} center>
              Verified riders
            </AppText>
          </View>
          <View style={[styles.tool, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="chatbubbles" size={22} color={theme.colors.primary} />
            <AppText variant="bodySmall" tone="secondary" style={{ marginTop: 6 }} center>
              In-app chat
            </AppText>
          </View>
        </View>

        <Button label="Get Started" iconRight="arrow-forward" onPress={() => navigation.navigate('Register')} style={{ marginTop: theme.spacing.xl }} />
        <Button label="I already have an account" variant="secondary" onPress={() => navigation.navigate('Login')} style={{ marginTop: theme.spacing.md }} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24 },
  hero: { alignItems: 'center', paddingVertical: 40 },
  logo: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tools: { flexDirection: 'row', marginTop: 20, gap: 12 },
  tool: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
});