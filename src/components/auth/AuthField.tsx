import { useState, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { colors, radii, spacing, typography } from '@/theme';

interface AuthFieldProps
  extends Pick<
    TextInputProps,
    | 'value'
    | 'onChangeText'
    | 'placeholder'
    | 'autoComplete'
    | 'textContentType'
    | 'keyboardType'
    | 'returnKeyType'
    | 'onSubmitEditing'
    | 'maxLength'
    | 'autoCapitalize'
    | 'autoFocus'
  > {
  label: string;
  icon: IconName;
  /** Validation message under the field; also outlines the field. */
  error?: string | null;
  /** Help text under the field when there's no error. */
  hint?: string;
  /** Password field with a show/hide toggle. */
  secure?: boolean;
  inputRef?: Ref<TextInput>;
}

/** Labelled text field for the sign-in screen: leading icon, gold outline on focus, inline error. */
export function AuthField({ label, icon, error, hint, secure = false, inputRef, autoCapitalize, ...input }: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const note = error ?? hint;

  return (
    <View style={styles.field}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <View style={[styles.inputRow, focused && styles.focused, error ? styles.invalid : null]}>
        <Icon name={icon} size={18} color={focused ? colors.gold : colors.textMuted} />
        <TextInput
          ref={inputRef}
          {...input}
          secureTextEntry={secure && !revealed}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.gold}
          cursorColor={colors.gold}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
          accessibilityLabel={label}
          accessibilityHint={note ?? undefined}
        />
        {secure ? (
          <IconButton
            icon={revealed ? 'eyeOff' : 'eye'}
            variant="ghost"
            size={36}
            iconSize={18}
            accessibilityLabel={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            onPress={() => setRevealed((r) => !r)}
            style={styles.toggle}
          />
        ) : null}
      </View>
      {note ? (
        <Text variant="caption" tone={error ? 'missing' : 'muted'} accessibilityLiveRegion={error ? 'polite' : 'none'}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs + spacing.xxs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  focused: {
    borderColor: colors.gold,
  },
  invalid: {
    borderColor: colors.missingBorder,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    paddingVertical: spacing.sm,
    // Web: the row's gold border already shows focus, so drop the browser's own outline.
    outlineWidth: 0,
  },
  toggle: {
    marginRight: -spacing.sm,
  },
});
