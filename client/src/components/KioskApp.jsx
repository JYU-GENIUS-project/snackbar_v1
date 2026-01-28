import { useEffect, useMemo, useRef, useState } from 'react';
import { useProductFeed } from '../hooks/useProductFeed.js';
import useKioskStatus from '../hooks/useKioskStatus.js';
import ProductGridSkeleton from './ProductGridSkeleton.jsx';
import ProductDetailModal from './ProductDetailModal.jsx';
import { OFFLINE_FEED_STORAGE_KEY } from '../utils/offlineCache.js';
import { logKioskEvent } from '../utils/analytics.js';

const TRUST_MODE_STORAGE_KEY = 'snackbar-trust-mode-disabled';
const OUT_OF_STOCK_DIALOG_TITLE_ID = 'kiosk-out-of-stock-title';
const OUT_OF_STOCK_DIALOG_MESSAGE_ID = 'kiosk-out-of-stock-message';

const formatLocalizedDateTime = (isoValue, timeZone) => {
    if (!isoValue) {
        return null;
    }
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    try {
        const formatter = new Intl.DateTimeFormat(undefined, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: timeZone || undefined
        });
        return formatter.format(date);
    } catch (error) {
        if (import.meta?.env?.DEV) {
            console.warn('Unable to format localized datetime', error);
        }
        return date.toLocaleString();
    }
};

const formatDurationUntil = (isoValue) => {
    if (!isoValue) {
        return null;
    }
    const target = new Date(isoValue);
    if (Number.isNaN(target.getTime())) {
        return null;
    }
    const diffMs = target.getTime() - Date.now();
    if (diffMs <= 0) {
        return 'starting soon';
    }
    const totalMinutes = Math.round(diffMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours >= 24) {
        const days = Math.floor(totalHours / 24);
        const remHours = totalHours % 24;
        return `${days} day${days === 1 ? '' : 's'}${remHours ? ` ${remHours}h` : ''}`;
    }
    if (totalHours > 0) {
        const remMinutes = totalMinutes % 60;
        return `${totalHours}h${remMinutes ? ` ${remMinutes}m` : ''}`;
    }
    return `${Math.max(totalMinutes, 1)}m`;
};

const formatRelativeTimestamp = (isoValue) => {
    if (!isoValue) {
        return null;
    }
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 30000) {
        return 'just now';
    }
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    } catch (error) {
        if (import.meta?.env?.DEV) {
            console.warn('Unable to format relative timestamp', error);
        }
        return date.toLocaleString();
    }
};

const formatPrice = (value) => `${Number(value ?? 0).toFixed(2)}€`;
const DEFAULT_PRODUCT_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%236b7280" font-size="28">No Image</text></svg>';
const REQUIRED_CUSTOMER_FILTERS = [
    { name: 'Hot Drinks', id: 'virtual-hot-drinks' }
];

const toNumberOrNull = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeProduct = (product) => {
    const limit = toNumberOrNull(product.purchaseLimit);
    const stockQuantity = toNumberOrNull(product.stockQuantity);
    const lowStockThreshold = toNumberOrNull(product.lowStockThreshold);
    const isOutOfStock = stockQuantity !== null && stockQuantity <= 0;
    const isLowStock =
        !isOutOfStock && stockQuantity !== null && lowStockThreshold !== null && stockQuantity <= lowStockThreshold;
    const categories = Array.isArray(product.categories)
        ? product.categories
            .filter(Boolean)
            .map((category) => ({
                id: category.id ?? (category.name ? `name:${category.name}` : null),
                name: category.name ?? category.id,
                isActive: category.isActive !== false
            }))
            .filter((category) => Boolean(category.name))
        : [];
    const categoryIds = Array.isArray(product.categoryIds)
        ? product.categoryIds.filter(Boolean)
        : categories.map((category) => category.id).filter(Boolean);

    return {
        id: product.id,
        name: product.name || 'Product',
        price: Number(product.price ?? 0),
        purchaseLimit: Number.isFinite(limit) && limit > 0 ? limit : null,
        stockQuantity,
        lowStockThreshold,
        isOutOfStock,
        isLowStock,
        status: product.status || 'active',
        imageUrl: product.primaryMedia?.url || '',
        imageAlt: product.primaryMedia?.alt || product.name || 'Product image',
        description: product.description || product.metadata?.description || '',
        allergens: typeof product.allergens === 'string' && product.allergens.trim()
            ? product.allergens.trim()
            : product.metadata?.allergens || '',
        categoryId: categoryIds[0] || null,
        categoryIds,
        categories,
        available: product.available !== false
    };
};

