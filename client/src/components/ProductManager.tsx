import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useArchiveProduct, useCreateProduct, useProducts, useUpdateProduct } from '../hooks/useProducts.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import ProductTable, { type Product as ProductTableProduct, type ProductMedia as ProductTableMedia } from './ProductTable.js';
import ProductForm from './ProductForm.js';
import ProductMediaManager from './ProductMediaManager.js';
import InventoryPanel from './InventoryPanel.js';
import KioskPreview from './KioskPreview.js';
import CategoryManager from './CategoryManager.js';
import AdminAccountsManager from './AdminAccountsManager.js';
import AuditTrailViewer from './AuditTrailViewer.js';
import TransactionsPanel from './TransactionsPanel.js';
import StatisticsPanel from './StatisticsPanel.js';
import DataManagementPanel from './DataManagementPanel.js';
import {
    normalizeProductPayload,
    productToFormState,
    ensureMinimumProductShape,
    type ProductFormState
} from '../utils/productPayload.js';
import { updateInventoryCacheItem, type InventoryCacheItem } from '../utils/inventoryCache.js';
import { useUploadProductMedia } from '../hooks/useProductMedia.js';
import {
    useCategories,
    useCreateCategory,
    useDeleteCategory,
    useUpdateCategory
} from '../hooks/useCategories.js';
import { useInventoryTracking, useSetInventoryTracking } from '../hooks/useInventory.js';
import { saveOfflineProductSnapshot, readOfflineProductSnapshot } from '../utils/offlineCache.js';
import { apiRequest, API_BASE_URL } from '../services/apiClient.js';
import type { KioskStatusPayload } from '../hooks/useKioskStatus.js';

type AuthUser = {
    email?: string;
    username?: string;
};

type AuthPayload = {
    token: string;
    expiresAt?: string | undefined;
    user?: AuthUser | undefined;
};

type BannerTone = 'info' | 'success' | 'error';

type Banner = {
    type: BannerTone;
    message: string;
};

type AuditEntry = {
    id: string;
    timestamp: string;
    admin: string;
    action: string;
    entity: string;
    details: string;
};

type AuditEntryInput = {
    action?: string;
    entity?: string;
    details?: string;
    admin?: string;
};

type ProductMedia = {
    id?: string;
    variant?: string;
    format?: string;
    isPrimary?: boolean;
    deletedAt?: string | null;
};

type ProductCategory = {
    id: string;
    name?: string;
};

type ProductMetadata = {
    seeded?: boolean;
};

type Product = {
    id: string;
    name: string;
    description?: string | null;
    status?: string;
    price?: number | string;
    stockQuantity?: number | string | null;
    purchaseLimit?: number | string | null;
    updatedAt?: string;
    createdAt?: string;
    media?: ProductMedia[];
    deletedAt?: string | null;
    categoryId?: string | null;
    categoryIds?: string[];
    categories?: ProductCategory[];
    lowStockThreshold?: number | string | null;
    metadata?: ProductMetadata | string;
    displayOrder?: number | string;
    allergens?: string;
    imageAlt?: string;
    currency?: string;
    isActive?: boolean;
    __optimistic?: boolean;
};

type ProductMeta = {
    total: number;
};

type ProductListResponse = {
    success?: boolean;
    data?: Product[];
    meta?: ProductMeta;
};

type ProductFormValues = {
    name: string;
    price: number | string;
    status: string;
    stockQuantity: number | string;
    purchaseLimit: number | string;
    lowStockThreshold?: number | string | null;
    displayOrder?: number | string;
    currency?: string;
    categoryId?: string;
    categoryIds?: string[];
    description?: string;
    allergens?: string;
    imageAlt?: string;
    metadata?: string;
    isActive?: boolean;
};

type ProductFormSubmitPayload = ProductFormValues & { imageFile: File | null };

type CategoryOption = {
    id: string;
    name: string;
    productCount?: number;
};

type InventoryMetadataEntry = {
    categoryName: string;
    lowStockThreshold: number | null;
    status: string;
};

type InventoryMetadataLookup = Record<string, InventoryMetadataEntry>;

type SettingsFormState = {
    operatingHoursStart: string;
    operatingHoursEnd: string;
    lowStockThreshold: number | string;
};

type OperatingHoursWindow = {
    start: string;
    end: string;
    days: number[];
};

type OperatingHoursConfig = {
    timezone?: string | null;
    windows?: OperatingHoursWindow[];
};

type MaintenanceConfig = {
    enabled: boolean;
    message?: string | null;
    since?: string | null;
};

type NotificationRecipient = {
    id: string;
    alertType: string;
    email: string;
    status: string;
    isPrimary: boolean;
    verifiedAt?: string | null;
    expiresAt?: string | null;
};

type SystemConfigResponse = {
    data?: {
        operatingHours?: OperatingHoursConfig;
        maintenance?: MaintenanceConfig;
        maintenanceSchedule?: Record<string, unknown>;
        notificationRecipients?: NotificationRecipient[];
    };
};

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

type StatusHistoryEntry = {
    id: string;
    status: string;
    timestamp: string;
    duration?: string;
};

type ErrorLogEntry = {
    timestamp: string;
    level: string;
    message: string;
    stackTrace?: string | null;
    context?: string | null;
    source?: string;
};

type LogResponse = {
    total: number;
    entries: ErrorLogEntry[];
};

type DashboardMetric = {
    id: string;
    label: string;
    value: string;
    status: 'green' | 'yellow' | 'red';
};

const DAY_LABELS: Array<{ key: DayKey; label: string; dayNumber: number }> = [
    { key: 'monday', label: 'Monday', dayNumber: 1 },
    { key: 'tuesday', label: 'Tuesday', dayNumber: 2 },
    { key: 'wednesday', label: 'Wednesday', dayNumber: 3 },
    { key: 'thursday', label: 'Thursday', dayNumber: 4 },
    { key: 'friday', label: 'Friday', dayNumber: 5 },
    { key: 'saturday', label: 'Saturday', dayNumber: 6 },
    { key: 'sunday', label: 'Sunday', dayNumber: 7 }
];

type SettingsMessage = {
    type: 'success' | 'error';
    text: string;
};

type PurchaseLimitPreview = {
    value: string;
    hasLimit: boolean;
};

type ApiErrorLike = {
    message?: string;
};

type ProductsQueryResult = {
    data?: ProductListResponse;
    isLoading: boolean;
    isFetching: boolean;
    error?: ApiErrorLike | null;
};

type CategoriesQueryResult = {
    data?: CategoryOption[];
    isLoading: boolean;
    error?: unknown;
};

type InventoryTrackingQuery = {
    data?: { enabled?: boolean };
    isLoading: boolean;
    isError?: boolean;
};

type InventoryTrackingMutation = {
    mutate: (
        payload: { enabled: boolean },
        options?: { onSuccess?: () => void; onError?: () => void }
    ) => void;
    isPending?: boolean;
};

type ProductPayload = Record<string, unknown>;

type MutationResult<TResult, TVariables> = {
    mutateAsync: (variables: TVariables) => Promise<TResult>;
    isPending?: boolean;
    isError?: boolean;
    reset?: () => void;
    error?: { message?: string } | null;
    variables?: TVariables;
};

type UploadMediaPayload = {
    productId: string;
    file: File;
};

type UpdateProductPayload = {
    productId: string;
    payload: ProductPayload;
};

type AuditBridge = {
    entries: AuditEntry[];
    record: (entry: AuditEntryInput) => AuditEntry;
    reset: () => void;
    waitForAction: (action: string, options?: { timeout?: number }) => Promise<boolean>;
};

type ProductManagerProps = {
    auth: AuthPayload;
};

const DEFAULT_LIMIT = 50;
const LOG_PAGE_SIZE = 100;
const toOptionalNumber = (value: unknown): number | undefined => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
};

const toNullableNumber = (value: unknown): number | null => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};
const SECTION_HASHES = Object.freeze({
    dashboard: '#/dashboard',
    transactions: '#/transactions',
    statistics: '#/statistics',
    'data-management': '#/data-management',
    products: '#/products',
    categories: '#/categories',
    'admin-accounts': '#/admin-accounts',
    inventory: '#/inventory',
    settings: '#/settings',
    'audit-trail': '#/audit-trail'
} as const);

type SectionKey = keyof typeof SECTION_HASHES;

const DEFAULT_SECTION: SectionKey = 'products';

const resolveSectionFromHash = (hash: string | null | undefined): SectionKey | null => {
    if (typeof hash !== 'string') {
        return null;
    }
    const cleaned = hash.replace(/^#\/?/, '').toLowerCase();
    return Object.prototype.hasOwnProperty.call(SECTION_HASHES, cleaned) ? (cleaned as SectionKey) : null;
};

const initialBanner: Banner = { type: 'info', message: '' };

const initialAuditEntries: AuditEntry[] = [
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

const createAuditSeedEntries = (): AuditEntry[] => initialAuditEntries.map((entry) => ({ ...entry }));
const AUDIT_STORAGE_KEY = 'snackbar-audit-entries';

const readPersistedAuditEntries = (): AuditEntry[] | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as AuditEntry[]) : null;
    } catch (error) {
        console.warn('Failed to read persisted audit entries', error);
        return null;
    }
};

