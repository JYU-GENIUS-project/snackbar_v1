import { useProductFeed } from '../hooks/useProductFeed.js';

const placeholderStyles = {
  width: '100%',
  aspectRatio: '4 / 3',
  background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#6b7280',
  fontWeight: 600
};

const cardStyles = {
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '0.75rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  backgroundColor: '#ffffff'
};

const imageStyles = {
  width: '100%',
  aspectRatio: '4 / 3',
  objectFit: 'cover',
  borderRadius: '12px',
  backgroundColor: '#f3f4f6'
};

const gridStyles = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '1rem',
  width: '100%'
};

const KioskPreview = () => {
  const { data, isLoading, isFetching, error } = useProductFeed();

  const products = data?.products ?? [];

  return (
    <section className="card" id="kiosk-preview">
      <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>Kiosk Feed Preview</h2>
          <p className="helper">Live snapshot of what the kiosk sees, refreshed automatically.</p>
        </div>
        {isFetching && !isLoading && <span className="helper">Updating…</span>}
      </div>

      {error && (
        <div className="alert error">
          <span>{error.message || 'Unable to load product feed.'}</span>
        </div>
      )}

      {isLoading ? (
        <p>Loading kiosk feed…</p>
      ) : products.length === 0 ? (
        <p>No active products available in the feed yet.</p>
      ) : (
        <div style={gridStyles}>
          {products.map((product) => {
            const imageUrl = product.primaryMedia?.url;
            const imageAlt = product.primaryMedia?.alt || product.imageAlt || product.name;
            return (
              <article key={product.id} style={cardStyles}>
                {imageUrl ? (
                  <img src={imageUrl} alt={imageAlt || product.name} style={imageStyles} loading="lazy" />
                ) : (
                  <div style={placeholderStyles}>No Image</div>
                )}
                <div>
                  <strong>{product.name}</strong>
                  <p className="helper" style={{ marginBottom: '0.25rem' }}>
                    € {Number(product.price ?? 0).toFixed(2)} · {product.available ? 'Available' : 'Unavailable'}
                  </p>
                  {product.metadata?.calories && (
                    <p className="helper">{product.metadata.calories} kcal</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default KioskPreview;
