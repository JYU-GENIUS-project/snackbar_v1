import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, type ApiError } from '../services/apiClient.js';

const CART_SESSION_STORAGE_KEY = 'snackbar-kiosk-session';
const OFFLINE_FLAG_STORAGE_KEY = 'snackbar-force-offline-feed';
const OFFLINE_CART_STORAGE_PREFIX = 'snackbar-offline-cart:';

type CartApiItem = {
    id?: string;
    productId?: string | null;
    name: string;
    unitPrice: number | string;
    quantity: number;
    purchaseLimit: number | null;
    imageUrl?: string | null;
};

type CartApiResponse = {
    success: boolean;
    data: {
        sessionKey: string;
        status: string;
        lastActivityAt: string;
        expiresAt: string | null;
        items: CartApiItem[];
        total: number;
    };
};

type CartItem = {
    id: string;
    name: string;
    price: number;
    purchaseLimit: number | null;
    quantity: number;
    imageUrl: string | null;
};

type CartProductSnapshot = {
    id: string;
    name: string;
    price: number;
    purchaseLimit: number | null;
    imageUrl: string | null;
};

const offlineCartStorageKey = (sessionKey: string): string => `${OFFLINE_CART_STORAGE_PREFIX}${sessionKey}`;

const isOfflineModeEnabled = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }
    if (window.localStorage.getItem(OFFLINE_FLAG_STORAGE_KEY) === '1') {
        return true;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && navigator.onLine === false) {
        return true;
    }
    return false;
};

const readOfflineCartItems = (sessionKey: string): CartItem[] => {
    if (typeof window === 'undefined') {
        return [];
    }
    try {
        const raw = window.localStorage.getItem(offlineCartStorageKey(sessionKey));
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw) as Array<Record<string, unknown>> | null;
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .map((entry) => {
                if (!entry || typeof entry !== 'object') {
                    return null;
                }
                const id = typeof entry.id === 'string' && entry.id ? entry.id : null;
                const name = typeof entry.name === 'string' && entry.name ? entry.name : null;
                if (!id || !name) {
                    return null;
                }
                const quantity = Number(entry.quantity ?? 0);
                if (!Number.isFinite(quantity) || quantity < 0) {
                    return null;
                }
                const purchaseLimitRaw = entry.purchaseLimit;
                const purchaseLimit =
                    purchaseLimitRaw === null || purchaseLimitRaw === undefined
                        ? null
                        : Number.isFinite(Number(purchaseLimitRaw))
                            ? Number(purchaseLimitRaw)
                            : null;
                const price = parseMoney(entry.price as number | string);
                const imageUrl = typeof entry.imageUrl === 'string' ? entry.imageUrl : null;
                return {
                    id,
                    name,
                    price,
                    purchaseLimit,
                    quantity,
                    imageUrl
                } satisfies CartItem;
            })
            .filter((item): item is CartItem => Boolean(item));
    } catch {
        return [];
    }
};

const persistOfflineCartItems = (sessionKey: string, items: CartItem[]): void => {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(offlineCartStorageKey(sessionKey), JSON.stringify(items));
    } catch {
        // Swallow persistence issues in offline mode
    }
};

const clearOfflineCartItems = (sessionKey: string): void => {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.removeItem(offlineCartStorageKey(sessionKey));
    } catch {
        // Ignore storage cleanup errors
    }
};

type UseCartResult = {
    cart: CartItem[];
    loading: boolean;
    error: ApiError | null;
    sessionKey: string;
    refreshCart: () => Promise<void>;
    setItemQuantity: (product: CartProductSnapshot, quantity: number) => Promise<void>;
    removeItem: (productId: string) => Promise<void>;
    clearCart: () => Promise<void>;
    hydrateFromProducts: (products: Array<CartProductSnapshot>) => void;
};

const parseMoney = (value: number | string): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    const parsed = Number.parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
};

