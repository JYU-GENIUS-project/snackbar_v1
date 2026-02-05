const eslintJs = require('@eslint/js');
const globals = require('globals');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
    {
        ignores: ['coverage/**', 'node_modules/**']
    },
    eslintJs.configs.recommended,
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: './tsconfig.eslint.json',
                tsconfigRootDir: __dirname
            },
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.jest
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            ...tseslint.configs['recommended-type-checked'].rules,
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
        }
    },
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
