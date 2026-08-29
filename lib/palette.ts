/**
 * Hex mirrors of the Blipp theme tokens in global.css.
 *
 * Icons, SVG props and native navigation options must receive React
 * Native-parseable colors, so they read from here instead of resolving the
 * oklch() CSS variables at runtime.
 */
export const PALETTE = {
  background: '#131217',
  surface: '#1C1B22',
  surfaceSecondary: '#24222B',
  surfaceTertiary: '#2C2A34',
  foreground: '#F5F4F7',
  muted: '#A9A5B2',
  border: '#2E2C36',
  accent: '#A855F7',
  accentForeground: '#14061F',
  wave: '#22D3EE',
  danger: '#EF4B4F',
  onCover: '#FFFFFF',
} as const;
