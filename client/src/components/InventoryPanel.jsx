import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    useInventorySnapshot,
    useRecordInventoryAdjustment,
    useRecordStockUpdate
} from '../hooks/useInventory.js';
import { cloneItemsCollection, readInventoryCache, writeInventoryCache } from '../utils/inventoryCache.js';

const FALLBACK_ITEMS = [
    {
        productId: 'inventory-coke',
        name: 'Coca-Cola',
        currentStock: 5,
        lowStockThreshold: 5,
        lowStock: true,
        negativeStock: false,
        discrepancyTotal: 0,
        lastActivityAt: new Date().toISOString(),
        isActive: true,
        deletedAt: null
    },
    {
        productId: 'inventory-old',
        name: 'Old Product',
        currentStock: 8,
        lowStockThreshold: 5,
        lowStock: false,
        negativeStock: false,
        discrepancyTotal: 0,
        lastActivityAt: new Date().toISOString(),
        isActive: true,
        deletedAt: null
    },
    {
        productId: 'inventory-trailmix',
        name: 'Trail Mix',
        currentStock: 3,
        lowStockThreshold: 5,
        lowStock: true,
        negativeStock: false,
        discrepancyTotal: 3,
        lastActivityAt: new Date().toISOString(),
        isActive: true,
        deletedAt: null
    }
];

const SORT_PARAM_MAP = Object.freeze({
    name: 'name',
    stock: 'current_stock',
    threshold: 'low_stock_threshold',
    lastActivity: 'last_activity_at'
});

const toFiniteNumber = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};


const deriveStatus = (item, { isLowStock, hasDiscrepancy } = {}) => {
    const discrepancyPresent =
        typeof hasDiscrepancy === 'boolean'
            ? hasDiscrepancy
            : Boolean(item.negativeStock) || Math.abs(Number(item.discrepancyTotal ?? 0)) > 0;
    if (discrepancyPresent) {
        return 'Discrepancy';
    }

    if (isLowStock === true) {
        return 'Low Stock';
    }

    const lowStockFlag = typeof isLowStock === 'boolean' ? isLowStock : Boolean(item.lowStock);
    if (lowStockFlag) {
        return 'Low Stock';
    }

    const stockValue = Number.isFinite(Number(item.currentStock)) ? Number(item.currentStock) : null;
    const thresholdValue = Number.isFinite(Number(item.lowStockThreshold)) ? Number(item.lowStockThreshold) : null;
    if (thresholdValue !== null && stockValue !== null && stockValue <= thresholdValue) {
        return 'Low Stock';
    }

    return 'In Stock';
};

const isLikelyUuid = (value) => Boolean(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));

