type ProductMedia = {
  id?: string;
  variant?: string;
  format?: string;
  isPrimary?: boolean;
  deletedAt?: string | null;
};

type Product = {
  id: string;
  name: string;
  status?: string;
  description?: string | null;
  price?: number;
  stockQuantity?: number | null;
  purchaseLimit?: number | null;
  updatedAt: string;
  deletedAt?: string | null;
  media?: ProductMedia[];
};

type ProductTableMeta = {
  total: number;
};

type ProductTableProps = {
  products: Product[];
  meta?: ProductTableMeta | null;
  isLoading?: boolean;
  isFetching?: boolean;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
  archivePendingId?: string | null;
  archivePending?: boolean;
  onManageMedia?: (product: Product) => void;
};

const statusBadgeClass = (status?: string) => {
  if (status === 'active') return 'badge success';
  if (status === 'archived') return 'badge warning';
  return 'badge neutral';
};

const ProductTable = ({
  products,
  meta,
  isLoading,
  isFetching,
  onEdit,
  onArchive,
  archivePendingId,
  archivePending,
  onManageMedia
}: ProductTableProps) => {
  const safeProducts = Array.isArray(products) ? products : [];
  const hasProducts = safeProducts.length > 0;

  return (
    <div className="table-wrapper">
      <table id="product-list" className="table product-list">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Media</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={7}>Loading products…</td>
            </tr>
          )}

          {!isLoading && !hasProducts && (
            <tr>
              <td colSpan={7}>No products found. Use the form below to add one.</td>
            </tr>
          )}

          {!isLoading &&
            hasProducts &&
            safeProducts.map((product) => {
              const isArchiving = archivePending && archivePendingId === product.id;
              const mediaItems = Array.isArray(product.media)
                ? product.media.filter((item) => !item.deletedAt)
                : [];
              const primaryMedia = mediaItems.find((item) => item.isPrimary);
              return (
                <tr key={product.id} className="product-item product-list-item" data-product-id={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                    <div className="helper" style={{ maxWidth: '320px' }}>
                      {product.description || 'No description'}
                    </div>
                  </td>
                  <td>
                    <span className={statusBadgeClass(product.status)}>{product.status}</span>
                    {product.deletedAt && (
                      <div className="helper">Archived {new Date(product.deletedAt).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td>
                    {mediaItems.length > 0 ? (
                      <div>
                        <span className="badge neutral">
                          {mediaItems.length} asset{mediaItems.length === 1 ? '' : 's'}
                        </span>
                        <div className="helper">
                          {primaryMedia
                            ? `Primary: ${primaryMedia.variant} / ${primaryMedia.format?.toUpperCase() || '—'}`
                            : 'No primary image yet'}
                        </div>
                        {onManageMedia && (
                          <button className="button secondary" type="button" onClick={() => onManageMedia(product)}>
                            Manage media
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="badge warning">None</span>
                        <div className="helper">Upload images to improve kiosk display.</div>
                        {onManageMedia && (
                          <button className="button secondary" type="button" onClick={() => onManageMedia(product)}>
                            Add media
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td>€ {product.price?.toFixed ? product.price.toFixed(2) : product.price}</td>
                  <td>
                    {product.stockQuantity ?? 0}
                    <div className="helper">Limit {product.purchaseLimit ?? '—'}</div>
                  </td>
                  <td>
                    <div className="helper">{new Date(product.updatedAt).toLocaleString()}</div>
                  </td>
                  <td>
                    <div className="inline">
                      <button className="button secondary edit-button" type="button" onClick={() => onEdit(product)}>
                        Edit
                      </button>
                      {!product.deletedAt && (
                        <button
                          className="button danger delete-button"
                          type="button"
                          onClick={() => onArchive(product)}
                          disabled={isArchiving}
                        >
                          {isArchiving ? 'Deleting…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      {meta && (
        <p className="helper" style={{ marginTop: '0.75rem' }}>
          {isFetching ? 'Refreshing catalog… ' : ''}
          Showing {products.length} of {meta.total} products.
        </p>
      )}
    </div>
  );
};

export default ProductTable;
