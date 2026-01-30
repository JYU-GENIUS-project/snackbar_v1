import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';

export const CATEGORIES_QUERY_KEY = 'categories';

type Category = {
  id: string;
  name: string;
  description?: string | null;
  displayOrder?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  productCount?: number;
  __optimistic?: boolean;
};

type CategoryPayload = {
  name: string;
  description?: string | null;
  displayOrder?: number | null;
};

type CategoryMutationPayload = CategoryPayload & { id: string };

type ApiResponse<T> = {
  data: T;
};

const generateOptimisticId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const listCategoriesRequest = async ({ token, signal }: { token?: string; signal?: AbortSignal }) => {
  const response = (await apiRequest({
    path: '/categories',
    token,
    signal
  })) as ApiResponse<Category[]>;

  return response?.data ?? [];
};

export const useCategories = (token?: string) => {
  return useQuery<Category[]>({
    queryKey: [CATEGORIES_QUERY_KEY, token],
    queryFn: ({ signal }) => listCategoriesRequest({ token, signal }),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000
  });
};

const createCategoryRequest = async ({ token, payload }: { token?: string; payload: CategoryPayload }) => {
  const response = (await apiRequest({
    path: '/categories',
    method: 'POST',
    token,
    body: payload
  })) as ApiResponse<Category>;

  return response.data;
};

const updateCategoryRequest = async ({
  token,
  categoryId,
  payload
}: {
  token?: string;
  categoryId: string;
  payload: CategoryPayload;
}) => {
  const response = (await apiRequest({
    path: `/categories/${categoryId}`,
    method: 'PUT',
    token,
    body: payload
  })) as ApiResponse<Category>;

  return response.data;
};

const deleteCategoryRequest = async ({ token, categoryId }: { token?: string; categoryId: string }) => {
  const response = (await apiRequest({
    path: `/categories/${categoryId}`,
    method: 'DELETE',
    token
  })) as ApiResponse<Category>;

  return response.data;
};

const updateCachedCategories = (
  queryClient: ReturnType<typeof useQueryClient>,
  token: string | undefined,
  updater: (current: Category[]) => Category[]
) => {
  queryClient.setQueryData([CATEGORIES_QUERY_KEY, token], (current: unknown) => {
    const base = Array.isArray(current) ? current : (current as { data?: Category[] } | undefined)?.data ?? [];
    return updater(Array.isArray(base) ? base : []);
  });
};

export const useCreateCategory = (token?: string) => {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, CategoryPayload>({
    mutationFn: async (payload) => createCategoryRequest({ token, payload }),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: [CATEGORIES_QUERY_KEY, token] });

      const previous = queryClient.getQueryData([CATEGORIES_QUERY_KEY, token]);

      updateCachedCategories(queryClient, token, (current) => {
        const optimistic: Category = {
          id: `optimistic-${generateOptimisticId()}`,
          name: payload.name,
          description: payload.description ?? null,
          displayOrder: payload.displayOrder ?? current.length,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          productCount: 0,
          __optimistic: true
        };
        return [...current, optimistic];
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([CATEGORIES_QUERY_KEY, token], context.previous);
      }
    },
    onSuccess: (data) => {
      updateCachedCategories(queryClient, token, (current) =>
        current.map((category) => (category.__optimistic ? data : category))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY, token] });
    }
  });
};

export const useUpdateCategory = (token?: string) => {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, CategoryMutationPayload>({
    mutationFn: async ({ id, ...payload }) => updateCategoryRequest({ token, categoryId: id, payload }),
    onMutate: async ({ id, ...payload }) => {
      await queryClient.cancelQueries({ queryKey: [CATEGORIES_QUERY_KEY, token] });

      const previous = queryClient.getQueryData([CATEGORIES_QUERY_KEY, token]);

      updateCachedCategories(queryClient, token, (current) =>
        current.map((category) =>
          category.id === id
            ? {
                ...category,
                ...payload,
                updatedAt: new Date().toISOString()
              }
            : category
        )
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([CATEGORIES_QUERY_KEY, token], context.previous);
      }
    },
    onSuccess: (data) => {
      updateCachedCategories(queryClient, token, (current) =>
        current.map((category) => (category.id === data.id ? data : category))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY, token] });
    }
  });
};

export const useDeleteCategory = (token?: string) => {
  const queryClient = useQueryClient();

  return useMutation<Category, Error, { id: string }>({
    mutationFn: async ({ id }) => deleteCategoryRequest({ token, categoryId: id }),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: [CATEGORIES_QUERY_KEY, token] });

      const previous = queryClient.getQueryData([CATEGORIES_QUERY_KEY, token]);

      updateCachedCategories(queryClient, token, (current) => current.filter((category) => category.id !== id));

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([CATEGORIES_QUERY_KEY, token], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY, token] });
    }
  });
};
