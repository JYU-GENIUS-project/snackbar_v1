import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';

const FEED_QUERY_KEY = ['product-feed'];

const fetchProductFeed = async ({ signal }) => {
  const response = await apiRequest({
    path: '/feed/products',
    method: 'GET',
    signal
  });

  return response.data;
};

export const useProductFeed = (options = {}) => {
  return useQuery({
    queryKey: FEED_QUERY_KEY,
    queryFn: ({ signal }) => fetchProductFeed({ signal }),
    refetchInterval: options.refetchInterval ?? 15000,
    staleTime: options.staleTime ?? 10000,
    ...options
  });
};