const buildStatusOverlay = (statusPayload, lastUpdatedAt) => {
    if (!statusPayload || typeof statusPayload !== 'object') {
        return { active: false };
    }

    const statusValue = statusPayload.status;
    if (statusValue !== 'maintenance' && statusValue !== 'closed') {
        return { active: false };
    }

    const timezone = statusPayload.timezone;
    const nextOpenLabel = formatLocalizedDateTime(statusPayload.nextOpen, timezone);
    const nextOpenEta = formatDurationUntil(statusPayload.nextOpen);
    const lastUpdatedLabel = formatRelativeTimestamp(lastUpdatedAt || statusPayload.generatedAt);

    if (statusValue === 'maintenance') {
        const maintenanceMessage = statusPayload.maintenance?.message || statusPayload.message;
        const maintenanceSince = statusPayload.maintenance?.since
            ? formatLocalizedDateTime(statusPayload.maintenance.since, timezone)
            : null;

        return {
            active: true,
            variant: 'maintenance',
            icon: '🛠️',
            title: 'Maintenance in Progress',
            message: maintenanceMessage || 'The kiosk is undergoing maintenance.',
            detail: maintenanceSince ? `Started ${maintenanceSince}` : null,
            next: nextOpenLabel,
            eta: nextOpenEta,
            lastUpdated: lastUpdatedLabel
        };
    }

    return {
        active: true,
        variant: 'closed',
        icon: '🔒',
        title: 'Kiosk Closed',
        message: statusPayload.message || 'The kiosk is currently closed.',
        detail: null,
        next: nextOpenLabel,
        eta: nextOpenEta,
        lastUpdated: lastUpdatedLabel
    };
};

const updateQuantityInCart = (cart, productId, updater) => {
    return cart
        .map((item) => {
            if (item.id !== productId) {
                return item;
            }
            const nextQuantity = updater(item.quantity, item.purchaseLimit);
            if (nextQuantity <= 0) {
                return null;
            }
            return {
                ...item,
                quantity: nextQuantity
            };
        })
        .filter(Boolean);
};

