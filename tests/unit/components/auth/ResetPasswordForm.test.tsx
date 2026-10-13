import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

function Harness({
  onRequestCode,
  onReset = jest.fn(),
  onBack = jest.fn(),
  error = null,
}: {
  onRequestCode: jest.Mock;
  onReset?: jest.Mock;
  onBack?: jest.Mock;
  error?: string | null;
}) {
  const [email, setEmail] = useState('');
  return (
    <ResetPasswordForm
      email={email}
      onEmailChange={setEmail}
      pending={false}
      error={error}
      onRequestCode={onRequestCode}
      onReset={onReset}
      onBack={onBack}
    />
  );
}

async function requestCodeFor(email: string) {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
}

describe('ResetPasswordForm', () => {
  it('asks for a valid email before sending a code', async () => {
    const onRequestCode = jest.fn();
    await render(<Harness onRequestCode={onRequestCode} />);
    await requestCodeFor('nope');
    expect(onRequestCode).not.toHaveBeenCalled();
    expect(screen.getByText('That doesn’t look like an email address.')).toBeTruthy();
  });

  it('stays on the email step when sending fails', async () => {
    const onRequestCode = jest.fn().mockResolvedValue(false);
    await render(<Harness onRequestCode={onRequestCode} error="Too many emails sent. Wait a few minutes and try again." />);
    await requestCodeFor('you@spellbinder.test');
    expect(onRequestCode).toHaveBeenCalledWith('you@spellbinder.test');
    expect(screen.getByRole('button', { name: 'Email me a code' })).toBeTruthy();
    expect(screen.getByText('Too many emails sent. Wait a few minutes and try again.')).toBeTruthy();
  });

  it('moves to the code step, then sets the new password', async () => {
    const onRequestCode = jest.fn().mockResolvedValue(true);
    const onReset = jest.fn();
    await render(<Harness onRequestCode={onRequestCode} onReset={onReset} />);
    await requestCodeFor('you@spellbinder.test');

    expect(screen.getByText('Enter the code we sent to you@spellbinder.test. It expires in 15 minutes.')).toBeTruthy();
    // No validation errors carried over from the first step.
    expect(screen.queryByText('Enter the 6-digit code from the email.')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Reset code'), '12-34 56');
    await fireEvent.changeText(screen.getByLabelText('New password'), 'new-password');
    await fireEvent.press(screen.getByRole('button', { name: 'Set new password' }));

    expect(onReset).toHaveBeenCalledWith('you@spellbinder.test', '123456', 'new-password');
  });

  it('validates the code and the new password', async () => {
    const onReset = jest.fn();
    await render(<Harness onRequestCode={jest.fn().mockResolvedValue(true)} onReset={onReset} />);
    await requestCodeFor('you@spellbinder.test');

    await fireEvent.changeText(screen.getByLabelText('Reset code'), '123');
    await fireEvent.changeText(screen.getByLabelText('New password'), 'short');
    await fireEvent.press(screen.getByRole('button', { name: 'Set new password' }));

    expect(onReset).not.toHaveBeenCalled();
    expect(screen.getByText('Enter the 6-digit code from the email.')).toBeTruthy();
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy();
  });

  it('works from the keyboard', async () => {
    const onRequestCode = jest.fn().mockResolvedValue(true);
    const onReset = jest.fn();
    await render(<Harness onRequestCode={onRequestCode} onReset={onReset} />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'you@spellbinder.test');
    await fireEvent(screen.getByLabelText('Email'), 'submitEditing');
    expect(onRequestCode).toHaveBeenCalledWith('you@spellbinder.test');

    await fireEvent.changeText(screen.getByLabelText('Reset code'), '123456');
    await fireEvent(screen.getByLabelText('Reset code'), 'submitEditing');
    await fireEvent.changeText(screen.getByLabelText('New password'), 'new-password');
    await fireEvent(screen.getByLabelText('New password'), 'submitEditing');
    expect(onReset).toHaveBeenCalledWith('you@spellbinder.test', '123456', 'new-password');
  });

  it('sends a new code from the code step', async () => {
    const onRequestCode = jest.fn().mockResolvedValue(true);
    await render(<Harness onRequestCode={onRequestCode} />);
    await requestCodeFor('you@spellbinder.test');
    await fireEvent.press(screen.getByRole('button', { name: 'Send a new code' }));
    expect(onRequestCode).toHaveBeenCalledTimes(2);
  });

  it('goes back to sign in', async () => {
    const onBack = jest.fn();
    await render(<Harness onRequestCode={jest.fn()} onBack={onBack} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back to sign in' }));
    expect(onBack).toHaveBeenCalled();
  });
});
