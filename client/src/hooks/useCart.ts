import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, type ApiError } from '../services/apiClient.js';

const CART_SESSION_STORAGE_KEY = 'snackbar-kiosk-session';

type CartApiItem = {
  id?: string;
  productId?: string | null;
  name: string;
  unitPrice: number | string;
  quantity: number;
  purchaseLimit: number | null;
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
};

type CartProductSnapshot = {
  id: string;
  name: string;
  price: number;
  purchaseLimit: number | null;
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
        quantity: Number(item.quantity || 0)
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
          quantity
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
      quantity
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
    try {
      const response = await apiRequest<CartApiResponse>({
        path: '/cart',
        headers
      });
      setCart(normalizeCartItems(response.data.items || []));
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
    setCart(normalizeCartItems(response.data.items || []));
  }, []);

  const setItemQuantity = useCallback(
    async (product: CartProductSnapshot, quantity: number) => {
      const previous = cart;
      setCart((current) => buildOptimisticCart(current, product, quantity));
      setError(null);
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
      setCart((current) => current.filter((item) => item.id !== productId));
      setError(null);
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
    setCart([]);
    setError(null);
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
          purchaseLimit: product.purchaseLimit
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
