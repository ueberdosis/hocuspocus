module.exports = {
  parser: '@babel/eslint-parser',
  parserOptions: {
    sourceType: 'module',
  },
  env: {
    es6: true,
    node: true,
  },
  overrides: [
    {
      files: [
        './packages/**/*.js',
      ],
      globals: {
        document: false,
        window: false,
      },
      extends: [
        'airbnb-base',
      ],
      rules: {
        'max-classes-per-file': 'off',
        'no-shadow': 'off',
        'no-alert': 'off',
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        semi: ['error', 'never'],
        'import/extensions': 'off',
        'import/no-extraneous-dependencies': 'off',
        'import/no-unresolved': 'off',
        'import/no-dynamic-require': 'off',
        'arrow-parens': ['error', 'as-needed'],
        'padded-blocks': 'off',
        'class-methods-use-this': 'off',
        'global-require': 'off',
        'func-names': ['error', 'never'],
        'arrow-body-style': 'off',
        'max-len': 'off',
        'no-param-reassign': 'off',
        'import/prefer-default-export': 'off',
        'consistent-return': 'off',
        'no-redeclare': 'off',
        'no-unused-vars': 'off',
        'no-use-before-define': 'off',
        'no-dupe-class-members': 'off',
      },
    },
  ],
}
