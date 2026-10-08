import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, EntranceFade, Pulse, Screen, ScreenFooter, ScreenHeader } from '../../components';
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
          navigation.popToTop();
        },
        onError: () => toast('We could not cancel the delivery.', { tone: 'error' }),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Finding a rider" subtitle="This usually takes a few seconds" onBack={searching ? undefined : () => navigation.goBack()} />
      <View style={styles.content}>
        <Pulse size={190} rings={3}>
          <Ionicons name="bicycle" size={38} color={theme.colors.onPrimary} />
        </Pulse>

        <EntranceFade delay={140} style={{ alignSelf: 'stretch', alignItems: 'center' }}>
          <AppText variant="heading2" weight="800" center style={{ marginTop: theme.spacing.xl }}>
            {searching ? 'Searching for a rider…' : 'Rider found!'}
          </AppText>
          <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm, maxWidth: 320 }}>
            {searching
              ? 'We are matching you with the nearest available rider. You can watch live once they accept.'
              : 'Your rider is on the way. Watch them in real time.'}
          </AppText>
        </EntranceFade>

        <Card variant="soft" style={{ marginTop: theme.spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} style={{ marginTop: 2 }} />
            <AppText variant="bodySmall" tone="secondary" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
              Tap back anytime — your request stays active. If no rider accepts within a few minutes, we will suggest a bigger area or a different time.
            </AppText>
          </View>
        </Card>
      </View>

      <ScreenFooter>
        <Button label="Cancel request" variant="ghost" icon="close-circle-outline" loading={cancel.isPending} onPress={handleCancel} disabled={!isActiveStatus(currentStatus as never)} />
      </ScreenFooter>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, alignItems: 'center', paddingTop: 24 },
});
