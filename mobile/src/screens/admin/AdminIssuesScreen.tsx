import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Badge, Card, DeliveryCard, EmptyView, Entrance, Screen, ScreenHeader } from '../../components';
import { useAdminDeliveries } from '../../hooks/queries';

type Props = NativeStackScreenProps<AdminHomeStackParamList, 'Issues'>;

export const AdminIssuesScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: deliveries = [], isPending } = useAdminDeliveries({ issues: true });

  return (
    <Screen>
      <ScreenHeader title="Issues" subtitle="Deliveries that need attention" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 20, paddingBottom: theme.spacing.md }}>
        <Card variant="soft" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="warning" size={18} color={theme.colors.warning} />
          <AppText variant="bodySmall" tone="secondary" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
            Deliveries that failed or were cancelled.
          </AppText>
          {!isPending ? <Badge label={`${deliveries.length}`} tone="warning" dot /> : null}
        </Card>
      </View>

      <FlatList
        data={deliveries}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isPending ? null : (
            <View style={{ paddingVertical: theme.spacing.xl }}>
              <EmptyView icon="checkmark-done-circle-outline" title="No open issues" message="Failed and cancelled deliveries will appear here." />
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Entrance delay={Math.min(index * 40, 240)}>
            <DeliveryCard
              delivery={item}
              onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: item.id })}
              style={{ marginBottom: theme.spacing.md }}
            />
          </Entrance>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});