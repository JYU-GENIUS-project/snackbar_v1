import { useEffect, useMemo, useState } from 'react';
import { useProductFeed } from '../hooks/useProductFeed.js';
import { OFFLINE_FEED_STORAGE_KEY } from '../utils/offlineCache.js';

const formatPrice = (value) => `${Number(value ?? 0).toFixed(2)}€`;

const normalizeProduct = (product) => {
    const limit = Number(product.purchaseLimit);
    return {
        id: product.id,
        name: product.name || 'Product',
        price: Number(product.price ?? 0),
        purchaseLimit: Number.isFinite(limit) && limit > 0 ? limit : null,
        imageUrl: product.primaryMedia?.url || '',
        imageAlt: product.primaryMedia?.alt || product.name || 'Product image',
        description: product.description || product.metadata?.description || '',
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
    const products = useMemo(() => {
        if (!Array.isArray(data?.products)) {
            return [];
        }
        return data.products.map(normalizeProduct).filter((product) => product.available);
    }, [data]);

    const [cart, setCart] = useState([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [limitMessage, setLimitMessage] = useState('');

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

    const handleAddToCart = (product) => {
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
                {isLoading ? (
                    <div className="loading-placeholder">Loading products…</div>
                ) : products.length === 0 ? (
                    <div className="loading-placeholder">No products available.</div>
                ) : (
                    <div id="product-grid" className="product-grid" aria-live={isFetching ? 'polite' : 'off'}>
                        {products.map((product) => (
                            <div key={product.id} className="product-card" data-product-name={product.name}>
                                <div className="product-image" role="img" aria-label={product.imageAlt}>
                                    {product.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt} /> : 'No Image'}
                                </div>
                                <div className="product-info">
                                    <strong className="product-name">{product.name}</strong>
                                    <span className="product-price">{formatPrice(product.price)}</span>
                                    {product.description && <p className="product-description">{product.description}</p>}
                                </div>
                                <button
                                    type="button"
                                    className="add-to-cart"
                                    onClick={() => handleAddToCart(product)}
                                >
                                    Add to cart
                                </button>
                            </div>
                        ))}
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
                        id="clear-cart-button"
                        type="button"
                        className="clear-cart"
                        onClick={clearCart}
                    >
                        Clear cart
                    </button>
                </div>
            </aside>
        </div>
    );
};

export default KioskApp;
