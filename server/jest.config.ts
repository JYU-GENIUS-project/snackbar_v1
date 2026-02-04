import type { Config } from 'jest';

const config: Config = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/server.ts'],
    testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    transform: {
        '^.+\\.(t|j)sx?$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false }]
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    verbose: true,
    testTimeout: 10000
};

export default config;
