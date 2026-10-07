import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../theme';
import { AppText } from './AppText';

type OtpInputProps = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  label?: string;
};

export const OtpInput = ({ length = 4, value, onChange, onComplete, error, disabled = false, label }: OtpInputProps) => {
  const theme = useTheme();
  const inputs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
  }, [value, length, onComplete]);

  const handleChange = (text: string, index: number) => {
    const digits = text.replace(/\D/g, '');
    if (digits.length === 0) {
      const next = value.split('');
      next[index] = '';
      onChange(next.join('').slice(0, length));
      return;
    }
    const next = value.split('');
    digits.split('').forEach((d, i) => {
      if (index + i < length) next[index + i] = d;
    });
    const joined = next.join('').slice(0, length);
    onChange(joined);
    const nextIndex = Math.min(length - 1, index + digits.length);
    if (joined.length < length) inputs.current[nextIndex]?.focus();
    else Keyboard.dismiss();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const next = value.split('');
      next[index - 1] = '';
      onChange(next.join(''));
    }
  };

  return (
    <View accessibilityLabel={label ?? 'One-time code'}>
      <View style={styles.row}>
        {Array.from({ length }).map((_, index) => {
          const char = value[index] ?? '';
          const active = focusedIndex === index;
          return (
            <Pressable
              key={`otp-${index}`}
              onPress={() => inputs.current[index]?.focus()}
              style={[
                styles.cell,
                {
                  borderColor: error ? theme.colors.error : active ? theme.colors.primary : theme.colors.border,
                  borderWidth: active ? 2 : 1.5,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <TextInput
                ref={(ref) => {
                  inputs.current[index] = ref;
                }}
                value={char}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e.nativeEvent.key, index)}
                onFocus={() => setFocusedIndex(index)}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={length}
                editable={!disabled}
                selectTextOnFocus
                accessibilityLabel={`Digit ${index + 1}`}
                style={[styles.cellText, { color: theme.colors.textPrimary }]}
              />
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <AppText variant="caption" tone="error" center style={{ marginTop: theme.spacing.sm }} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  cell: {
    width: 56,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 24, fontWeight: '700', textAlign: 'center', width: '100%', height: '100%', textAlignVertical: 'center' },
});
