import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';

export const CATEGORIES_QUERY_KEY = 'categories';

const listCategoriesRequest = async ({ token, signal }) => {
  const response = await apiRequest({
    path: '/categories',
    token,
    signal
  });

  return response.data ?? [];
};

export const useCategories = (token) => {
  return useQuery({
    queryKey: [CATEGORIES_QUERY_KEY, token],
    queryFn: ({ signal }) => listCategoriesRequest({ token, signal }),
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000
  });
};