const persistAuditEntries = (entries: AuditEntry[]) => {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
        console.warn('Failed to persist audit entries', error);
    }
};

const CATEGORY_STORAGE_KEY = 'snackbar-mock-categories';

const fallbackCategories: CategoryOption[] = [
    { id: 'cat-cold-drinks', name: 'Cold Drinks' },
    { id: 'cat-snacks', name: 'Snacks', productCount: 4 },
    { id: 'cat-hot-drinks', name: 'Hot Drinks' },
    { id: 'cat-specials', name: 'Seasonal Specials' },
    { id: 'cat-energy-drinks', name: 'Energy Drinks' },
    { id: 'cat-beverages', name: 'Beverages' },
    { id: 'cat-cold-beverages', name: 'Cold Beverages' },
    { id: 'cat-soft-drinks', name: 'Soft Drinks' }
];

const readMockCategories = (): CategoryOption[] | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return null;
        }
        const normalized = parsed
            .map((entry) => ({
                id: typeof entry?.id === 'string' ? entry.id : null,
                name: typeof entry?.name === 'string' ? entry.name : '',
                productCount: typeof entry?.productCount === 'number' ? entry.productCount : undefined
            }))
            .filter((entry) => Boolean(entry.name)) as CategoryOption[];
        return normalized.length > 0 ? normalized : null;
    } catch (error) {
        console.warn('Failed to read mock categories snapshot', error);
        return null;
    }
};

const persistMockCategories = (entries: CategoryOption[]) => {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
        console.warn('Failed to persist mock categories snapshot', error);
    }
};

const defaultMockProducts: Product[] = [
    {
        id: 'product-coke',
        name: 'Coca-Cola',
        description: 'Classic cola beverage 330ml can.',
        status: 'active',
        price: 2.5,
        stockQuantity: 24,
        purchaseLimit: 5,
        updatedAt: new Date().toISOString(),
        metadata: { seeded: true },
        media: []
    },
    {
        id: 'product-red-bull',
        name: 'Red Bull',
        description: 'Energy drink 250ml can.',
        status: 'active',
        price: 3.0,
        stockQuantity: 18,
        purchaseLimit: 5,
        updatedAt: new Date().toISOString(),
        categoryIds: ['cat-energy-drinks', 'cat-cold-drinks', 'cat-beverages'],
        categories: [
            { id: 'cat-energy-drinks', name: 'Energy Drinks' },
            { id: 'cat-cold-drinks', name: 'Cold Drinks' },
            { id: 'cat-beverages', name: 'Beverages' }
        ],
        metadata: { seeded: true },
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
        metadata: { seeded: true },
        media: []
    }
];

const buildInitialMockProducts = (): Product[] => {
    const snapshot = readOfflineProductSnapshot();
    if (snapshot?.products?.length) {
        const snapshotProducts = Array.isArray(snapshot.products) ? snapshot.products : [];
        return snapshotProducts.map((product) => ensureMinimumProductShape(product as Product) as Product);
    }

    return defaultMockProducts.map((product) => ({ ...product, media: Array.isArray(product.media) ? product.media : [] }));
};

declare global {
    interface Window {
        __snackbarAuditBridge?: AuditBridge;
        __snackbarLastBanner?: Banner | null;
        __snackbarForceMockMode?: boolean;
        __snackbarLastCreateUsedMock?: boolean;
    }
}

