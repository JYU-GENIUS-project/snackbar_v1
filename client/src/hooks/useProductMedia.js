import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';
import { PRODUCTS_QUERY_KEY } from './useProducts.js';

export const PRODUCT_MEDIA_QUERY_KEY = 'product-media';

const listProductMediaRequest = async ({ token, productId, signal }) => {
  const response = await apiRequest({
    path: `/products/${productId}/media`,
    token,
    signal
  });

  return response.data ?? [];
};

const uploadProductMediaRequest = async ({ token, productId, file }) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiRequest({
    path: `/products/${productId}/media`,
    method: 'POST',
    token,
    body: formData
  });

  return response.data ?? [];
};

const markPrimaryMediaRequest = async ({ token, productId, mediaId }) => {
  const response = await apiRequest({
    path: `/products/${productId}/media/${mediaId}/primary`,
    method: 'PATCH',
    token
  });

  return response.data;
};

const deleteProductMediaRequest = async ({ token, productId, mediaId }) => {
  const response = await apiRequest({
    path: `/products/${productId}/media/${mediaId}`,
    method: 'DELETE',
    token
  });

  return response.data;
};

export const useProductMedia = ({ token, productId, enabled = true }) => {
  return useQuery({
    queryKey: [PRODUCT_MEDIA_QUERY_KEY, productId],
    queryFn: ({ signal }) => listProductMediaRequest({ token, productId, signal }),
    enabled: Boolean(token && productId && enabled)
  });
};

export const useUploadProductMedia = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, file }) => uploadProductMediaRequest({ token, productId, file }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRODUCT_MEDIA_QUERY_KEY, variables.productId] });
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    }
  });
};

export const useMarkPrimaryMedia = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, mediaId }) => markPrimaryMediaRequest({ token, productId, mediaId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRODUCT_MEDIA_QUERY_KEY, variables.productId] });
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    }
  });
};

export const useDeleteProductMedia = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, mediaId }) => deleteProductMediaRequest({ token, productId, mediaId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRODUCT_MEDIA_QUERY_KEY, variables.productId] });
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    }
  });
};
