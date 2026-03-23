/// <reference types="vitest/globals" />
import { cleanup } from '@testing-library/react';

const createStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => (key in store ? store[key] : null),
        setItem: (key: string, value: string) => {
            store[key] = String(value);
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        }
    };
};

if (typeof window !== 'undefined') {
    const candidate = (window as Window & { localStorage?: unknown }).localStorage;
    const hasStorage = candidate && typeof (candidate as Storage).getItem === 'function';
    if (!hasStorage) {
        Object.defineProperty(window, 'localStorage', {
            value: createStorageMock(),
            writable: true
        });
    }
}

afterEach(() => {
    cleanup();
});
