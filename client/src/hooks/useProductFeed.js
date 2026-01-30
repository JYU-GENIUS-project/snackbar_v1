import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';
import { ensureMinimumProductShape } from '../utils/productPayload.js';
import { readOfflineProductSnapshot, saveOfflineProductSnapshot } from '../utils/offlineCache.js';

const FEED_QUERY_KEY = ['product-feed'];

const normalizeStatusPayload = (input) => {
  if (!input || typeof input !== 'object') {
    return null;
  }

  return {
    status: typeof input.status === 'string' ? input.status : null,
    reason: typeof input.reason === 'string' ? input.reason : null,
    message: typeof input.message === 'string' ? input.message : null,
    nextOpen: typeof input.nextOpen === 'string' ? input.nextOpen : null,
    nextClose: typeof input.nextClose === 'string' ? input.nextClose : null,
    maintenance: {
      enabled: Boolean(input?.maintenance?.enabled),
      message: typeof input?.maintenance?.message === 'string' ? input.maintenance.message : null,
      since: typeof input?.maintenance?.since === 'string' ? input.maintenance.since : null
    },
    timezone: typeof input.timezone === 'string' ? input.timezone : null,
    generatedAt: typeof input.generatedAt === 'string' ? input.generatedAt : null,
    windows: Array.isArray(input.windows) ? input.windows : []
  };
};

const buildFeedFromOfflineSnapshot = (snapshot) => {
  if (!snapshot || !Array.isArray(snapshot.products)) {
    return {
      products: [],
      source: 'offline',
      inventoryTrackingEnabled: true,
      status: null,
      statusFingerprint: null
    };
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
      stockQuantity: normalized.stockQuantity ?? null,
      lowStockThreshold: normalized.lowStockThreshold ?? null,
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
    generatedAt: snapshot.generatedAt || new Date().toISOString(),
    lastUpdatedAt: snapshot.lastUpdatedAt || snapshot.generatedAt || new Date().toISOString(),
    inventoryTrackingEnabled:
      typeof snapshot.inventoryTrackingEnabled === 'boolean'
        ? snapshot.inventoryTrackingEnabled
        : true,
    statusFingerprint: snapshot.statusFingerprint || null,
    status: normalizeStatusPayload(snapshot.status)
  };
};

const normalizeFeedPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return {
      products: [],
      source: 'api',
      generatedAt: new Date().toISOString(),
      inventoryTrackingEnabled: true,
      status: null,
      statusFingerprint: null
    };
  }

  const products = Array.isArray(payload.products) ? payload.products : [];

  return {
    ...payload,
    products,
    generatedAt: payload.generatedAt || new Date().toISOString(),
    lastUpdatedAt: payload.lastUpdatedAt || payload.generatedAt || new Date().toISOString(),
    source: payload.source || 'api',
    inventoryTrackingEnabled:
      typeof payload.inventoryTrackingEnabled === 'boolean' ? payload.inventoryTrackingEnabled : true,
    statusFingerprint: typeof payload.statusFingerprint === 'string' ? payload.statusFingerprint : null,
    status: normalizeStatusPayload(payload.status)
  };
};

const fetchProductFeed = async ({ signal }) => {
  try {
    const response = await apiRequest({
      path: '/feed/products',
      method: 'GET',
      signal
    });

    const selected = normalizeFeedPayload(
      response?.success && response.data
        ? response.data
        : Array.isArray(response?.products)
          ? response
          : response?.data && typeof response.data === 'object'
            ? response.data
            : response
    );

    if (Array.isArray(selected.products) && selected.products.length > 0) {
      saveOfflineProductSnapshot({
        products: selected.products,
        generatedAt: selected.generatedAt || new Date().toISOString(),
        source: 'api',
        inventoryTrackingEnabled: selected.inventoryTrackingEnabled,
        status: selected.status,
        statusFingerprint: selected.statusFingerprint
      });
      return selected;
    }

    const fallbackSnapshot = readOfflineProductSnapshot();
    if (fallbackSnapshot?.products?.length) {
      return buildFeedFromOfflineSnapshot(fallbackSnapshot);
    }

    return selected;
  } catch (error) {
    console.warn('Product feed request failed, using offline snapshot.', error);
    const fallbackSnapshot = readOfflineProductSnapshot();
    if (fallbackSnapshot?.products?.length) {
      return buildFeedFromOfflineSnapshot(fallbackSnapshot);
    }
    return {
      products: [],
      source: 'offline',
      inventoryTrackingEnabled: true,
      status: null,
      statusFingerprint: null
    };
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
