import type { TextStyle, ViewStyle } from 'react-native';

/**
 * The initial tokens follow the referenced Figma Login frame. Keeping these
 * values centralized makes later visual refinements predictable and prevents
 * feature screens from introducing one-off colors and spacing.
 */
export const colors = {
  background: '#FFF9E3',
  surface: '#FFF7E5',
  primary: '#EA7A53',
  primaryPressed: '#D86B47',
  text: '#081226',
  textMuted: '#435875',
  border: '#E1DBCA',
  inputBorder: '#C6BFA2',
  white: '#FFFFFF',
  shadow: '#AA9180',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  xxxxl: 50,
  xxxxxl: 62,
  xxxxxxl: 80,
  x7l: 92,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 16,
  brand: 20,
  pill: 999,
} as const;

export const fonts = {
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const typography = {
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
  },
  heading: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 26,
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
} satisfies Record<string, TextStyle>;

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 9,
    elevation: 4,
  },
} satisfies Record<string, ViewStyle>;

export const currency = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
} as const;
