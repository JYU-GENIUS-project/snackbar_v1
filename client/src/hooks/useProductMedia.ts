import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';
import { PRODUCTS_QUERY_KEY } from './useProducts.js';

export const PRODUCT_MEDIA_QUERY_KEY = 'product-media';

export type ProductMediaItem = {
  id: string;
  url?: string | null;
  previewUrl?: string | null;
  localPath?: string | null;
  alt?: string | null;
  description?: string | null;
  variant?: string | null;
  format?: string | null;
  sizeBytes?: number | null;
  isPrimary?: boolean;
  createdAt?: string | null;
};

const listProductMediaRequest = async ({ token, productId, signal }: { token?: string | undefined; productId: string; signal?: AbortSignal; }): Promise<ProductMediaItem[]> => {
  const response = await apiRequest<{ data?: ProductMediaItem[] }>({
    path: `/products/${productId}/media`,
    token,
    signal
  });

  return response.data ?? [];
};

const uploadProductMediaRequest = async ({ token, productId, file }: { token?: string | undefined; productId: string; file: File; }): Promise<ProductMediaItem[]> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiRequest<{ data?: ProductMediaItem[] }>({
    path: `/products/${productId}/media`,
    method: 'POST',
    token,
    body: formData
  });

  return response.data ?? [];
};

const markPrimaryMediaRequest = async ({ token, productId, mediaId }: { token?: string | undefined; productId: string; mediaId: string; }): Promise<ProductMediaItem> => {
  const response = await apiRequest<{ data: ProductMediaItem }>({
    path: `/products/${productId}/media/${mediaId}/primary`,
    method: 'PATCH',
    token
  });

  return response.data;
};

const deleteProductMediaRequest = async ({ token, productId, mediaId }: { token?: string | undefined; productId: string; mediaId: string; }): Promise<ProductMediaItem> => {
  const response = await apiRequest<{ data: ProductMediaItem }>({
    path: `/products/${productId}/media/${mediaId}`,
    method: 'DELETE',
    token
  });

  return response.data;
};

export const useProductMedia = ({ token, productId, enabled = true }: { token?: string | undefined; productId?: string | null | undefined; enabled?: boolean }) => {
  return useQuery({
    queryKey: [PRODUCT_MEDIA_QUERY_KEY, productId],
    queryFn: ({ signal }) => listProductMediaRequest({ token, productId: productId as string, signal }),
    enabled: Boolean(token && productId && enabled)
  });
};

export const useUploadProductMedia = (token?: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, file }: { productId: string; file: File }) => uploadProductMediaRequest({ token, productId, file }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRODUCT_MEDIA_QUERY_KEY, variables.productId] });
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    }
  });
};

export const useMarkPrimaryMedia = (token?: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, mediaId }: { productId: string; mediaId: string }) => markPrimaryMediaRequest({ token, productId, mediaId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRODUCT_MEDIA_QUERY_KEY, variables.productId] });
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    }
  });
};

export const useDeleteProductMedia = (token?: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, mediaId }: { productId: string; mediaId: string }) => deleteProductMediaRequest({ token, productId, mediaId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [PRODUCT_MEDIA_QUERY_KEY, variables.productId] });
      queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
    }
  });
};
