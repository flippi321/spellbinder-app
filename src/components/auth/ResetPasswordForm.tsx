import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { RESET_CODE_LENGTH, emailError, passwordError, resetCodeError } from '@/utils/auth';
import { spacing } from '@/theme';

import { AuthField } from './AuthField';
import { FormError } from './FormError';

interface ResetPasswordFormProps {
  email: string;
  onEmailChange: (email: string) => void;
  pending: boolean;
  error: string | null;
  /** Email a reset code. Resolves to true once it's sent. */
  onRequestCode: (email: string) => Promise<boolean>;
  /** Check the code and set the new password (signs in on success). */
  onReset: (email: string, code: string, password: string) => void;
  onBack: () => void;
}

/** Forgot password: email → 6-digit code from the email + a new password. */
export function ResetPasswordForm({
  email,
  onEmailChange,
  pending,
  error,
  onRequestCode,
  onReset,
  onBack,
}: ResetPasswordFormProps) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const requestCode = async () => {
    setSubmitted(true);
    if (emailError(email)) return;
    if (await onRequestCode(email)) {
      setSubmitted(false);
      setStep('verify');
    }
  };

  const reset = () => {
    setSubmitted(true);
    if (resetCodeError(code) || passwordError(password)) return;
    onReset(email, code, password);
  };

  return (
    <View style={styles.form}>
      <View style={styles.intro}>
        <Text variant="heading" accessibilityRole="header">
          Reset your password
        </Text>
        <Text variant="body" tone="secondary">
          {step === 'request'
            ? `We’ll email you a ${RESET_CODE_LENGTH}-digit code to choose a new password.`
            : `Enter the code we sent to ${email.trim()}. It expires in 15 minutes.`}
        </Text>
      </View>

      {step === 'request' ? (
        <AuthField
          label="Email"
          icon="mail"
          value={email}
          onChangeText={onEmailChange}
          placeholder="you@example.com"
          // "username" so the password manager files the new password under this account (see AuthForm).
          autoComplete="username"
          textContentType="username"
          keyboardType="email-address"
          returnKeyType="send"
          onSubmitEditing={() => void requestCode()}
          error={submitted ? emailError(email) : null}
        />
      ) : (
        <>
          <AuthField
            label="Reset code"
            icon="mail"
            value={code}
            onChangeText={(text) => setCode(text.replace(/\D/g, ''))}
            placeholder={'0'.repeat(RESET_CODE_LENGTH)}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            keyboardType="number-pad"
            maxLength={RESET_CODE_LENGTH}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            error={submitted ? resetCodeError(code) : null}
          />
          <AuthField
            label="New password"
            icon="lock"
            secure
            inputRef={passwordRef}
            value={password}
            onChangeText={setPassword}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={reset}
            error={submitted ? passwordError(password) : null}
          />
        </>
      )}

      <FormError message={error} />

      {step === 'request' ? (
        <Button label="Email me a code" onPress={() => void requestCode()} loading={pending} />
      ) : (
        <>
          <Button label="Set new password" onPress={reset} loading={pending} />
          <Button
            label="Send a new code"
            variant="ghost"
            size="sm"
            disabled={pending}
            onPress={() => void onRequestCode(email)}
            style={styles.link}
          />
        </>
      )}
      <Button label="Back to sign in" variant="secondary" onPress={onBack} disabled={pending} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  intro: {
    gap: spacing.xs,
  },
  link: {
    alignSelf: 'center',
    marginTop: -spacing.xs,
  },
});
