import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../../services/apiClient', () => ({
    apiRequest: vi.fn(),
    API_BASE_URL: '/api'
}));

vi.mock('../../utils/offlineCache', () => ({
    readOfflineProductSnapshot: vi.fn(),
    saveOfflineProductSnapshot: vi.fn()
}));

const mockUseQuery = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', () => ({
    useQuery: mockUseQuery
}));

import { apiRequest } from '../../services/apiClient';
import { readOfflineProductSnapshot, saveOfflineProductSnapshot } from '../../utils/offlineCache';
import useKioskStatus from '../useKioskStatus.js';

describe('useKioskStatus', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    beforeEach(() => {
        readOfflineProductSnapshot.mockReturnValue(null);
        mockUseQuery.mockImplementation((params: any) => {
            const { queryFn, onSuccess } = params;
            const execute = async () => {
                const data = await queryFn({ signal: undefined });
                if (typeof onSuccess === 'function') {
                    onSuccess(data);
                }
                return { data };
            };

            if (params.enabled !== false) {
                execute();
            }

            const refetch = vi.fn(execute);

            return {
                isLoading: false,
                isFetching: false,
                error: null,
                refetch
            };
        });
    });

    it('returns offline defaults when no cached snapshot is available', () => {
        const { result } = renderHook(() => useKioskStatus({ enabled: false, sse: false }));

        expect(result.current.status).toBeNull();
        expect(result.current.inventoryTrackingEnabled).toBe(true);
        expect(result.current.connectionState).toBe('idle');
    });

    it('hydrates kiosk status from polling requests and persists snapshot', async () => {
        const payload = {
            status: 'open',
            reason: 'operational',
            message: '🟢 Open - Closes at 18:00',
            nextClose: '2025-05-05T18:00:00.000Z',
            nextOpen: null,
            maintenance: { enabled: false, message: 'All good' },
            generatedAt: '2025-05-05T10:00:00.000Z'
        };

        apiRequest.mockResolvedValue(payload);

        const { result } = renderHook(() => useKioskStatus({ sse: false, refetchInterval: false }));

        await waitFor(() => {
            expect(apiRequest).toHaveBeenCalled();
        }, { timeout: 3000 });

        await act(async () => {
            await result.current.refetch();
        });

        await waitFor(() => {
            expect(saveOfflineProductSnapshot).toHaveBeenCalled();
        }, { timeout: 3000 });

        await waitFor(() => {
            expect(result.current.status).not.toBeNull();
        }, { timeout: 3000 });

        expect(result.current.status).toMatchObject(payload);

        expect(result.current.statusFingerprint).not.toBeNull();
        expect(result.current.lastUpdatedAt).toBe(payload.generatedAt);
        expect(saveOfflineProductSnapshot).toHaveBeenCalled();
    });

    it('applies SSE status, tracking, and inventory updates', async () => {
        class MockEventSource {
            static instances: MockEventSource[] = [];
            url: string;
            options: EventSourceInit | undefined;
            closed: boolean;
            eventHandlers: Map<string, (event: { data: string }) => void>;
            onopen: (() => void) | null;
            onerror: (() => void) | null;

            constructor(url: string, options?: EventSourceInit) {
                this.url = url;
                this.options = options;
                this.closed = false;
                this.eventHandlers = new Map();
                this.onopen = null;
                this.onerror = null;
                MockEventSource.instances.push(this);
            }

            addEventListener(type: string, handler: (event: { data: string }) => void) {
                this.eventHandlers.set(type, handler);
            }

            emit(type: string, payload: unknown) {
                const handler = this.eventHandlers.get(type);
                if (handler) {
                    handler({ data: JSON.stringify(payload) });
                }
            }

            close() {
                this.closed = true;
            }
        }

        vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);

        const { result } = renderHook(() => useKioskStatus({ enabled: false }));

        expect(MockEventSource.instances).toHaveLength(1);
        const instance = MockEventSource.instances[0];

        await act(async () => {
            if (typeof instance.onopen === 'function') {
                instance.onopen();
            }
        });

        await waitFor(() => {
            expect(result.current.connectionState).toBe('connected');
        });

        act(() => {
            instance.emit('status:update', {
                status: 'maintenance',
                reason: 'maintenance',
                message: '🔧 Maintenance',
                maintenance: { enabled: true, message: '🔧 Maintenance' },
                generatedAt: '2025-05-05T11:00:00.000Z'
            });
        });

        await waitFor(() => {
            expect(result.current.status?.status).toBe('maintenance');
        });

        act(() => {
            instance.emit('inventory:tracking', { enabled: false, emittedAt: '2025-05-05T11:00:10.000Z' });
        });

        expect(result.current.inventoryTrackingEnabled).toBe(false);

        act(() => {
            instance.emit('inventory:update', {
                productId: 'sku-123',
                stockQuantity: '4',
                isLowStock: 1,
                isOutOfStock: false,
                stockStatus: 'available'
            });
        });

        await waitFor(() => {
            const availability = result.current.inventoryAvailability;
            expect(availability['sku-123']).toMatchObject({
                productId: 'sku-123',
                isLowStock: true,
                isOutOfStock: false,
                available: true
            });
        });

        expect(saveOfflineProductSnapshot).toHaveBeenCalled();
    });
});
