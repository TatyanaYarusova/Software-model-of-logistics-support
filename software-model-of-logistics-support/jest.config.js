/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jest-environment-jsdom',

    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov'],

    roots: ['<rootDir>/tests'],          // где лежат тесты
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],

    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
        '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
    },

    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },

    moduleFileExtensions: ['ts','tsx','js','jsx','json','node'],
    testTimeout: 30000,
};