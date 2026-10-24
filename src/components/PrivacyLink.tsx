import React from 'react';
import { Platform } from 'react-native';

import { colors } from '@/theme';

export function PrivacyLink() {
  if (Platform.OS !== 'web') return null;

  return React.createElement(
    'a',
    {
      href: '/privacy.html',
      target: '_blank',
      rel: 'noopener noreferrer',
      style: {
        display: 'block',
        textAlign: 'center',
        fontSize: 12,
        color: colors.primary,
        textDecoration: 'underline',
      },
    },
    'Privacy Policy',
  );
}