import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';

export const INVENTORY_QUERY_KEY = 'inventory-snapshot';
export const INVENTORY_TRACKING_QUERY_KEY = 'inventory-tracking';
export const INVENTORY_DISCREPANCY_QUERY_KEY = 'inventory-discrepancies';

export type InventoryListParams = {
    token?: string | undefined;
    search?: string;
    includeInactive?: boolean;
    sortBy?: string;
    sortDirection?: string;
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
};

export type InventoryListResponse = Record<string, unknown>;
export type InventoryItem = Record<string, unknown>;
export type InventoryTrackingState = { enabled: boolean } & Record<string, unknown>;
export type InventoryDiscrepancies = Record<string, unknown>;

const listInventoryRequest = async ({ token, search, includeInactive, sortBy, sortDirection, limit, offset, signal }: InventoryListParams): Promise<InventoryListResponse> => {
    const response = await apiRequest<InventoryListResponse>({
        path: '/inventory',
        token,
        signal,
        searchParams: {
            search: search || undefined,
            includeInactive: includeInactive ? 'true' : undefined,
            sortBy: sortBy || undefined,
            sortDirection: sortDirection || undefined,
            limit: limit ?? undefined,
            offset: offset ?? undefined
        }
    });

    return response;
};

const getInventoryItemRequest = async ({ token, productId, signal }: { token?: string | undefined; productId: string; signal?: AbortSignal; }): Promise<InventoryItem> => {
    const response = await apiRequest<{ data: InventoryItem }>({
        path: `/inventory/${productId}`,
        token,
        signal
    });

    return response.data;
};

const getTrackingRequest = async ({ token, signal }: { token?: string | undefined; signal?: AbortSignal; }): Promise<InventoryTrackingState> => {
    const response = await apiRequest<{ data: InventoryTrackingState }>({
        path: '/inventory/tracking',
        token,
        signal
    });

    return response.data;
};

const setTrackingRequest = async ({ token, enabled }: { token?: string | undefined; enabled: boolean; }): Promise<InventoryTrackingState> => {
    const response = await apiRequest<{ data: InventoryTrackingState }>({
        path: '/inventory/tracking',
        method: 'PATCH',
        token,
        body: { enabled }
    });

    return response.data;
};

const recordStockRequest = async ({ token, productId, quantity, reason }: { token?: string | undefined; productId: string; quantity: number; reason?: string; }): Promise<InventoryItem> => {
    const response = await apiRequest<{ data: InventoryItem }>({
        path: `/inventory/${productId}/stock`,
        method: 'PATCH',
        token,
        body: { quantity, reason }
    });

    return response.data;
};

const recordAdjustmentRequest = async ({ token, productId, newQuantity, reason }: { token?: string | undefined; productId: string; newQuantity: number; reason?: string; }): Promise<InventoryItem> => {
    const response = await apiRequest<{ data: InventoryItem }>({
        path: `/inventory/${productId}/adjustments`,
        method: 'POST',
        token,
        body: { newQuantity, reason }
    });

    return response.data;
};

const listDiscrepanciesRequest = async ({ token, signal }: { token?: string | undefined; signal?: AbortSignal; }): Promise<InventoryDiscrepancies> => {
    const response = await apiRequest<{ data: InventoryDiscrepancies }>({
        path: '/inventory/discrepancies',
        token,
        signal
    });

    return response.data;
};

export const useInventorySnapshot = ({
    token,
    search,
    includeInactive = false,
    sortBy = 'name',
    sortDirection = 'asc',
    limit = 50,
    offset = 0,
    enabled = true
}: InventoryListParams & { enabled?: boolean }) => {
    return useQuery({
        queryKey: [
            INVENTORY_QUERY_KEY,
            {
                search,
                includeInactive,
                sortBy,
                sortDirection,
                limit,
                offset
            }
        ],
        queryFn: ({ signal }) =>
            listInventoryRequest({ token, search, includeInactive, sortBy, sortDirection, limit, offset, signal }),
        enabled: Boolean(token) && enabled,
        refetchInterval: 15000
    });
};

export const useInventoryItem = ({ token, productId, enabled = true }: { token?: string | undefined; productId?: string | null; enabled?: boolean; }) => {
    return useQuery({
        queryKey: ['inventory-item', productId],
        queryFn: ({ signal }) => getInventoryItemRequest({ token, productId: productId as string, signal }),
        enabled: Boolean(token) && Boolean(productId) && enabled
    });
};

export const useInventoryTracking = (token?: string | undefined) => {
    return useQuery({
        queryKey: [INVENTORY_TRACKING_QUERY_KEY],
        queryFn: ({ signal }) => getTrackingRequest({ token, signal }),
        enabled: Boolean(token),
        staleTime: 15000
    });
};

export const useSetInventoryTracking = (token?: string | undefined) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ enabled }: { enabled: boolean }) => setTrackingRequest({ token, enabled }),
        onMutate: async ({ enabled }) => {
            await queryClient.cancelQueries({ queryKey: [INVENTORY_TRACKING_QUERY_KEY] });
            const previous = queryClient.getQueryData([INVENTORY_TRACKING_QUERY_KEY]) as InventoryTrackingState | undefined;
            queryClient.setQueryData([INVENTORY_TRACKING_QUERY_KEY], { enabled });
            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData([INVENTORY_TRACKING_QUERY_KEY], context.previous);
            }
        },
        onSuccess: (data) => {
            queryClient.setQueryData([INVENTORY_TRACKING_QUERY_KEY], data);
            queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
        }
    });
};

export const useRecordStockUpdate = (token?: string | undefined) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ productId, quantity, reason }: { productId: string; quantity: number; reason?: string }) =>
            recordStockRequest({ token, productId, quantity, reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
        }
    });
};

export const useRecordInventoryAdjustment = (token?: string | undefined) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ productId, newQuantity, reason }: { productId: string; newQuantity: number; reason?: string }) =>
            recordAdjustmentRequest({ token, productId, newQuantity, reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
        }
    });
};

export const useInventoryDiscrepancies = ({ token, enabled = true }: { token?: string | undefined; enabled?: boolean }) => {
    return useQuery({
        queryKey: [INVENTORY_DISCREPANCY_QUERY_KEY],
        queryFn: ({ signal }) => listDiscrepanciesRequest({ token, signal }),
        enabled: Boolean(token) && enabled,
        refetchInterval: 60000
    });
};
