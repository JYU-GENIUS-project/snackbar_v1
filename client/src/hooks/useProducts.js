import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';
import { ensureMinimumProductShape } from '../utils/productPayload.js';

export const PRODUCTS_QUERY_KEY = 'products';

const listProductsRequest = async ({ token, includeArchived, search, limit, offset, signal }) => {
  const response = await apiRequest({
    path: '/products',
    token,
    signal,
    searchParams: {
      includeArchived: includeArchived ? 'true' : undefined,
      search: search || undefined,
      limit: limit ?? undefined,
      offset: offset ?? undefined
    }
  });

  return response;
};

const createProductRequest = async ({ token, payload }) => {
  const response = await apiRequest({
    path: '/products',
    method: 'POST',
    token,
    body: payload
  });

  return response.data;
};

const updateProductRequest = async ({ token, productId, payload }) => {
  const response = await apiRequest({
    path: `/products/${productId}`,
    method: 'PUT',
    token,
    body: payload
  });

  return response.data;
};

const archiveProductRequest = async ({ token, productId }) => {
  const response = await apiRequest({
    path: `/products/${productId}`,
    method: 'DELETE',
    token
  });

  return response.data;
};

export const useProducts = ({ token, includeArchived, search, limit = 50, offset = 0 }) => {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, { includeArchived, search, limit, offset }],
    queryFn: ({ signal }) => listProductsRequest({ token, includeArchived, search, limit, offset, signal }),
    enabled: Boolean(token),
    refetchInterval: 5000
  });
};

const createOptimisticSnapshot = (queryClient) => {
  const snapshots = queryClient.getQueriesData({ queryKey: [PRODUCTS_QUERY_KEY] });
  return snapshots;
};

const restoreSnapshot = (queryClient, snapshot) => {
  snapshot.forEach(([key, data]) => {
    queryClient.setQueryData(key, data);
  });
};

const updateQueries = (queryClient, updater) => {
  const matching = queryClient.getQueriesData({ queryKey: [PRODUCTS_QUERY_KEY] });
  matching.forEach(([key, data]) => {
    queryClient.setQueryData(key, (current) => updater(current ?? data, key[1]));
  });
};

export const useCreateProduct = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => createProductRequest({ token, payload }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      const snapshot = createOptimisticSnapshot(queryClient);

      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      const optimisticProduct = ensureMinimumProductShape({
        ...variables,
        id: optimisticId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      optimisticProduct.__optimistic = true;

      updateQueries(queryClient, (current) => {
        if (!current) {
          return { success: true, data: [optimisticProduct], meta: { total: 1, limit: 50, offset: 0 } };
        }

        const meta = current.meta || { total: current.data?.length ?? 0, limit: 50, offset: 0 };
        return {
          ...current,
          data: [optimisticProduct, ...(current.data || [])],
          meta: {
            ...meta,
            total: (meta?.total ?? 0) + 1
          }
        };
      });

      return { snapshot, optimisticId };
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(queryClient, context.snapshot);
      }
    },
    onSuccess: (data, _variables, context) => {
      if (!context?.optimisticId) {
        return;
      }

      updateQueries(queryClient, (current) => {
        if (!current?.data) {
          return current;
        }

        return {
          ...current,
          data: current.data.map((product) =>
            product.id === context.optimisticId ? { ...data, __optimistic: false } : product
          )
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    }
  });
};

export const useUpdateProduct = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, payload }) => updateProductRequest({ token, productId, payload }),
    onMutate: async ({ productId, payload }) => {
      await queryClient.cancelQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      const snapshot = createOptimisticSnapshot(queryClient);

      updateQueries(queryClient, (current) => {
        if (!current?.data) {
          return current;
        }

        return {
          ...current,
          data: current.data.map((product) =>
            product.id === productId
              ? {
                  ...ensureMinimumProductShape({ ...product, ...payload }),
                  id: product.id,
                  updatedAt: new Date().toISOString()
                }
              : product
          )
        };
      });

      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(queryClient, context.snapshot);
      }
    },
    onSuccess: (data) => {
      updateQueries(queryClient, (current) => {
        if (!current?.data) {
          return current;
        }

        return {
          ...current,
          data: current.data.map((product) => (product.id === data.id ? data : product))
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    }
  });
};

export const useArchiveProduct = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId) => archiveProductRequest({ token, productId }),
    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      const snapshot = createOptimisticSnapshot(queryClient);

      updateQueries(queryClient, (current, keyParams) => {
        if (!current?.data) {
          return current;
        }

        const includeArchived = keyParams?.includeArchived;
        let removed = false;
        const updatedData = current.data
          .map((product) => {
            if (product.id !== productId) {
              return product;
            }
            if (includeArchived) {
              return {
                ...product,
                status: 'archived',
                isActive: false,
                deletedAt: new Date().toISOString()
              };
            }
            removed = true;
            return null;
          })
          .filter(Boolean);

        const totalAdjustment = includeArchived || !removed ? 0 : -1;

        return {
          ...current,
          data: updatedData,
          meta: {
            ...(current.meta || {}),
            total: Math.max((current.meta?.total ?? updatedData.length) + totalAdjustment, 0)
          }
        };
      });

      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot) {
        restoreSnapshot(queryClient, context.snapshot);
      }
    },
    onSuccess: (data) => {
      updateQueries(queryClient, (current, keyParams) => {
        if (!current?.data) {
          return current;
        }
        const includeArchived = keyParams?.includeArchived;

        if (includeArchived) {
          return {
            ...current,
            data: current.data.map((product) => (product.id === data.id ? data : product))
          };
        }

        return current;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    }
  });
};
