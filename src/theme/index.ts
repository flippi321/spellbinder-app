import { DarkTheme, type Theme } from 'expo-router';

import { colors } from './colors';

export * from './colors';
export * from './fonts';
export * from './spacing';
export * from './typography';

/** Navigation theme so native screens/transitions never flash white. */
export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.gold,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.gold,
  },
};
