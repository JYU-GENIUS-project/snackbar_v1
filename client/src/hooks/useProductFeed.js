import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';
import { ensureMinimumProductShape } from '../utils/productPayload.js';
import { readOfflineProductSnapshot } from '../utils/offlineCache.js';

const FEED_QUERY_KEY = ['product-feed'];

const buildFeedFromOfflineSnapshot = (snapshot) => {
  if (!snapshot || !Array.isArray(snapshot.products)) {
    return { products: [] };
  }

  const feedProducts = snapshot.products.map((product) => {
    const normalized = ensureMinimumProductShape(product);
    const mediaItems = Array.isArray(normalized.media)
      ? normalized.media.filter((item) => !item.deletedAt)
      : [];
    const primaryCandidate = mediaItems.find((item) => item.isPrimary) || mediaItems[0] || null;

    return {
      id: normalized.id,
      name: normalized.name,
      price: Number(normalized.price ?? 0),
      currency: normalized.currency || 'EUR',
      available: normalized.status !== 'archived',
      purchaseLimit: normalized.purchaseLimit ?? null,
      imageAlt: normalized.imageAlt || normalized.name || 'Product image',
      categoryId: normalized.categoryId ?? normalized.categoryIds?.[0] ?? null,
      categoryIds: normalized.categoryIds || [],
      categories: normalized.categories || [],
      metadata: normalized.metadata || {},
      primaryMedia: primaryCandidate
        ? {
            url: primaryCandidate.url || primaryCandidate.previewUrl || primaryCandidate.localPath || '',
            alt:
              primaryCandidate.alt ||
              primaryCandidate.description ||
              normalized.imageAlt ||
              normalized.name ||
              'Product image'
          }
        : null
    };
  });

  return {
    products: feedProducts,
    source: snapshot.source || 'offline',
    generatedAt: snapshot.generatedAt || new Date().toISOString()
  };
};

const fetchProductFeed = async ({ signal }) => {
  try {
    const response = await apiRequest({
      path: '/feed/products',
      method: 'GET',
      signal
    });

    if (Array.isArray(response?.products)) {
      return response;
    }

    if (Array.isArray(response?.data?.products)) {
      return response.data;
    }

    const fallbackSnapshot = readOfflineProductSnapshot();
    if (fallbackSnapshot?.products?.length) {
      return buildFeedFromOfflineSnapshot(fallbackSnapshot);
    }

    return {
      products: Array.isArray(response?.products)
        ? response.products
        : Array.isArray(response?.data?.products)
          ? response.data.products
          : []
    };
  } catch (error) {
    console.warn('Product feed request failed, using offline snapshot.', error);
    const fallbackSnapshot = readOfflineProductSnapshot();
    if (fallbackSnapshot?.products?.length) {
      return buildFeedFromOfflineSnapshot(fallbackSnapshot);
    }
    return { products: [] };
  }
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
