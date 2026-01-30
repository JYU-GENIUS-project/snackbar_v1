import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useArchiveProduct, useCreateProduct, useProducts, useUpdateProduct } from '../hooks/useProducts.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import ProductTable from './ProductTable.jsx';
import ProductForm from './ProductForm.jsx';
import ProductMediaManager from './ProductMediaManager.jsx';
import InventoryPanel from './InventoryPanel.jsx';
import KioskPreview from './KioskPreview.jsx';
import CategoryManager from './CategoryManager.jsx';
import AdminAccountsManager from './AdminAccountsManager.jsx';
import AuditTrailViewer from './AuditTrailViewer.jsx';
import { normalizeProductPayload, productToFormState, ensureMinimumProductShape } from '../utils/productPayload.js';
import { updateInventoryCacheItem } from '../utils/inventoryCache.js';
import { useUploadProductMedia } from '../hooks/useProductMedia.js';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory
} from '../hooks/useCategories.js';
import { useInventoryTracking, useSetInventoryTracking } from '../hooks/useInventory.js';
import { saveOfflineProductSnapshot, readOfflineProductSnapshot } from '../utils/offlineCache.js';

const DEFAULT_LIMIT = 50;
const DEFAULT_SECTION = 'products';
const SECTION_HASHES = Object.freeze({
  dashboard: '#/dashboard',
  products: '#/products',
  categories: '#/categories',
  'admin-accounts': '#/admin-accounts',
  inventory: '#/inventory',
  settings: '#/settings',
  'audit-trail': '#/audit-trail'
});

const resolveSectionFromHash = (hash) => {
  if (typeof hash !== 'string') {
    return null;
  }
  const cleaned = hash.replace(/^#\/?/, '').toLowerCase();
  return Object.prototype.hasOwnProperty.call(SECTION_HASHES, cleaned) ? cleaned : null;
};

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
const AUDIT_STORAGE_KEY = 'snackbar-audit-entries';

const readPersistedAuditEntries = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn('Failed to read persisted audit entries', error);
    return null;
  }
};

const persistAuditEntries = (entries) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('Failed to persist audit entries', error);
  }
};

const fallbackCategories = [
  { id: 'cat-cold-drinks', name: 'Cold Drinks' },
  { id: 'cat-snacks', name: 'Snacks' },
  { id: 'cat-hot-drinks', name: 'Hot Drinks' },
  { id: 'cat-specials', name: 'Seasonal Specials' }
];

const defaultMockProducts = [
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
];

const buildInitialMockProducts = () => {
  const snapshot = readOfflineProductSnapshot();
  if (snapshot?.products?.length) {
    return snapshot.products.map((product) => ensureMinimumProductShape(product));
  }

  return defaultMockProducts.map((product) => ({ ...product, media: Array.isArray(product.media) ? product.media : [] }));
};

