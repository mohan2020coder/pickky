import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AppText } from './AppText';

type RatingStarsProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  label?: string;
};

export const RatingStars = ({ value, onChange, size = 40, label = 'Rating' }: RatingStarsProps) => {
  const theme = useTheme();

  return (
    <View
      style={styles.row}
      accessibilityRole={onChange ? 'adjustable' : 'text'}
      accessibilityLabel={`${label}: ${value} of 5 stars`}
      accessibilityValue={{ min: 0, max: 5, now: value }}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          filled={star <= value}
          size={size}
          onPress={onChange ? () => onChange(star) : undefined}
          color={theme.colors.warning}
          emptyColor={theme.colors.border}
          index={star}
        />
      ))}
    </View>
  );
};

const Star = ({
  filled,
  size,
  onPress,
  color,
  emptyColor,
  index,
}: {
  filled: boolean;
  size: number;
  onPress?: () => void;
  color: string;
  emptyColor: string;
  index: number;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!filled) return;
    scale.setValue(0.6);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8, delay: index * 12 }).start();
  }, [filled, scale, index]);

  const content = (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color={filled ? color : emptyColor} />
    </Animated.View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={`Rate ${index} star${index > 1 ? 's' : ''}`}
      style={{ padding: 4, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      {content}
    </Pressable>
  );
};

type ReadOnlyRatingProps = { value?: number | null; count?: number; size?: number };

export const ReadOnlyRating = ({ value, count, size = 14 }: ReadOnlyRatingProps) => {
  const theme = useTheme();
  if (value === undefined || value === null) return null;
  return (
    <View style={styles.row} accessibilityLabel={`Rated ${value} out of 5`}>
      <Ionicons name="star" size={size} color={theme.colors.warning} />
      <AppText variant="caption" tone="secondary" style={{ marginLeft: 3 }}>
        {value.toFixed(1)}
        {count ? ` (${count})` : ''}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
