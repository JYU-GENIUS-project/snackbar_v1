const eslintJs = require('@eslint/js');
const globals = require('globals');

module.exports = [
    {
        ignores: ['coverage/**', 'node_modules/**']
    },
    eslintJs.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.jest
            }
        },
        rules: {
            indent: ['error', 2],
            'linebreak-style': ['error', 'windows'],
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            eqeqeq: ['error', 'always'],
            curly: ['error', 'all'],
            'brace-style': ['error', '1tbs'],
            'comma-dangle': ['error', 'never'],
            'no-trailing-spaces': 'error',
            'no-multiple-empty-lines': ['error', { max: 2 }]
        }
    }
];
