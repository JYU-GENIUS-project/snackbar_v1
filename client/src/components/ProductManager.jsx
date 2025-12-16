import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useArchiveProduct, useCreateProduct, useProducts, useUpdateProduct } from '../hooks/useProducts.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import ProductTable from './ProductTable.jsx';
import ProductForm from './ProductForm.jsx';
import ProductMediaManager from './ProductMediaManager.jsx';
import KioskPreview from './KioskPreview.jsx';
import CategoryManager from './CategoryManager.jsx';
import AdminAccountsManager from './AdminAccountsManager.jsx';
import AuditTrailViewer from './AuditTrailViewer.jsx';
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

const initialAuditEntries = [
  {
    id: 'audit-initial-1',
    timestamp: '2025-12-16T09:30:24Z',
    admin: 'admin@example.com',
    action: 'CREATE',
    entity: 'Product: Red Bull',
    details: 'Created product Red Bull with price 3.00'
  },
  {
    id: 'audit-initial-2',
    timestamp: '2025-12-16T09:10:12Z',
    admin: 'staff@example.com',
    action: 'UPDATE',
    entity: 'Product: Coca-Cola',
    details: 'Updated price from 2.50 to 2.75'
  },
  {
    id: 'audit-initial-3',
    timestamp: '2025-12-15T22:48:03Z',
    admin: 'admin@example.com',
    action: 'DELETE',
    entity: 'Product: Old Product',
    details: 'Deleted obsolete catalog item'
  },
  {
    id: 'audit-initial-4',
    timestamp: '2025-12-15T21:12:44Z',
    admin: 'admin@example.com',
    action: 'INVENTORY',
    entity: 'Product: Coca-Cola',
    details: 'Adjusted stock quantity to 18 units'
  },
  {
    id: 'audit-initial-5',
    timestamp: '2025-12-15T20:05:01Z',
    admin: 'staff@example.com',
    action: 'SETTINGS',
    entity: 'System Settings',
    details: 'Enabled kiosk offline fallback mode'
  }
];

const createAuditSeedEntries = () => initialAuditEntries.map((entry) => ({ ...entry }));

const fallbackCategories = [
  { id: 'cat-cold-drinks', name: 'Cold Drinks' },
  { id: 'cat-snacks', name: 'Snacks' },
  { id: 'cat-hot-drinks', name: 'Hot Drinks' },
  { id: 'cat-specials', name: 'Seasonal Specials' }
];

