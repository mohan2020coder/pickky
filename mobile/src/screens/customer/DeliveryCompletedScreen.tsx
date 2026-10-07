import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Animated } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerFlowStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Button, Card, Screen } from '../../components';
import { useDelivery } from '../../hooks/queries';
import { formatMoney } from '../../utils/format';

type Props = NativeStackScreenProps<CustomerFlowStackParamList, 'DeliveryCompleted'>;

export const DeliveryCompletedScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const { deliveryId } = route.params ?? {};
  const { data: delivery } = useDelivery(deliveryId);
  const scale = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }).start();
  }, [scale]);

  return (
    <Screen>
      <View style={styles.content}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <View style={[styles.bubble, { backgroundColor: theme.colors.successSoft }]}>
            <Ionicons name="checkmark" size={44} color={theme.colors.success} />
          </View>
        </Animated.View>
        <AppText variant="heading1" center style={{ marginTop: theme.spacing.xl }}>
          Delivered!
        </AppText>
        <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
          {delivery?.reference ?? 'Your '} delivered safely to its destination.
        </AppText>

        <Card style={{ marginTop: theme.spacing.xl, width: '100%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="body" tone="secondary">Reference</AppText>
            <AppText variant="body" weight="600">{delivery?.reference ?? '—'}</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.sm }}>
            <AppText variant="body" tone="secondary">Rider</AppText>
            <AppText variant="body" weight="600">{delivery?.rider?.name ?? '—'}</AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.sm }}>
            <AppText variant="body" tone="secondary">Paid</AppText>
            <AppText variant="body" weight="700" color={theme.colors.primary}>
              {delivery ? formatMoney(delivery.price_minor, delivery.currency) : '—'}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.sm }}>
            <AppText variant="body" tone="secondary">Delivery time</AppText>
            <AppText variant="body" weight="600">{delivery?.eta_minutes ?? '—'} min</AppText>
          </View>
        </Card>

        <Button
          label="Rate this pickup"
          iconRight="star"
          onPress={() => delivery && navigation.replace('Rating', { deliveryId: delivery.id })}
          style={{ marginTop: theme.spacing.xl }}
        />
        <Button label="Back to home" variant="secondary" onPress={() => navigation.getParent()?.goBack()} style={{ marginTop: theme.spacing.md }} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 20, justifyContent: 'center' },
  bubble: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
});