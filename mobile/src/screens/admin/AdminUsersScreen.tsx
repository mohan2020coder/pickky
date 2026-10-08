import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminUsersStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, Avatar, Badge, Button, Card, Chip, EmptyView, Entrance, Screen, ScreenHeader, SearchInput } from '../../components';
import { useAdminUsers } from '../../hooks/queries';
import { ROLE_META } from '../../constants/delivery';
import { Role } from '../../types';

type Props = NativeStackScreenProps<AdminUsersStackParamList, 'AdminUsers'>;

export const AdminUsersScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const [q, setQ] = useState('');
  const search = q.trim();
  const { data: users = [], isPending } = useAdminUsers(search);

  const customerCount = users.filter((u) => u.roles.includes('CUSTOMER')).length;
  const riderCount = users.filter((u) => u.roles.includes('RIDER')).length;
  const staffCount = users.filter((u) => u.roles.includes('ADMIN') || u.roles.includes('SUPPORT')).length;

  return (
    <Screen>
      <ScreenHeader
        title="People"
        subtitle="Customers, riders and staff"
        right={<Button label="Riders" variant="ghost" size="sm" icon="bicycle-outline" onPress={() => navigation.navigate('AdminRiders')} />}
      />
      <View style={{ paddingHorizontal: 20, paddingBottom: theme.spacing.md, gap: theme.spacing.md }}>
        <SearchInput value={q} onChangeText={setQ} placeholder="Search name or phone" />
        {!isPending && users.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Badge label={`${customerCount} customers`} tone="info" dot />
            <Badge label={`${riderCount} riders`} tone="success" dot />
            <Badge label={`${staffCount} staff`} tone="primary" dot />
          </View>
        ) : null}
      </View>

      <FlatList
        data={users}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          isPending ? null : (
            <View style={{ paddingVertical: theme.spacing.xl }}>
              <EmptyView icon="people-outline" title="No people found" message={search ? `Nothing matches “${search}”.` : 'Users will show up here once they sign up.'} />
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Entrance delay={Math.min(index * 40, 240)}>
            <UserRow name={item.name} phone={item.phone} roles={item.roles} active={item.is_active !== false} />
          </Entrance>
        )}
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
          <AppText variant="heading3" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {phone}
          </AppText>
        </View>
        <Badge label={active ? 'Active' : 'Inactive'} tone={active ? 'success' : 'neutral'} dot />
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