import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../services/apiClient.js';
import { ensureMinimumProductShape, type ProductRecord } from '../utils/productPayload.js';
import { readOfflineProductSnapshot, saveOfflineProductSnapshot, type OfflineProductSnapshot, type OfflineStatusPayload } from '../utils/offlineCache.js';

const FEED_QUERY_KEY = ['product-feed'];

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export type ProductFeedStatus = OfflineStatusPayload | null;

export type ProductFeedProduct = {
  id?: string | undefined;
  name?: string | undefined;
  price: number;
  currency?: string | null;
  available?: boolean;
  stockQuantity?: number | null;
  lowStockThreshold?: number | null;
  purchaseLimit?: number | null;
  imageAlt?: string | null;
  categoryId?: string | null | undefined;
  categoryIds?: string[] | undefined;
  categories?: unknown[];
  metadata?: Record<string, unknown> | undefined;
  primaryMedia?: { url?: string | undefined; alt?: string | undefined } | null;
};

export type ProductFeedPayload = {
  products: ProductFeedProduct[];
  source: string;
  generatedAt?: string;
  lastUpdatedAt?: string;
  inventoryTrackingEnabled: boolean;
  status: ProductFeedStatus;
  statusFingerprint: string | null;
};

export type ProductFeedOptions = {
  refetchInterval?: number | false;
  staleTime?: number;
  enabled?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const normalizeStatusPayload = (input: unknown): ProductFeedStatus => {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = readRecord(input);
  const maintenanceCandidate = readRecord(candidate.maintenance);

  return {
    status: typeof candidate.status === 'string' ? candidate.status : null,
    reason: typeof candidate.reason === 'string' ? candidate.reason : null,
    message: typeof candidate.message === 'string' ? candidate.message : null,
    nextOpen: typeof candidate.nextOpen === 'string' ? candidate.nextOpen : null,
    nextClose: typeof candidate.nextClose === 'string' ? candidate.nextClose : null,
    maintenance: {
      enabled: Boolean(maintenanceCandidate.enabled),
      message: typeof maintenanceCandidate.message === 'string' ? maintenanceCandidate.message : null,
      since: typeof maintenanceCandidate.since === 'string' ? maintenanceCandidate.since : null
    },
    timezone: typeof candidate.timezone === 'string' ? candidate.timezone : null,
    generatedAt: typeof candidate.generatedAt === 'string' ? candidate.generatedAt : null,
    windows: Array.isArray(candidate.windows) ? candidate.windows : []
  };
};

const buildFeedFromOfflineSnapshot = (snapshot: OfflineProductSnapshot | null): ProductFeedPayload => {
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
    const normalized = ensureMinimumProductShape(product as ProductRecord);
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
      stockQuantity: toNumberOrNull(normalized.stockQuantity),
      lowStockThreshold: toNumberOrNull(normalized.lowStockThreshold),
      purchaseLimit: toNumberOrNull(normalized.purchaseLimit),
      imageAlt: normalized.imageAlt || normalized.name || 'Product image',
      categoryId: normalized.categoryId ?? normalized.categoryIds?.[0] ?? null,
      categoryIds: normalized.categoryIds || [],
      categories: normalized.categories || [],
      metadata:
        typeof normalized.metadata === 'object' && normalized.metadata !== null
          ? (normalized.metadata as Record<string, unknown>)
          : {},
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

const normalizeFeedPayload = (payload: unknown): ProductFeedPayload => {
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

  const candidate = readRecord(payload);
  const products = Array.isArray(candidate.products) ? (candidate.products as ProductFeedProduct[]) : [];

  return {
    products,
    generatedAt: typeof candidate.generatedAt === 'string' ? candidate.generatedAt : new Date().toISOString(),
    lastUpdatedAt:
      typeof candidate.lastUpdatedAt === 'string'
        ? candidate.lastUpdatedAt
        : typeof candidate.generatedAt === 'string'
          ? candidate.generatedAt
          : new Date().toISOString(),
    source: typeof candidate.source === 'string' ? candidate.source : 'api',
    inventoryTrackingEnabled:
      typeof candidate.inventoryTrackingEnabled === 'boolean' ? candidate.inventoryTrackingEnabled : true,
    statusFingerprint: typeof candidate.statusFingerprint === 'string' ? candidate.statusFingerprint : null,
    status: normalizeStatusPayload(candidate.status)
  };
};

const extractApiPayload = (response: unknown): unknown => {
  if (!isRecord(response)) {
    return response;
  }

  const success = response.success === true;
  const data = response.data;
  if (success && data !== undefined) {
    return data;
  }
  if (Array.isArray(response.products)) {
    return response;
  }
  if (data !== undefined && isRecord(data)) {
    return data;
  }
  return response;
};

const fetchProductFeed = async ({ signal }: { signal?: AbortSignal }): Promise<ProductFeedPayload> => {
  try {
    if (typeof window !== 'undefined') {
      const forceOffline = window.localStorage.getItem('snackbar-force-offline-feed') === '1';
      if (forceOffline) {
        const fallbackSnapshot = readOfflineProductSnapshot();
        if (fallbackSnapshot?.products?.length) {
          return buildFeedFromOfflineSnapshot(fallbackSnapshot);
        }
      }
    }

    const response = await apiRequest<unknown>({
      path: '/feed/products',
      method: 'GET',
      signal
    });

    const selected = normalizeFeedPayload(extractApiPayload(response));

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

export const useProductFeed = (options: ProductFeedOptions = {}) => {
  return useQuery<ProductFeedPayload>({
    queryKey: FEED_QUERY_KEY,
    queryFn: ({ signal }) => fetchProductFeed({ signal }),
    refetchInterval: options.refetchInterval ?? 15000,
    staleTime: options.staleTime ?? 10000,
    ...options
  });
};
