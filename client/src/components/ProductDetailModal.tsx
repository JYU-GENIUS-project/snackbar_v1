import { useEffect, useRef } from 'react';

type ProductCategory = {
  id?: string;
  name?: string;
};

type ProductDetail = {
  id?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  price?: number;
  allergens?: string[] | string;
  categories?: ProductCategory[];
  isOutOfStock?: boolean;
  isLowStock?: boolean;
  purchaseLimit?: number | null;
};

type ConnectionState = 'connected' | 'disconnected' | 'polling' | string;

type ProductDetailModalProps = {
  product?: ProductDetail | null;
  onDismiss: () => void;
  onAddToCart?: (product: ProductDetail) => void;
  connectionState?: ConnectionState;
};

const buildAllergenList = (allergens?: ProductDetail['allergens']) => {
  if (!allergens) {
    return [] as string[];
  }
  if (Array.isArray(allergens)) {
    return allergens.filter(Boolean);
  }
  return allergens
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const ProductDetailModal = ({ product, onDismiss, onAddToCart, connectionState }: ProductDetailModalProps) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const target = closeButtonRef?.current;
    if (target && typeof target.focus === 'function') {
      target.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
      }
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) {
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [onDismiss]);

  if (!product) {
    return null;
  }

  const allergenList = buildAllergenList(product.allergens);
  const hasAllergens = allergenList.length > 0;

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        id="product-detail-modal"
        ref={dialogRef}
        className="product-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
      >
        <header className="product-detail-header">
          <div>
            <h2 id="product-detail-title">{product.name}</h2>
            {product.categories?.length ? (
              <p className="product-detail-subtitle">
                {(product.categories || []).map((category) => category.name).filter(Boolean).join(', ')}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="button tertiary close-detail-button"
            onClick={onDismiss}
            ref={closeButtonRef}
            aria-label="Close product details"
          >
            Close
          </button>
        </header>

        <section className="product-detail-body">
          <div className="product-detail-media" aria-hidden={!product.imageUrl}>
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.imageAlt}
                loading="lazy"
                decoding="async"
                width="640"
                height="480"
              />
            ) : (
              <div className="product-detail-placeholder">No image available</div>
            )}
          </div>

          <div className="product-detail-content">
            <p className="product-detail-price">
              {product.price?.toFixed ? `${product.price.toFixed(2)}€` : ''}
            </p>
            <p className="product-detail-description">
              {product.description || 'No additional description provided.'}
            </p>

            <div className="product-detail-meta">
              <div className="product-detail-row">
                <span className="label">Inventory tracking</span>
                <span className="value">
                  {product.isOutOfStock ? 'Out of stock' : product.isLowStock ? 'Low stock' : 'Available'}
                </span>
              </div>
              {product.purchaseLimit ? (
                <div className="product-detail-row">
                  <span className="label">Per-order limit</span>
                  <span className="value">{product.purchaseLimit}</span>
                </div>
              ) : null}
              <div className="product-detail-row">
                <span className="label">Status updates</span>
                <span className="value">
                  {connectionState === 'connected'
                    ? 'Live'
                    : connectionState === 'disconnected'
                    ? 'Reconnecting…'
                    : 'Polling'}
                </span>
              </div>
            </div>

            <section id="allergen-information" className="product-detail-allergens" aria-live="polite">
              <h3>Allergens</h3>
              {hasAllergens ? (
                <ul>
                  {allergenList.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>No allergen information available</p>
              )}
            </section>
            <div className="product-detail-actions">
              <button
                id="add-to-cart-button"
                type="button"
                className="button primary"
                onClick={() => onAddToCart && onAddToCart(product)}
                disabled={!onAddToCart}
              >
                Add to cart
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductDetailModal;
