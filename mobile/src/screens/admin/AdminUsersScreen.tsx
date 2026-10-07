import React, { useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminUsersStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Avatar, Badge, Button, Card, Chip, Screen, ScreenHeader, SearchInput } from '../../components';
import { useAdminUsers } from '../../hooks/queries';
import { ROLE_META } from '../../constants/delivery';
import { Role } from '../../types';

type Props = NativeStackScreenProps<AdminUsersStackParamList, 'AdminUsers'>;

export const AdminUsersScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const [q, setQ] = useState('');
  const search = q.trim();
  const { data: users = [], isPending } = useAdminUsers(search);

  return (
    <Screen>
      <ScreenHeader
        title="People"
        subtitle="Customers, riders and staff"
        right={<Button label="Riders" variant="ghost" size="sm" icon="bicycle-outline" onPress={() => navigation.navigate('AdminRiders')} />}
      />
      <View style={{ paddingHorizontal: 20, paddingBottom: theme.spacing.md }}>
        <SearchInput value={q} onChangeText={setQ} placeholder="Search name or phone" />
      </View>

      <FlatList
        data={users}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isPending ? null : (
            <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl * 2 }}>
              <AppText variant="heading3" center>
                No people found
              </AppText>
              <AppText variant="body" tone="secondary" center style={{ marginTop: theme.spacing.sm }}>
                {search ? `Nothing matches “${search}”.` : 'Users will show up here once they sign up.'}
              </AppText>
            </View>
          )
        }
        renderItem={({ item }) => <UserRow name={item.name} phone={item.phone} roles={item.roles} active={item.is_active !== false} />}
      />
    </Screen>
  );
};

const UserRow = ({ name, phone, roles, active }: { name: string; phone: string; roles: Role[]; active: boolean }) => {
  const theme = useTheme();
  return (
    <Card style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Avatar name={name} />
        <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
          <AppText variant="label" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {phone}
          </AppText>
        </View>
        <Badge label={active ? 'Active' : 'Inactive'} tone={active ? 'success' : 'neutral'} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: theme.spacing.md }}>
        {roles.map((role) => (
          <Chip key={role} label={ROLE_META[role].label} small />
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 24 },
});