const KioskApp = () => {
    const { data, isLoading, isFetching, error, refetch } = useProductFeed({ refetchInterval: 15000, staleTime: 10000 });
    const kioskStatus = useKioskStatus({ refetchInterval: 45000 });

    const baseInventoryTrackingEnabled = kioskStatus.inventoryTrackingEnabled;
    const inventoryTrackingEnabled = typeof baseInventoryTrackingEnabled === 'boolean'
        ? baseInventoryTrackingEnabled
        : data?.inventoryTrackingEnabled !== false;

    const [trackingDisabled, setTrackingDisabled] = useState(() => {
        if (typeof window !== 'undefined') {
            const persisted = window.sessionStorage.getItem(TRUST_MODE_STORAGE_KEY);
            if (persisted !== null) {
                return persisted === 'true';
            }
        }
        return typeof inventoryTrackingEnabled === 'boolean' ? !inventoryTrackingEnabled : false;
    });

    useEffect(() => {
        if (typeof inventoryTrackingEnabled === 'boolean') {
            const disabled = !inventoryTrackingEnabled;
            setTrackingDisabled((current) => (current === disabled ? current : disabled));
            if (typeof window !== 'undefined') {
                window.sessionStorage.setItem(TRUST_MODE_STORAGE_KEY, disabled ? 'true' : 'false');
            }
        }
    }, [inventoryTrackingEnabled]);

    const usingOfflineFeed = data?.source === 'offline';
    const kioskConnectionState = kioskStatus.connectionState;
    const statusPayload = kioskStatus.status;
    const lastStatusUpdate = kioskStatus.lastUpdatedAt;
    const overlayInfo = useMemo(
        () => buildStatusOverlay(statusPayload, lastStatusUpdate),
        [statusPayload, lastStatusUpdate]
    );
    const overlayVariant = overlayInfo.variant;
    const kioskUnavailable = overlayInfo.active;
    const kioskUnavailableMessage = overlayVariant === 'maintenance'
        ? 'Ordering is paused while maintenance is in progress.'
        : 'Ordering is currently unavailable while the kiosk is closed.';

    const baseProducts = useMemo(() => {
        if (!Array.isArray(data?.products)) {
            return [];
        }

        return data.products
            .map(normalizeProduct)
            .filter((product) => product.status !== 'archived');
    }, [data]);

    const products = useMemo(() => {
        if (!Array.isArray(baseProducts) || baseProducts.length === 0) {
            return baseProducts;
        }

        const availability = kioskStatus.inventoryAvailability || {};

        return baseProducts.map((product) => {
            const override = availability[product.id];
            if (!override) {
                return product;
            }

            const stockQuantity = typeof override.stockQuantity === 'number' && Number.isFinite(override.stockQuantity)
                ? override.stockQuantity
                : product.stockQuantity;

            const lowStockThreshold = typeof override.lowStockThreshold === 'number' && Number.isFinite(override.lowStockThreshold)
                ? override.lowStockThreshold
                : product.lowStockThreshold;

            const isOutOfStock = typeof override.isOutOfStock === 'boolean'
                ? override.isOutOfStock
                : stockQuantity !== null && stockQuantity <= 0;

            const isLowStock = typeof override.isLowStock === 'boolean'
                ? override.isLowStock
                : !isOutOfStock && stockQuantity !== null && lowStockThreshold !== null && stockQuantity <= lowStockThreshold;

            const available = typeof override.available === 'boolean'
                ? override.available
                : inventoryTrackingEnabled
                    ? !isOutOfStock
                    : product.available;

            return {
                ...product,
                stockQuantity,
                lowStockThreshold,
                isOutOfStock,
                isLowStock,
                available
            };
        });
    }, [baseProducts, kioskStatus.inventoryAvailability, inventoryTrackingEnabled]);

    const sortedProducts = useMemo(() => {
        if (!Array.isArray(products) || products.length === 0) {
            return products;
        }

        return [...products].sort((a, b) => {
            if (a.isOutOfStock !== b.isOutOfStock) {
                return a.isOutOfStock ? -1 : 1;
            }
            if (a.isLowStock !== b.isLowStock) {
                return a.isLowStock ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }, [products]);

    const categoryFilters = useMemo(() => {
        const seen = new Set();
        const derived = [];

        (sortedProducts || []).forEach((product) => {
            (product.categories || []).forEach((category) => {
                const name = category.name;
                if (!name || category.isActive === false || seen.has(name)) {
                    return;
                }
                seen.add(name);
                derived.push({ id: category.id, name });
            });
        });

        REQUIRED_CUSTOMER_FILTERS.forEach((category) => {
            if (!seen.has(category.name)) {
                seen.add(category.name);
                derived.push({ id: category.id, name: category.name });
            }
        });

        return derived.sort((a, b) => a.name.localeCompare(b.name));
    }, [sortedProducts]);

    const [selectedCategory, setSelectedCategory] = useState('All Products');
    const [cart, setCart] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [limitMessage, setLimitMessage] = useState('');
    const [outOfStockPrompt, setOutOfStockPrompt] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const outOfStockDialogRef = useRef(null);
    const outOfStockConfirmRef = useRef(null);
    const outOfStockCancelRef = useRef(null);
    const previousFocusRef = useRef(null);
    const statusOverlayRef = useRef(null);
    const previousOverlayFocusRef = useRef(null);

    useEffect(() => {
        if (selectedCategory === 'All Products') {
            return;
        }
        const exists = categoryFilters.some((category) => category.name === selectedCategory);
        if (!exists) {
            setSelectedCategory('All Products');
        }
    }, [categoryFilters, selectedCategory]);

    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'All Products') {
            return sortedProducts;
        }

        return (sortedProducts || []).filter((product) =>
            (product.categories || []).some((category) => category.name === selectedCategory)
        );
    }, [sortedProducts, selectedCategory]);

    useEffect(() => {
        if (!kioskUnavailable) {
            return;
        }
        setOutOfStockPrompt(null);
        setSelectedProduct(null);
        setCartOpen(false);
        setLimitMessage('');
    }, [kioskUnavailable]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }
        if (!overlayInfo.active) {
            const previous = previousOverlayFocusRef.current;
            if (previous && typeof previous.focus === 'function') {
                previous.focus({ preventScroll: true });
            }
            previousOverlayFocusRef.current = null;
            return;
        }

        previousOverlayFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const node = statusOverlayRef.current;
        if (node && typeof node.focus === 'function') {
            node.focus({ preventScroll: true });
        }
    }, [overlayInfo.active, overlayVariant]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof document === 'undefined' || !outOfStockPrompt) {
            return undefined;
        }

        const dialogNode = outOfStockDialogRef.current;
        const confirmButton = outOfStockConfirmRef.current;
        const cancelButton = outOfStockCancelRef.current;
        const focusables = [confirmButton, cancelButton].filter((node) => node && typeof node.focus === 'function');

        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        if (focusables.length > 0) {
            focusables[0].focus({ preventScroll: true });
        } else if (dialogNode && typeof dialogNode.focus === 'function') {
            dialogNode.focus({ preventScroll: true });
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                logKioskEvent('kiosk.out_of_stock_cancelled', {
                    productId: outOfStockPrompt.id,
                    productName: outOfStockPrompt.name,
                    reason: 'escapeKey'
                });
                setOutOfStockPrompt(null);
                return;
            }

            if (event.key !== 'Tab' || focusables.length === 0) {
                return;
            }

            const activeElement = document.activeElement;
            const currentIndex = focusables.indexOf(activeElement);
            const fallbackIndex = event.shiftKey ? focusables.length - 1 : 0;
            const nextIndex = currentIndex === -1
                ? fallbackIndex
                : event.shiftKey
                    ? (currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1)
                    : (currentIndex >= focusables.length - 1 ? 0 : currentIndex + 1);

            focusables[nextIndex]?.focus({ preventScroll: true });
            event.preventDefault();
        };

        dialogNode?.addEventListener('keydown', handleKeyDown);

        return () => {
            dialogNode?.removeEventListener('keydown', handleKeyDown);
            const previous = previousFocusRef.current;
            if (previous && typeof previous.focus === 'function') {
                previous.focus({ preventScroll: true });
            }
            previousFocusRef.current = null;
        };
    }, [outOfStockPrompt]);

    useEffect(() => {
        if (!toastMessage || typeof window === 'undefined') {
            return undefined;
        }
        const timer = window.setTimeout(() => setToastMessage(''), 2000);
        return () => window.clearTimeout(timer);
    }, [toastMessage]);

    useEffect(() => {
        if (products.length === 0) {
            setCart([]);
            return;
        }
        setCart((current) =>
            current
                .map((item) => {
                    const source = products.find((product) => product.id === item.id);
                    if (!source) {
                        return null;
                    }
                    return {
                        ...item,
                        name: source.name,
                        price: source.price,
                        purchaseLimit: source.purchaseLimit
                    };
                })
                .filter(Boolean)
        );
    }, [products]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleStorage = (event) => {
            if (event?.key === OFFLINE_FEED_STORAGE_KEY) {
                refetch();
            }
        };

        const handleFocus = () => {
            refetch();
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('focus', handleFocus);
        };
    }, [refetch]);

    const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

    const addProductToCart = (product) => {
        setCart((current) => {
            const existing = current.find((item) => item.id === product.id);
            const limit = product.purchaseLimit ?? null;
            const currentQuantity = existing?.quantity ?? 0;
            if (limit && currentQuantity >= limit) {
                setLimitMessage(`Maximum ${limit} of this item per purchase`);
                return current;
            }
            const nextQuantity = currentQuantity + 1;
            const showLimitMessage = limit && nextQuantity >= limit;
            setLimitMessage(showLimitMessage ? `Maximum ${limit} of this item per purchase` : '');
            setToastMessage('Added to cart');
            if (existing) {
                return current.map((item) =>
                    item.id === product.id
                        ? {
                            ...item,
                            quantity: nextQuantity,
                            price: product.price,
                            purchaseLimit: product.purchaseLimit
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
                    quantity: 1
                }
            ];
        });
    };

    const showOutOfStockPrompt = (product, trigger, options = {}) => {
        const { closeDetails = true } = options;
        if (closeDetails) {
            setSelectedProduct(null);
        }
        setOutOfStockPrompt(product);
        setLimitMessage('');
        logKioskEvent('kiosk.out_of_stock_prompted', {
            productId: product.id,
            productName: product.name,
            stockQuantity: product.stockQuantity,
            available: product.available,
            trigger
        });
    };

    const handleAddToCart = (product) => {
        if (kioskUnavailable) {
            setToastMessage(kioskUnavailableMessage);
            logKioskEvent('kiosk.order_blocked_unavailable', {
                productId: product.id,
                productName: product.name,
                state: overlayVariant || 'unknown',
                status: statusPayload?.status || null
            });
            return;
        }

        if (inventoryTrackingEnabled && product.isOutOfStock) {
            showOutOfStockPrompt(product, 'add-to-cart');
            return;
        }

        if (product.available === false && !product.isOutOfStock) {
            setToastMessage('This item is currently unavailable.');
            logKioskEvent('kiosk.unavailable_item_selected', {
                productId: product.id,
                productName: product.name
            });
            return;
        }

        addProductToCart(product);
    };

    const handleProductCardClick = (event, product) => {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }
        const interactive = event.target.closest('button, a, input, select, textarea, label');
        if (interactive) {
            return;
        }
        if (kioskUnavailable) {
            setToastMessage(kioskUnavailableMessage);
            return;
        }
        if (inventoryTrackingEnabled && product.isOutOfStock) {
            setSelectedProduct(product);
            showOutOfStockPrompt(product, 'card', { closeDetails: false });
            return;
        }
        setSelectedProduct(product);
    };

    const handleProductCardKeyDown = (event, product) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }
        if (event.target instanceof HTMLElement) {
            const interactive = event.target.closest('button, a, input, select, textarea, label');
            if (interactive) {
                return;
            }
        }
        event.preventDefault();
        if (kioskUnavailable) {
            setToastMessage(kioskUnavailableMessage);
            return;
        }
        if (inventoryTrackingEnabled && product.isOutOfStock) {
            setSelectedProduct(product);
            showOutOfStockPrompt(product, 'keyboard', { closeDetails: false });
            return;
        }
        setSelectedProduct(product);
    };

    const confirmOutOfStockSelection = (accept) => {
        const promptProduct = outOfStockPrompt;
        if (!promptProduct) {
            setOutOfStockPrompt(null);
            return;
        }

        if (kioskUnavailable) {
            logKioskEvent('kiosk.out_of_stock_cancelled', {
                productId: promptProduct.id,
                productName: promptProduct.name,
                reason: 'unavailable',
                state: overlayVariant || 'unknown'
            });
            setOutOfStockPrompt(null);
            setToastMessage(kioskUnavailableMessage);
            return;
        }

        const baseEvent = {
            productId: promptProduct.id,
            productName: promptProduct.name,
            stockQuantity: promptProduct.stockQuantity,
            available: promptProduct.available,
            trigger: 'button'
        };

        if (accept) {
            logKioskEvent('kiosk.out_of_stock_confirmed', baseEvent);
            addProductToCart(promptProduct);
        } else {
            logKioskEvent('kiosk.out_of_stock_cancelled', { ...baseEvent, reason: 'button' });
        }

        setSelectedProduct(null);
        setOutOfStockPrompt(null);
    };

    const incrementQuantity = (productId) => {
        setCart((current) => {
            const target = current.find((item) => item.id === productId);
            if (!target) {
                return current;
            }
            const limit = target.purchaseLimit ?? null;
            if (limit && target.quantity >= limit) {
                setLimitMessage(`Maximum ${limit} of this item per purchase`);
                return current;
            }
            return updateQuantityInCart(current, productId, (quantity) => quantity + 1);
        });
    };

    const decrementQuantity = (productId) => {
        setCart((current) => updateQuantityInCart(current, productId, (quantity) => quantity - 1));
    };

    const removeItem = (productId) => {
        setCart((current) => current.filter((item) => item.id !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setLimitMessage('');
    };

    const handleCheckout = () => {
        if (!hasCartItems) {
            return;
        }
        if (kioskUnavailable) {
            setToastMessage(kioskUnavailableMessage);
            logKioskEvent('kiosk.checkout_blocked_unavailable', {
                cartSize: cart.length,
                state: overlayVariant || 'unknown'
            });
            return;
        }
        setToastMessage('Checkout flow coming soon');
    };

    const handleToggleCart = () => {
        if (kioskUnavailable) {
            setToastMessage(kioskUnavailableMessage);
            logKioskEvent('kiosk.cart_blocked_unavailable', {
                state: overlayVariant || 'unknown'
            });
            return;
        }
        setCartOpen((current) => !current);
    };

    const hasCartItems = cart.length > 0;

    return (
        <div className={`kiosk-app${overlayInfo.active ? ' kiosk-unavailable' : ''}`}>
            <header className="kiosk-header">
                <h1>Snackbar Kiosk</h1>
                <button
                    id="cart-icon"
                    type="button"
                    className="cart-toggle"
                    onClick={handleToggleCart}
                    aria-expanded={cartOpen}
                    aria-controls="cart-panel"
                    disabled={kioskUnavailable}
                    aria-disabled={kioskUnavailable}
                    title={kioskUnavailable ? kioskUnavailableMessage : undefined}
                >
                    Cart
                    <span id="cart-badge" className="cart-badge">
                        {cartCount}
                    </span>
                </button>
            </header>

            {trackingDisabled && (
                <div
                    id="inventory-warning-banner"
                    className="kiosk-warning-banner"
                    role="status"
                    aria-live="polite"
                >
                    ⚠️ Inventory tracking disabled. Please verify items are in cabinet before payment.
                </div>
            )}

            {usingOfflineFeed && (
                <div
                    id="offline-feed-banner"
                    className="kiosk-offline-banner"
                    role="status"
                    aria-live="polite"
                >
                    You are viewing cached inventory data. Availability may differ from the cabinet.
                </div>
            )}

            {kioskConnectionState === 'disconnected' && (
                <div className="kiosk-offline-banner" role="status" aria-live="polite">
                    Attempting to reconnect to live status updates…
                </div>
            )}

            {toastMessage && (
                <div id="kiosk-toast" className="kiosk-toast" role="status" aria-live="polite">
                    {toastMessage}
                </div>
            )}

            {limitMessage && (
                <div id="purchase-limit-message" className="kiosk-limit-message" role="alert">
                    {limitMessage}
                </div>
            )}

            {overlayInfo.active && (
                <div
                    id="kiosk-status-overlay"
                    className={`kiosk-status-overlay${overlayVariant ? ` ${overlayVariant}` : ''}`}
                    role="alert"
                    aria-live="assertive"
                    tabIndex={-1}
                    ref={statusOverlayRef}
                >
                    <div className="overlay-panel">
                        <div className="overlay-icon" aria-hidden="true">{overlayInfo.icon}</div>
                        <h2 className="overlay-title">{overlayInfo.title}</h2>
                        {overlayInfo.message && (
                            <p className="overlay-message">{overlayInfo.message}</p>
                        )}
                        {overlayInfo.detail && (
                            <p className="overlay-detail">{overlayInfo.detail}</p>
                        )}
                        {overlayInfo.next && (
                            <p className="overlay-next">
                                Next opening <strong>{overlayInfo.next}</strong>
                                {overlayInfo.eta ? <span className="overlay-eta"> · {overlayInfo.eta}</span> : null}
                            </p>
                        )}
                        {overlayInfo.next === null && overlayInfo.eta && (
                            <p className="overlay-eta-only">{overlayInfo.eta}</p>
                        )}
                        {overlayInfo.lastUpdated && (
                            <p className="overlay-updated">Status updated {overlayInfo.lastUpdated}</p>
                        )}
                    </div>
                </div>
            )}

            <main className="kiosk-main" aria-hidden={overlayInfo.active ? 'true' : undefined}>
                {error && (
                    <div className="kiosk-error" role="alert">
                        {error.message || 'Unable to load products.'}
                    </div>
                )}
                {!isLoading && categoryFilters.length > 0 && (
                    <div
                        id="category-filters"
                        className="category-filters"
                        role="group"
                        aria-label="Filter by category"
                        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}
                    >
                        <button
                            type="button"
                            className={`button secondary category-filter-button${selectedCategory === 'All Products' ? ' active' : ' muted'}`}
                            data-category="All Products"
                            aria-pressed={selectedCategory === 'All Products'}
                            aria-controls="product-grid"
                            onClick={() => setSelectedCategory('All Products')}
                        >
                            All Products
                        </button>
                        {categoryFilters.map((category) => (
                            <button
                                key={category.id || category.name}
                                type="button"
                                className={`button secondary category-filter-button${selectedCategory === category.name ? ' active' : ' muted'}`}
                                data-category={category.name}
                                aria-pressed={selectedCategory === category.name}
                                aria-controls="product-grid"
                                onClick={() => setSelectedCategory(category.name)}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                )}
                {isLoading ? (
                    <ProductGridSkeleton />
                ) : (sortedProducts?.length ?? 0) === 0 ? (
                    <div className="loading-placeholder">No products available.</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="loading-placeholder" role="status" aria-live="polite">
                        No products in this category
                    </div>
                ) : (
                    <div
                        id="product-grid"
                        className="product-grid"
                        aria-live={isFetching ? 'polite' : 'off'}
                        aria-busy={isFetching}
                    >
                        {filteredProducts.map((product) => {
                            const categoryLabels = (product.categories || [])
                                .map((category) => category?.name)
                                .filter(Boolean);
                            const primaryCategory = categoryLabels[0] || 'Uncategorized';
                            const cardClasses = ['product-card'];
                            const allergenValue = typeof product.allergens === 'string'
                                ? product.allergens.trim()
                                : '';
                            const hasAllergenInfo = allergenValue.length > 0;
                            if (inventoryTrackingEnabled && product.isOutOfStock) {
                                cardClasses.push('out-of-stock');
                            }
                            if (inventoryTrackingEnabled && !product.isOutOfStock && product.isLowStock) {
                                cardClasses.push('low-stock');
                            }
                            if (product.available === false && !inventoryTrackingEnabled) {
                                cardClasses.push('trust-mode');
                            }
                            if (kioskUnavailable) {
                                cardClasses.push('status-locked');
                            }

                            const stockValue =
                                typeof product.stockQuantity === 'number' && Number.isFinite(product.stockQuantity)
                                    ? product.stockQuantity
                                    : '';

                            const addToCartDisabled = kioskUnavailable || (
                                inventoryTrackingEnabled &&
                                product.available === false &&
                                !product.isOutOfStock
                            );

                            const addToCartLabel = kioskUnavailable
                                ? 'Ordering unavailable'
                                : inventoryTrackingEnabled && product.isOutOfStock
                                    ? 'Request cabinet check'
                                    : inventoryTrackingEnabled && product.available === false
                                        ? 'Unavailable'
                                        : 'Add to cart';

                            return (
                                <div
                                    key={product.id}
                                    className={cardClasses.join(' ')}
                                    data-product-name={product.name}
                                    data-category={categoryLabels.join(', ') || primaryCategory}
                                    data-stock={stockValue}
                                    data-low-stock={Boolean(product.isLowStock && inventoryTrackingEnabled)}
                                    data-has-allergen={hasAllergenInfo ? 'true' : 'false'}
                                    role="button"
                                    tabIndex={0}
                                    onClick={(event) => handleProductCardClick(event, product)}
                                    onKeyDown={(event) => handleProductCardKeyDown(event, product)}
                                >
                                    <div className="product-image-wrapper">
                                        <img
                                            src={product.imageUrl || DEFAULT_PRODUCT_IMAGE}
                                            alt={product.imageAlt}
                                            loading="lazy"
                                            decoding="async"
                                            width="400"
                                            height="300"
                                            className="product-image"
                                        />
                                    </div>
                                    <div className="product-info">
                                        <strong className="product-name">{product.name}</strong>
                                        <span className="product-price">{formatPrice(product.price)}</span>
                                        {inventoryTrackingEnabled && product.isOutOfStock && (
                                            <span className="badge out-of-stock-badge">Out of Stock</span>
                                        )}
                                        {inventoryTrackingEnabled && !product.isOutOfStock && product.isLowStock && (
                                            <span className="badge low-stock-badge">Low stock</span>
                                        )}
                                        {product.description && (
                                            <p className="product-description">{product.description}</p>
                                        )}
                                    </div>
                                    <div className="product-card-actions">
                                        <button
                                            type="button"
                                            className="button tertiary details-button"
                                            onClick={() => setSelectedProduct(product)}
                                            aria-label={`View details for ${product.name}`}
                                        >
                                            View details
                                        </button>
                                        <button
                                            type="button"
                                            className="add-to-cart add-to-cart-button"
                                            onClick={() => handleAddToCart(product)}
                                            disabled={addToCartDisabled}
                                            aria-disabled={addToCartDisabled}
                                        >
                                            {addToCartLabel}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <aside
                id="cart-panel"
                className={`cart-panel${cartOpen ? ' open' : ''}`}
                aria-hidden={kioskUnavailable || !cartOpen}
            >
                <div className="cart-header">
                    <h2>Shopping Cart</h2>
                    <button type="button" className="close-cart" onClick={handleToggleCart}>
                        Close
                    </button>
                </div>
                <div id="cart-items" className="cart-items">
                    {!hasCartItems && <p className="cart-empty">Your cart is empty</p>}
                    {cart.map((item) => {
                        const limitReached = item.purchaseLimit && item.quantity >= item.purchaseLimit;
                        return (
                            <div key={item.id} className="cart-item" data-product-name={item.name}>
                                <div className="cart-item-info">
                                    <span className="item-name">{item.name}</span>
                                    <span className="item-price">{formatPrice(item.price)}</span>
                                </div>
                                <div className="cart-item-controls">
                                    <button
                                        type="button"
                                        className="quantity-minus-button"
                                        onClick={() => decrementQuantity(item.id)}
                                        aria-label={`Decrease quantity for ${item.name}`}
                                        style={{ width: '48px', height: '48px' }}
                                    >
                                        −
                                    </button>
                                    <span className="quantity-display">
                                        <span className="quantity-value cart-item-quantity">{item.quantity}</span>
                                    </span>
                                    <button
                                        type="button"
                                        className="quantity-plus-button"
                                        onClick={() => incrementQuantity(item.id)}
                                        aria-label={`Increase quantity for ${item.name}`}
                                        disabled={Boolean(limitReached)}
                                        style={{ width: '48px', height: '48px' }}
                                    >
                                        +
                                    </button>
                                    <span className="item-subtotal">{formatPrice(item.price * item.quantity)}</span>
                                    <button
                                        type="button"
                                        className="remove-button"
                                        onClick={() => removeItem(item.id)}
                                        aria-label={`Remove ${item.name} from cart`}
                                        style={{ width: '48px', height: '48px' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="cart-footer">
                    <div id="cart-total" className="cart-total">
                        Total: {formatPrice(cartTotal)}
                    </div>
                    <button
                        id="checkout-button"
                        type="button"
                        className="checkout-button"
                        onClick={handleCheckout}
                        disabled={!hasCartItems || kioskUnavailable}
                        aria-disabled={!hasCartItems || kioskUnavailable}
                        title={kioskUnavailable ? kioskUnavailableMessage : undefined}
                    >
                        Proceed to checkout
                    </button>
                    <button
                        id="clear-cart-button"
                        type="button"
                        className="clear-cart"
                        onClick={clearCart}
                    >
                        Clear cart
                    </button>
                </div>
            </aside>

            {outOfStockPrompt && (
                <div className="modal-backdrop out-of-stock-backdrop" role="presentation">
                    <div
                        id="out-of-stock-confirmation"
                        className="out-of-stock-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={OUT_OF_STOCK_DIALOG_TITLE_ID}
                        aria-describedby={OUT_OF_STOCK_DIALOG_MESSAGE_ID}
                        tabIndex={-1}
                        ref={outOfStockDialogRef}
                    >
                        <h2 id={OUT_OF_STOCK_DIALOG_TITLE_ID} className="dialog-title">Out of stock confirmation</h2>
                        <p id={OUT_OF_STOCK_DIALOG_MESSAGE_ID} className="dialog-message">Can you see it in the cabinet?</p>
                        <div className="dialog-actions">
                            <button
                                id="confirm-yes-button"
                                type="button"
                                className="button"
                                ref={outOfStockConfirmRef}
                                onClick={() => confirmOutOfStockSelection(true)}
                            >
                                Yes, I see it
                            </button>
                            <button
                                id="confirm-no-button"
                                type="button"
                                className="button secondary"
                                ref={outOfStockCancelRef}
                                onClick={() => confirmOutOfStockSelection(false)}
                            >
                                No, go back
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedProduct && (
                <ProductDetailModal
                    product={selectedProduct}
                    onDismiss={() => setSelectedProduct(null)}
                    onAddToCart={(product) => handleAddToCart(product)}
                    connectionState={kioskConnectionState}
                />
            )}
        </div>
    );
};

export default KioskApp;
