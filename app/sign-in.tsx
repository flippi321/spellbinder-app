import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AuthForm, type AuthFormValues, type AuthMode } from '@/components/auth/AuthForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { Sigil } from '@/components/ui/Sigil';
import { Text } from '@/components/ui/Text';
import { loadUserData } from '@/stores/bootstrap';
import { useSessionStore } from '@/stores/useSessionStore';
import { colors, layout, radii, spacing } from '@/theme';

const MODES: readonly SegmentOption<AuthMode>[] = [
  { value: 'signIn', label: 'Sign in' },
  { value: 'signUp', label: 'Create account' },
];

/**
 * Supabase mode only: the root layout shows this screen while signed out and leaves it as soon as
 * the session store says `signedIn`.
 */
export default function SignInScreen() {
  const pending = useSessionStore((s) => s.pending);
  const authError = useSessionStore((s) => s.authError);
  const [mode, setMode] = useState<AuthMode | 'reset'>('signIn');
  const [email, setEmail] = useState('');

  const switchMode = (next: AuthMode | 'reset') => {
    useSessionStore.getState().clearAuthError();
    setMode(next);
  };

  const submit = async ({ email: address, password, displayName }: AuthFormValues) => {
    const { signIn, signUp } = useSessionStore.getState();
    const ok = mode === 'signUp' ? await signUp(address, password, displayName) : await signIn(address, password);
    if (ok) void loadUserData();
  };

  const reset = async (address: string, code: string, password: string) => {
    if (await useSessionStore.getState().resetPassword(address, code, password)) void loadUserData();
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.sigil}>
            <Sigil size={44} />
          </View>
          <Text variant="display" accessibilityRole="header">
            Spellbinder
          </Text>
          <Text variant="body" tone="secondary" align="center">
            Your binder, your decks and your playgroup — together at the table.
          </Text>
        </View>

        <Card padding={spacing.xl} style={styles.panel}>
          {mode === 'reset' ? (
            <ResetPasswordForm
              email={email}
              onEmailChange={setEmail}
              pending={pending}
              error={authError}
              onRequestCode={(address) => useSessionStore.getState().requestPasswordReset(address)}
              onReset={(address, code, password) => void reset(address, code, password)}
              onBack={() => switchMode('signIn')}
            />
          ) : (
            <>
              <SegmentedControl options={MODES} value={mode} onChange={switchMode} accessibilityLabel="Account" />
              <AuthForm
                key={mode}
                mode={mode}
                email={email}
                onEmailChange={setEmail}
                pending={pending}
                error={authError}
                onSubmit={(values) => void submit(values)}
                onForgotPassword={() => switchMode('reset')}
              />
            </>
          )}
        </Card>

        <Text variant="caption" tone="muted" align="center" style={styles.footer}>
          Free and non-commercial. Unofficial Fan Content, not approved or endorsed by Wizards of the Coast.
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sigil: {
    width: 84,
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.chip,
    borderWidth: 1,
    borderColor: colors.borderGold,
    backgroundColor: colors.surfaceGold,
    marginBottom: spacing.xs,
  },
  panel: {
    gap: spacing.xl,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
  },
});