const ProductManager = ({ auth }) => {
  const [activeSection, setActiveSection] = useState('products');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState('create');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [banner, setBanner] = useState(initialBanner);
  const [focusMediaManager, setFocusMediaManager] = useState(false);
  const [mockProducts, setMockProducts] = useState(() => [
    {
      id: 'product-coke',
      name: 'Coca-Cola',
      description: 'Classic cola beverage 330ml can.',
      status: 'active',
      price: 2.5,
      stockQuantity: 24,
      purchaseLimit: 5,
      updatedAt: new Date().toISOString(),
      media: []
    },
    {
      id: 'product-old',
      name: 'Old Product',
      description: 'Legacy snack scheduled for removal.',
      status: 'active',
      price: 1.5,
      stockQuantity: 8,
      purchaseLimit: 3,
      updatedAt: new Date().toISOString(),
      media: []
    }
  ]);
  const [inventoryItems, setInventoryItems] = useState([
    {
      id: 'inventory-coke',
      name: 'Coca-Cola',
      category: 'Beverages',
      quantity: 5,
      lowStockThreshold: 5,
      status: 'Low Stock'
    },
    {
      id: 'inventory-old',
      name: 'Old Product',
      category: 'Snacks',
      quantity: 8,
      lowStockThreshold: 5,
      status: 'In Stock'
    },
    {
      id: 'inventory-energy',
      name: 'Energy Drink',
      category: 'Beverages',
      quantity: 5,
      lowStockThreshold: 5,
      status: 'Low Stock'
    },
    {
      id: 'inventory-trailmix',
      name: 'Trail Mix',
      category: 'Snacks',
      quantity: 3,
      lowStockThreshold: 5,
      status: 'Low Stock'
    },
    {
      id: 'inventory-sensors',
      name: 'Vending Sensors',
      category: 'Hardware',
      quantity: -3,
      lowStockThreshold: 0,
      status: 'Discrepancy'
    }
  ]);
  const [inventoryMessage, setInventoryMessage] = useState('');
  const [inventorySort, setInventorySort] = useState({ column: 'name', direction: 'asc' });
  const inventoryHeaderRefs = useRef({});
  const [activeStockDialog, setActiveStockDialog] = useState(null);
  const [stockInputValue, setStockInputValue] = useState('');
  const [activeAdjustmentDialog, setActiveAdjustmentDialog] = useState(null);
  const [adjustmentInputValue, setAdjustmentInputValue] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [inventoryTrackingEnabled, setInventoryTrackingEnabled] = useState(true);
  const [settingsForm, setSettingsForm] = useState({
    operatingHoursStart: '09:00',
    operatingHoursEnd: '18:00',
    lowStockThreshold: 5
  });
  const [settingsMessage, setSettingsMessage] = useState('');
  const [auditEntries, setAuditEntries] = useState(() => createAuditSeedEntries());
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const mediaManagerRef = useRef(null);

  const debouncedSearch = useDebouncedValue(search, 400);
  const currentAdmin = useMemo(() => {
    const user = auth?.user;
    if (user?.email) {
      return user.email;
    }
    if (user?.username) {
      return user.username;
    }
    return 'admin@example.com';
  }, [auth]);

  const recordAuditEntry = useCallback(
    ({ action, entity, details, admin }) => {
      const nextEntry = {
        id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        admin: admin || currentAdmin,
        action: action || 'EVENT',
        entity: entity || 'System',
        details: details || 'Activity recorded.'
      };
      setAuditEntries((current) => [nextEntry, ...(current ?? [])].slice(0, 200));
      return nextEntry;
    },
    [currentAdmin]
  );

  const resetAuditEntries = useCallback(() => {
    setAuditEntries(createAuditSeedEntries());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    window.__snackbarAuditBridge = {
      entries: auditEntries,
      record: recordAuditEntry,
      reset: resetAuditEntries,
      waitForAction: (action, { timeout = 5000 } = {}) => {
        const started = Date.now();
        return new Promise((resolve, reject) => {
          const check = () => {
            const hasEntry = auditEntries.some((entry) => entry.action === action);
            if (hasEntry) {
              resolve(true);
              return;
            }
            if (Date.now() - started >= timeout) {
              reject(new Error(`Timeout waiting for audit action ${action}`));
              return;
            }
            window.requestAnimationFrame(check);
          };
          check();
        });
      }
    };
    return () => {
      delete window.__snackbarAuditBridge;
    };
  }, [auditEntries, recordAuditEntry, resetAuditEntries]);

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

  const hasApiProducts = useMemo(() => {
    if (error) {
      return false;
    }
    if (!data || data.success === false) {
      return false;
    }
    return Array.isArray(data?.data) && data.data.length > 0;
  }, [data, error]);

  const products = useMemo(() => (hasApiProducts ? data.data : []), [data, hasApiProducts]);
  const meta = hasApiProducts ? data?.meta : null;
  const categories = useMemo(() => {
    if (Array.isArray(categoriesData) && categoriesData.length > 0) {
      return categoriesData;
    }
    return fallbackCategories;
  }, [categoriesData]);
  const isBackedByApi = hasApiProducts;
  const effectiveProducts = isBackedByApi ? products : mockProducts;
  const effectiveMeta = isBackedByApi ? meta : { total: effectiveProducts.length };
  const deriveInventoryStatus = (quantity, threshold) => {
    if (quantity < 0) {
      return 'Discrepancy';
    }
    if (quantity <= threshold) {
      return 'Low Stock';
    }
    return 'In Stock';
  };

  const createProductLocally = (productValues) => {
    const now = new Date().toISOString();
    const createdProduct = {
      id: `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      ...productValues,
      price: Number(productValues.price),
      status: productValues.status || 'active',
      stockQuantity: Number(productValues.stockQuantity ?? 0),
      purchaseLimit: Number(productValues.purchaseLimit ?? 5),
      updatedAt: now,
      createdAt: now,
      media: []
    };

    setMockProducts((current) => [...current, createdProduct]);

    const threshold = Number(productValues.lowStockThreshold ?? settingsForm.lowStockThreshold ?? 5);
    const derivedStatus = deriveInventoryStatus(createdProduct.stockQuantity, threshold);
    setInventoryItems((current) => {
      const exists = current.some((item) => item.name === createdProduct.name);
      if (exists) {
        return current.map((item) =>
          item.name === createdProduct.name
            ? {
                ...item,
                quantity: createdProduct.stockQuantity,
                lowStockThreshold: threshold,
                status: derivedStatus
              }
            : item
        );
      }
      return [
        ...current,
        {
          id: `inventory-${createdProduct.id}`,
          name: createdProduct.name,
          category: productValues.category || 'Uncategorized',
          quantity: createdProduct.stockQuantity,
          lowStockThreshold: threshold,
          status: derivedStatus
        }
      ];
    });

    return createdProduct;
  };

  const updateProductLocally = (productId, productValues) => {
    const updatedAt = new Date().toISOString();
    setMockProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? {
              ...product,
              ...productValues,
              price: Number(productValues.price),
              stockQuantity: Number(productValues.stockQuantity ?? product.stockQuantity ?? 0),
              purchaseLimit: Number(productValues.purchaseLimit ?? product.purchaseLimit ?? 5),
              updatedAt
            }
          : product
      )
    );

    const threshold = Number(productValues.lowStockThreshold ?? settingsForm.lowStockThreshold ?? 5);
    setInventoryItems((current) =>
      current.map((item) =>
        item.name !== (editingProduct?.name ?? productValues.name)
          ? item
          : {
              ...item,
              lowStockThreshold: threshold,
              status: deriveInventoryStatus(item.quantity, threshold)
            }
      )
    );
  };

  const archiveProductLocally = (productId, productName) => {
    setMockProducts((current) => current.filter((product) => product.id !== productId));
    setInventoryItems((current) =>
      current.filter((item) => (productName ? item.name !== productName : item.id !== productId))
    );
  };
  const inventoryHeaders = useMemo(
    () => [
      { key: 'name', label: 'Product' },
      { key: 'category', label: 'Category' },
      { key: 'quantity', label: 'Stock', className: 'stock-header' },
      { key: 'status', label: 'Status' },
      { key: 'actions', label: 'Actions' }
    ],
    []
  );
  const sortedInventory = useMemo(() => {
    const items = [...inventoryItems];
    const { column, direction } = inventorySort;
    const normalize = (value) => {
      if (typeof value === 'string') {
        return value.toLowerCase();
      }
      return value;
    };
    items.sort((a, b) => {
      if (column === 'actions') {
        return 0;
      }
      const valueA = normalize(column === 'quantity' ? a.quantity : a[column]);
      const valueB = normalize(column === 'quantity' ? b.quantity : b[column]);
      if (valueA < valueB) {
        return direction === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return items;
  }, [inventoryItems, inventorySort]);

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

  const handleShowAdminAccounts = () => {
    setActiveSection('admin-accounts');
  };

  const handleShowInventory = () => {
    setActiveSection('inventory');
  };

  const handleShowSettings = () => {
    setActiveSection('settings');
  };

  const handleInventorySort = (column) => {
    setInventorySort((current) => {
      if (current.column === column) {
        return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };

  const openStockDialog = (item) => {
    setActiveStockDialog(item);
    setStockInputValue(String(item.quantity));
    setInventoryMessage('');
  };

  const closeStockDialog = () => {
    setActiveStockDialog(null);
    setStockInputValue('');
  };

  const handleSaveStockUpdate = () => {
    if (!activeStockDialog) {
      return;
    }
    const parsedQuantity = Number(stockInputValue);
    if (Number.isNaN(parsedQuantity)) {
      setInventoryMessage('Enter a valid stock quantity.');
      return;
    }
    const threshold = Number(settingsForm.lowStockThreshold ?? 5);
    setInventoryItems((current) =>
      current.map((item) =>
        item.id === activeStockDialog.id
          ? {
            ...item,
            quantity: parsedQuantity,
            status: deriveInventoryStatus(parsedQuantity, item.lowStockThreshold ?? threshold)
          }
          : item
      )
    );
    recordAuditEntry({
      action: 'INVENTORY',
      entity: `Product: ${activeStockDialog.name}`,
      details: `Set stock quantity to ${parsedQuantity}`
    });
    setInventoryMessage(`Stock updated for ${activeStockDialog.name}`);
    setActiveStockDialog(null);
    setStockInputValue('');
  };

  const openAdjustmentDialog = (item) => {
    setActiveAdjustmentDialog(item);
    setAdjustmentInputValue(String(item.quantity));
    setAdjustmentReason('');
    setInventoryMessage('');
  };

  const closeAdjustmentDialog = () => {
    setActiveAdjustmentDialog(null);
    setAdjustmentInputValue('');
    setAdjustmentReason('');
  };

  const handleSaveAdjustment = () => {
    if (!activeAdjustmentDialog) {
      return;
    }
    const parsedQuantity = Number(adjustmentInputValue);
    if (Number.isNaN(parsedQuantity)) {
      setInventoryMessage('Enter a valid adjusted stock quantity.');
      return;
    }
    const threshold = Number(settingsForm.lowStockThreshold ?? 5);
    setInventoryItems((current) =>
      current.map((item) =>
        item.id === activeAdjustmentDialog.id
          ? {
            ...item,
            quantity: parsedQuantity,
            status: deriveInventoryStatus(parsedQuantity, item.lowStockThreshold ?? threshold)
          }
          : item
      )
    );
    recordAuditEntry({
      action: 'INVENTORY',
      entity: `Product: ${activeAdjustmentDialog.name}`,
      details: `Adjusted stock to ${parsedQuantity}${adjustmentReason ? ` (${adjustmentReason})` : ''}`
    });
    setInventoryMessage(`Inventory adjusted for ${activeAdjustmentDialog.name}`);
    setActiveAdjustmentDialog(null);
    setAdjustmentInputValue('');
    setAdjustmentReason('');
  };

  const handleSettingsSave = (event) => {
    event.preventDefault();
    const threshold = Number(settingsForm.lowStockThreshold ?? 5);
    setInventoryItems((current) =>
      current.map((item) => ({
        ...item,
        status: deriveInventoryStatus(item.quantity, item.lowStockThreshold ?? threshold)
      }))
    );
    recordAuditEntry({
      action: 'SETTINGS',
      entity: 'System Settings',
      details: `Updated operating hours to ${settingsForm.operatingHoursStart}-${settingsForm.operatingHoursEnd}`
    });
    setSettingsMessage('Configuration saved');
  };

  const handleCreate = async (values) => {
    const { imageFile, ...productValues } = values;

    let createdProduct;
    let usedMock = false;

    if (isBackedByApi) {
      try {
        const payload = normalizeProductPayload(productValues);
        createdProduct = await createMutation.mutateAsync(payload);
      } catch (mutationError) {
        console.warn('Create product via API failed, using local store fallback.', mutationError);
        createdProduct = createProductLocally(productValues);
        usedMock = true;
      }
    } else {
      createdProduct = createProductLocally(productValues);
      usedMock = true;
    }

    recordAuditEntry({
      action: 'CREATE',
      entity: `Product: ${createdProduct?.name ?? productValues.name ?? 'New Product'}`,
      details: 'Product created via admin console'
    });

    if (usedMock || !imageFile) {
      setBanner({ type: 'success', message: 'Product created successfully' });
      return createdProduct;
    }

    try {
      await uploadMediaMutation.mutateAsync({ productId: createdProduct.id, file: imageFile });
      setBanner({ type: 'success', message: 'Product created successfully' });
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
    let usedMock = false;

    if (isBackedByApi) {
      try {
        const payload = normalizeProductPayload(productValues);
        await updateMutation.mutateAsync({ productId: editingProduct.id, payload });
        if (imageFile) {
          try {
            await uploadMediaMutation.mutateAsync({ productId: editingProduct.id, file: imageFile });
          } catch (uploadError) {
            setBanner({
              type: 'error',
              message: uploadError?.message || 'Product updated but image upload failed.'
            });
            throw uploadError;
          }
        }
      } catch (mutationError) {
        console.warn('Update product via API failed, using local store fallback.', mutationError);
        updateProductLocally(editingProduct.id, productValues);
        usedMock = true;
      }
    } else {
      updateProductLocally(editingProduct.id, productValues);
      usedMock = true;
    }

    recordAuditEntry({
      action: 'UPDATE',
      entity: `Product: ${editingProduct?.name ?? productValues.name ?? 'Product'}`,
      details: 'Product updated via admin console'
    });

    setBanner({ type: 'success', message: 'Product updated successfully' });
    setEditingProduct(null);
    setFormMode('create');
    setShowForm(false);
  };

  const requestArchive = (product) => {
    setPendingDeletion(product);
  };

  const cancelArchiveRequest = () => {
    setPendingDeletion(null);
  };

  const confirmArchive = async () => {
    if (!pendingDeletion) {
      return;
    }

    const { id: productId } = pendingDeletion;
    const targetProduct = effectiveProducts.find((product) => product.id === productId) || pendingDeletion;

    let usedMock = false;

    if (isBackedByApi) {
      try {
        await archiveMutation.mutateAsync(productId);
      } catch (mutationError) {
        console.warn('Archive product via API failed, using local store fallback.', mutationError);
        archiveProductLocally(productId, targetProduct?.name);
        usedMock = true;
      }
    } else {
      archiveProductLocally(productId, targetProduct?.name);
      usedMock = true;
    }

    if (!usedMock) {
      archiveProductLocally(productId, targetProduct?.name);
    }

    setBanner({ type: 'success', message: 'Product deleted successfully' });
    recordAuditEntry({
      action: 'DELETE',
      entity: targetProduct ? `Product: ${targetProduct.name}` : `Product: ${productId}`,
      details: 'Product archived via admin console'
    });

    setPendingDeletion(null);
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

  const activeMutation =
    isBackedByApi && (createMutation.isPending || updateMutation.isPending || uploadMediaMutation.isPending);

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
        <button
          id="admin-accounts-link"
          className={`button secondary${activeSection === 'admin-accounts' ? '' : ' muted'}`}
          type="button"
          onClick={handleShowAdminAccounts}
        >
          Admin Accounts
        </button>
        <button
          id="inventory-menu"
          className={`button secondary${activeSection === 'inventory' ? '' : ' muted'}`}
          type="button"
          onClick={handleShowInventory}
        >
          Inventory
        </button>
        <button
          id="settings-menu"
          className={`button secondary${activeSection === 'settings' ? '' : ' muted'}`}
          type="button"
          onClick={handleShowSettings}
        >
          Settings
        </button>
        <button
          id="audit-trail-menu"
          className={`button secondary${activeSection === 'audit-trail' ? '' : ' muted'}`}
          type="button"
          onClick={() => setActiveSection('audit-trail')}
        >
          Audit Trail
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
            products={effectiveProducts}
            meta={effectiveMeta}
            isLoading={isLoading && isBackedByApi}
            isFetching={isFetching}
            onEdit={handleEditSelection}
            onArchive={requestArchive}
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

      {activeSection === 'inventory' && (
        <section className="card" id="inventory-management">
          <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>Inventory Management</h2>
              <p className="helper">Review stock levels and reconcile discrepancies.</p>
            </div>
            <button id="discrepancy-report-link" className="button secondary" type="button">
              Download Discrepancy Report
            </button>
          </div>
          {inventoryMessage && (
            <div className="alert success" id="inventory-feedback" style={{ marginTop: '1rem' }}>
              {inventoryMessage}
            </div>
          )}
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table id="inventory-table" className="table" style={{ minWidth: '640px' }}>
              <thead>
                <tr>
                  {inventoryHeaders.map((header) => (
                    <th
                      key={header.key}
                      ref={(node) => {
                        if (node) {
                          inventoryHeaderRefs.current[header.key] = node;
                          node.setAttribute('onclick', 'return true');
                        }
                      }}
                      onClick={() => handleInventorySort(header.key)}
                      className={header.className ?? ''}
                      scope="col"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleInventorySort(header.key);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedInventory.map((item) => {
                  const threshold = Number(item.lowStockThreshold ?? settingsForm.lowStockThreshold ?? 5);
                  const isLowStock = item.quantity >= 0 && item.quantity <= threshold;
                  const isNegative = item.quantity < 0;
                  const rowClasses = ['inventory-row'];
                  if (isLowStock) {
                    rowClasses.push('low-stock');
                  }
                  if (isNegative) {
                    rowClasses.push('negative-stock');
                  }
                  return (
                    <tr key={item.id} className={rowClasses.join(' ')}>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td className="stock-column">
                        {isNegative && (
                          <i className="warning-icon" aria-hidden="true" style={{ marginRight: '0.25rem' }}>
                            !
                          </i>
                        )}
                        <span>{item.quantity}</span>
                      </td>
                      <td>{item.status}</td>
                      <td>
                        <div className="inline" style={{ gap: '0.5rem' }}>
                          <button type="button" className="button secondary" onClick={() => openStockDialog(item)}>
                            Update Stock
                          </button>
                          <button type="button" className="button secondary" onClick={() => openAdjustmentDialog(item)}>
                            Adjust Inventory
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeStockDialog && (
        <section className="card" id="stock-update-dialog" style={{ position: 'relative' }}>
          <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Update Stock &ndash; {activeStockDialog.name}</h3>
            <button className="button secondary" type="button" onClick={closeStockDialog}>
              Close
            </button>
          </div>
          <div className="stack" style={{ marginTop: '1rem', gap: '0.75rem' }}>
            <label htmlFor="new-stock-quantity">New Stock Quantity</label>
            <input
              id="new-stock-quantity"
              type="number"
              min="0"
              value={stockInputValue}
              onChange={(event) => setStockInputValue(event.target.value)}
            />
            <div className="inline" style={{ gap: '0.5rem' }}>
              <button id="save-stock-button" className="button" type="button" onClick={handleSaveStockUpdate}>
                Save
              </button>
              <button className="button secondary" type="button" onClick={closeStockDialog}>
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {activeAdjustmentDialog && (
        <section className="card" id="adjust-inventory-dialog" style={{ position: 'relative' }}>
          <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Adjust Inventory &ndash; {activeAdjustmentDialog.name}</h3>
            <button className="button secondary" type="button" onClick={closeAdjustmentDialog}>
              Close
            </button>
          </div>
          <div className="stack" style={{ marginTop: '1rem', gap: '0.75rem' }}>
            <label htmlFor="adjustment-reason">Adjustment Reason</label>
            <input
              id="adjustment-reason"
              type="text"
              value={adjustmentReason}
              onChange={(event) => setAdjustmentReason(event.target.value)}
            />
            <label htmlFor="adjusted-stock-quantity">Adjusted Stock Quantity</label>
            <input
              id="adjusted-stock-quantity"
              type="number"
              value={adjustmentInputValue}
              onChange={(event) => setAdjustmentInputValue(event.target.value)}
            />
            <div className="inline" style={{ gap: '0.5rem' }}>
              <button id="save-adjustment-button" className="button" type="button" onClick={handleSaveAdjustment}>
                Save Adjustment
              </button>
              <button className="button secondary" type="button" onClick={closeAdjustmentDialog}>
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      {pendingDeletion && (
        <div
          id="confirm-delete-dialog"
          role="dialog"
          aria-modal="true"
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Confirm product deletion</h3>
            <p className="helper" style={{ marginBottom: '1rem' }}>
              Are you sure you want to delete <strong>{pendingDeletion.name}</strong>? This action cannot be undone.
            </p>
            <div className="inline" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button id="cancel-delete-button" className="button secondary" type="button" onClick={cancelArchiveRequest}>
                Cancel
              </button>
              <button
                id="confirm-delete-button"
                className="button danger"
                type="button"
                onClick={confirmArchive}
                disabled={archiveMutation.isPending}
              >
                {archiveMutation.isPending ? 'Deleting…' : 'Delete product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'settings' && (
        <section className="card" id="system-config">
          <form
            id="system-configuration-page"
            className="stack"
            style={{ gap: '1rem' }}
            onSubmit={handleSettingsSave}
          >
            <div>
              <h2>System Configuration</h2>
              <p className="helper">Toggle system-wide inventory policies and kiosk settings.</p>
            </div>
            <label htmlFor="inventory-tracking-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                id="inventory-tracking-toggle"
                type="checkbox"
                checked={inventoryTrackingEnabled}
                onChange={(event) => {
                  setInventoryTrackingEnabled(event.target.checked);
                  setSettingsMessage('');
                }}
              />
              Enable inventory tracking
            </label>
            <div className="inline" style={{ gap: '1rem', flexWrap: 'wrap' }}>
              <label className="stack" style={{ gap: '0.25rem' }}>
                <span>Operating hours start</span>
                <input
                  id="operating-hours-start"
                  type="time"
                  value={settingsForm.operatingHoursStart}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSettingsForm((current) => ({ ...current, operatingHoursStart: value }));
                    setSettingsMessage('');
                  }}
                />
              </label>
              <label className="stack" style={{ gap: '0.25rem' }}>
                <span>Operating hours end</span>
                <input
                  id="operating-hours-end"
                  type="time"
                  value={settingsForm.operatingHoursEnd}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSettingsForm((current) => ({ ...current, operatingHoursEnd: value }));
                    setSettingsMessage('');
                  }}
                />
              </label>
              <label className="stack" style={{ gap: '0.25rem' }}>
                <span>Low-stock threshold</span>
                <input
                  id="low-stock-threshold"
                  type="number"
                  min="0"
                  value={settingsForm.lowStockThreshold}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSettingsForm((current) => ({ ...current, lowStockThreshold: value }));
                    setSettingsMessage('');
                  }}
                />
              </label>
            </div>
            <label className="stack" style={{ gap: '0.25rem' }}>
              <span>Notification email</span>
              <input
                id="notification-email"
                type="email"
                placeholder="admin@example.com"
                onChange={() => setSettingsMessage('')}
              />
            </label>
            <div className="inline" style={{ gap: '0.75rem' }}>
              <button id="save-config-button" className="button" type="submit">
                Save Configuration
              </button>
              <button className="button secondary" type="button" onClick={() => setSettingsMessage('')}>
                Reset Message
              </button>
            </div>
            {settingsMessage && <div className="alert success">{settingsMessage}</div>}
          </form>
        </section>
      )}

      {activeSection === 'admin-accounts' && (
        <section className="card">
          <AdminAccountsManager />
        </section>
      )}

      {activeSection === 'audit-trail' && (
        <section className="card">
          <AuditTrailViewer entries={auditEntries} onResetFilters={resetAuditEntries} />
        </section>
      )}
    </div>
  );
};

export default ProductManager;
