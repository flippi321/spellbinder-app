// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Matches '#abc', '#aabbcc', '#aabbccdd' and 'rgb(…)' / 'rgba(…)' string literals.
const COLOR_LITERAL = '/^(#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\\(.*\\))$/';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'supabase/**'],
  },
  {
    // CLAUDE.md: screens never call fetch directly. Stores → repositories → services;
    // src/services owns all network access (Scryfall only through the rate-limited client).
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/services/**', 'scripts/**', '**/__tests__/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Network access lives in src/services — go through a store/repository instead.',
        },
      ],
    },
  },
  {
    // CLAUDE.md: all colors come from src/theme. No hard-coded hex/rgb values in UI code.
    files: ['app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${COLOR_LITERAL}]`,
          message: 'Use a color token from @/theme instead of a hard-coded color.',
        },
      ],
    },
  },
]);
