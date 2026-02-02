import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';
import { ensureMinimumProductShape, type ProductRecord } from '../utils/productPayload.js';

export const PRODUCTS_QUERY_KEY = 'products';

export type ProductsQueryParams = {
  includeArchived?: boolean | undefined;
  search?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
};

export type ProductsResponse = {
  success?: boolean;
  data?: ProductRecord[];
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
} & Record<string, unknown>;

export type ProductWithOptimistic = ProductRecord & { __optimistic?: boolean };

const listProductsRequest = async ({ token, includeArchived, search, limit, offset, signal }: { token?: string | undefined; includeArchived?: boolean | undefined; search?: string | undefined; limit?: number | undefined; offset?: number | undefined; signal?: AbortSignal; }): Promise<ProductsResponse> => {
  const response = await apiRequest<ProductsResponse>({
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

const createProductRequest = async ({ token, payload }: { token?: string | undefined; payload: Record<string, unknown>; }): Promise<ProductRecord> => {
  const response = await apiRequest<{ data: ProductRecord }>({
    path: '/products',
    method: 'POST',
    token,
    body: payload
  });

  return response.data;
};

const updateProductRequest = async ({ token, productId, payload }: { token?: string | undefined; productId: string; payload: Record<string, unknown>; }): Promise<ProductRecord> => {
  const response = await apiRequest<{ data: ProductRecord }>({
    path: `/products/${productId}`,
    method: 'PUT',
    token,
    body: payload
  });

  return response.data;
};

const archiveProductRequest = async ({ token, productId }: { token?: string | undefined; productId: string; }): Promise<ProductRecord> => {
  const response = await apiRequest<{ data: ProductRecord }>({
    path: `/products/${productId}`,
    method: 'DELETE',
    token
  });

  return response.data;
};

export const useProducts = ({ token, includeArchived, search, limit = 50, offset = 0 }: ProductsQueryParams & { token?: string | undefined }) => {
  return useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, { includeArchived, search, limit, offset }],
    queryFn: ({ signal }) => listProductsRequest({ token, includeArchived, search, limit, offset, signal }),
    enabled: Boolean(token),
    refetchInterval: 5000
  });
};

const createOptimisticSnapshot = (queryClient: ReturnType<typeof useQueryClient>) => {
  const snapshots = queryClient.getQueriesData<ProductsResponse>({ queryKey: [PRODUCTS_QUERY_KEY] });
  return snapshots;
};

const restoreSnapshot = (queryClient: ReturnType<typeof useQueryClient>, snapshot: Array<[QueryKey, ProductsResponse | undefined]>) => {
  snapshot.forEach(([key, data]) => {
    queryClient.setQueryData(key, data);
  });
};

const updateQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (current: ProductsResponse | undefined, keyParams: ProductsQueryParams | undefined) => ProductsResponse | undefined
) => {
  const matching = queryClient.getQueriesData<ProductsResponse>({ queryKey: [PRODUCTS_QUERY_KEY] });
  matching.forEach(([key, data]) => {
    const keyParams = (key as [string, ProductsQueryParams | undefined])[1];
    queryClient.setQueryData(key, (current: ProductsResponse | undefined) => updater(current ?? data, keyParams));
  });
};

export const useCreateProduct = (token?: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => createProductRequest({ token, payload }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
      const snapshot = createOptimisticSnapshot(queryClient);

      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      const optimisticProduct = ensureMinimumProductShape({
        ...variables,
        id: optimisticId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }) as ProductWithOptimistic;
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

export const useUpdateProduct = (token?: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, payload }: { productId: string; payload: Record<string, unknown> }) =>
      updateProductRequest({ token, productId, payload }),
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

export const useArchiveProduct = (token?: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => archiveProductRequest({ token, productId }),
    onMutate: async (productId: string) => {
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
          .filter(Boolean) as ProductRecord[];

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
