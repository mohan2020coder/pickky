import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerFlowStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';
import { AppText, AppInput, Button, Chip, RatingStars, Screen, ScreenHeader } from '../../components';
import { useDelivery, useRateDelivery } from '../../hooks/queries';
import { toast } from '../../stores/uiStore';

type Props = NativeStackScreenProps<CustomerFlowStackParamList, 'Rating'>;

const TAG_OPTIONS = ['On time', 'Careful', 'Polite', 'Fast', 'Well packed'];

export const RatingScreen = ({ navigation, route }: Props) => {
  const theme = useTheme();
  const { deliveryId } = route.params ?? {};
  const { data: delivery } = useDelivery(deliveryId);
  const rate = useRateDelivery();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const submit = () => {
    if (stars < 1) {
      toast('Please choose a rating.', { tone: 'error' });
      return;
    }
    rate.mutate(
      { id: deliveryId ?? '', stars, comment: comment.trim() || undefined, tags },
      {
        onSuccess: () => {
          toast('Thanks for your feedback!', { tone: 'success' });
          navigation.getParent()?.goBack();
        },
        onError: () => toast('We could not submit your rating.', { tone: 'error' }),
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader title="Rate this pickup" subtitle={delivery?.rider?.name ? `You were served by ${delivery.rider.name}` : undefined} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <View style={{ alignItems: 'center', marginTop: theme.spacing.md }}>
          <RatingStars value={stars} onChange={setStars} size={44} label="Rate your pickup" />
          <AppText variant="body" tone="secondary" style={{ marginTop: theme.spacing.md }}>
            {stars === 0
              ? 'Tap a star to rate'
              : stars <= 2
                ? 'Sorry to hear that.'
                : stars === 3
                  ? 'Good — how could it be better?'
                  : 'Awesome, glad it went well!'}
          </AppText>
        </View>

        <AppText variant="label" tone="secondary" style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}>
          What went well?
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TAG_OPTIONS.map((tag) => (
            <Chip key={tag} selected={tags.includes(tag)} label={tag} onPress={() => toggleTag(tag)} />
          ))}
        </View>

        <AppInput
          label="Anything else?"
          placeholder="Optional comment for your rider"
          multiline
          numberOfLines={3}
          value={comment}
          onChangeText={setComment}
          containerStyle={{ marginTop: theme.spacing.xl }}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Submit Rating" loading={rate.isPending} onPress={submit} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
});