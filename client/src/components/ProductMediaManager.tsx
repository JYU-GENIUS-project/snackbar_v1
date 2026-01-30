import { forwardRef, useState } from 'react';
import {
  useDeleteProductMedia,
  useMarkPrimaryMedia,
  useProductMedia,
  useUploadProductMedia
} from '../hooks/useProductMedia.js';

type MediaStatus = {
  type: 'success' | 'error' | '';
  message: string;
};

type ProductMediaManagerProps = {
  productId?: string | null;
  token?: string;
  productName?: string;
};

type MediaItem = {
  id: string;
  variant?: string;
  format?: string;
  sizeBytes?: number | null;
  isPrimary?: boolean;
  createdAt?: string | null;
};

const formatBytes = (bytes?: number | null) => {
  if (!bytes) {
    return '—';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const ProductMediaManager = forwardRef<HTMLDivElement, ProductMediaManagerProps>(
  ({ productId, token, productName }, ref) => {
    const [status, setStatus] = useState<MediaStatus>({ type: '', message: '' });

    const { data: media = [], isLoading, isFetching } = useProductMedia({
      token,
      productId,
      enabled: Boolean(productId)
    });
    const uploadMutation = useUploadProductMedia(token);
    const markPrimaryMutation = useMarkPrimaryMedia(token);
    const deleteMutation = useDeleteProductMedia(token);

    if (!productId) {
      return null;
    }

    const resetStatus = () => setStatus({ type: '', message: '' });

    const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetStatus();

      const form = event.currentTarget;
      const fileInput = form.elements.namedItem('mediaFile') as HTMLInputElement | null;
      const file = fileInput?.files?.[0];

      if (!file) {
        setStatus({ type: 'error', message: 'Choose an image file to upload.' });
        return;
      }

      try {
        await uploadMutation.mutateAsync({ productId, file });
        setStatus({ type: 'success', message: 'Upload complete. Image variants generated.' });
        form.reset();
      } catch (error) {
        setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to upload media.' });
      }
    };

    const handleMarkPrimary = async (mediaId: string) => {
      resetStatus();
      try {
        await markPrimaryMutation.mutateAsync({ productId, mediaId });
        setStatus({ type: 'success', message: 'Primary image updated.' });
      } catch (error) {
        setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Unable to update primary image.' });
      }
    };

    const handleDelete = async (mediaId: string) => {
      resetStatus();
      if (typeof window !== 'undefined' && !window.confirm('Remove this media asset?')) {
        return;
      }

      try {
        await deleteMutation.mutateAsync({ productId, mediaId });
        setStatus({ type: 'success', message: 'Media asset removed.' });
      } catch (error) {
        setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Unable to delete media asset.' });
      }
    };

    const pendingAction = uploadMutation.isPending || markPrimaryMutation.isPending || deleteMutation.isPending;

    return (
      <section
        ref={ref}
        className="card"
        aria-live={status.type === 'error' ? 'assertive' : 'polite'}
        tabIndex={-1}
      >
        <div className="inline" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2>Media Library</h2>
            <p className="helper">
              Manage product imagery for <strong>{productName}</strong>. The first display variant is used in kiosk
              listings.
            </p>
          </div>
        </div>

        {status.message && (
          <div className={`alert ${status.type === 'error' ? 'error' : 'success'}`}>
            <span>{status.message}</span>
            <button className="button secondary" type="button" onClick={resetStatus}>
              Dismiss
            </button>
          </div>
        )}

        <form className="inline" style={{ gap: '0.75rem', alignItems: 'flex-end' }} onSubmit={handleUpload}>
          <div className="form-field" style={{ flexGrow: 1 }}>
            <label htmlFor="product-media-file">Upload new image</label>
            <input id="product-media-file" name="mediaFile" type="file" accept="image/*" disabled={pendingAction} />
            <span className="helper">JPEG, PNG, or WebP up to 5 MB. Variants generate automatically.</span>
          </div>
          <button className="button" type="submit" disabled={pendingAction}>
            {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Existing media</h3>
          {isLoading ? (
            <p>Loading media…</p>
          ) : media.length === 0 ? (
            <p>No media uploaded yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Variant</th>
                    <th scope="col">Format</th>
                    <th scope="col">Size</th>
                    <th scope="col">Primary</th>
                    <th scope="col">Uploaded</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(media as MediaItem[]).map((item) => {
                    const markedPrimary = item.isPrimary;
                    return (
                      <tr key={item.id}>
                        <td>{item.variant}</td>
                        <td>{item.format?.toUpperCase() || '—'}</td>
                        <td>{formatBytes(item.sizeBytes)}</td>
                        <td>{markedPrimary ? <span className="badge success">Primary</span> : '—'}</td>
                        <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</td>
                        <td>
                          <div className="inline" style={{ gap: '0.5rem' }}>
                            {!markedPrimary && item.variant === 'display' && (
                              <button
                                className="button secondary"
                                type="button"
                                onClick={() => handleMarkPrimary(item.id)}
                                disabled={markPrimaryMutation.isPending}
                              >
                                {markPrimaryMutation.isPending && markPrimaryMutation.variables?.mediaId === item.id
                                  ? 'Updating…'
                                  : 'Make primary'}
                              </button>
                            )}
                            <button
                              className="button danger"
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteMutation.isPending && deleteMutation.variables?.mediaId === item.id}
                            >
                              {deleteMutation.isPending && deleteMutation.variables?.mediaId === item.id
                                ? 'Removing…'
                                : 'Remove'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {isFetching && <p className="helper">Refreshing media…</p>}
            </div>
          )}
        </div>
      </section>
    );
  }
);

ProductMediaManager.displayName = 'ProductMediaManager';

export default ProductMediaManager;
