import { messageOf } from './errors';

/** `minimum_password_length` in spellbinder-db/supabase/config.toml. */
export const PASSWORD_MIN_LENGTH = 8;
/** The `profiles.display_name` check in spellbinder-db (1–40 characters). */
export const DISPLAY_NAME_MAX_LENGTH = 40;
/** `otp_length` in spellbinder-db/supabase/config.toml (the password-reset code). */
export const RESET_CODE_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = new RegExp(`^\\d{${RESET_CODE_LENGTH}}$`);

/** Form validation: each returns a message to show, or null when the value is fine. */
export function emailError(email: string): string | null {
  if (email.trim() === '') return 'Enter your email.';
  return EMAIL_PATTERN.test(email.trim()) ? null : 'That doesn’t look like an email address.';
}

export function passwordError(password: string): string | null {
  if (password === '') return 'Enter your password.';
  return password.length >= PASSWORD_MIN_LENGTH ? null : `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
}

export function displayNameError(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'Enter the name your playgroup knows you by.';
  return trimmed.length <= DISPLAY_NAME_MAX_LENGTH ? null : `Keep it to ${DISPLAY_NAME_MAX_LENGTH} characters.`;
}

export function resetCodeError(code: string): string | null {
  return CODE_PATTERN.test(code.trim()) ? null : `Enter the ${RESET_CODE_LENGTH}-digit code from the email.`;
}

/** Supabase Auth error codes we expect from the sign-in screen, in plain words. */
const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'That email and password don’t match.',
  user_already_exists: 'There’s already an account with that email. Sign in instead.',
  email_exists: 'There’s already an account with that email. Sign in instead.',
  weak_password: `Choose a stronger password (at least ${PASSWORD_MIN_LENGTH} characters).`,
  same_password: 'Choose a password that’s different from your old one.',
  otp_expired: 'That code is wrong or has expired. Ask for a new one.',
  email_address_invalid: 'That doesn’t look like an email address.',
  signup_disabled: 'New accounts are turned off right now.',
  over_request_rate_limit: 'Too many attempts. Wait a minute and try again.',
  over_email_send_rate_limit: 'Too many emails sent. Wait a few minutes and try again.',
};

const OFFLINE_MESSAGE = 'Couldn’t reach Spellbinder. Check your connection and try again.';

/** A readable message for a failed sign-in, sign-up or password reset. */
export function authErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const { code, name } = error as { code?: unknown; name?: unknown };
    if (typeof code === 'string' && code in AUTH_MESSAGES) return AUTH_MESSAGES[code];
    if (name === 'AuthRetryableFetchError') return OFFLINE_MESSAGE;
  }
  return messageOf(error);
}
