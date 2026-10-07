import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Screen, ScreenHeader } from '../../components';
import { useDelivery, useCancelDelivery } from '../../hooks/queries';
import { useRealtimeStore } from '../../stores/realtimeStore';
import { toast } from '../../stores/uiStore';
import { isActiveStatus } from '../../constants/delivery';

type Props = NativeStackScreenProps<CustomerHomeStackParamList, 'SearchingRider'>;

export const SearchingRiderScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const { deliveryId } = route.params ?? {};
  const { data: delivery } = useDelivery(deliveryId);
  const status = useRealtimeStore((s) => (deliveryId ? s.activeDeliveries[deliveryId] : undefined));
  const currentStatus = status ?? delivery?.status;
  const cancel = useCancelDelivery();

  const searching = !currentStatus || currentStatus === 'CREATED' || currentStatus === 'SEARCHING_RIDER';

  useEffect(() => {
    if (deliveryId && currentStatus && !searching) {
      navigation.replace('Tracking', { deliveryId });
    }
  }, [currentStatus, searching, navigation, deliveryId]);

  const handleCancel = () => {
    if (!deliveryId) return;
    cancel.mutate(
      { id: deliveryId, reason: 'Cancelled from searching screen' },
      {
        onSuccess: () => {
          toast('Delivery cancelled.', { tone: 'info' });
          navigation.getParent()?.goBack();
        },
        onError: () => toast('We could not cancel the delivery.', { tone: 'error' }),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Finding a rider" subtitle="This usually takes a few seconds" onBack={searching ? undefined : () => navigation.goBack()} />
      <View style={styles.content}>
        <View style={[styles.pulse, { borderColor: theme.colors.primary }]}>
          <View style={[styles.pulseInner, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="bicycle" size={34} color="#FFFFFF" />
          </View>
        </View>
        <AppText variant="heading2" center style={{ marginTop: theme.spacing.xl }}>
          {searching ? 'Searching for a rider…' : 'Rider found!'}
        </AppText>
        <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm, maxWidth: 300 }}>
          {searching
            ? 'We are matching you with the nearest available rider. You can watch live once they accept.'
            : 'Your rider is on the way. Watch them in real time.'}
        </AppText>
        <View style={{ alignItems: 'center', marginTop: theme.spacing.xl }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>

        <Card elevated={false} style={{ marginTop: theme.spacing.xl }}>
          <AppText variant="bodySmall" tone="secondary">
            Tap back anytime — your request stays active. If no rider accepts within a few minutes, we will suggest a bigger area or a different time.
          </AppText>
        </Card>
      </View>

      <View style={styles.footer}>
        <Button label="Cancel request" variant="danger" loading={cancel.isPending} onPress={handleCancel} disabled={!isActiveStatus(currentStatus as never)} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, alignItems: 'center', paddingTop: 24 },
  pulse: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});