import { useEffect, useMemo, useRef, useState } from 'react';
import { useProductFeed } from '../hooks/useProductFeed.js';
import useKioskStatus from '../hooks/useKioskStatus.js';
import ProductGridSkeleton from './ProductGridSkeleton.jsx';
import ProductDetailModal from './ProductDetailModal.jsx';
import { OFFLINE_FEED_STORAGE_KEY } from '../utils/offlineCache.js';

const formatPrice = (value) => `${Number(value ?? 0).toFixed(2)}€`;

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
    const products = useMemo(() => {
        if (!Array.isArray(data?.products)) {
            return [];
        }
        return data.products
            .map(normalizeProduct)
            .filter((product) => product.status !== 'archived');
    }, [data]);
    const inventoryTrackingEnabled = kioskStatus.inventoryTrackingEnabled ?? (data?.inventoryTrackingEnabled !== false);
    const trackingDisabled = !inventoryTrackingEnabled;
    const usingOfflineFeed = data?.source === 'offline';
    const kioskConnectionState = kioskStatus.connectionState;
    const latestAvailabilityTimestampRef = useRef(null);

    const categoryFilters = useMemo(() => {
        const seen = new Set();
        const derived = [];

        products.forEach((product) => {
            (product.categories || []).forEach((category) => {
                const name = category.name;
                if (!name || category.isActive === false || seen.has(name)) {
                    return;
                }
                seen.add(name);
                derived.push({ id: category.id, name });
            });
        });

        return derived.sort((a, b) => a.name.localeCompare(b.name));
    }, [products]);

    const [selectedCategory, setSelectedCategory] = useState('All Products');
    const [cart, setCart] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [limitMessage, setLimitMessage] = useState('');
    const [outOfStockPrompt, setOutOfStockPrompt] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

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
            return products;
        }

        return products.filter((product) =>
            (product.categories || []).some((category) => category.name === selectedCategory)
        );
    }, [products, selectedCategory]);

    useEffect(() => {
        if (!kioskStatus.inventoryAvailability) {
            return;
        }
        const updates = Object.values(kioskStatus.inventoryAvailability);
        if (!updates.length) {
            return;
        }
        const newest = updates.reduce((acc, entry) => {
            if (!entry?.emittedAt) {
                return acc;
            }
            if (!acc || entry.emittedAt > acc.emittedAt) {
                return entry;
            }
            return acc;
        }, null);
        if (!newest?.emittedAt) {
            return;
        }
        if (latestAvailabilityTimestampRef.current === newest.emittedAt) {
            return;
        }
        latestAvailabilityTimestampRef.current = newest.emittedAt;
        refetch();
    }, [kioskStatus.inventoryAvailability, refetch]);

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

    const handleAddToCart = (product) => {
        if (inventoryTrackingEnabled && product.isOutOfStock) {
            setOutOfStockPrompt(product);
            setLimitMessage('');
            return;
        }

        if (product.available === false && !product.isOutOfStock) {
            setToastMessage('This item is currently unavailable.');
            return;
        }

        addProductToCart(product);
    };

    const confirmOutOfStockSelection = (accept) => {
        if (!accept) {
            setOutOfStockPrompt(null);
            return;
        }
        if (outOfStockPrompt) {
            addProductToCart(outOfStockPrompt);
        }
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
        setToastMessage('Checkout flow coming soon');
    };

    const handleToggleCart = () => {
        setCartOpen((current) => !current);
    };

    const hasCartItems = cart.length > 0;

    return (
        <div className="kiosk-app">
            <header className="kiosk-header">
                <h1>Snackbar Kiosk</h1>
                <button
                    id="cart-icon"
                    type="button"
                    className="cart-toggle"
                    onClick={handleToggleCart}
                    aria-expanded={cartOpen}
                    aria-controls="cart-panel"
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

            <main className="kiosk-main">
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
                ) : products.length === 0 ? (
                    <div className="loading-placeholder">No products available.</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="loading-placeholder" role="status" aria-live="polite">
                        No products found for {selectedCategory}. Try another category.
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
                            if (inventoryTrackingEnabled && product.isOutOfStock) {
                                cardClasses.push('out-of-stock');
                            }
                            if (inventoryTrackingEnabled && !product.isOutOfStock && product.isLowStock) {
                                cardClasses.push('low-stock');
                            }
                            if (product.available === false && !inventoryTrackingEnabled) {
                                cardClasses.push('trust-mode');
                            }

                            const stockValue =
                                typeof product.stockQuantity === 'number' && Number.isFinite(product.stockQuantity)
                                    ? product.stockQuantity
                                    : '';

                            return (
                                <div
                                    key={product.id}
                                    className={cardClasses.join(' ')}
                                    data-product-name={product.name}
                                    data-category={categoryLabels.join(', ') || primaryCategory}
                                    data-stock={stockValue}
                                    data-low-stock={Boolean(product.isLowStock && inventoryTrackingEnabled)}
                                >
                                    <div className="product-image" role="img" aria-label={product.imageAlt}>
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.imageAlt} />
                                        ) : (
                                            'No Image'
                                        )}
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
                                            disabled={
                                                inventoryTrackingEnabled &&
                                                product.available === false &&
                                                !product.isOutOfStock
                                            }
                                            aria-disabled={
                                                inventoryTrackingEnabled &&
                                                product.available === false &&
                                                !product.isOutOfStock
                                            }
                                        >
                                            {inventoryTrackingEnabled && product.isOutOfStock
                                                ? 'Request cabinet check'
                                                : 'Add to cart'}
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
                aria-hidden={!cartOpen}
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
                        disabled={!hasCartItems}
                        aria-disabled={!hasCartItems}
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
                <div className="modal-backdrop" role="presentation">
                    <div
                        id="out-of-stock-confirmation"
                        className="out-of-stock-dialog"
                        role="dialog"
                        aria-modal="true"
                    >
                        <h2 className="dialog-title">Out of stock confirmation</h2>
                        <p className="dialog-message">Can you see it in the cabinet?</p>
                        <div className="dialog-actions">
                            <button
                                id="confirm-yes-button"
                                type="button"
                                className="button"
                                onClick={() => confirmOutOfStockSelection(true)}
                            >
                                Yes, I see it
                            </button>
                            <button
                                id="confirm-no-button"
                                type="button"
                                className="button secondary"
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
                    connectionState={kioskConnectionState}
                />
            )}
        </div>
    );
};

export default KioskApp;
