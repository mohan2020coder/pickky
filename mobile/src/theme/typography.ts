import { TextStyle } from 'react-native';

export type TypographyVariant =
  | 'displayXl'
  | 'display'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bodyLarge'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'eyebrow'
  | 'caption'
  | 'button'
  | 'price';

type VariantStyle = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing' | 'textTransform'>;

export const typography: Record<TypographyVariant, VariantStyle> = {
  displayXl: { fontSize: 42, lineHeight: 48, fontWeight: '800', letterSpacing: -1 },
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.7 },
  heading1: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6 },
  heading2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  heading3: { fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.3 },
  bodyLarge: { fontSize: 17, lineHeight: 25, fontWeight: '400' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodySmall: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600', letterSpacing: 0.1 },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.2 },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: 0.1 },
  price: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.6 },
};
