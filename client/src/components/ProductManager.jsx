import { useEffect, useMemo, useRef, useState } from 'react';
import { useArchiveProduct, useCreateProduct, useProducts, useUpdateProduct } from '../hooks/useProducts.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import ProductTable from './ProductTable.jsx';
import ProductForm from './ProductForm.jsx';
import ProductMediaManager from './ProductMediaManager.jsx';
import KioskPreview from './KioskPreview.jsx';
import CategoryManager from './CategoryManager.jsx';
import { normalizeProductPayload, productToFormState } from '../utils/productPayload.js';
import { useUploadProductMedia } from '../hooks/useProductMedia.js';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory
} from '../hooks/useCategories.js';

const DEFAULT_LIMIT = 50;

const initialBanner = { type: 'info', message: '' };

const ProductManager = ({ auth }) => {
  const [activeSection, setActiveSection] = useState('products');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState('create');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [banner, setBanner] = useState(initialBanner);
  const [focusMediaManager, setFocusMediaManager] = useState(false);
  const mediaManagerRef = useRef(null);

  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading, isFetching, error } = useProducts({
    token: auth.token,
    includeArchived,
    search: debouncedSearch,
    limit: DEFAULT_LIMIT,
    offset: 0
  });

  const createMutation = useCreateProduct(auth.token);
  const updateMutation = useUpdateProduct(auth.token);
  const archiveMutation = useArchiveProduct(auth.token);
  const uploadMediaMutation = useUploadProductMedia(auth.token);
  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError
  } = useCategories(auth.token);
  const createCategoryMutation = useCreateCategory(auth.token);
  const updateCategoryMutation = useUpdateCategory(auth.token);
  const deleteCategoryMutation = useDeleteCategory(auth.token);

  const products = useMemo(() => data?.data ?? [], [data]);
  const meta = data?.meta;
  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);

  useEffect(() => {
    if (formMode === 'edit') {
      setShowForm(true);
    }
  }, [formMode]);

  useEffect(() => {
    if (focusMediaManager && editingProduct && mediaManagerRef.current) {
      mediaManagerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (typeof mediaManagerRef.current.focus === 'function') {
        mediaManagerRef.current.focus();
      }
      setFocusMediaManager(false);
    }
  }, [focusMediaManager, editingProduct]);

  const handleShowDashboard = () => {
    setActiveSection('dashboard');
  };

  const handleShowProducts = () => {
    setActiveSection('products');
  };

  const handleShowCategories = () => {
    setActiveSection('categories');
  };

  const handleCreate = async (values) => {
    const { imageFile, ...productValues } = values;

    let createdProduct;

    try {
      const payload = normalizeProductPayload(productValues);
      createdProduct = await createMutation.mutateAsync(payload);
    } catch (mutationError) {
      setBanner({ type: 'error', message: mutationError?.message || 'Failed to create product.' });
      throw mutationError;
    }

    if (!imageFile) {
      setBanner({ type: 'success', message: 'Product created successfully.' });
      return createdProduct;
    }

    try {
      await uploadMediaMutation.mutateAsync({ productId: createdProduct.id, file: imageFile });
      setBanner({ type: 'success', message: 'Product created successfully with image.' });
    } catch (uploadError) {
      setBanner({
        type: 'error',
        message: uploadError?.message || 'Product created but image upload failed.'
      });
      throw uploadError;
    }

    return createdProduct;
  };

  const handleUpdate = async (values) => {
    if (!editingProduct) {
      return;
    }

    const { imageFile, ...productValues } = values;

    try {
      const payload = normalizeProductPayload(productValues);
      await updateMutation.mutateAsync({ productId: editingProduct.id, payload });
      if (imageFile) {
        await uploadMediaMutation.mutateAsync({ productId: editingProduct.id, file: imageFile });
      }
      setBanner({
        type: 'success',
        message: imageFile ? 'Product updated successfully with new image.' : 'Product updated successfully.'
      });
      setEditingProduct(null);
      setFormMode('create');
      setShowForm(false);
    } catch (mutationError) {
      setBanner({ type: 'error', message: mutationError?.message || 'Failed to update product.' });
      throw mutationError;
    }
  };

  const handleArchive = async (productId) => {
    try {
      await archiveMutation.mutateAsync(productId);
      setBanner({ type: 'success', message: 'Product deleted successfully.' });
    } catch (mutationError) {
      setBanner({ type: 'error', message: mutationError?.message || 'Failed to archive product.' });
    }
  };

  const handleEditSelection = (product) => {
    setEditingProduct(product);
    setFormMode('edit');
    setActiveSection('products');
    setShowForm(true);
    setFocusMediaManager(false);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setFormMode('create');
    setShowForm(false);
    setFocusMediaManager(false);
  };

  const handleStartCreate = () => {
    setEditingProduct(null);
    setFormMode('create');
    setShowForm(true);
    setActiveSection('products');
    setFocusMediaManager(false);
  };

  const handleManageMedia = (product) => {
    setEditingProduct(product);
    setFormMode('edit');
    setActiveSection('products');
    setShowForm(false);
    setFocusMediaManager(true);
  };

  const activeMutation = createMutation.isPending || updateMutation.isPending || uploadMediaMutation.isPending;

  return (
    <div className="stack">
      <nav id="admin-menu" className="card inline" style={{ justifyContent: 'flex-start', gap: '0.75rem' }}>
        <button
          id="dashboard-menu"
          className={`button secondary${activeSection === 'dashboard' ? '' : ' muted'}`}
          type="button"
          onClick={handleShowDashboard}
        >
          Dashboard
        </button>
        <button
          id="products-menu"
          className={`button secondary${activeSection === 'products' ? '' : ' muted'}`}
          type="button"
          onClick={handleShowProducts}
        >
          Products
        </button>
        <button
          id="categories-menu"
          className={`button secondary${activeSection === 'categories' ? '' : ' muted'}`}
          type="button"
          onClick={handleShowCategories}
        >
          Categories
        </button>
        <button id="inventory-menu" className="button secondary muted" type="button" disabled>
          Inventory
        </button>
        <button id="settings-menu" className="button secondary muted" type="button" disabled>
          Settings
        </button>
        <button id="audit-trail-menu" className="button secondary muted" type="button" disabled>
          Audit Trail
        </button>
        <button id="admin-accounts-link" className="button secondary muted" type="button" disabled>
          Admin Accounts
        </button>
      </nav>

      {activeSection === 'dashboard' && (
        <>
          <section className="card" id="system-dashboard">
            <h2>System Overview</h2>
            <div className="helper">Monitor kiosk status and preview the live feed below.</div>
          </section>
          <KioskPreview />
        </>
      )}

      {activeSection === 'products' && (
        <section className="card">
        <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2>Product Catalog</h2>
            <p className="helper">Manage snacks, pricing, stock levels, and publication status.</p>
          </div>
          <div className="inline">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
              />
              Include archived
            </label>
            <input
              type="search"
              placeholder="Search by name or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            />
          </div>
        </div>
        {banner.message && (
          <div
            id={banner.type === 'error' ? 'error-message' : 'success-message'}
            className={`alert ${banner.type === 'error' ? 'error error-message' : 'success success-message'}`}
          >
            <span>{banner.message}</span>
            <button className="button secondary" type="button" onClick={() => setBanner(initialBanner)}>
              Dismiss
            </button>
          </div>
        )}
        {error && (
          <div className="alert error">
            <span>{error.message || 'Failed to load products.'}</span>
          </div>
        )}
          <div className="inline" style={{ marginBottom: '1rem' }}>
            <button id="add-product-button" className="button" type="button" onClick={handleStartCreate}>
              Add New Product
            </button>
          </div>
        <ProductTable
          products={products}
          meta={meta}
          isLoading={isLoading}
          isFetching={isFetching}
          onEdit={handleEditSelection}
          onArchive={handleArchive}
          archivePendingId={archiveMutation.variables}
          archivePending={archiveMutation.isPending}
          onManageMedia={handleManageMedia}
        />
        </section>
      )}

      {activeSection === 'products' && showForm && (
        <section className="card">
          <div className="inline" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2>{formMode === 'create' ? 'Create Product' : 'Edit Product'}</h2>
              <p className="helper">
                {formMode === 'create'
                  ? 'Add a new product to the kiosk catalog. Images may be uploaded after creation.'
                  : 'Update product details. Changes take effect immediately for kiosk clients.'}
              </p>
            </div>
            {formMode === 'edit' && (
              <button className="button secondary" type="button" onClick={handleCancelEdit}>
                Cancel edit
              </button>
            )}
          </div>
          <ProductForm
            key={editingProduct?.id ?? 'product-create'}
            initialValues={productToFormState(formMode === 'edit' ? editingProduct : null)}
            mode={formMode}
            onSubmit={formMode === 'create' ? handleCreate : handleUpdate}
            isSubmitting={activeMutation}
            submitLabel={formMode === 'create' ? 'Save Product' : 'Save Changes'}
            categories={categories}
            categoriesLoading={categoriesLoading}
            categoriesError={categoriesError}
          />
          {createMutation.isError && (
            <div className="alert error" style={{ marginTop: '1rem' }}>
              <span>{createMutation.error?.message || 'Unable to create product.'}</span>
            </div>
          )}
          {updateMutation.isError && (
            <div className="alert error" style={{ marginTop: '1rem' }}>
              <span>{updateMutation.error?.message || 'Unable to update product.'}</span>
            </div>
          )}
        </section>
      )}

      {activeSection === 'products' && formMode === 'edit' && editingProduct && (
        <ProductMediaManager
          productId={editingProduct.id}
          productName={editingProduct.name}
          token={auth.token}
          ref={mediaManagerRef}
        />
      )}

      {activeSection === 'categories' && (
        <CategoryManager
          categories={categories}
          isLoading={categoriesLoading}
          error={categoriesError}
          onCreate={createCategoryMutation.mutateAsync}
          onUpdate={updateCategoryMutation.mutateAsync}
          onDelete={deleteCategoryMutation.mutateAsync}
          isCreating={createCategoryMutation.isPending}
          isUpdating={updateCategoryMutation.isPending}
          isDeleting={deleteCategoryMutation.isPending}
          deletePendingId={deleteCategoryMutation.variables?.id ?? null}
        />
      )}
    </div>
  );
};

export default ProductManager;
