import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { Button } from '@/components/ui/Button';
import { DISPLAY_NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH, displayNameError, emailError, passwordError } from '@/utils/auth';
import { spacing } from '@/theme';

import { AuthField } from './AuthField';
import { FormError } from './FormError';

export type AuthMode = 'signIn' | 'signUp';

export interface AuthFormValues {
  email: string;
  password: string;
  displayName: string;
}

interface AuthFormProps {
  mode: AuthMode;
  /** Kept by the screen so it survives switching between modes. */
  email: string;
  onEmailChange: (email: string) => void;
  pending: boolean;
  /** Server-side failure from the last attempt. */
  error: string | null;
  onSubmit: (values: AuthFormValues) => void;
  onForgotPassword: () => void;
}

/** "Sign in" and "Create account" (adds a display name). Validates before it submits. */
export function AuthForm({ mode, email, onEmailChange, pending, error, onSubmit, onForgotPassword }: AuthFormProps) {
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  // Field errors only appear once the user has tried to submit, then update as they type.
  const [submitted, setSubmitted] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const signUp = mode === 'signUp';

  const errors = {
    displayName: signUp ? displayNameError(displayName) : null,
    email: emailError(email),
    password: signUp ? passwordError(password) : password === '' ? 'Enter your password.' : null,
  };

  const submit = () => {
    setSubmitted(true);
    if (errors.displayName || errors.email || errors.password) return;
    onSubmit({ email, password, displayName });
  };

  return (
    <View style={styles.form}>
      {signUp ? (
        <AuthField
          label="Display name"
          icon="user"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="What your playgroup calls you"
          autoComplete="name"
          textContentType="nickname"
          autoCapitalize="words"
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          error={submitted ? errors.displayName : null}
        />
      ) : null}
      <AuthField
        label="Email"
        icon="mail"
        inputRef={emailRef}
        value={email}
        onChangeText={onEmailChange}
        placeholder="you@example.com"
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={submitted ? errors.email : null}
      />
      <AuthField
        label="Password"
        icon="lock"
        secure
        inputRef={passwordRef}
        value={password}
        onChangeText={setPassword}
        autoComplete={signUp ? 'new-password' : 'current-password'}
        textContentType={signUp ? 'newPassword' : 'password'}
        returnKeyType="go"
        onSubmitEditing={submit}
        hint={signUp ? `At least ${PASSWORD_MIN_LENGTH} characters.` : undefined}
        error={submitted ? errors.password : null}
      />

      <FormError message={error} />

      <Button label={signUp ? 'Create account' : 'Sign in'} onPress={submit} loading={pending} style={styles.submit} />
      {signUp ? null : (
        <Button label="Forgot password?" variant="ghost" size="sm" onPress={onForgotPassword} style={styles.link} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  submit: {
    marginTop: spacing.xs,
  },
  link: {
    alignSelf: 'center',
    marginTop: -spacing.xs,
  },
});
