import { TextStyle } from 'react-native';

export type TypographyVariant =
  | 'display'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'caption'
  | 'button'
  | 'price';

type VariantStyle = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing'>;

export const typography: Record<TypographyVariant, VariantStyle> = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5 },
  heading1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  heading2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  heading3: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
  bodyLarge: { fontSize: 17, lineHeight: 25, fontWeight: '400' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodySmall: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600', letterSpacing: 0.1 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.2 },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: 0.1 },
  price: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
};
