module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },

  // the ts-eslint recommended ruleset sets the parser so we need to set it back
  parser: 'vue-eslint-parser',
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],

  parserOptions: {
    ecmaVersion: 2020,
    parser: '@typescript-eslint/parser',
    extraFileExtensions: ['.vue'],
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: 'module',
  },

  plugins: ['@typescript-eslint'],

  rules: {
    'vue/script-setup-uses-vars': 'error',

    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    '@typescript-eslint/ban-ts-comment': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    '@typescript-eslint/no-unused-vars': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    '@typescript-eslint/no-explicit-any': process.env.NODE_ENV === 'production' ? 'warn' : 'off',

    // this rule, if on, would require explicit return type on the `render` function
    '@typescript-eslint/explicit-function-return-type': 'off',

    'vue/no-ref-as-operand': 'off',
  },

  ignorePatterns: ['public/**'],

  overrides: [
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
}
