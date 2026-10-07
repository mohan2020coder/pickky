import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Card, DeliveryCard, Screen, ScreenHeader } from '../../components';
import { useAdminDeliveries } from '../../hooks/queries';

type Props = NativeStackScreenProps<AdminHomeStackParamList, 'Issues'>;

export const AdminIssuesScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const { data: deliveries = [], isPending } = useAdminDeliveries({ issues: true });

  return (
    <Screen>
      <ScreenHeader title="Issues" subtitle="Deliveries that need attention" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 20, paddingBottom: theme.spacing.md }}>
        <Card style={{ padding: theme.spacing.md }}>
          <AppText variant="bodySmall" tone="secondary">
            Deliveries that failed or were cancelled.
          </AppText>
        </Card>
      </View>

      <FlatList
        data={deliveries}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isPending ? null : (
            <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl * 2 }}>
              <AppText variant="heading3" center>
                No open issues
              </AppText>
              <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
                Failed and cancelled deliveries will appear here.
              </AppText>
            </View>
          )
        }
        renderItem={({ item }) => (
          <DeliveryCard
            delivery={item}
            onPress={() => navigation.navigate('DeliveryDetails', { deliveryId: item.id })}
            style={{ marginBottom: theme.spacing.md }}
          />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});
