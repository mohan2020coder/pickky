import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerHomeStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, AppInput, Button, Chip, ProgressIndicator, Screen, ScreenFooter, ScreenHeader, Card } from '../../components';
import { useBookingStore } from '../../stores/bookingStore';
import { PACKAGE_TYPES, PACKAGE_SIZES } from '../../constants/delivery';

type Props = NativeStackScreenProps<CustomerHomeStackParamList, 'PackageDetails'>;

export const PackageDetailsScreen = ({ navigation }: Props) => {
  const theme = useTheme();
  const pkg = useBookingStore((s) => s.pkg);
  const setPkg = useBookingStore((s) => s.setPkg);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const ready = pkg.description.trim().length >= 3 && pkg.quantity >= 1;

  const continuePress = () => {
    if (!ready) {
      setDescriptionError('Tell us what we are picking up (min 3 characters).');
      return;
    }
    setDescriptionError(null);
    navigation.navigate('PriceConfirm');
  };

  return (
    <Screen>
      <ScreenHeader title="Package details" subtitle="What are we picking up?" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <ProgressIndicator progress={2 / 3} label="Step 2 of 3 — Package" />

        <Card style={{ marginTop: theme.spacing.lg }}>
          <AppText variant="eyebrow" tone="primary">
            What is it?
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.md }}>
            {PACKAGE_TYPES.map((type) => (
              <Chip
                key={type.id}
                label={`${type.icon} ${type.label}`}
                selected={pkg.package_type === type.id}
                onPress={() => setPkg({ package_type: type.id })}
              />
            ))}
          </View>
        </Card>

        <Card style={{ marginTop: theme.spacing.md }}>
          <AppText variant="eyebrow" tone="primary">
            Size
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.md }}>
            {PACKAGE_SIZES.map((size) => (
              <Chip key={size.id} label={size.label} small selected={pkg.package_size === size.id} onPress={() => setPkg({ package_size: size.id })} />
            ))}
          </View>
        </Card>

        <Card style={{ marginTop: theme.spacing.md }}>
          <AppInput
            label="Description"
            placeholder="e.g. Laptop charger, brown envelope, 2 bags of groceries"
            multiline
            numberOfLines={3}
            value={pkg.description}
            onChangeText={(text) => {
              setPkg({ description: text });
              if (descriptionError) setDescriptionError(null);
            }}
            error={descriptionError}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <AppInput
              label="Quantity"
              placeholder="1"
              keyboardType="number-pad"
              value={String(pkg.quantity)}
              onChangeText={(text) => {
                const n = Math.max(1, parseInt(text.replace(/\D/g, ''), 10) || 1);
                setPkg({ quantity: n });
              }}
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <AppInput
              label="Weight (kg, optional)"
              placeholder="1.5"
              keyboardType="decimal-pad"
              value={pkg.weight_kg ? String(pkg.weight_kg) : ''}
              onChangeText={(text) => setPkg({ weight_kg: parseFloat(text) || undefined })}
              containerStyle={{ flex: 1.4, marginBottom: 0 }}
            />
          </View>
        </Card>

        <Card variant="outline" onPress={() => setPkg({ fragile: !pkg.fragile })} accessibilityLabel="Fragile, handle with care" style={{ marginTop: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name={pkg.fragile ? 'checkbox' : 'square-outline'} size={20} color={pkg.fragile ? theme.colors.primary : theme.colors.textMuted} />
            <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              <AppText variant="body">Fragile — handle with care</AppText>
              <AppText variant="caption" tone="muted">
                Rider will carry it gently.
              </AppText>
            </View>
          </View>
        </Card>

        <Card style={{ marginTop: theme.spacing.md }}>
          <AppInput
            label="Instructions for rider (optional)"
            placeholder="Ask for 'Aarav' at the front desk…"
            multiline
            numberOfLines={3}
            value={pkg.instructions}
            onChangeText={(text) => setPkg({ instructions: text })}
            containerStyle={{ marginBottom: 0 }}
          />
        </Card>
      </ScrollView>

      <ScreenFooter>
        <Button label="Continue to price estimate" onPress={continuePress} />
      </ScreenFooter>
    </Screen>
  );
};