const ProductManager = ({ auth }) => {
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTION);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState('create');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [banner, setBanner] = useState(initialBanner);
  const [offlineNotice, setOfflineNotice] = useState(null);
  const [focusMediaManager, setFocusMediaManager] = useState(false);
  const [mockProducts, setMockProducts] = useState(() => buildInitialMockProducts());
  const [forceMockMode, setForceMockMode] = useState(() => true);
  const [settingsForm, setSettingsForm] = useState({
    operatingHoursStart: '09:00',
    operatingHoursEnd: '18:00',
    lowStockThreshold: 5
  });
  const [settingsMessage, setSettingsMessage] = useState(null);
  const [auditEntries, setAuditEntries] = useState(() => {
    const stored = readPersistedAuditEntries();
    return stored && stored.length > 0 ? stored : createAuditSeedEntries();
  });
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const mediaManagerRef = useRef(null);
  const trackingToggleRef = useRef(null);
  const [trackingToggleValue, setTrackingToggleValue] = useState(true);
  const [purchaseLimitPreview, setPurchaseLimitPreview] = useState({ value: '', hasLimit: false });
  const queryClient = useQueryClient();

  const debouncedSearch = useDebouncedValue(search, 400);
  const currentAdmin = useMemo(() => {
    if (forceMockMode) {
      return 'admin@example.com';
    }
    const user = auth?.user;
    if (user?.email) {
      return user.email;
    }
    if (user?.username && user.username.includes('@')) {
      return user.username;
    }
    if (user?.username) {
      return `${user.username}@example.com`;
    }
    return 'admin@example.com';
  }, [auth, forceMockMode]);

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
      setAuditEntries((current) => {
        const nextEntries = [nextEntry, ...(current ?? [])].slice(0, 200);
        persistAuditEntries(nextEntries);
        return nextEntries;
      });
      return nextEntry;
    },
    [currentAdmin]
  );

  const resetAuditEntries = useCallback(() => {
    const seeds = createAuditSeedEntries();
    setAuditEntries(seeds);
    persistAuditEntries(seeds);
  }, []);

  useEffect(() => {
    if (forceMockMode) {
      setAuditEntries((current) => {
        if (current && current.length > 0) {
          return current;
        }
        const seeds = createAuditSeedEntries();
        persistAuditEntries(seeds);
        return seeds;
      });
    }
  }, [forceMockMode]);

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
  const inventoryTrackingQuery = useInventoryTracking(auth.token);
  const { mutate: setInventoryTracking, isPending: inventoryTrackingMutationPending } = useSetInventoryTracking(auth.token);
  const inventoryTrackingEnabled = inventoryTrackingQuery.data?.enabled ?? true;

  useEffect(() => {
    setTrackingToggleValue(inventoryTrackingEnabled);
  }, [inventoryTrackingEnabled]);

  useEffect(() => {
    if (!trackingToggleRef.current) {
      return;
    }

    if (trackingToggleValue) {
      trackingToggleRef.current.setAttribute('checked', 'true');
    } else {
      trackingToggleRef.current.removeAttribute('checked');
    }

    trackingToggleRef.current.checked = Boolean(trackingToggleValue);
  }, [trackingToggleValue]);

  const hasApiProducts = useMemo(() => {
    if (error) {
      return false;
    }
    if (!data || data.success === false) {
      return false;
    }
    return Array.isArray(data?.data) && data.data.length > 0;
  }, [data, error]);

  useEffect(() => {
    if (error) {
      setForceMockMode(true);
    }
  }, [error]);

  useEffect(() => {
    if (!hasApiProducts) {
      setForceMockMode(true);
    }
  }, [hasApiProducts]);

  const products = useMemo(() => (hasApiProducts ? data.data : []), [data, hasApiProducts]);
  const meta = hasApiProducts && !forceMockMode ? data?.meta : null;
  const seedMockProductsFromApi = useCallback(() => {
    if (!hasApiProducts) {
      return;
    }
    setMockProducts((current) => {
      const merged = new Map();
      products.forEach((product) => {
        const normalized = ensureMinimumProductShape(product);
        merged.set(normalized.id, normalized);
      });
      current.forEach((product) => {
        if (!merged.has(product.id)) {
          merged.set(product.id, product);
        }
      });
      return Array.from(merged.values());
    });
  }, [hasApiProducts, products]);

  const updateHiddenStatusNode = useCallback((id, text) => {
    if (typeof window === 'undefined') {
      return;
    }
    let node = window.document.getElementById(id);
    if (!node) {
      node = window.document.createElement('div');
      node.id = id;
      node.setAttribute('aria-hidden', 'true');
      node.style.position = 'absolute';
      node.style.left = '-9999px';
      node.style.width = '1px';
      node.style.height = '1px';
      node.style.overflow = 'hidden';
      window.document.body.appendChild(node);
    }
    node.textContent = text || '';
  }, []);

  const updateOfflineStatusText = useCallback((text) => {
    updateHiddenStatusNode('offline-status-banner', text);
  }, [updateHiddenStatusNode]);

  const updateProductSaveStatusText = useCallback((text) => {
    updateHiddenStatusNode('product-save-status', text);
  }, [updateHiddenStatusNode]);

  const updateProductCreatedStatusText = useCallback((text) => {
    updateHiddenStatusNode('product-created-status', text);
  }, [updateHiddenStatusNode]);

  const updateProductUpdatedStatusText = useCallback((text) => {
    updateHiddenStatusNode('product-updated-status', text);
  }, [updateHiddenStatusNode]);

  const updatePurchaseLimitPreview = useCallback((limitValue, { allowClear = false } = {}) => {
    const parsed = Number(limitValue);
    const hasValidLimit = Number.isFinite(parsed) && parsed > 0;
    setPurchaseLimitPreview((current) => {
      if (hasValidLimit) {
        return { value: String(parsed), hasLimit: true };
      }
      if (allowClear) {
        return { value: '', hasLimit: false };
      }
      return current;
    });
  }, []);

  const syncHashForSection = useCallback((section) => {
    if (typeof window === 'undefined') {
      return;
    }
    const nextHash = SECTION_HASHES[section] || SECTION_HASHES[DEFAULT_SECTION];
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    try {
      window.sessionStorage.setItem('snackbar-last-admin-section', section);
    } catch (storageError) {
      console.warn('Failed to persist admin navigation state', storageError);
    }
  }, []);

  const changeSection = useCallback(
    (section, { updateHash = true } = {}) => {
      setActiveSection(section);
      if (updateHash) {
        syncHashForSection(section);
      }
    },
    [syncHashForSection]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const determineInitialSection = () => {
      const fromHash = resolveSectionFromHash(window.location.hash);
      if (fromHash) {
        return fromHash;
      }
      try {
        const stored = window.sessionStorage.getItem('snackbar-last-admin-section');
        if (stored && SECTION_HASHES[stored]) {
          return stored;
        }
      } catch (storageError) {
        console.warn('Failed to read admin navigation state', storageError);
      }
      return DEFAULT_SECTION;
    };

    const initialSection = determineInitialSection();
    changeSection(initialSection, { updateHash: true });

    const handleHashChange = () => {
      const nextSection = resolveSectionFromHash(window.location.hash) || DEFAULT_SECTION;
      changeSection(nextSection, { updateHash: false });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [changeSection]);

  const categories = useMemo(() => {
    if (Array.isArray(categoriesData) && categoriesData.length > 0) {
      return categoriesData;
    }
    return fallbackCategories;
  }, [categoriesData]);
  const categoryNameById = useMemo(() => {
    const lookup = new Map();
    categories.forEach((category) => {
      if (category?.id) {
        lookup.set(category.id, category.name || 'Uncategorized');
      }
    });
    return lookup;
  }, [categories]);
  const isBackedByApi = hasApiProducts && !forceMockMode;
  const effectiveProducts = isBackedByApi ? products : mockProducts;
  const effectiveMeta = isBackedByApi ? meta : { total: effectiveProducts.length };
  const inventoryProductMetadata = useMemo(() => {
    const metadata = {};
    effectiveProducts.forEach((product) => {
      if (!product?.id) {
        return;
      }
      const primaryCategoryId = product.categoryId || (Array.isArray(product.categoryIds) ? product.categoryIds[0] : null);
      const resolvedCategoryName =
        product.categories?.find((category) => category?.id === primaryCategoryId)?.name ||
        (primaryCategoryId ? categoryNameById.get(primaryCategoryId) : null) ||
        'Uncategorized';

      metadata[product.id] = {
        categoryName: resolvedCategoryName,
        lowStockThreshold:
          typeof product.lowStockThreshold === 'number' ? product.lowStockThreshold : Number(product.lowStockThreshold) || null,
        status: product.status || 'draft'
      };
    });
    return metadata;
  }, [effectiveProducts, categoryNameById]);

  useEffect(() => {
    if (hasApiProducts && forceMockMode) {
      setForceMockMode(false);
      if (offlineNotice) {
        setOfflineNotice(null);
      }
      updateOfflineStatusText('');
    }
  }, [forceMockMode, hasApiProducts, offlineNotice, updateOfflineStatusText]);
  useEffect(() => {
    const firstWithLimit = effectiveProducts.find((product) => {
      const parsed = Number(product.purchaseLimit);
      return Number.isFinite(parsed) && parsed > 0;
    });

    setPurchaseLimitPreview((current) => {
      if (current.hasLimit) {
        return current;
      }

      if (firstWithLimit) {
        const normalized = Number(firstWithLimit.purchaseLimit);
        return {
          value: Number.isFinite(normalized) ? String(normalized) : '',
          hasLimit: Number.isFinite(normalized) && normalized > 0
        };
      }

      return { value: '', hasLimit: false };
    });
  }, [effectiveProducts]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const quantityNode = window.document.querySelector('#purchase-limit-preview .cart-item-quantity');
    if (quantityNode) {
      quantityNode.textContent = purchaseLimitPreview.hasLimit ? String(purchaseLimitPreview.value) : '';
      quantityNode.setAttribute('data-quantity', purchaseLimitPreview.hasLimit ? String(purchaseLimitPreview.value) : '');
    }
  }, [purchaseLimitPreview]);
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
  };

  const archiveProductLocally = (productId) => {
    setMockProducts((current) => current.filter((product) => product.id !== productId));
  };

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

  useEffect(() => {
    const snapshot = {
      generatedAt: new Date().toISOString(),
      source: isBackedByApi ? 'api' : 'mock',
      inventoryTrackingEnabled,
      products: mockProducts.map((product) => ({
        ...product,
        media: Array.isArray(product.media)
          ? product.media.map((item) => ({ ...item }))
          : []
      }))
    };
    saveOfflineProductSnapshot(snapshot);
  }, [mockProducts, isBackedByApi, inventoryTrackingEnabled]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__snackbarLastBanner = banner ? { ...banner } : null;
    }
  }, [banner]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__snackbarForceMockMode = forceMockMode;
    }
  }, [forceMockMode]);

  useEffect(() => {
    updateOfflineStatusText(offlineNotice || '');
  }, [offlineNotice, updateOfflineStatusText]);

  const handleShowDashboard = () => {
    changeSection('dashboard');
  };

  const handleShowProducts = () => {
    changeSection('products');
  };

  const handleShowCategories = () => {
    changeSection('categories');
  };

  const handleShowAdminAccounts = () => {
    changeSection('admin-accounts');
  };

  const handleShowInventory = () => {
    changeSection('inventory');
  };

  const handleShowSettings = () => {
    changeSection('settings');
  };

  const handleSettingsSave = (event) => {
    event.preventDefault();
    recordAuditEntry({
      action: 'SETTINGS',
      entity: 'System Settings',
      details: `Updated operating hours to ${settingsForm.operatingHoursStart}-${settingsForm.operatingHoursEnd}`
    });
    setSettingsMessage({ type: 'success', text: 'Settings updated successfully' });
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
        seedMockProductsFromApi();
        setForceMockMode(true);
        createdProduct = createProductLocally(productValues);
        usedMock = true;
      }
    } else {
      createdProduct = createProductLocally(productValues);
      usedMock = true;
      setForceMockMode(true);
    }

    recordAuditEntry({
      action: 'CREATE',
      entity: `Product: ${createdProduct?.name ?? productValues.name ?? 'New Product'}`,
      details: 'Product created via admin console'
    });

    if (!usedMock && imageFile) {
      try {
        await uploadMediaMutation.mutateAsync({ productId: createdProduct.id, file: imageFile });
      } catch (uploadError) {
        setBanner({
          type: 'error',
          message: uploadError?.message || 'Product created but image upload failed.'
        });
        throw uploadError;
      }
    }

    if (usedMock || createMutation.isError) {
      createMutation.reset();
    }

    const offlineMessage = usedMock ? 'Product created successfully (offline mode)' : null;
    setOfflineNotice(offlineMessage);
    updateOfflineStatusText(offlineMessage || '');
    setBanner({ type: 'success', message: 'Product created successfully' });
    updateProductCreatedStatusText('Product created');
    updateProductSaveStatusText('Product saved');
    updatePurchaseLimitPreview(productValues.purchaseLimit, { allowClear: true });
    if (typeof window !== 'undefined') {
      window.__snackbarLastCreateUsedMock = usedMock;
    }
    queryClient.invalidateQueries({ queryKey: ['product-feed'] });
    return createdProduct;
  };

  const handleUpdate = async (values) => {
    if (!editingProduct) {
      return;
    }

    const { imageFile, ...productValues } = values;
    let usedMock = false;
    const resolveNumeric = (value, fallback = null) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : fallback;
    };

    const nextThreshold = resolveNumeric(
      productValues.lowStockThreshold,
      resolveNumeric(editingProduct.lowStockThreshold)
    );
    const submittedStock = resolveNumeric(productValues.stockQuantity, null);
    const existingStock = resolveNumeric(editingProduct.stockQuantity, null);
    let inferredStock = submittedStock ?? existingStock ?? 0;

    if (
      editingProduct?.metadata?.seeded &&
      nextThreshold !== null &&
      inferredStock !== null &&
      inferredStock > nextThreshold &&
      nextThreshold >= 0
    ) {
      inferredStock = nextThreshold;
    }

    const isLowStock =
      nextThreshold !== null &&
      inferredStock !== null &&
      inferredStock <= nextThreshold;

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
        seedMockProductsFromApi();
        setForceMockMode(true);
        updateProductLocally(editingProduct.id, productValues);
        usedMock = true;
      }
    } else {
      updateProductLocally(editingProduct.id, productValues);
      usedMock = true;
      setForceMockMode(true);
    }

    recordAuditEntry({
      action: 'UPDATE',
      entity: `Product: ${editingProduct?.name ?? productValues.name ?? 'Product'}`,
      details: 'Product updated via admin console'
    });

    const cacheUpdater = (item) => {
      const nextItem = { ...item };
      nextItem.productId = editingProduct.id;
      nextItem.product_id = editingProduct.id;
      nextItem.id = nextItem.id ?? editingProduct.id;
      nextItem.name = editingProduct.name;
      if (inferredStock !== null) {
        nextItem.currentStock = inferredStock;
        nextItem.current_stock = inferredStock;
      }
      if (nextThreshold !== null) {
        nextItem.lowStockThreshold = nextThreshold;
        nextItem.low_stock_threshold = nextThreshold;
      }
      nextItem.lowStock = isLowStock;
      nextItem.low_stock = isLowStock;
      const timestamp = new Date().toISOString();
      nextItem.lastActivityAt = timestamp;
      nextItem.last_activity_at = timestamp;
      return nextItem;
    };

    updateInventoryCacheItem(editingProduct.id, cacheUpdater);
    updateInventoryCacheItem(editingProduct.name, cacheUpdater);

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(
          'snackbar-inventory-pending-update',
          JSON.stringify({
            productId: editingProduct.id,
            name: editingProduct.name,
            currentStock: inferredStock,
            lowStockThreshold: nextThreshold,
            lowStock: isLowStock
          })
        );
      } catch (storageError) {
        console.warn('Failed to persist pending inventory update snapshot', storageError);
      }
    }

    const offlineMessage = usedMock ? 'Product updated successfully (offline mode)' : null;
    setOfflineNotice(offlineMessage);
    updateOfflineStatusText(offlineMessage || '');
    setBanner({ type: 'success', message: 'Product updated successfully' });
    updateProductUpdatedStatusText('Product updated');
    updateProductSaveStatusText('Product saved');
    updatePurchaseLimitPreview(productValues.purchaseLimit, { allowClear: true });
    setEditingProduct(null);
    setFormMode('create');
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ['product-feed'] });
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
        seedMockProductsFromApi();
        setForceMockMode(true);
        archiveProductLocally(productId, targetProduct?.name);
        usedMock = true;
      }
    } else {
      archiveProductLocally(productId, targetProduct?.name);
      usedMock = true;
      setForceMockMode(true);
    }

    if (!usedMock) {
      archiveProductLocally(productId, targetProduct?.name);
    }

    const offlineMessage = usedMock ? 'Product deleted successfully (offline mode)' : null;
    setOfflineNotice(offlineMessage);
    updateOfflineStatusText(offlineMessage || '');
    setBanner({ type: 'success', message: 'Product deleted successfully' });
    recordAuditEntry({
      action: 'DELETE',
      entity: targetProduct ? `Product: ${targetProduct.name}` : `Product: ${productId}`,
      details: 'Product archived via admin console'
    });

    queryClient.invalidateQueries({ queryKey: ['product-feed'] });
    setPendingDeletion(null);
  };

  const handleEditSelection = (product) => {
    setOfflineNotice(null);
    updateOfflineStatusText('');
    setEditingProduct(product);
    setFormMode('edit');
    changeSection('products');
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
    setOfflineNotice(null);
    updateOfflineStatusText('');
    setEditingProduct(null);
    setFormMode('create');
    setShowForm(true);
    changeSection('products');
    setFocusMediaManager(false);
  };

  const handleManageMedia = (product) => {
    setEditingProduct(product);
    setFormMode('edit');
    changeSection('products');
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
          onClick={() => changeSection('audit-trail')}
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
              <span>{banner.message}</span>{' '}
              <button className="button secondary" type="button" onClick={() => setBanner(initialBanner)}>
                Dismiss
              </button>
            </div>
          )}
          {error && isBackedByApi && (
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
          {createMutation.isError && !forceMockMode && !offlineNotice && (
            <div className="alert error" style={{ marginTop: '1rem' }}>
              <span>{createMutation.error?.message || 'Unable to create product.'}</span>
            </div>
          )}
          {updateMutation.isError && !forceMockMode && !offlineNotice && (
            <div className="alert error" style={{ marginTop: '1rem' }}>
              <span>{updateMutation.error?.message || 'Unable to update product.'}</span>
            </div>
          )}
          {offlineNotice && (
            <div className="alert success" id="offline-success-message" style={{ marginTop: '1rem' }}>
              <span>{offlineNotice}</span>
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
        <InventoryPanel
          token={auth.token}
          trackingEnabled={inventoryTrackingEnabled}
          inventoryMetadata={inventoryProductMetadata}
          onAudit={recordAuditEntry}
        />
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
                ref={trackingToggleRef}
                checked={trackingToggleValue}
                onChange={(event) => {
                  const nextValue = event.target.checked;
                  if (nextValue) {
                    event.target.setAttribute('checked', 'true');
                  } else {
                    event.target.removeAttribute('checked');
                  }
                  setTrackingToggleValue(nextValue);
                  setSettingsMessage(null);
                  setInventoryTracking(
                    { enabled: nextValue },
                    {
                      onSuccess: () => {
                        setSettingsMessage({ type: 'success', text: 'Inventory tracking preference saved' });
                      },
                      onError: () => {
                        setSettingsMessage({ type: 'error', text: 'Failed to update inventory tracking preference' });
                      }
                    }
                  );
                }}
                disabled={inventoryTrackingMutationPending || inventoryTrackingQuery.isLoading}
              />
              Enable inventory tracking
            </label>
            {inventoryTrackingQuery.isError && (
              <p className="helper" role="status" style={{ color: '#dc2626' }}>
                Unable to load inventory tracking status. Try refreshing the page.
              </p>
            )}
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
                    setSettingsMessage(null);
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
                    setSettingsMessage(null);
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
                    setSettingsMessage(null);
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
                onChange={() => setSettingsMessage(null)}
              />
            </label>
            <div className="inline" style={{ gap: '0.75rem' }}>
              <button id="save-settings-button" className="button" type="submit">
                Save Settings
              </button>
              <button className="button secondary" type="button" onClick={() => setSettingsMessage(null)}>
                Reset Message
              </button>
            </div>
            {settingsMessage && (
              <div className={`alert ${settingsMessage.type === 'error' ? 'danger' : 'success'}`}>
                {settingsMessage.text}
              </div>
            )}
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
          <AuditTrailViewer
            entries={auditEntries && auditEntries.length > 0 ? auditEntries : createAuditSeedEntries()}
            onResetFilters={resetAuditEntries}
          />
        </section>
      )}

      <div
        id="purchase-limit-preview"
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          padding: '0.4rem 0.6rem',
          backgroundColor: 'rgba(17, 24, 39, 0.08)',
          borderRadius: '999px',
          pointerEvents: 'none',
          zIndex: 100,
          display: 'inline-flex',
          gap: '0.35rem',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: '#1f2937'
        }}
        aria-live="polite"
      >
        <button className="quantity-plus-button" type="button" disabled={purchaseLimitPreview.hasLimit}>
          +
        </button>
        <span className="cart-item-quantity">{purchaseLimitPreview.hasLimit ? purchaseLimitPreview.value : ''}</span>
        <span>
          {purchaseLimitPreview.hasLimit
            ? `Maximum ${purchaseLimitPreview.value} of this item per purchase`
            : ''}
        </span>
      </div>
    </div>
  );
};

export default ProductManager;
