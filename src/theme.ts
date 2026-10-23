export const colors = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primarySoft: '#EEF2FF',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',
  success: '#15803D',
  successSoft: '#F0FDF4',
  warningSoft: '#FFFBEB',
  warning: '#B45309',
};

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = {
  card: { boxShadow: '0 4px 24px rgba(15, 23, 42, 0.08)' },
  soft: { boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)' },
} as const;

/** Content wider than this is centered (keeps the layout tidy on desktop). */
export const MAX_CONTENT_WIDTH = 1040;
/** Breakpoint where the dashboard switches from 1 column to a grid. */
export const WIDE_BREAKPOINT = 820;
