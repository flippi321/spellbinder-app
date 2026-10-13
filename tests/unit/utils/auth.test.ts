import {
  authErrorMessage,
  displayNameError,
  emailError,
  passwordError,
  resetCodeError,
} from '@/utils/auth';

describe('emailError', () => {
  it.each(['you@spellbinder.test', '  jonas@example.com  ', 'a@b.co'])('accepts %p', (email) => {
    expect(emailError(email)).toBeNull();
  });

  it.each(['', '   '])('asks for an email when it is empty (%p)', (email) => {
    expect(emailError(email)).toBe('Enter your email.');
  });

  it.each(['jonas', 'jonas@', '@example.com', 'jonas@example', 'jo nas@example.com'])('rejects %p', (email) => {
    expect(emailError(email)).toBe('That doesn’t look like an email address.');
  });
});

describe('passwordError', () => {
  it('asks for a password when it is empty', () => {
    expect(passwordError('')).toBe('Enter your password.');
  });

  it('rejects 7 characters and accepts exactly 8', () => {
    expect(passwordError('1234567')).toBe('Use at least 8 characters.');
    expect(passwordError('12345678')).toBeNull();
  });
});

describe('displayNameError', () => {
  it.each(['', '   '])('asks for a name when it is blank (%p)', (name) => {
    expect(displayNameError(name)).toBe('Enter the name your playgroup knows you by.');
  });

  it('accepts 1 and 40 characters, ignoring surrounding spaces', () => {
    expect(displayNameError('J')).toBeNull();
    expect(displayNameError(` ${'a'.repeat(40)} `)).toBeNull();
  });

  it('rejects 41 characters', () => {
    expect(displayNameError('a'.repeat(41))).toBe('Keep it to 40 characters.');
  });
});

describe('resetCodeError', () => {
  it('accepts six digits, ignoring surrounding spaces', () => {
    expect(resetCodeError('123456')).toBeNull();
    expect(resetCodeError(' 123456 ')).toBeNull();
  });

  it.each(['', '12345', '1234567', '12a456'])('rejects %p', (code) => {
    expect(resetCodeError(code)).toBe('Enter the 6-digit code from the email.');
  });
});

describe('authErrorMessage', () => {
  it.each([
    ['invalid_credentials', 'That email and password don’t match.'],
    ['user_already_exists', 'There’s already an account with that email. Sign in instead.'],
    ['email_exists', 'There’s already an account with that email. Sign in instead.'],
    ['weak_password', 'Choose a stronger password (at least 8 characters).'],
    ['same_password', 'Choose a password that’s different from your old one.'],
    ['otp_expired', 'That code is wrong or has expired. Ask for a new one.'],
    ['email_address_invalid', 'That doesn’t look like an email address.'],
    ['signup_disabled', 'New accounts are turned off right now.'],
    ['over_request_rate_limit', 'Too many attempts. Wait a minute and try again.'],
    ['over_email_send_rate_limit', 'Too many emails sent. Wait a few minutes and try again.'],
  ])('explains Supabase code %s', (code, message) => {
    expect(authErrorMessage(Object.assign(new Error('raw'), { code }))).toBe(message);
  });

  it('explains a network failure', () => {
    const error = Object.assign(new Error('Network request failed'), { name: 'AuthRetryableFetchError' });
    expect(authErrorMessage(error)).toBe('Couldn’t reach Spellbinder. Check your connection and try again.');
  });

  it('falls back to the error message for an unknown code', () => {
    expect(authErrorMessage(Object.assign(new Error('Database error saving new user'), { code: 'unexpected_failure' })))
      .toBe('Database error saving new user');
  });

  it('falls back to the error message when there is no code', () => {
    expect(authErrorMessage(new Error('Boom'))).toBe('Boom');
  });

  it.each([
    ['a string', 'Plain failure', 'Plain failure'],
    ['null', null, 'Something went wrong'],
    ['a non-string code', { code: 42 }, 'Something went wrong'],
  ])('handles %s', (_kind, error, message) => {
    expect(authErrorMessage(error)).toBe(message);
  });
});
