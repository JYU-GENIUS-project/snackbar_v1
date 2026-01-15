import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';

export const INVENTORY_QUERY_KEY = 'inventory-snapshot';
export const INVENTORY_TRACKING_QUERY_KEY = 'inventory-tracking';
export const INVENTORY_DISCREPANCY_QUERY_KEY = 'inventory-discrepancies';

const listInventoryRequest = async ({ token, search, includeInactive, sortBy, sortDirection, limit, offset, signal }) => {
  const response = await apiRequest({
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

const getInventoryItemRequest = async ({ token, productId, signal }) => {
  const response = await apiRequest({
    path: `/inventory/${productId}`,
    token,
    signal
  });

  return response.data;
};

const getTrackingRequest = async ({ token, signal }) => {
  const response = await apiRequest({
    path: '/inventory/tracking',
    token,
    signal
  });

  return response.data;
};

const setTrackingRequest = async ({ token, enabled }) => {
  const response = await apiRequest({
    path: '/inventory/tracking',
    method: 'PATCH',
    token,
    body: { enabled }
  });

  return response.data;
};

const recordStockRequest = async ({ token, productId, quantity, reason }) => {
  const response = await apiRequest({
    path: `/inventory/${productId}/stock`,
    method: 'PATCH',
    token,
    body: { quantity, reason }
  });

  return response.data;
};

const recordAdjustmentRequest = async ({ token, productId, newQuantity, reason }) => {
  const response = await apiRequest({
    path: `/inventory/${productId}/adjustments`,
    method: 'POST',
    token,
    body: { newQuantity, reason }
  });

  return response.data;
};

const listDiscrepanciesRequest = async ({ token, signal }) => {
  const response = await apiRequest({
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
}) => {
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

export const useInventoryItem = ({ token, productId, enabled = true }) => {
  return useQuery({
    queryKey: ['inventory-item', productId],
    queryFn: ({ signal }) => getInventoryItemRequest({ token, productId, signal }),
    enabled: Boolean(token) && Boolean(productId) && enabled
  });
};

export const useInventoryTracking = (token) => {
  return useQuery({
    queryKey: [INVENTORY_TRACKING_QUERY_KEY],
    queryFn: ({ signal }) => getTrackingRequest({ token, signal }),
    enabled: Boolean(token),
    staleTime: 15000
  });
};

export const useSetInventoryTracking = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ enabled }) => setTrackingRequest({ token, enabled }),
    onMutate: async ({ enabled }) => {
      await queryClient.cancelQueries({ queryKey: [INVENTORY_TRACKING_QUERY_KEY] });
      const previous = queryClient.getQueryData([INVENTORY_TRACKING_QUERY_KEY]);
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

export const useRecordStockUpdate = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity, reason }) => recordStockRequest({ token, productId, quantity, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
    }
  });
};

export const useRecordInventoryAdjustment = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, newQuantity, reason }) =>
      recordAdjustmentRequest({ token, productId, newQuantity, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
    }
  });
};

export const useInventoryDiscrepancies = ({ token, enabled = true }) => {
  return useQuery({
    queryKey: [INVENTORY_DISCREPANCY_QUERY_KEY],
    queryFn: ({ signal }) => listDiscrepanciesRequest({ token, signal }),
    enabled: Boolean(token) && enabled,
    refetchInterval: 60000
  });
};