const readOrCreateSessionKey = (): string => {
    if (typeof window === 'undefined') {
        return 'kiosk-session';
    }
    const existing = window.localStorage.getItem(CART_SESSION_STORAGE_KEY);
    if (existing) {
        return existing;
    }
    const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `kiosk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(CART_SESSION_STORAGE_KEY, generated);
    return generated;
};

const normalizeCartItems = (items: CartApiItem[]): CartItem[] => {
    return items
        .map((item) => {
            const id = item.productId || item.id;
            if (!id) {
                return null;
            }
            return {
                id,
                name: item.name,
                price: parseMoney(item.unitPrice),
                purchaseLimit: item.purchaseLimit ?? null,
                quantity: Number(item.quantity || 0),
                imageUrl: item.imageUrl ?? null
            };
        })
        .filter((item): item is CartItem => Boolean(item));
};

const buildOptimisticCart = (current: CartItem[], product: CartProductSnapshot, quantity: number): CartItem[] => {
    if (quantity <= 0) {
        return current.filter((item) => item.id !== product.id);
    }
    const existing = current.find((item) => item.id === product.id);
    if (existing) {
        return current.map((item) =>
            item.id === product.id
                ? {
                    ...item,
                    name: product.name,
                    price: product.price,
                    purchaseLimit: product.purchaseLimit,
                    quantity,
                    imageUrl: product.imageUrl ?? item.imageUrl ?? null
                }
                : item
        );
    }
    return [
        ...current,
        {
            id: product.id,
            name: product.name,
            price: product.price,
            purchaseLimit: product.purchaseLimit,
            quantity,
            imageUrl: product.imageUrl ?? null
        }
    ];
};

const useCart = (): UseCartResult => {
    const sessionKeyRef = useRef<string>(readOrCreateSessionKey());
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);

    const headers = useMemo(() => ({ 'x-kiosk-session': sessionKeyRef.current }), []);

    const refreshCart = useCallback(async () => {
        setLoading(true);
        setError(null);
        if (isOfflineModeEnabled()) {
            setCart(readOfflineCartItems(sessionKeyRef.current));
            setLoading(false);
            return;
        }
        try {
            const response = await apiRequest<CartApiResponse>({
                path: '/cart',
                headers
            });
            const normalized = normalizeCartItems(response.data.items || []);
            setCart(normalized);
            persistOfflineCartItems(sessionKeyRef.current, normalized);
        } catch (err) {
            setError(err as ApiError);
        } finally {
            setLoading(false);
        }
    }, [headers]);

    useEffect(() => {
        void refreshCart();
    }, [refreshCart]);

    const applyServerCart = useCallback((response: CartApiResponse) => {
        const normalized = normalizeCartItems(response.data.items || []);
        setCart(normalized);
        persistOfflineCartItems(sessionKeyRef.current, normalized);
    }, []);

    const setItemQuantity = useCallback(
        async (product: CartProductSnapshot, quantity: number) => {
            const previous = cart;
            setError(null);
            if (isOfflineModeEnabled()) {
                setCart((current) => {
                    const optimistic = buildOptimisticCart(current, product, quantity);
                    persistOfflineCartItems(sessionKeyRef.current, optimistic);
                    return optimistic;
                });
                return;
            }
            setCart((current) => buildOptimisticCart(current, product, quantity));
            try {
                const response = await apiRequest<CartApiResponse, { productId: string; quantity: number }>({
                    path: '/cart/items',
                    method: 'POST',
                    headers,
                    body: {
                        productId: product.id,
                        quantity
                    }
                });
                applyServerCart(response);
            } catch (err) {
                setCart(previous);
                setError(err as ApiError);
                throw err;
            }
        },
        [applyServerCart, cart, headers]
    );

    const removeItem = useCallback(
        async (productId: string) => {
            const previous = cart;
            setError(null);
            if (isOfflineModeEnabled()) {
                setCart((current) => {
                    const filtered = current.filter((item) => item.id !== productId);
                    persistOfflineCartItems(sessionKeyRef.current, filtered);
                    return filtered;
                });
                return;
            }
            setCart((current) => current.filter((item) => item.id !== productId));
            try {
                const response = await apiRequest<CartApiResponse>({
                    path: `/cart/items/${productId}`,
                    method: 'DELETE',
                    headers
                });
                applyServerCart(response);
            } catch (err) {
                setCart(previous);
                setError(err as ApiError);
                throw err;
            }
        },
        [applyServerCart, cart, headers]
    );

    const clearCart = useCallback(async () => {
        const previous = cart;
        setError(null);
        if (isOfflineModeEnabled()) {
            setCart([]);
            clearOfflineCartItems(sessionKeyRef.current);
            return;
        }
        setCart([]);
        try {
            const response = await apiRequest<CartApiResponse>({
                path: '/cart/clear',
                method: 'POST',
                headers
            });
            applyServerCart(response);
        } catch (err) {
            setCart(previous);
            setError(err as ApiError);
            throw err;
        }
    }, [applyServerCart, cart, headers]);

    const hydrateFromProducts = useCallback((products: Array<CartProductSnapshot>) => {
        if (products.length === 0) {
            return;
        }
        setCart((current) =>
            current.map((item) => {
                const product = products.find((entry) => entry.id === item.id);
                if (!product) {
                    return item;
                }
                return {
                    ...item,
                    name: product.name,
                    price: product.price,
                    purchaseLimit: product.purchaseLimit,
                    imageUrl: product.imageUrl ?? item.imageUrl ?? null
                };
            })
        );
    }, []);

    return {
        cart,
        loading,
        error,
        sessionKey: sessionKeyRef.current,
        refreshCart,
        setItemQuantity,
        removeItem,
        clearCart,
        hydrateFromProducts
    };
};

export type { CartItem, CartProductSnapshot };
export default useCart;
