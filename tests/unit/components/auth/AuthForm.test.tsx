import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { AuthForm, type AuthMode } from '@/components/auth/AuthForm';
import { colors } from '@/theme';

function Harness({
  mode,
  error = null,
  pending = false,
  onSubmit,
  onForgotPassword = jest.fn(),
}: {
  mode: AuthMode;
  error?: string | null;
  pending?: boolean;
  onSubmit: jest.Mock;
  onForgotPassword?: jest.Mock;
}) {
  const [email, setEmail] = useState('');
  return (
    <AuthForm
      mode={mode}
      email={email}
      onEmailChange={setEmail}
      pending={pending}
      error={error}
      onSubmit={onSubmit}
      onForgotPassword={onForgotPassword}
    />
  );
}

describe('AuthForm — sign in', () => {
  it('submits email and password', async () => {
    const onSubmit = jest.fn();
    await render(<Harness mode="signIn" onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'you@spellbinder.test');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'spellbinder-dev');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'you@spellbinder.test',
      password: 'spellbinder-dev',
      displayName: '',
    });
  });

  it('shows what is missing instead of submitting, and has no display name field', async () => {
    const onSubmit = jest.fn();
    await render(<Harness mode="signIn" onSubmit={onSubmit} />);
    expect(screen.queryByLabelText('Display name')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter your email.')).toBeTruthy();
    expect(screen.getByText('Enter your password.')).toBeTruthy();
  });

  it('does not enforce the new-password length on sign in', async () => {
    const onSubmit = jest.fn();
    await render(<Harness mode="signIn" onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'you@spellbinder.test');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'short');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows the server error and offers a password reset', async () => {
    const onForgotPassword = jest.fn();
    await render(
      <Harness mode="signIn" onSubmit={jest.fn()} onForgotPassword={onForgotPassword} error="That email and password don’t match." />,
    );
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('That email and password don’t match.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(onForgotPassword).toHaveBeenCalled();
  });

  it('shows or hides the password', async () => {
    await render(<Harness mode="signIn" onSubmit={jest.fn()} />);
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByLabelText('Show password'));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByLabelText('Hide password'));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  it('submits from the keyboard', async () => {
    const onSubmit = jest.fn();
    await render(<Harness mode="signIn" onSubmit={onSubmit} />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'you@spellbinder.test');
    await fireEvent(screen.getByLabelText('Email'), 'submitEditing');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'spellbinder-dev');
    await fireEvent(screen.getByLabelText('Password'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('outlines the field that has focus', async () => {
    await render(<Harness mode="signIn" onSubmit={jest.fn()} />);
    const email = screen.getByLabelText('Email');
    expect(email.parent).toHaveStyle({ borderColor: colors.borderStrong });
    await fireEvent(email, 'focus');
    expect(email.parent).toHaveStyle({ borderColor: colors.gold });
    await fireEvent(email, 'blur');
    expect(email.parent).toHaveStyle({ borderColor: colors.borderStrong });
  });

  it('disables the button while a request is pending', async () => {
    const onSubmit = jest.fn();
    await render(<Harness mode="signIn" onSubmit={onSubmit} pending />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  });
});

describe('AuthForm — create account', () => {
  it('submits display name, email and password', async () => {
    const onSubmit = jest.fn();
    await render(<Harness mode="signUp" onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Display name'), 'Jonas');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'jonas@spellbinder.test');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'password1');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'jonas@spellbinder.test', password: 'password1', displayName: 'Jonas' });
  });

  it('moves from the display name to the email field from the keyboard', async () => {
    const onSubmit = jest.fn();
    await render(<Harness mode="signUp" onSubmit={onSubmit} />);
    await fireEvent(screen.getByLabelText('Display name'), 'submitEditing');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a name, a valid email and 8 characters, and has no reset link', async () => {
    const onSubmit = jest.fn();
    await render(<Harness mode="signUp" onSubmit={onSubmit} />);
    expect(screen.queryByRole('button', { name: 'Forgot password?' })).toBeNull();
    expect(screen.getByText('At least 8 characters.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Email'), 'jonas@');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'short');
    await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Enter the name your playgroup knows you by.')).toBeTruthy();
    expect(screen.getByText('That doesn’t look like an email address.')).toBeTruthy();
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy();
  });
});