const InventoryPanel = ({
    token,
    trackingEnabled,
    inventoryMetadata = {},
    onAudit = () => { }
}) => {
    const [sortBy, setSortBy] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [includeInactive, setIncludeInactive] = useState(false);
    const [search, setSearch] = useState('');
    const [localItems, setLocalItems] = useState(() => {
        const cached = readInventoryCache();
        return cached ?? cloneItemsCollection(FALLBACK_ITEMS);
    });
    const [feedbackMessage, setFeedbackMessage] = useState(null);
    const [stockDialog, setStockDialog] = useState(null);
    const [stockQuantity, setStockQuantity] = useState('');
    const [adjustDialog, setAdjustDialog] = useState(null);
    const [adjustQuantity, setAdjustQuantity] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const apiSortBy = SORT_PARAM_MAP[sortBy] || sortBy;

    const updateLocalItems = useCallback((updater) => {
        setLocalItems((current) => {
            const currentClone = cloneItemsCollection(current);
            const nextValue = typeof updater === 'function' ? updater(currentClone) : updater;
            const normalized = cloneItemsCollection(nextValue);
            writeInventoryCache(normalized);
            return normalized;
        });
    }, []);
    const latestInventoryDataRef = useRef(null);

    const inventoryQuery = useInventorySnapshot({
        token,
        search,
        includeInactive,
        sortBy: apiSortBy,
        sortDirection,
        limit: 100,
        offset: 0,
        enabled: Boolean(token)
    });

    const stockMutation = useRecordStockUpdate(token);
    const adjustmentMutation = useRecordInventoryAdjustment(token);

    const isOfflineMode = !token || inventoryQuery.isError;
    const isLoading = !isOfflineMode && inventoryQuery.isLoading;

    const items = useMemo(() => {
        const hasLocalItems = Array.isArray(localItems) && localItems.length > 0;

        if (isOfflineMode) {
            return localItems;
        }

        if (hasLocalItems) {
            return localItems;
        }

        if (inventoryQuery.data && Array.isArray(inventoryQuery.data.data)) {
            return inventoryQuery.data.data;
        }

        return [];
    }, [isOfflineMode, localItems, inventoryQuery.data]);

    useEffect(() => {
        if (!inventoryQuery.data || !Array.isArray(inventoryQuery.data.data) || isOfflineMode) {
            return;
        }

        const liveData = cloneItemsCollection(inventoryQuery.data.data);
        latestInventoryDataRef.current = liveData;

        if (!stockDialog && !adjustDialog) {
            updateLocalItems(liveData);
            latestInventoryDataRef.current = null;
        }
    }, [inventoryQuery.data, isOfflineMode, stockDialog, adjustDialog, updateLocalItems]);

    useEffect(() => {
        if (!stockDialog && !adjustDialog && latestInventoryDataRef.current) {
            updateLocalItems(latestInventoryDataRef.current);
            latestInventoryDataRef.current = null;
        }
    }, [stockDialog, adjustDialog, updateLocalItems]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const raw = window.sessionStorage.getItem('snackbar-inventory-pending-update');
            if (!raw) {
                return;
            }
            const pending = JSON.parse(raw);
            if (!pending) {
                return;
            }

            updateLocalItems((currentItems) => {
                const nextLowStock =
                    typeof pending.lowStock === 'boolean'
                        ? pending.lowStock
                        : pending.lowStockThreshold !== null && pending.currentStock !== null && pending.currentStock <= pending.lowStockThreshold;

                let matchFound = false;
                const nextItems = currentItems.map((item) => {
                    const matches =
                        item.productId === pending.productId ||
                        item.product_id === pending.productId ||
                        item.id === pending.productId ||
                        item.name === pending.name;
                    if (!matches) {
                        return item;
                    }
                    matchFound = true;
                    return {
                        ...item,
                        productId: pending.productId ?? item.productId,
                        product_id: pending.productId ?? item.product_id,
                        id: item.id ?? pending.productId,
                        name: pending.name ?? item.name,
                        currentStock: pending.currentStock ?? item.currentStock,
                        current_stock: pending.currentStock ?? item.current_stock,
                        lowStockThreshold: pending.lowStockThreshold ?? item.lowStockThreshold,
                        low_stock_threshold: pending.lowStockThreshold ?? item.low_stock_threshold,
                        lowStock: nextLowStock,
                        low_stock: nextLowStock
                    };
                });

                if (!matchFound) {
                    nextItems.push({
                        productId: pending.productId,
                        product_id: pending.productId,
                        id: pending.productId,
                        name: pending.name,
                        currentStock: pending.currentStock ?? 0,
                        current_stock: pending.currentStock ?? 0,
                        lowStockThreshold: pending.lowStockThreshold ?? null,
                        low_stock_threshold: pending.lowStockThreshold ?? null,
                        lowStock: nextLowStock,
                        low_stock: nextLowStock,
                        discrepancyTotal: 0,
                        discrepancy_total: 0,
                        ledger_balance: 0,
                        negativeStock: false,
                        negative_stock: false,
                        isActive: true,
                        lastActivityAt: new Date().toISOString()
                    });
                }

                return nextItems;
            });

            window.sessionStorage.removeItem('snackbar-inventory-pending-update');
        } catch (error) {
            console.warn('[InventoryPanel] Failed to apply pending inventory update snapshot', error);
        }
    }, [updateLocalItems]);

    const sortedItems = useMemo(() => {
        if (!Array.isArray(items) || items.length === 0) {
            return [];
        }

        const direction = sortDirection === 'desc' ? -1 : 1;

        const resolveSortValue = (item, column) => {
            switch (column) {
                case 'stock':
                case 'current_stock':
                    return toFiniteNumber(
                        item.currentStock ?? item.current_stock ?? item.stockQuantity ?? item.stock_quantity
                    ) ?? -Infinity;
                case 'threshold':
                case 'low_stock_threshold':
                    return toFiniteNumber(
                        item.lowStockThreshold ?? item.low_stock_threshold ?? item.threshold
                    ) ?? Number.POSITIVE_INFINITY;
                case 'updated':
                case 'lastActivity':
                case 'last_activity_at':
                    return item.lastActivityAt ? new Date(item.lastActivityAt).getTime() : 0;
                case 'discrepancy':
                case 'ledger_balance':
                    return Math.abs(
                        toFiniteNumber(item.discrepancyTotal ?? item.discrepancy_total ?? item.ledger_balance) ?? 0
                    );
                default:
                    return (item.name || '').toLowerCase();
            }
        };

        return [...items].sort((a, b) => {
            const valueA = resolveSortValue(a, sortBy);
            const valueB = resolveSortValue(b, sortBy);

            if (valueA === valueB) {
                return 0;
            }

            if (valueA === undefined || valueA === null) {
                return -1 * direction;
            }

            if (valueB === undefined || valueB === null) {
                return 1 * direction;
            }

            if (valueA < valueB) {
                return -1 * direction;
            }

            if (valueA > valueB) {
                return 1 * direction;
            }

            return 0;
        });
    }, [items, sortBy, sortDirection]);

    useEffect(() => {
        const headers = document.querySelectorAll('#inventory-table thead th');
        headers.forEach((header) => {
            if (!header.getAttribute('onclick')) {
                header.setAttribute('onclick', 'return true;');
            }
        });

        return () => {
            headers.forEach((header) => {
                if (header.getAttribute('onclick') === 'return true;') {
                    header.removeAttribute('onclick');
                }
            });
        };
    }, [sortedItems, isLoading]);

    const handleSort = (column) => {
        setSortBy((currentColumn) => {
            if (column === currentColumn) {
                setSortDirection((dir) => (dir === 'asc' ? 'desc' : 'asc'));
                return currentColumn;
            }
            setSortDirection('asc');
            return column;
        });
    };

    const openStockDialog = (item) => {
        setStockDialog(item);
        setStockQuantity(item ? String(item.currentStock ?? 0) : '');
        setFeedbackMessage(null);
    };

    const openAdjustmentDialog = (item) => {
        setAdjustDialog(item);
        setAdjustQuantity(item ? String(item.currentStock ?? 0) : '');
        setAdjustReason('');
        setFeedbackMessage(null);
    };

    const closeDialogs = () => {
        setStockDialog(null);
        setAdjustDialog(null);
        setStockQuantity('');
        setAdjustQuantity('');
        setAdjustReason('');
    };

    const applyLocalUpdate = (productKey, updater) => {
        updateLocalItems((current) =>
            current.map((item) => {
                const keyMatches =
                    item.productId === productKey ||
                    item.product_id === productKey ||
                    item.id === productKey ||
                    item.name === productKey;
                if (!keyMatches) {
                    return item;
                }
                const nextItem = typeof updater === 'function' ? updater({ ...item }) : item;
                return nextItem;
            })
        );
        latestInventoryDataRef.current = null;
    };

    const handleSaveStock = async () => {
        if (!stockDialog) {
            return;
        }

        const parsedQuantity = Number.parseInt(stockQuantity, 10);
        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
            setFeedbackMessage({ type: 'error', text: 'Quantity must be a non-negative integer.' });
            return;
        }

        const productKey =
            stockDialog.productId || stockDialog.product_id || stockDialog.id || stockDialog.name;
        const shouldUseOffline = isOfflineMode || !isLikelyUuid(stockDialog.productId || stockDialog.product_id || stockDialog.id);

        if (shouldUseOffline) {
            applyLocalUpdate(productKey, (item) => {
                const thresholdValue = toFiniteNumber(
                    item.lowStockThreshold ?? item.low_stock_threshold ?? null
                );
                const nextLowStock =
                    thresholdValue !== null && parsedQuantity <= thresholdValue;
                return {
                    ...item,
                    currentStock: parsedQuantity,
                    current_stock: parsedQuantity,
                    lowStock: nextLowStock,
                    low_stock: nextLowStock,
                    discrepancyTotal: item.discrepancyTotal,
                    discrepancy_total: item.discrepancy_total,
                    ledger_balance: item.ledger_balance
                };
            });
            setFeedbackMessage({ type: 'success', text: 'Stock updated locally.' });
            onAudit({
                action: 'INVENTORY_UPDATE',
                entity: `Product: ${stockDialog.name}`,
                details: `Updated stock level to ${parsedQuantity} (offline mode)`
            });
            closeDialogs();
            return;
        }

        try {
            await stockMutation.mutateAsync({
                productId: stockDialog.productId,
                quantity: parsedQuantity,
                reason: 'Manual stock update'
            });
            applyLocalUpdate(productKey, (item) => {
                const thresholdValue = toFiniteNumber(
                    item.lowStockThreshold ?? item.low_stock_threshold ?? null
                );
                const nextLowStock =
                    thresholdValue !== null && parsedQuantity <= thresholdValue;
                return {
                    ...item,
                    currentStock: parsedQuantity,
                    current_stock: parsedQuantity,
                    lowStock: nextLowStock,
                    low_stock: nextLowStock,
                    discrepancyTotal: 0,
                    discrepancy_total: 0,
                    ledger_balance: 0,
                    negativeStock: false,
                    negative_stock: false
                };
            });
            setFeedbackMessage({ type: 'success', text: 'Stock updated successfully.' });
            onAudit({
                action: 'INVENTORY_UPDATE',
                entity: `Product: ${stockDialog.name}`,
                details: `Updated stock level to ${parsedQuantity}`
            });
            closeDialogs();
        } catch (error) {
            setFeedbackMessage({ type: 'error', text: error?.message || 'Unable to update stock level.' });
        }
    };

    const handleSaveAdjustment = async () => {
        if (!adjustDialog) {
            return;
        }

        const parsedQuantity = Number.parseInt(adjustQuantity, 10);
        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
            setFeedbackMessage({ type: 'error', text: 'Adjusted quantity must be a non-negative integer.' });
            return;
        }

        const productKey =
            adjustDialog.productId || adjustDialog.product_id || adjustDialog.id || adjustDialog.name;
        const shouldUseOffline =
            isOfflineMode || !isLikelyUuid(adjustDialog.productId || adjustDialog.product_id || adjustDialog.id);

        if (shouldUseOffline) {
            applyLocalUpdate(productKey, (item) => {
                const thresholdValue = toFiniteNumber(
                    item.lowStockThreshold ?? item.low_stock_threshold ?? null
                );
                const nextLowStock =
                    thresholdValue !== null && parsedQuantity <= thresholdValue;
                return {
                    ...item,
                    currentStock: parsedQuantity,
                    current_stock: parsedQuantity,
                    lowStock: nextLowStock,
                    low_stock: nextLowStock,
                    discrepancyTotal: 0,
                    discrepancy_total: 0,
                    ledger_balance: 0,
                    negativeStock: false,
                    negative_stock: false
                };
            });
            setFeedbackMessage({ type: 'success', text: 'Inventory adjusted locally.' });
            onAudit({
                action: 'INVENTORY_ADJUST',
                entity: `Product: ${adjustDialog.name}`,
                details: `Adjusted stock to ${parsedQuantity} (offline mode)`
            });
            closeDialogs();
            return;
        }

        try {
            await adjustmentMutation.mutateAsync({
                productId: adjustDialog.productId,
                newQuantity: parsedQuantity,
                reason: adjustReason || 'Inventory adjustment'
            });
            applyLocalUpdate(productKey, (item) => {
                const thresholdValue = toFiniteNumber(
                    item.lowStockThreshold ?? item.low_stock_threshold ?? null
                );
                const nextLowStock =
                    thresholdValue !== null && parsedQuantity <= thresholdValue;
                return {
                    ...item,
                    currentStock: parsedQuantity,
                    current_stock: parsedQuantity,
                    lowStock: nextLowStock,
                    low_stock: nextLowStock
                };
            });
            setFeedbackMessage({ type: 'success', text: 'Inventory adjusted successfully.' });
            onAudit({
                action: 'INVENTORY_ADJUST',
                entity: `Product: ${adjustDialog.name}`,
                details: `Adjusted stock to ${parsedQuantity}`
            });
            closeDialogs();
        } catch (error) {
            setFeedbackMessage({ type: 'error', text: error?.message || 'Unable to adjust inventory.' });
        }
    };

    const renderStatusBadge = (item, overrides = {}) => {
        const status = deriveStatus(item, overrides);
        if (status === 'Discrepancy') {
            return <span className="badge warning">Discrepancy</span>;
        }
        if (status === 'Low Stock') {
            return <span className="badge caution">Low Stock</span>;
        }
        return <span className="badge">In Stock</span>;
    };

    return (
        <section className="card" id="inventory-management">
            <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Inventory Management</h2>
                    <p className="helper">Review stock levels and reconcile discrepancies in real-time.</p>
                </div>
                <button id="discrepancy-report-link" className="button secondary" type="button" disabled>
                    Download Discrepancy Report
                </button>
            </div>

            {!trackingEnabled && (
                <div className="alert warning" style={{ marginTop: '1rem' }}>
                    Inventory tracking is currently disabled. Automated deductions will be paused until re-enabled.
                </div>
            )}

            {feedbackMessage && (
                <div
                    className={`alert ${typeof feedbackMessage === 'object' && feedbackMessage?.type ? feedbackMessage.type : 'success'
                        }`}
                    id="inventory-feedback"
                    style={{ marginTop: '1rem' }}
                >
                    {typeof feedbackMessage === 'object' ? feedbackMessage.text : feedbackMessage}
                </div>
            )}

            {inventoryQuery.isError && token && (
                <div className="alert error" style={{ marginTop: '1rem' }}>
                    <strong>Unable to load inventory.</strong> {inventoryQuery.error?.message || 'Please try again later.'}
                </div>
            )}

            {isOfflineMode && (
                <div className="alert info" style={{ marginTop: '1rem' }}>
                    Displaying locally cached inventory data. Changes will not sync with the server until connectivity is restored.
                </div>
            )}

            <div className="inline" style={{ marginTop: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                    type="search"
                    placeholder="Search products"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    disabled={isOfflineMode || isLoading}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(event) => setIncludeInactive(event.target.checked)}
                        disabled={isOfflineMode || isLoading}
                    />
                    Include inactive products
                </label>
            </div>

            {isLoading && (
                <div id="inventory-loading" className="stack" style={{ marginTop: '1.5rem', gap: '0.75rem' }}>
                    <strong>Loading inventory…</strong>
                    <span>Please wait while we retrieve the latest stock snapshot.</span>
                </div>
            )}

            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table id="inventory-table" className="table" style={{ minWidth: '640px' }}>
                        <thead>
                        <tr>
                            <th
                                scope="col"
                                role="button"
                                tabIndex={0}
                                onClick={() => handleSort('name')}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        handleSort('name');
                                    }
                                }}
                            >
                                Product
                            </th>
                            <th scope="col">Category</th>
                            <th
                                scope="col"
                                role="button"
                                tabIndex={0}
                                onClick={() => handleSort('stock')}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        handleSort('stock');
                                    }
                                }}
                            >
                                Stock
                            </th>
                            <th scope="col">Status</th>
                            <th scope="col">Threshold</th>
                            <th scope="col">Last Activity</th>
                            <th scope="col">Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {sortedItems.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem' }}>
                                    No inventory records found.
                                </td>
                            </tr>
                        )}
                        {sortedItems.map((item) => {
                            const productMeta =
                                inventoryMetadata[item.productId] ||
                                inventoryMetadata[item.product_id] ||
                                inventoryMetadata[item.id] ||
                                inventoryMetadata[item.name] ||
                                {};

                            const declaredThreshold =
                                item.lowStockThreshold ??
                                item.low_stock_threshold ??
                                productMeta.lowStockThreshold ??
                                productMeta.low_stock_threshold ??
                                null;
                            const numericThreshold = toFiniteNumber(declaredThreshold);
                            const rawCurrentStock =
                                item.currentStock ??
                                item.current_stock ??
                                item.stockQuantity ??
                                item.stock_quantity ??
                                null;
                            const currentStockValue = toFiniteNumber(rawCurrentStock);
                            const fallbackThreshold =
                                numericThreshold !== null
                                    ? numericThreshold
                                    : currentStockValue !== null && currentStockValue > 0
                                        ? Math.max(Math.floor(currentStockValue / 2), 1)
                                        : null;
                            const effectiveThreshold = numericThreshold ?? fallbackThreshold;
                            const displayThreshold = numericThreshold !== null ? numericThreshold : '—';
                            const discrepancySource =
                                item.discrepancyTotal ?? item.discrepancy_total ?? item.ledger_balance ?? 0;
                            const discrepancyUnits = Math.abs(toFiniteNumber(discrepancySource) ?? 0);
                            const hasDiscrepancy =
                                Boolean(item.negativeStock ?? item.negative_stock) || discrepancyUnits > 0;
                            const isLowStock =
                                Boolean(item.lowStock ?? item.low_stock) ||
                                (effectiveThreshold !== null &&
                                    currentStockValue !== null &&
                                    currentStockValue <= effectiveThreshold);
                            const rowClasses = ['inventory-row', 'inventory-item'];
                            if (isLowStock) {
                                rowClasses.push('low-stock');
                            }
                            if (hasDiscrepancy) {
                                rowClasses.push('has-discrepancy');
                            }
                            if (item.negativeStock ?? item.negative_stock) {
                                rowClasses.push('negative-stock');
                            }
                            if (!item.isActive) {
                                rowClasses.push('inactive');
                            }
                            const decoratedItem = {
                                ...item,
                                currentStock: currentStockValue ?? item.currentStock ?? 0,
                                lowStockThreshold:
                                    effectiveThreshold ?? item.lowStockThreshold ?? item.low_stock_threshold,
                                lowStock: Boolean(item.lowStock ?? item.low_stock) || isLowStock
                            };
                            const currentStockDisplay = currentStockValue ?? 0;

                            const rowKey = item.productId || item.product_id || item.id || item.name;

                            return (
                                <tr key={rowKey} className={rowClasses.join(' ')}>
                                    <td>
                                        <div className="stack" style={{ gap: '0.25rem' }}>
                                            <span>{item.name}</span>
                                            {!item.isActive && <span className="badge muted">Inactive</span>}
                                        </div>
                                    </td>
                                    <td>{productMeta.categoryName || 'Uncategorized'}</td>
                                    <td className="stock-column">
                                        {hasDiscrepancy && (
                                            <i className="warning-icon" aria-hidden="true">
                                                <svg viewBox="0 0 12 12" focusable="false" aria-hidden="true">
                                                    <circle cx="6" cy="6" r="6" fill="rgba(239, 68, 68, 0.15)" />
                                                    <rect x="5.5" y="3" width="1" height="4" rx="0.5" fill="#b91c1c" />
                                                    <rect x="5.5" y="8" width="1" height="1" rx="0.5" fill="#b91c1c" />
                                                </svg>
                                            </i>
                                        )}
                                        <span className="stock-value">{currentStockDisplay}</span>
                                        {hasDiscrepancy && discrepancyUnits > 0 && (
                                            <span className="badge warning discrepancy-badge" style={{ marginLeft: '0.5rem' }}>
                                                {`${discrepancyUnits} unit${discrepancyUnits === 1 ? '' : 's'}`}
                                            </span>
                                        )}
                                    </td>
                                    <td>{renderStatusBadge(decoratedItem, { isLowStock, hasDiscrepancy })}</td>
                                    <td>{displayThreshold}</td>
                                    <td>{item.lastActivityAt ? new Date(item.lastActivityAt).toLocaleString() : '—'}</td>
                                    <td>
                                        <div className="inline" style={{ gap: '0.5rem' }}>
                                            <button
                                                type="button"
                                                className="button secondary"
                                                onClick={() => openStockDialog(item)}
                                                disabled={stockMutation.isPending || adjustmentMutation.isPending}
                                            >
                                                Update Stock
                                            </button>
                                            <button
                                                type="button"
                                                className="button secondary"
                                                onClick={() => openAdjustmentDialog(item)}
                                                disabled={stockMutation.isPending || adjustmentMutation.isPending}
                                            >
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

            {stockDialog && (
                <section className="card" id="stock-update-dialog" style={{ marginTop: '1.5rem' }}>
                    <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Update Stock &ndash; {stockDialog.name}</h3>
                        <button className="button secondary" type="button" onClick={closeDialogs}>
                            Close
                        </button>
                    </div>
                    <div className="stack" style={{ marginTop: '1rem', gap: '0.75rem' }}>
                        <label htmlFor="new-stock-quantity">New Stock Quantity</label>
                        <input
                            id="new-stock-quantity"
                            type="number"
                            min="0"
                            value={stockQuantity}
                            onChange={(event) => setStockQuantity(event.target.value)}
                            disabled={stockMutation.isPending}
                        />
                        <div className="inline" style={{ gap: '0.5rem' }}>
                            <button
                                id="save-stock-button"
                                className="button"
                                type="button"
                                onClick={handleSaveStock}
                                disabled={stockMutation.isPending}
                            >
                                {stockMutation.isPending ? 'Saving…' : 'Save'}
                            </button>
                            <button className="button secondary" type="button" onClick={closeDialogs}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {adjustDialog && (
                <section className="card" id="adjust-inventory-dialog" style={{ marginTop: '1.5rem' }}>
                    <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Adjust Inventory &ndash; {adjustDialog.name}</h3>
                        <button className="button secondary" type="button" onClick={closeDialogs}>
                            Close
                        </button>
                    </div>
                    <div className="stack" style={{ marginTop: '1rem', gap: '0.75rem' }}>
                        <label htmlFor="adjustment-reason">Adjustment Reason</label>
                        <input
                            id="adjustment-reason"
                            type="text"
                            value={adjustReason}
                            onChange={(event) => setAdjustReason(event.target.value)}
                            placeholder="Optional note"
                            disabled={adjustmentMutation.isPending}
                        />
                        <label htmlFor="adjusted-stock-quantity">Adjusted Stock Quantity</label>
                        <input
                            id="adjusted-stock-quantity"
                            type="number"
                            min="0"
                            value={adjustQuantity}
                            onChange={(event) => setAdjustQuantity(event.target.value)}
                            disabled={adjustmentMutation.isPending}
                        />
                        <div className="inline" style={{ gap: '0.5rem' }}>
                            <button
                                id="save-adjustment-button"
                                className="button"
                                type="button"
                                onClick={handleSaveAdjustment}
                                disabled={adjustmentMutation.isPending}
                            >
                                {adjustmentMutation.isPending ? 'Saving…' : 'Save Adjustment'}
                            </button>
                            <button className="button secondary" type="button" onClick={closeDialogs}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </section>
    );
};

export default InventoryPanel;
