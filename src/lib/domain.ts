import { ENV } from '@/config/env';

export const RESTRICTED_MESSAGE =
  'Access restricted. Please login using your official domain email.';

/**
 * Returns true only when the email's domain is EXACTLY the allowed domain.
 *
 * We compare the part after the last "@" for equality instead of using a loose
 * `includes()` / `endsWith('hbplus.fit')`, so these are all rejected:
 *   - someone@evilhbplus.fit      (suffix trick)
 *   - someone@hbplus.fit.evil.com (prefix trick)
 *   - someone@sub.hbplus.fit      (sub-domain)
 */
export function isAllowedEmail(
  email: string | null | undefined,
  allowedDomain: string = ENV.allowedDomain,
): boolean {
  if (!email) return false;
  const value = email.trim().toLowerCase();
  const at = value.lastIndexOf('@');
  if (at < 1) return false; // no local part
  return value.slice(at + 1) === allowedDomain.toLowerCase();
}
