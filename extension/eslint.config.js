import globals from 'globals'
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import stylisticJs from '@stylistic/eslint-plugin-js'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
    plugins: {
      '@stylistic/js': stylisticJs,
      prettier,
    },
    rules: {
      '@stylistic/js/nonblock-statement-body-position': 'off',
      '@stylistic/js/comma-dangle': 'off',
      'class-methods-use-this': 'off',
      '@stylistic/js/max-len': [2, 120],
      'no-restricted-syntax': ['error', 'WithStatement'],
      'no-param-reassign': 0,
      'no-plusplus': 0,
      'no-unused-expressions': 'off',
      '@stylistic/js/template-curly-spacing': 'off',
      '@stylistic/js/indent': 'off',
      '@stylistic/js/operator-linebreak': 'off',
      'no-await-in-loop': 'off',
      'prefer-destructuring': 'off',
      'no-use-before-define': [2, 'nofunc'],
      'no-underscore-dangle': 'off',
      'dot-notation': 'off',
      'no-return-await': 'off',
    },
  },
]