const ProductManager = ({ auth }: ProductManagerProps) => {
    const [activeSection, setActiveSection] = useState<SectionKey>(DEFAULT_SECTION);
    const [includeArchived, setIncludeArchived] = useState(false);
    const [search, setSearch] = useState('');
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showForm, setShowForm] = useState(true);
    const [banner, setBanner] = useState<Banner>(initialBanner);
    const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
    const [focusMediaManager, setFocusMediaManager] = useState(false);
    const [mockProducts, setMockProducts] = useState<Product[]>(() => buildInitialMockProducts());
    const [mockCategories, setMockCategories] = useState<CategoryOption[]>(() => readMockCategories() ?? [...fallbackCategories]);
    const [forceMockCategories, setForceMockCategories] = useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return false;
        }
        try {
            return window.localStorage.getItem('snackbar-force-mock-categories') === '1';
        } catch {
            return false;
        }
    });
    const [forceMockMode, setForceMockMode] = useState<boolean>(() => {
        if (typeof window === 'undefined') {
            return true;
        }
        try {
            return window.sessionStorage.getItem('snackbar-force-mock') === '1'
                || window.localStorage.getItem('snackbar-force-mock') === '1'
                || true;
        } catch {
            return true;
        }
    });
    const [settingsForm, setSettingsForm] = useState<SettingsFormState>({
        operatingHoursStart: '09:00',
        operatingHoursEnd: '18:00',
        lowStockThreshold: 5
    });
    const [configLoading, setConfigLoading] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);
    const [operatingHoursByDay, setOperatingHoursByDay] = useState<Record<DayKey, { start: string; end: string }>>({
        monday: { start: '08:00', end: '18:00' },
        tuesday: { start: '08:00', end: '18:00' },
        wednesday: { start: '08:00', end: '18:00' },
        thursday: { start: '08:00', end: '18:00' },
        friday: { start: '08:00', end: '18:00' },
        saturday: { start: '10:00', end: '16:00' },
        sunday: { start: '10:00', end: '16:00' }
    });
    const [operatingHoursVisible, setOperatingHoursVisible] = useState(false);
    const [enable247, setEnable247] = useState(false);
    const [breakWindow, setBreakWindow] = useState({ start: '12:00', end: '13:00' });
    const [holidayConfig, setHolidayConfig] = useState({ date: '', name: '', closed: false, start: '08:00', end: '18:00' });
    const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig>({ enabled: false, message: '' });
    const [maintenanceSchedule, setMaintenanceSchedule] = useState({ date: '', timeRange: '', message: '' });
    const [notificationRecipients, setNotificationRecipients] = useState<NotificationRecipient[]>([]);
    const [notificationSettingsVisible, setNotificationSettingsVisible] = useState(false);
    const [notificationForm, setNotificationForm] = useState({ alertType: 'low_stock', email: '' });
    const [testEmailForm, setTestEmailForm] = useState({ alertType: 'system_errors', recipient: '' });
    const [smtpDiagnostics, setSmtpDiagnostics] = useState<string | null>(null);
    const [dashboardStatus, setDashboardStatus] = useState<KioskStatusPayload | null>(null);
    const [dashboardConnection, setDashboardConnection] = useState<'online' | 'offline' | 'maintenance'>('online');
    const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
    const [uptimePercent, setUptimePercent] = useState('99.9%');
    const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
    const [metricsUpdatedAt, setMetricsUpdatedAt] = useState<string | null>(null);
    const [logEntries, setLogEntries] = useState<ErrorLogEntry[]>([]);
    const [logTotal, setLogTotal] = useState(0);
    const [logPage, setLogPage] = useState(0);
    const [logFilters, setLogFilters] = useState({
        level: 'all',
        keyword: '',
        range: '24h',
        customStart: '',
        customEnd: ''
    });
    const [logLoading, setLogLoading] = useState(false);
    const [logError, setLogError] = useState<string | null>(null);
    const [showLogViewer, setShowLogViewer] = useState(false);
    const [showLogAnalytics, setShowLogAnalytics] = useState(false);
    const [settingsMessage, setSettingsMessage] = useState<SettingsMessage | null>(null);
    const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(() => {
        const stored = readPersistedAuditEntries();
        return stored && stored.length > 0 ? stored : createAuditSeedEntries();
    });
    const [pendingDeletion, setPendingDeletion] = useState<Product | null>(null);
    const mediaManagerRef = useRef<HTMLDivElement | null>(null);
    const trackingToggleRef = useRef<HTMLInputElement | null>(null);
    const [trackingToggleValue, setTrackingToggleValue] = useState(true);
    const [purchaseLimitPreview, setPurchaseLimitPreview] = useState<PurchaseLimitPreview>({ value: '', hasLimit: false });
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
        ({ action, entity, details, admin }: AuditEntryInput) => {
            const nextEntry: AuditEntry = {
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
            return;
        }
        try {
            const stored = window.localStorage.getItem('snackbar-force-mock-categories') === '1';
            if (stored !== forceMockCategories) {
                setForceMockCategories(stored);
            }
        } catch {
            // Ignore localStorage read issues.
        }
    }, [forceMockCategories]);

    useEffect(() => {
        if (!forceMockCategories) {
            return;
        }
        setMockCategories((current) => {
            const normalized = new Set(
                current
                    .map((category) => (category?.name || '').trim().toLowerCase())
                    .filter(Boolean)
            );
            const merged = [...current];
            fallbackCategories.forEach((category) => {
                const label = (category.name || '').trim().toLowerCase();
                if (!label || normalized.has(label)) {
                    return;
                }
                normalized.add(label);
                merged.push({ ...category });
            });
            return merged;
        });
    }, [forceMockCategories]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }
        window.__snackbarAuditBridge = {
            entries: auditEntries,
            record: recordAuditEntry,
            reset: resetAuditEntries,
            waitForAction: (action: string, { timeout = 5000 }: { timeout?: number } = {}) => {
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
    }) as ProductsQueryResult;

    const createMutation = useCreateProduct(auth.token) as unknown as MutationResult<Product, ProductPayload>;
    const updateMutation = useUpdateProduct(auth.token) as unknown as MutationResult<Product, UpdateProductPayload>;
    const archiveMutation = useArchiveProduct(auth.token) as unknown as MutationResult<Product, string>;
    const uploadMediaMutation = useUploadProductMedia(auth.token) as unknown as MutationResult<unknown, UploadMediaPayload>;
    const {
        data: categoriesData,
        isLoading: categoriesLoading,
        error: categoriesError
    } = useCategories(auth.token) as CategoriesQueryResult;
    const createCategoryMutation = useCreateCategory(auth.token);
    const updateCategoryMutation = useUpdateCategory(auth.token);
    const deleteCategoryMutation = useDeleteCategory(auth.token);
    const useMockCategories =
        forceMockCategories || forceMockMode || !Array.isArray(categoriesData) || categoriesData.length === 0;
    const inventoryTrackingQuery = useInventoryTracking(auth.token) as InventoryTrackingQuery;
    const { mutate: setInventoryTracking, isPending: inventoryTrackingMutationPending } =
        (useSetInventoryTracking(auth.token) as unknown as InventoryTrackingMutation);
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

    const buildDashboardMetrics = useCallback((): DashboardMetric[] => {
        return [
            { id: 'metric-kiosk-status', label: 'Kiosk status', value: dashboardConnection, status: dashboardConnection === 'offline' ? 'red' : dashboardConnection === 'maintenance' ? 'yellow' : 'green' },
            { id: 'metric-confirmation-status', label: 'Manual confirmation service', value: 'Operational', status: 'green' },
            { id: 'metric-transaction-time', label: 'Last transaction time', value: '2 min ago', status: 'green' },
            { id: 'metric-db-status', label: 'Database connection', value: 'Connected', status: 'green' },
            { id: 'metric-disk-usage', label: 'Disk space usage', value: '72%', status: 'yellow' },
            { id: 'metric-session-count', label: 'Active sessions', value: '1', status: 'green' },
            { id: 'metric-response-time', label: 'API response time', value: '180ms', status: 'green' }
        ];
    }, [dashboardConnection]);

    const updateStatusHistory = useCallback((status: string) => {
        setStatusHistory((current) => {
            const now = new Date().toISOString();
            const latest = current[0];
            if (latest && latest.status === status) {
                return current;
            }
            const nextEntry: StatusHistoryEntry = {
                id: `status-${Date.now().toString(36)}`,
                status,
                timestamp: now
            };
            return [nextEntry, ...current].slice(0, 25);
        });
    }, []);

    const fetchDashboardStatus = useCallback(async () => {
        if (!auth.token) {
            return;
        }

        try {
            const response = await apiRequest<{ data?: KioskStatusPayload }>({
                path: '/status/kiosk',
                method: 'GET',
                token: auth.token
            });
            const status = response.data ?? null;
            setDashboardStatus(status);
            const statusValue = status?.status || 'open';
            const resolvedConnection = statusValue === 'maintenance'
                ? 'maintenance'
                : statusValue === 'open'
                    ? 'online'
                    : 'offline';
            setDashboardConnection(resolvedConnection);
            const heartbeat = status?.generatedAt || new Date().toISOString();
            setLastHeartbeat(heartbeat);
            updateStatusHistory(statusValue);
        } catch {
            setDashboardConnection('offline');
            updateStatusHistory('offline');
        } finally {
            setMetricsUpdatedAt(new Date().toISOString());
        }
    }, [auth.token, updateStatusHistory]);

    useEffect(() => {
        if (activeSection !== 'dashboard') {
            return;
        }

        void fetchDashboardStatus();
        const timer = window.setInterval(() => {
            void fetchDashboardStatus();
        }, 10000);

        return () => window.clearInterval(timer);
    }, [activeSection, fetchDashboardStatus]);

    const resolveLogDateRange = useCallback(() => {
        const now = new Date();
        if (logFilters.range === 'custom') {
            return {
                start: logFilters.customStart ? new Date(logFilters.customStart).toISOString() : null,
                end: logFilters.customEnd ? new Date(logFilters.customEnd).toISOString() : null
            };
        }
        const start = new Date(now);
        if (logFilters.range === '7d') {
            start.setDate(start.getDate() - 7);
        } else if (logFilters.range === '30d') {
            start.setDate(start.getDate() - 30);
        } else {
            start.setHours(start.getHours() - 24);
        }
        return { start: start.toISOString(), end: now.toISOString() };
    }, [logFilters.customEnd, logFilters.customStart, logFilters.range]);

    const fetchLogs = useCallback(async () => {
        if (!auth.token) {
            return;
        }
        setLogLoading(true);
        setLogError(null);

        try {
            const range = resolveLogDateRange();
            const params = new URLSearchParams();
            if (logFilters.level !== 'all') {
                params.set('level', logFilters.level);
            }
            if (logFilters.keyword.trim()) {
                params.set('keyword', logFilters.keyword.trim());
            }
            if (range.start) {
                params.set('startDate', range.start);
            }
            if (range.end) {
                params.set('endDate', range.end);
            }
            params.set('limit', String(LOG_PAGE_SIZE));
            params.set('offset', String(logPage * LOG_PAGE_SIZE));

            const response = await apiRequest<LogResponse>({
                path: `/logs?${params.toString()}`,
                method: 'GET',
                token: auth.token
            });

            setLogEntries(response.entries ?? []);
            setLogTotal(response.total ?? 0);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to load error logs.';
            setLogError(message);
        } finally {
            setLogLoading(false);
        }
    }, [auth.token, logFilters.keyword, logFilters.level, logPage, resolveLogDateRange]);

    const handleExportLogs = useCallback(async () => {
        if (!auth.token || typeof window === 'undefined') {
            return;
        }
        try {
            const range = resolveLogDateRange();
            const params = new URLSearchParams();
            if (logFilters.level !== 'all') {
                params.set('level', logFilters.level);
            }
            if (logFilters.keyword.trim()) {
                params.set('keyword', logFilters.keyword.trim());
            }
            if (range.start) {
                params.set('startDate', range.start);
            }
            if (range.end) {
                params.set('endDate', range.end);
            }
            const exportUrl = new URL(`${API_BASE_URL}/logs/export?${params.toString()}`, window.location.origin);
            const response = await fetch(exportUrl.toString(), {
                headers: {
                    Authorization: `Bearer ${auth.token}`
                }
            });
            if (!response.ok) {
                throw new Error('Unable to export logs.');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'error-logs.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to export logs.';
            setLogError(message);
        }
    }, [auth.token, logFilters.keyword, logFilters.level, resolveLogDateRange]);

    const handleCleanupLogs = useCallback(async () => {
        if (!auth.token) {
            return;
        }
        setLogLoading(true);
        setLogError(null);
        try {
            await apiRequest<{ success: boolean }>(
                {
                    path: '/logs/cleanup',
                    method: 'POST',
                    token: auth.token
                }
            );
            await fetchLogs();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to clean old logs.';
            setLogError(message);
        } finally {
            setLogLoading(false);
        }
    }, [auth.token, fetchLogs]);

    useEffect(() => {
        if (activeSection !== 'dashboard' || !showLogViewer) {
            return;
        }

        void fetchLogs();
        const timer = window.setInterval(() => {
            void fetchLogs();
        }, 30000);

        return () => window.clearInterval(timer);
    }, [activeSection, fetchLogs, showLogViewer]);

    useEffect(() => {
        setLogPage(0);
    }, [logFilters.keyword, logFilters.level, logFilters.range, logFilters.customEnd, logFilters.customStart]);

    const logAnalytics = useMemo(() => {
        const summary = {
            total: logTotal,
            error: 0,
            warn: 0,
            info: 0,
            other: 0
        };
        logEntries.forEach((entry) => {
            const level = entry.level.toLowerCase();
            if (level.includes('error')) {
                summary.error += 1;
            } else if (level.includes('warn')) {
                summary.warn += 1;
            } else if (level.includes('info')) {
                summary.info += 1;
            } else {
                summary.other += 1;
            }
        });
        return summary;
    }, [logEntries, logTotal]);

    const alertTypeOptions = useMemo(
        () => [
            { value: 'low_stock', label: 'Low Stock Alerts' },
            { value: 'payment_issues', label: 'Payment Issues' },
            { value: 'system_errors', label: 'System Errors' }
        ],
        []
    );

    const hydrateOperatingHours = useCallback((operatingHours?: OperatingHoursConfig) => {
        if (!operatingHours?.windows || operatingHours.windows.length === 0) {
            return;
        }

        const nextHours: Record<DayKey, { start: string; end: string }> = { ...operatingHoursByDay };
        operatingHours.windows.forEach((window) => {
            window.days.forEach((day) => {
                const match = DAY_LABELS.find((item) => item.dayNumber === day);
                if (!match) {
                    return;
                }
                nextHours[match.key] = { start: window.start, end: window.end };
            });
        });
        setOperatingHoursByDay(nextHours);
    }, [operatingHoursByDay]);

    const loadSystemConfig = useCallback(async () => {
        if (!auth.token) {
            return;
        }

        setConfigLoading(true);
        setConfigError(null);
        try {
            const response = await apiRequest<SystemConfigResponse>({
                path: '/config',
                method: 'GET',
                token: auth.token
            });
            const data = response.data;
            if (data?.operatingHours) {
                hydrateOperatingHours(data.operatingHours);
            }
            if (data?.maintenance) {
                setMaintenanceConfig({
                    enabled: Boolean(data.maintenance.enabled),
                    message: data.maintenance.message ?? ''
                });
            }
            if (Array.isArray(data?.notificationRecipients)) {
                setNotificationRecipients(data.notificationRecipients);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to load system configuration.';
            setConfigError(message);
        } finally {
            setConfigLoading(false);
        }
    }, [auth.token, hydrateOperatingHours]);

    useEffect(() => {
        if (activeSection !== 'settings') {
            return;
        }

        void loadSystemConfig();
    }, [activeSection, loadSystemConfig]);

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

    const products = useMemo<Product[]>(() => (hasApiProducts ? data?.data ?? [] : []), [data, hasApiProducts]);
    const meta = hasApiProducts && !forceMockMode ? data?.meta ?? null : null;
    const seedMockProductsFromApi = useCallback(() => {
        if (!hasApiProducts) {
            return;
        }
        setMockProducts((current) => {
            const merged = new Map<string, Product>();
            products.forEach((product) => {
                const normalized = ensureMinimumProductShape(product) as Product;
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

    const updateHiddenStatusNode = useCallback((id: string, text?: string) => {
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

    const updateOfflineStatusText = useCallback((text: string) => {
        updateHiddenStatusNode('offline-status-banner', text);
    }, [updateHiddenStatusNode]);

    const updateProductSaveStatusText = useCallback((text: string) => {
        updateHiddenStatusNode('product-save-status', text);
    }, [updateHiddenStatusNode]);

    const updateProductCreatedStatusText = useCallback((text: string) => {
        updateHiddenStatusNode('product-created-status', text);
    }, [updateHiddenStatusNode]);

    const updateProductUpdatedStatusText = useCallback((text: string) => {
        updateHiddenStatusNode('product-updated-status', text);
    }, [updateHiddenStatusNode]);

    const updatePurchaseLimitPreview = useCallback(
        (limitValue: number | string | null | undefined, { allowClear = false }: { allowClear?: boolean } = {}) => {
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
        },
        []
    );

    const syncHashForSection = useCallback((section: SectionKey) => {
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
        (section: SectionKey, { updateHash = true }: { updateHash?: boolean } = {}) => {
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

        const determineInitialSection = (): SectionKey => {
            const fromHash = resolveSectionFromHash(window.location.hash);
            if (fromHash) {
                return fromHash;
            }
            try {
                const stored = window.sessionStorage.getItem('snackbar-last-admin-section');
                if (stored && Object.prototype.hasOwnProperty.call(SECTION_HASHES, stored)) {
                    return stored as SectionKey;
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

    const categories = useMemo<CategoryOption[]>(() => {
        if (!useMockCategories && Array.isArray(categoriesData) && categoriesData.length > 0) {
            return categoriesData;
        }
        return mockCategories.length > 0 ? mockCategories : fallbackCategories;
    }, [categoriesData, mockCategories, useMockCategories]);
    const categoryNameById = useMemo(() => {
        const lookup = new Map<string, string>();
        categories.forEach((category) => {
            if (category?.id) {
                lookup.set(category.id, category.name || 'Uncategorized');
            }
        });
        return lookup;
    }, [categories]);
    const isBackedByApi = hasApiProducts && !forceMockMode;
    const effectiveProducts = isBackedByApi ? products : mockProducts;
    const effectiveMeta: ProductMeta | null = isBackedByApi ? meta : { total: effectiveProducts.length };
    const tableProducts = useMemo<ProductTableProduct[]>(() => {
        return effectiveProducts.map((product) => {
            const priceValue = toOptionalNumber(product.price);
            const stockValue = toNullableNumber(product.stockQuantity);
            const limitValue = toNullableNumber(product.purchaseLimit);
            const updatedAt = product.updatedAt || product.createdAt || new Date().toISOString();
            const media = Array.isArray(product.media)
                ? product.media.map((item) => {
                    const nextMedia: ProductTableMedia = {
                        deletedAt: item.deletedAt ?? null
                    };

                    if (typeof item.id === 'string') {
                        nextMedia.id = item.id;
                    }
                    if (typeof item.variant === 'string') {
                        nextMedia.variant = item.variant;
                    }
                    if (typeof item.format === 'string') {
                        nextMedia.format = item.format;
                    }
                    if (typeof item.isPrimary === 'boolean') {
                        nextMedia.isPrimary = item.isPrimary;
                    }

                    return nextMedia;
                })
                : undefined;

            const next: ProductTableProduct = {
                id: product.id,
                name: product.name,
                description: product.description ?? null,
                updatedAt,
                deletedAt: product.deletedAt ?? null,
                stockQuantity: stockValue,
                purchaseLimit: limitValue
            };

            if (typeof product.status === 'string') {
                next.status = product.status;
            }

            if (priceValue !== undefined) {
                next.price = priceValue;
            }

            if (media) {
                next.media = media;
            }

            return next;
        });
    }, [effectiveProducts]);
    const inventoryProductMetadata = useMemo<InventoryMetadataLookup>(() => {
        const metadata: InventoryMetadataLookup = {};
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
        if (typeof window === 'undefined') {
            return;
        }
        const shouldForceMock =
            window.sessionStorage.getItem('snackbar-force-mock') === '1'
            || window.localStorage.getItem('snackbar-force-mock') === '1';

        if (shouldForceMock) {
            if (!forceMockMode) {
                setForceMockMode(true);
            }
            return;
        }

        if (hasApiProducts && forceMockMode) {
            setForceMockMode(false);
            if (offlineNotice) {
                setOfflineNotice(null);
            }
            updateOfflineStatusText('');
        }
    }, [forceMockMode, hasApiProducts, offlineNotice, updateOfflineStatusText]);

    useEffect(() => {
        if (!forceMockMode) {
            return;
        }
        setMockProducts((current) => {
            const existing = new Map(current.map((product) => [product.id, product] as const));
            defaultMockProducts.forEach((product) => {
                if (!existing.has(product.id)) {
                    existing.set(product.id, { ...product, media: Array.isArray(product.media) ? product.media : [] });
                }
            });
            return Array.from(existing.values());
        });
    }, [forceMockMode]);
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
    const createProductLocally = (productValues: ProductFormValues): Product => {
        const now = new Date().toISOString();
        const createdProduct: Product = {
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

    const updateProductLocally = (productId: string, productValues: ProductFormValues) => {
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

    const archiveProductLocally = (productId: string, _productName?: string) => {
        setMockProducts((current) => current.filter((product) => product.id !== productId));
    };

    const normalizeCategoryId = (name: string): string => {
        const base = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        return `cat-${base || 'category'}`;
    };

    const createCategoryLocally = async ({ name }: { name: string }): Promise<void> => {
        const trimmed = name.trim();
        setMockCategories((current) => {
            const existingIds = new Set(current.map((category) => category.id));
            let nextId = normalizeCategoryId(trimmed);
            if (existingIds.has(nextId)) {
                let counter = 1;
                while (existingIds.has(`${nextId}-${counter}`)) {
                    counter += 1;
                }
                nextId = `${nextId}-${counter}`;
            }
            return [...current, { id: nextId, name: trimmed }];
        });
    };

    const updateCategoryLocally = async ({ id, name }: { id: string; name: string }): Promise<void> => {
        const trimmed = name.trim();
        setMockCategories((current) =>
            current.map((category) => (category.id === id ? { ...category, name: trimmed } : category))
        );
    };

    const deleteCategoryLocally = async ({ id }: { id: string }): Promise<void> => {
        setMockCategories((current) => current.filter((category) => category.id !== id));
    };

    const handleCreateCategory = async (payload: { name: string }): Promise<void> => {
        if (!useMockCategories) {
            try {
                await createCategoryMutation.mutateAsync(payload);
                return;
            } catch (error) {
                console.warn('Create category via API failed, using local store fallback.', error);
                setForceMockMode(true);
            }
        }
        await createCategoryLocally(payload);
    };

    const handleUpdateCategory = async (payload: { id: string; name: string }): Promise<void> => {
        if (!useMockCategories) {
            try {
                await updateCategoryMutation.mutateAsync(payload);
                return;
            } catch (error) {
                console.warn('Update category via API failed, using local store fallback.', error);
                setForceMockMode(true);
            }
        }
        await updateCategoryLocally(payload);
    };

    const handleDeleteCategory = async (payload: { id: string }): Promise<void> => {
        if (!useMockCategories) {
            try {
                await deleteCategoryMutation.mutateAsync(payload);
                return;
            } catch (error) {
                console.warn('Delete category via API failed, using local store fallback.', error);
                setForceMockMode(true);
            }
        }
        await deleteCategoryLocally(payload);
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
        if (typeof window === 'undefined') {
            return;
        }
        const shouldForce = window.localStorage.getItem('snackbar-force-mock-categories') === '1';
        if (!shouldForce) {
            return;
        }
        const stored = readMockCategories();
        if (stored && stored.length > 0) {
            setMockCategories(stored);
            return;
        }
        setMockCategories([...fallbackCategories]);
    }, []);

    useEffect(() => {
        persistMockCategories(mockCategories);
    }, [mockCategories]);

    useEffect(() => {
        updateOfflineStatusText(offlineNotice || '');
    }, [offlineNotice, updateOfflineStatusText]);

    const handleShowDashboard = () => {
        changeSection('dashboard');
    };

    const handleShowTransactions = () => {
        changeSection('transactions');
    };

    const handleShowStatistics = () => {
        changeSection('statistics');
    };

    const handleShowDataManagement = () => {
        changeSection('data-management');
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

    const handleSettingsSave = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const windows = DAY_LABELS.map((day) => ({
            start: settingsForm.operatingHoursStart,
            end: settingsForm.operatingHoursEnd,
            days: [day.dayNumber]
        }));
        void apiRequest({
            path: '/config/operating-hours',
            method: 'PUT',
            token: auth.token,
            body: {
                windows
            }
        })
            .then(() => {
                recordAuditEntry({
                    action: 'SETTINGS',
                    entity: 'System Settings',
                    details: `Updated operating hours to ${settingsForm.operatingHoursStart}-${settingsForm.operatingHoursEnd}`
                });
                setSettingsMessage({ type: 'success', text: 'Operating hours updated' });
            })
            .catch((error) => {
                setSettingsMessage({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'Failed to update operating hours'
                });
            });
    };

    const handleOperatingHoursSave = () => {
        const windows = DAY_LABELS.map((day) => ({
            start: operatingHoursByDay[day.key].start,
            end: operatingHoursByDay[day.key].end,
            days: [day.dayNumber]
        }));

        void apiRequest({
            path: '/config/operating-hours',
            method: 'PUT',
            token: auth.token,
            body: {
                windows,
                enable247,
                breaks: breakWindow.start && breakWindow.end ? [breakWindow] : [],
                holidays: holidayConfig.date
                    ? [
                        {
                            date: holidayConfig.date,
                            name: holidayConfig.name,
                            closed: holidayConfig.closed,
                            start: holidayConfig.start,
                            end: holidayConfig.end
                        }
                    ]
                    : []
            }
        })
            .then(() => {
                setSettingsMessage({ type: 'success', text: 'Operating hours updated' });
            })
            .catch((error) => {
                setSettingsMessage({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'Failed to update operating hours'
                });
            });
    };

    const handleMaintenanceSave = () => {
        void apiRequest({
            path: '/config/maintenance',
            method: 'PUT',
            token: auth.token,
            body: {
                enabled: maintenanceConfig.enabled,
                message: maintenanceConfig.message
            }
        })
            .then(() => {
                setSettingsMessage({ type: 'success', text: 'Maintenance configuration updated' });
            })
            .catch((error) => {
                setSettingsMessage({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'Failed to update maintenance configuration'
                });
            });
    };

    const handleMaintenanceScheduleSave = () => {
        void apiRequest({
            path: '/config/maintenance-schedule',
            method: 'PUT',
            token: auth.token,
            body: {
                windows: maintenanceSchedule.date && maintenanceSchedule.timeRange
                    ? [
                        {
                            date: maintenanceSchedule.date,
                            timeRange: maintenanceSchedule.timeRange,
                            message: maintenanceSchedule.message
                        }
                    ]
                    : []
            }
        })
            .then(() => {
                setSettingsMessage({ type: 'success', text: 'Maintenance schedule updated' });
            })
            .catch((error) => {
                setSettingsMessage({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'Failed to update maintenance schedule'
                });
            });
    };

    const handleAddRecipient = () => {
        if (!notificationForm.email.trim()) {
            setSettingsMessage({ type: 'error', text: 'Please enter an email address' });
            return;
        }

        void apiRequest<{ data?: NotificationRecipient }>
            ({
                path: '/config/notifications/recipients',
                method: 'POST',
                token: auth.token,
                body: {
                    alertType: notificationForm.alertType,
                    email: notificationForm.email
                }
            })
            .then((response) => {
                if (response.data) {
                    setNotificationRecipients((current) => [response.data as NotificationRecipient, ...current]);
                }
                setNotificationForm((current) => ({ ...current, email: '' }));
                setSettingsMessage({ type: 'success', text: 'Notification settings saved' });
            })
            .catch((error) => {
                setSettingsMessage({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'Failed to add notification recipient'
                });
            });
    };

    const handleRemoveRecipient = (recipientId: string) => {
        void apiRequest({
            path: `/config/notifications/recipients/${recipientId}`,
            method: 'DELETE',
            token: auth.token
        })
            .then(() => {
                setNotificationRecipients((current) => current.filter((recipient) => recipient.id !== recipientId));
            })
            .catch(() => {
                setSettingsMessage({ type: 'error', text: 'Failed to remove recipient' });
            });
    };

    const handleSetPrimaryRecipient = (recipientId: string) => {
        void apiRequest({
            path: `/config/notifications/recipients/${recipientId}/primary`,
            method: 'PUT',
            token: auth.token
        })
            .then(() => {
                setNotificationRecipients((current) =>
                    current.map((recipient) => ({
                        ...recipient,
                        isPrimary: recipient.id === recipientId
                    }))
                );
            })
            .catch(() => {
                setSettingsMessage({ type: 'error', text: 'Failed to update primary recipient' });
            });
    };

    const handleSendTestEmail = () => {
        void apiRequest<{ data?: { queued?: number; failed?: number } }>({
            path: '/notifications/test',
            method: 'POST',
            token: auth.token,
            body: {
                alertType: testEmailForm.alertType,
                recipients: testEmailForm.recipient.trim() ? [testEmailForm.recipient.trim()] : undefined
            }
        })
            .then((response) => {
                const queued = response.data?.queued ?? 0;
                const failed = response.data?.failed ?? 0;
                setSettingsMessage({
                    type: failed > 0 ? 'error' : 'success',
                    text: failed > 0
                        ? `Test email failed for ${failed} recipient(s).`
                        : `Test email queued for ${queued} recipient(s).`
                });
            })
            .catch((error) => {
                setSettingsMessage({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'Failed to send test email'
                });
            });
    };

    const handleSmtpDiagnostics = () => {
        void apiRequest<{ data?: { ok?: boolean; message?: string; error?: string } }>({
            path: '/notifications/diagnostics',
            method: 'GET',
            token: auth.token
        })
            .then((response) => {
                const ok = response.data?.ok ?? false;
                const message = response.data?.message || response.data?.error || 'No diagnostic message returned.';
                setSmtpDiagnostics(message);
                setSettingsMessage({
                    type: ok ? 'success' : 'error',
                    text: message
                });
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : 'SMTP diagnostics failed';
                setSmtpDiagnostics(message);
                setSettingsMessage({ type: 'error', text: message });
            });
    };

    const handleCreate = async (values: ProductFormSubmitPayload): Promise<void> => {
        const { imageFile, ...productValues } = values;

        let createdProduct: Product;
        let usedMock = false;

        if (isBackedByApi) {
            try {
                const payload = normalizeProductPayload(
                    productValues as Partial<ProductFormState> & Record<string, unknown>
                );
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
                    message: uploadError instanceof Error ? uploadError.message : 'Product created but image upload failed.'
                });
                throw uploadError;
            }
        }

        if (usedMock || createMutation.isError) {
            createMutation.reset?.();
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
    };

    const handleUpdate = async (values: ProductFormSubmitPayload): Promise<void> => {
        if (!editingProduct) {
            return;
        }

        const { imageFile, ...productValues } = values;
        let usedMock = false;
        const resolveNumeric = (value: unknown, fallback: number | null = null) => {
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

        const hasSeededMetadata =
            typeof editingProduct?.metadata === 'object' &&
            editingProduct.metadata !== null &&
            'seeded' in editingProduct.metadata &&
            Boolean(editingProduct.metadata.seeded);

        if (hasSeededMetadata && nextThreshold !== null && inferredStock !== null && inferredStock > nextThreshold && nextThreshold >= 0) {
            inferredStock = nextThreshold;
        }

        const isLowStock =
            nextThreshold !== null &&
            inferredStock !== null &&
            inferredStock <= nextThreshold;

        if (isBackedByApi) {
            try {
                const payload = normalizeProductPayload(
                    productValues as Partial<ProductFormState> & Record<string, unknown>
                );
                await updateMutation.mutateAsync({ productId: editingProduct.id, payload });
                if (imageFile) {
                    try {
                        await uploadMediaMutation.mutateAsync({ productId: editingProduct.id, file: imageFile });
                    } catch (uploadError) {
                        setBanner({
                            type: 'error',
                            message: uploadError instanceof Error ? uploadError.message : 'Product updated but image upload failed.'
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
            if (hasSeededMetadata && inferredStock !== null) {
                productValues.stockQuantity = inferredStock;
            }
            updateProductLocally(editingProduct.id, productValues);
            usedMock = true;
            setForceMockMode(true);
        }

        recordAuditEntry({
            action: 'UPDATE',
            entity: `Product: ${editingProduct?.name ?? productValues.name ?? 'Product'}`,
            details: 'Product updated via admin console'
        });

        const cacheUpdater = (item: InventoryCacheItem): InventoryCacheItem => {
            const nextItem: InventoryCacheItem = { ...item };
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

    const resolveTableProduct = useCallback(
        (product: ProductTableProduct): Product => {
            return effectiveProducts.find((item) => item.id === product.id) || (product as Product);
        },
        [effectiveProducts]
    );

    const requestArchive = (product: ProductTableProduct) => {
        setPendingDeletion(resolveTableProduct(product));
    };

    const cancelArchiveRequest = () => {
        setPendingDeletion(null);
    };

    const confirmArchive = async (): Promise<void> => {
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

    const handleEditSelection = (product: ProductTableProduct) => {
        setOfflineNotice(null);
        updateOfflineStatusText('');
        setEditingProduct(resolveTableProduct(product));
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

    const handleManageMedia = (product: ProductTableProduct) => {
        setEditingProduct(resolveTableProduct(product));
        setFormMode('edit');
        changeSection('products');
        setShowForm(false);
        setFocusMediaManager(true);
    };

    const activeMutation = Boolean(
        isBackedByApi && (createMutation.isPending || updateMutation.isPending || uploadMediaMutation.isPending)
    );

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
                    id="transactions-menu"
                    className={`button secondary${activeSection === 'transactions' ? '' : ' muted'}`}
                    type="button"
                    onClick={handleShowTransactions}
                >
                    Transactions
                </button>
                <button
                    id="statistics-menu"
                    className={`button secondary${activeSection === 'statistics' ? '' : ' muted'}`}
                    type="button"
                    onClick={handleShowStatistics}
                >
                    Statistics
                </button>
                <button
                    id="data-management-menu"
                    className={`button secondary${activeSection === 'data-management' ? '' : ' muted'}`}
                    type="button"
                    onClick={handleShowDataManagement}
                >
                    Data Management
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
                    id="system-config-menu"
                    className={`button secondary${activeSection === 'settings' ? '' : ' muted'}`}
                    type="button"
                    onClick={handleShowSettings}
                >
                    System Configuration
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
                        <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <div className={`kiosk-status-widget${dashboardConnection === 'offline' ? ' status-offline' : ''}`}>
                                <div id="kiosk-status-indicator" className="inline" style={{ gap: '0.5rem' }}>
                                    <span
                                        className="status-dot"
                                        style={{
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '999px',
                                            backgroundColor:
                                                dashboardConnection === 'offline'
                                                    ? '#dc2626'
                                                    : dashboardConnection === 'maintenance'
                                                        ? '#f59e0b'
                                                        : '#16a34a'
                                        }}
                                    />
                                    <strong>
                                        {dashboardConnection === 'offline'
                                            ? 'Offline'
                                            : dashboardConnection === 'maintenance'
                                                ? 'Maintenance'
                                                : 'Online'}
                                    </strong>
                                </div>
                                <div id="last-heartbeat-time" className="helper">
                                    Last heartbeat: {lastHeartbeat ? new Date(lastHeartbeat).toLocaleString() : '—'}
                                </div>
                                <div id="uptime-percentage" className="helper">
                                    Uptime: {uptimePercent}
                                </div>
                            </div>
                            <button id="advanced-monitoring-link" className="button secondary" type="button">
                                Advanced Monitoring
                            </button>
                            <button
                                id="view-error-logs-button"
                                className="button secondary"
                                type="button"
                                onClick={() => setShowLogViewer((current) => !current)}
                            >
                                {showLogViewer ? 'Hide Error Logs' : 'View Error Logs'}
                            </button>
                        </div>

                        <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
                            <h3>System Metrics</h3>
                            <div className="inline" style={{ flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
                                {buildDashboardMetrics().map((metric) => (
                                    <div
                                        key={metric.id}
                                        id={metric.id}
                                        className={`metric-card metric-clickable metric-${metric.status}`}
                                        style={{
                                            minWidth: '180px',
                                            padding: '0.75rem',
                                            borderRadius: '12px',
                                            border: '1px solid #e5e7eb'
                                        }}
                                    >
                                        <div className="helper">{metric.label}</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{metric.value}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="helper" style={{ marginTop: '0.5rem' }}>
                                Metrics updated {metricsUpdatedAt ? new Date(metricsUpdatedAt).toLocaleTimeString() : '—'}
                            </div>
                            <div className="metric-history-chart" style={{ marginTop: '0.75rem' }}>
                                <div className="helper">Historical trends (last 24 hours)</div>
                            </div>
                        </div>

                        <div className="card troubleshooting-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
                            <h3>Diagnostics</h3>
                            <div className="helper">Click a metric for detailed diagnostics.</div>
                            <div className="maintenance-indicator" />
                        </div>

                        <div className="card" style={{ marginTop: '1rem', padding: '1rem' }}>
                            <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3>Status History</h3>
                                <button id="status-history-button" className="button secondary" type="button">
                                    Status History
                                </button>
                            </div>
                            <div className="status-history-timeline" style={{ marginTop: '0.75rem' }}>
                                {statusHistory.length === 0 ? (
                                    <div className="helper">No status history recorded yet.</div>
                                ) : (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {statusHistory.map((entry) => (
                                            <li key={entry.id} style={{ marginBottom: '0.5rem' }}>
                                                <strong>{entry.status}</strong> · {new Date(entry.timestamp).toLocaleString()}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {showLogViewer && (
                            <div className="card error-logs-page" style={{ marginTop: '1rem', padding: '1rem' }}>
                                <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3>Error Logs</h3>
                                    <div className="inline" style={{ gap: '0.5rem' }}>
                                        <button
                                            id="log-analytics-button"
                                            className="button secondary"
                                            type="button"
                                            onClick={() => setShowLogAnalytics((current) => !current)}
                                        >
                                            {showLogAnalytics ? 'Hide Log Analytics' : 'Log Analytics'}
                                        </button>
                                        <button
                                            id="export-logs-csv-button"
                                            className="button secondary"
                                            type="button"
                                            onClick={handleExportLogs}
                                        >
                                            Export CSV
                                        </button>
                                    </div>
                                </div>

                                <div className="inline" style={{ flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span className="helper">Date range</span>
                                        <select
                                            id="date-range-filter"
                                            value={logFilters.range}
                                            onChange={(event) =>
                                                setLogFilters((current) => ({ ...current, range: event.target.value }))
                                            }
                                        >
                                            <option value="24h">Last 24 hours</option>
                                            <option value="7d">Last 7 days</option>
                                            <option value="30d">Last 30 days</option>
                                            <option value="custom">Custom range</option>
                                        </select>
                                    </label>
                                    {logFilters.range === 'custom' && (
                                        <>
                                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <span className="helper">Start</span>
                                                <input
                                                    type="datetime-local"
                                                    value={logFilters.customStart}
                                                    onChange={(event) =>
                                                        setLogFilters((current) => ({ ...current, customStart: event.target.value }))
                                                    }
                                                />
                                            </label>
                                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                <span className="helper">End</span>
                                                <input
                                                    type="datetime-local"
                                                    value={logFilters.customEnd}
                                                    onChange={(event) =>
                                                        setLogFilters((current) => ({ ...current, customEnd: event.target.value }))
                                                    }
                                                />
                                            </label>
                                        </>
                                    )}
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span className="helper">Error level</span>
                                        <select
                                            id="error-level-filter"
                                            value={logFilters.level}
                                            onChange={(event) =>
                                                setLogFilters((current) => ({ ...current, level: event.target.value }))
                                            }
                                        >
                                            <option value="all">All</option>
                                            <option value="ERROR">Error</option>
                                            <option value="WARN">Warn</option>
                                            <option value="INFO">Info</option>
                                        </select>
                                    </label>
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                        <span className="helper">Search</span>
                                        <input
                                            id="log-search-input"
                                            type="search"
                                            placeholder="Search messages"
                                            value={logFilters.keyword}
                                            onChange={(event) =>
                                                setLogFilters((current) => ({ ...current, keyword: event.target.value }))
                                            }
                                        />
                                    </label>
                                    <div className="inline" style={{ gap: '0.5rem', alignItems: 'flex-end' }}>
                                        <button
                                            id="search-logs-button"
                                            className="button secondary"
                                            type="button"
                                            onClick={() => void fetchLogs()}
                                        >
                                            Search
                                        </button>
                                        <button
                                            id="clear-old-logs-button"
                                            className="button secondary"
                                            type="button"
                                            onClick={() => void handleCleanupLogs()}
                                            disabled={logLoading}
                                        >
                                            Clear old logs
                                        </button>
                                    </div>
                                </div>

                                <div className="helper filter-result-count" style={{ marginTop: '0.5rem' }}>
                                    {logLoading ? 'Loading logs…' : `${logTotal} entries found`}
                                </div>
                                {logError && <div className="helper" style={{ color: '#dc2626' }}>{logError}</div>}

                                {showLogAnalytics && (
                                    <div className="card log-analytics-dashboard" style={{ marginTop: '0.75rem', padding: '0.75rem' }}>
                                        <div className="inline" style={{ gap: '1.5rem', flexWrap: 'wrap' }}>
                                            <div><strong>Total</strong> {logAnalytics.total}</div>
                                            <div><strong>Error</strong> {logAnalytics.error}</div>
                                            <div><strong>Warn</strong> {logAnalytics.warn}</div>
                                            <div><strong>Info</strong> {logAnalytics.info}</div>
                                            <div><strong>Other</strong> {logAnalytics.other}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="log-entry-list" style={{ marginTop: '0.75rem' }}>
                                    {logEntries.length === 0 && !logLoading ? (
                                        <div className="helper">No log entries available.</div>
                                    ) : (
                                        logEntries.map((entry, index) => (
                                            <div key={`${entry.timestamp}-${index}`} className="log-entry" style={{ padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                                                <div className="log-entry-timestamp"><strong>{new Date(entry.timestamp).toLocaleString()}</strong></div>
                                                <div className="log-entry-level">{entry.level}</div>
                                                <div className="log-entry-message">{entry.message}</div>
                                                {entry.stackTrace && <div className="log-entry-stacktrace">{entry.stackTrace}</div>}
                                                <div className="log-entry-context">{entry.context || entry.source}</div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="pagination-controls" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <button
                                        className="button secondary"
                                        type="button"
                                        onClick={() => setLogPage((current) => Math.max(0, current - 1))}
                                        disabled={logPage === 0}
                                    >
                                        Previous
                                    </button>
                                    <span className="helper">Page {logPage + 1}</span>
                                    <button
                                        className="button secondary"
                                        type="button"
                                        onClick={() => setLogPage((current) => current + 1)}
                                        disabled={(logPage + 1) * LOG_PAGE_SIZE >= logTotal}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
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
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => setIncludeArchived(event.target.checked)}
                                />
                                Include archived
                            </label>
                            <input
                                type="search"
                                placeholder="Search by name or description"
                                value={search}
                                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
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
                        products={tableProducts}
                        meta={effectiveMeta}
                        isLoading={isLoading && isBackedByApi}
                        isFetching={isFetching}
                        onEdit={handleEditSelection}
                        onArchive={requestArchive}
                        archivePendingId={archiveMutation.variables ?? null}
                        archivePending={Boolean(archiveMutation.isPending)}
                        onManageMedia={handleManageMedia}
                    />
                </section>
            )}

            {activeSection === 'transactions' && (
                <TransactionsPanel token={auth.token} />
            )}

            {activeSection === 'statistics' && (
                <StatisticsPanel token={auth.token} />
            )}

            {activeSection === 'data-management' && (
                <DataManagementPanel />
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
                    onCreate={handleCreateCategory}
                    onUpdate={handleUpdateCategory}
                    onDelete={handleDeleteCategory}
                    isCreating={useMockCategories ? false : createCategoryMutation.isPending}
                    isUpdating={useMockCategories ? false : updateCategoryMutation.isPending}
                    isDeleting={useMockCategories ? false : deleteCategoryMutation.isPending}
                    deletePendingId={useMockCategories ? null : deleteCategoryMutation.variables?.id ?? null}
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
                    <div id="system-config-page">
                        <form
                            id="system-configuration-page"
                            className="stack"
                            style={{ gap: '1rem' }}
                            onSubmit={handleSettingsSave}
                        >
                            <div>
                                <h2>System Configuration</h2>
                                <p className="helper">Manage operating hours, maintenance, and notification routing.</p>
                            </div>

                            {configLoading && <div className="alert">Loading configuration…</div>}
                            {configError && <div className="alert danger">{configError}</div>}

                            <label htmlFor="inventory-tracking-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    id="inventory-tracking-toggle"
                                    type="checkbox"
                                    ref={trackingToggleRef}
                                    checked={trackingToggleValue}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
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

                            <div className="card" style={{ padding: '1rem' }}>
                                <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3>Operating Hours</h3>
                                        <p className="helper">Configure daily hours, breaks, and holidays.</p>
                                    </div>
                                    <button
                                        id="configure-hours-button"
                                        className="button secondary"
                                        type="button"
                                        onClick={() => setOperatingHoursVisible((current) => !current)}
                                    >
                                        Configure Operating Hours
                                    </button>
                                </div>

                                {operatingHoursVisible && (
                                    <div className="operating-hours-form stack" style={{ marginTop: '1rem' }}>
                                        <div className="inline" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <button
                                                id="enable-247-mode"
                                                className="button secondary"
                                                type="button"
                                                onClick={() => setEnable247(true)}
                                            >
                                                Enable 24/7 Operation
                                            </button>
                                            <button
                                                id="disable-247-mode"
                                                className="button secondary"
                                                type="button"
                                                onClick={() => setEnable247(false)}
                                            >
                                                Disable 24/7 Operation
                                            </button>
                                            <button
                                                id="copy-monday-to-weekdays-button"
                                                className="button secondary"
                                                type="button"
                                                onClick={() => {
                                                    const monday = operatingHoursByDay.monday;
                                                    setOperatingHoursByDay((current) => ({
                                                        ...current,
                                                        tuesday: { ...monday },
                                                        wednesday: { ...monday },
                                                        thursday: { ...monday },
                                                        friday: { ...monday }
                                                    }));
                                                }}
                                            >
                                                Copy Monday hours to all weekdays
                                            </button>
                                        </div>

                                        {DAY_LABELS.map((day) => (
                                            <div key={day.key} className="inline" style={{ gap: '0.75rem', alignItems: 'center' }}>
                                                <span style={{ minWidth: '90px' }}>{day.label}</span>
                                                <input
                                                    id={`${day.key}-opening-time`}
                                                    type="time"
                                                    value={operatingHoursByDay[day.key].start}
                                                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                                        const value = event.target.value;
                                                        setOperatingHoursByDay((current) => ({
                                                            ...current,
                                                            [day.key]: { ...current[day.key], start: value }
                                                        }));
                                                        setSettingsMessage(null);
                                                    }}
                                                />
                                                <input
                                                    id={`${day.key}-closing-time`}
                                                    type="time"
                                                    value={operatingHoursByDay[day.key].end}
                                                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                                        const value = event.target.value;
                                                        setOperatingHoursByDay((current) => ({
                                                            ...current,
                                                            [day.key]: { ...current[day.key], end: value }
                                                        }));
                                                        setSettingsMessage(null);
                                                    }}
                                                />
                                            </div>
                                        ))}

                                        <div className="inline" style={{ gap: '0.75rem', alignItems: 'center' }}>
                                            <button
                                                id="add-break-button"
                                                className="button secondary"
                                                type="button"
                                                onClick={() => setBreakWindow({ start: '12:00', end: '13:00' })}
                                            >
                                                Add Break
                                            </button>
                                            <input
                                                id="break-start-time"
                                                type="time"
                                                value={breakWindow.start}
                                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                    setBreakWindow((current) => ({ ...current, start: event.target.value }))
                                                }
                                            />
                                            <input
                                                id="break-end-time"
                                                type="time"
                                                value={breakWindow.end}
                                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                    setBreakWindow((current) => ({ ...current, end: event.target.value }))
                                                }
                                            />
                                        </div>

                                        <div className="stack" style={{ gap: '0.5rem' }}>
                                            <button
                                                id="add-holiday-button"
                                                className="button secondary"
                                                type="button"
                                                onClick={() => setHolidayConfig((current) => ({ ...current }))}
                                            >
                                                Add Holiday
                                            </button>
                                            <div className="inline" style={{ gap: '0.75rem', alignItems: 'center' }}>
                                                <input
                                                    id="holiday-date"
                                                    type="date"
                                                    value={holidayConfig.date}
                                                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                        setHolidayConfig((current) => ({ ...current, date: event.target.value }))
                                                    }
                                                />
                                                <input
                                                    id="holiday-name"
                                                    type="text"
                                                    placeholder="Holiday name"
                                                    value={holidayConfig.name}
                                                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                        setHolidayConfig((current) => ({ ...current, name: event.target.value }))
                                                    }
                                                />
                                            </div>
                                            <div className="inline" style={{ gap: '0.75rem' }}>
                                                <label htmlFor="holiday-hours-option" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <input
                                                        id="holiday-hours-option"
                                                        type="radio"
                                                        name="holiday-mode"
                                                        checked={!holidayConfig.closed}
                                                        onChange={() => setHolidayConfig((current) => ({ ...current, closed: false }))}
                                                    />
                                                    Custom hours
                                                </label>
                                                <label htmlFor="holiday-closed-option" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <input
                                                        id="holiday-closed-option"
                                                        type="radio"
                                                        name="holiday-mode"
                                                        checked={holidayConfig.closed}
                                                        onChange={() => setHolidayConfig((current) => ({ ...current, closed: true }))}
                                                    />
                                                    Closed all day
                                                </label>
                                            </div>
                                            {!holidayConfig.closed && (
                                                <div className="inline" style={{ gap: '0.75rem' }}>
                                                    <input
                                                        type="time"
                                                        value={holidayConfig.start}
                                                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                            setHolidayConfig((current) => ({ ...current, start: event.target.value }))
                                                        }
                                                    />
                                                    <input
                                                        type="time"
                                                        value={holidayConfig.end}
                                                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                            setHolidayConfig((current) => ({ ...current, end: event.target.value }))
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="inline" style={{ gap: '0.75rem' }}>
                                            <button
                                                id="save-operating-hours-button"
                                                className="button"
                                                type="button"
                                                onClick={handleOperatingHoursSave}
                                            >
                                                Save operating hours
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="inline" style={{ gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                                    <label className="stack" style={{ gap: '0.25rem' }}>
                                        <span>Operating hours start</span>
                                        <input
                                            id="operating-hours-start"
                                            type="time"
                                            value={settingsForm.operatingHoursStart}
                                            onChange={(event: ChangeEvent<HTMLInputElement>) => {
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
                                            onChange={(event: ChangeEvent<HTMLInputElement>) => {
                                                const value = event.target.value;
                                                setSettingsForm((current) => ({ ...current, operatingHoursEnd: value }));
                                                setSettingsMessage(null);
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '1rem' }}>
                                <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3>Maintenance Mode</h3>
                                        <p className="helper">Toggle maintenance mode and schedule windows.</p>
                                    </div>
                                    <span
                                        id="maintenance-status"
                                        className={maintenanceConfig.enabled ? 'maintenance-mode-active' : undefined}
                                    >
                                        {maintenanceConfig.enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                <label htmlFor="maintenance-mode-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        id="maintenance-mode-toggle"
                                        type="checkbox"
                                        checked={maintenanceConfig.enabled}
                                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                            setMaintenanceConfig((current) => ({ ...current, enabled: event.target.checked }))
                                        }
                                    />
                                    Maintenance Mode
                                </label>
                                <label className="stack" style={{ gap: '0.25rem' }}>
                                    <span>Maintenance message</span>
                                    <input
                                        id="maintenance-custom-message"
                                        type="text"
                                        value={maintenanceConfig.message ?? ''}
                                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                            setMaintenanceConfig((current) => ({ ...current, message: event.target.value }))
                                        }
                                    />
                                </label>
                                <div className="inline" style={{ gap: '0.75rem' }}>
                                    <button
                                        id="save-maintenance-config"
                                        className="button"
                                        type="button"
                                        onClick={handleMaintenanceSave}
                                    >
                                        Save maintenance configuration
                                    </button>
                                    <button
                                        id="maintenance-config-link"
                                        className="button secondary"
                                        type="button"
                                    >
                                        Schedule maintenance
                                    </button>
                                </div>

                                <div className="stack" style={{ marginTop: '0.75rem' }}>
                                    <div className="inline" style={{ gap: '0.75rem' }}>
                                        <input
                                            id="maintenance-schedule-date"
                                            type="date"
                                            value={maintenanceSchedule.date}
                                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                setMaintenanceSchedule((current) => ({ ...current, date: event.target.value }))
                                            }
                                        />
                                        <input
                                            id="maintenance-schedule-time"
                                            type="text"
                                            placeholder="02:00-06:00"
                                            value={maintenanceSchedule.timeRange}
                                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                setMaintenanceSchedule((current) => ({ ...current, timeRange: event.target.value }))
                                            }
                                        />
                                    </div>
                                    <input
                                        id="scheduled-maintenance-message"
                                        type="text"
                                        placeholder="Scheduled maintenance message"
                                        value={maintenanceSchedule.message}
                                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                            setMaintenanceSchedule((current) => ({ ...current, message: event.target.value }))
                                        }
                                    />
                                    <button
                                        id="save-maintenance-schedule"
                                        className="button secondary"
                                        type="button"
                                        onClick={handleMaintenanceScheduleSave}
                                    >
                                        Save schedule
                                    </button>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '1rem' }}>
                                <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3>Notification Email Configuration</h3>
                                        <p className="helper">Route alerts to the right recipients.</p>
                                    </div>
                                    <button
                                        id="configure-notifications-button"
                                        className="button secondary"
                                        type="button"
                                        onClick={() => setNotificationSettingsVisible((current) => !current)}
                                    >
                                        Configure Notifications
                                    </button>
                                </div>

                                {notificationSettingsVisible && (
                                    <div className="notification-settings-page stack" style={{ marginTop: '1rem' }}>
                                        <h4>Notification Email Configuration</h4>
                                        <div className="inline" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <select
                                                id="alert-type-select"
                                                value={notificationForm.alertType}
                                                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                                    setNotificationForm((current) => ({ ...current, alertType: event.target.value }))
                                                }
                                            >
                                                {alertTypeOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                id="notification-email-input"
                                                type="email"
                                                placeholder="admin@example.com"
                                                value={notificationForm.email}
                                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                    setNotificationForm((current) => ({ ...current, email: event.target.value }))
                                                }
                                            />
                                            <button id="add-email-button" className="button secondary" type="button" onClick={handleAddRecipient}>
                                                Add email
                                            </button>
                                        </div>
                                        <div className="inline" style={{ gap: '0.75rem' }}>
                                            <input
                                                id="new-email-input"
                                                type="email"
                                                placeholder="newadmin@example.com"
                                                value={notificationForm.email}
                                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                    setNotificationForm((current) => ({ ...current, email: event.target.value }))
                                                }
                                            />
                                            <button id="add-new-email-button" className="button secondary" type="button" onClick={handleAddRecipient}>
                                                Add new email
                                            </button>
                                        </div>
                                        <button id="save-notification-config" className="button" type="button" onClick={() => setSettingsMessage({ type: 'success', text: 'Notification settings saved' })}>
                                            Save notification settings
                                        </button>
                                        <div className="stack" style={{ marginTop: '0.75rem' }}>
                                            {notificationRecipients.length === 0 && (
                                                <div className="helper">No notification recipients configured.</div>
                                            )}
                                            {notificationRecipients.map((recipient) => (
                                                <div key={recipient.id} className="inline" style={{ justifyContent: 'space-between', gap: '0.75rem' }}>
                                                    <div className="stack" style={{ gap: '0.15rem' }}>
                                                        <strong>{recipient.email}</strong>
                                                        <span className="helper">
                                                            {alertTypeOptions.find((option) => option.value === recipient.alertType)?.label || recipient.alertType}
                                                        </span>
                                                        <span className="email-status">{recipient.status === 'verified' ? 'Verified' : 'Pending Verification'}</span>
                                                    </div>
                                                    <div className="inline" style={{ gap: '0.5rem' }}>
                                                        <button
                                                            className="button secondary set-primary-button"
                                                            type="button"
                                                            onClick={() => handleSetPrimaryRecipient(recipient.id)}
                                                        >
                                                            Set Primary
                                                        </button>
                                                        <button
                                                            className="button secondary remove-recipient-button"
                                                            type="button"
                                                            onClick={() => handleRemoveRecipient(recipient.id)}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="card" style={{ marginTop: '1rem', padding: '0.75rem' }}>
                                            <h4>Email Tests & Diagnostics</h4>
                                            <div className="inline" style={{ gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                                <select
                                                    id="notification-test-type"
                                                    value={testEmailForm.alertType}
                                                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                                        setTestEmailForm((current) => ({ ...current, alertType: event.target.value }))
                                                    }
                                                >
                                                    {alertTypeOptions.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    id="test-email-address"
                                                    type="email"
                                                    placeholder="optional recipient override"
                                                    value={testEmailForm.recipient}
                                                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                                        setTestEmailForm((current) => ({ ...current, recipient: event.target.value }))
                                                    }
                                                />
                                                <button id="send-test-email-button" className="button secondary" type="button" onClick={handleSendTestEmail}>
                                                    Send Test Email
                                                </button>
                                                <button id="smtp-diagnostics-button" className="button secondary" type="button" onClick={handleSmtpDiagnostics}>
                                                    SMTP Diagnostics
                                                </button>
                                            </div>
                                            {smtpDiagnostics && (
                                                <div className="helper" style={{ marginTop: '0.5rem' }}>{smtpDiagnostics}</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="inline" style={{ gap: '0.75rem' }}>
                                <button id="save-settings-button" className="button" type="submit">
                                    Save Settings
                                </button>
                                <button className="button secondary" type="button" onClick={() => setSettingsMessage(null)}>
                                    Reset Message
                                </button>
                            </div>

                            {settingsMessage && (
                                <div
                                    className={`alert ${settingsMessage.type === 'error' ? 'danger' : 'success'}${settingsMessage.type === 'success' ? ' success-message' : ''
                                        }`}
                                >
                                    {settingsMessage.text}
                                </div>
                            )}
                        </form>
                    </div>
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
