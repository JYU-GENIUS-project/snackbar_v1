import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    INVENTORY_QUERY_KEY,
    INVENTORY_TRACKING_QUERY_KEY,
    useInventorySnapshot,
    useRecordInventoryAdjustment,
    useRecordStockUpdate
} from '../hooks/useInventory.js';

const API_BASE_PATH = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

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
        discrepancyTotal: 0,
        lastActivityAt: new Date().toISOString(),
        isActive: true,
        deletedAt: null
    }
];

const FALLBACK_SORT_KEYS = {
    name: (item) => (item.name || '').toLowerCase(),
    stock: (item) => Number.parseInt(item.currentStock, 10) || 0
};

const SORT_PARAM_MAP = Object.freeze({
    name: 'name',
    stock: 'current_stock',
    threshold: 'low_stock_threshold',
    lastActivity: 'last_activity_at'
});

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

const buildEventSourceUrl = (token) => {
    const url = new URL(`${API_BASE_PATH}/inventory/events`, window.location.origin);
    url.searchParams.set('token', token);
    return url.toString();
};

const InventoryPanel = ({
    token,
    trackingEnabled,
    inventoryMetadata = {},
    onTrackingUpdate = () => { },
    onAudit = () => { }
}) => {
    const [sortBy, setSortBy] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const [includeInactive, setIncludeInactive] = useState(false);
    const [search, setSearch] = useState('');
    const [fallbackItems, setFallbackItems] = useState(FALLBACK_ITEMS);
    const [feedbackMessage, setFeedbackMessage] = useState(null);
    const [stockDialog, setStockDialog] = useState(null);
    const [stockQuantity, setStockQuantity] = useState('');
    const [adjustDialog, setAdjustDialog] = useState(null);
    const [adjustQuantity, setAdjustQuantity] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [usingFallback, setUsingFallback] = useState(false);
    const apiSortBy = SORT_PARAM_MAP[sortBy] || sortBy;

    const queryClient = useQueryClient();

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

    useEffect(() => {
        if (!token) {
            setUsingFallback(true);
            return;
        }

        if (inventoryQuery.isError) {
            setUsingFallback(true);
            return;
        }

        if (inventoryQuery.data && Array.isArray(inventoryQuery.data.data)) {
            setUsingFallback(false);
        }
    }, [token, inventoryQuery.isError, inventoryQuery.data]);

    const items = useMemo(() => {
        if (usingFallback) {
            return fallbackItems;
        }

        if (inventoryQuery.data && Array.isArray(inventoryQuery.data.data)) {
            return inventoryQuery.data.data;
        }

        return [];
    }, [usingFallback, fallbackItems, inventoryQuery.data]);

    const fallbackSortAccessor = useMemo(() => {
        const accessor = FALLBACK_SORT_KEYS[sortBy];
        return typeof accessor === 'function' ? accessor : FALLBACK_SORT_KEYS.name;
    }, [sortBy]);

    const sortedItems = useMemo(() => {
        if (!usingFallback) {
            return items;
        }

        const next = [...items];
        next.sort((a, b) => {
            const valueA = fallbackSortAccessor(a);
            const valueB = fallbackSortAccessor(b);
            if (valueA < valueB) {
                return sortDirection === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return sortDirection === 'asc' ? 1 : -1;
            }
            return 0;
        });
        return next;
    }, [items, usingFallback, fallbackSortAccessor, sortDirection]);

    useEffect(() => {
        if (!token) {
            return;
        }

        let eventSource;
        try {
            const url = buildEventSourceUrl(token);
            eventSource = new EventSource(url, { withCredentials: true });

            eventSource.addEventListener('inventory:update', () => {
                queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
            });

            eventSource.addEventListener('inventory:tracking', (event) => {
                queryClient.invalidateQueries({ queryKey: [INVENTORY_TRACKING_QUERY_KEY] });
                queryClient.invalidateQueries({ queryKey: [INVENTORY_QUERY_KEY] });
                if (event?.data) {
                    try {
                        const payload = JSON.parse(event.data);
                        onTrackingUpdate(payload.enabled);
                    } catch (parseError) {
                        // ignore parsing error
                    }
                }
            });

            eventSource.onerror = () => {
                eventSource.close();
            };
        } catch (error) {
            console.error('[InventoryPanel] Failed to establish SSE connection', error);
        }

        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [token, queryClient, onTrackingUpdate]);

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

    const applyFallbackUpdate = (productId, updater) => {
        setFallbackItems((current) => current.map((item) => (item.productId === productId ? updater(item) : item)));
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

        if (usingFallback || !token) {
            applyFallbackUpdate(stockDialog.productId, (item) => ({ ...item, currentStock: parsedQuantity }));
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

        if (usingFallback || !token) {
            applyFallbackUpdate(adjustDialog.productId, (item) => ({ ...item, currentStock: parsedQuantity }));
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

            {inventoryQuery.isError && !usingFallback && (
                <div className="alert error" style={{ marginTop: '1rem' }}>
                    <strong>Unable to load inventory.</strong> {inventoryQuery.error?.message || 'Please try again later.'}
                </div>
            )}

            {usingFallback && (
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
                    disabled={usingFallback}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        checked={includeInactive}
                        onChange={(event) => setIncludeInactive(event.target.checked)}
                        disabled={usingFallback}
                    />
                    Include inactive products
                </label>
            </div>

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
                            const productMeta = inventoryMetadata[item.productId] || {};
                            const declaredThreshold =
                                item.lowStockThreshold ?? productMeta.lowStockThreshold ?? null;
                            const numericThreshold = Number.isFinite(Number(declaredThreshold)) ? Number(declaredThreshold) : null;
                            const fallbackThreshold =
                                numericThreshold !== null
                                    ? numericThreshold
                                    : Number.isFinite(Number(item.currentStock)) && Number(item.currentStock) > 0
                                        ? Math.max(Math.floor(Number(item.currentStock) / 2), 1)
                                        : null;
                            const displayThreshold = numericThreshold !== null ? numericThreshold : '—';
                            const effectiveThreshold = fallbackThreshold ?? numericThreshold;
                            const currentStockValue = Number.isFinite(Number(item.currentStock)) ? Number(item.currentStock) : 0;
                            const isLowStock =
                                Boolean(item.lowStock) || (effectiveThreshold !== null && currentStockValue <= effectiveThreshold);
                            const discrepancyUnits = Math.abs(Number(item.discrepancyTotal ?? 0));
                            const hasDiscrepancy = Boolean(item.negativeStock) || discrepancyUnits > 0;
                            const rowClasses = ['inventory-row', 'inventory-item'];
                            if (isLowStock) {
                                rowClasses.push('low-stock');
                            }
                            if (hasDiscrepancy) {
                                rowClasses.push('has-discrepancy');
                            }
                            if (item.negativeStock) {
                                rowClasses.push('negative-stock');
                            }
                            if (!item.isActive) {
                                rowClasses.push('inactive');
                            }
                            const decoratedItem = {
                                ...item,
                                lowStockThreshold: effectiveThreshold ?? item.lowStockThreshold,
                                lowStock: item.lowStock || isLowStock
                            };

                            return (
                                <tr key={item.productId} className={rowClasses.join(' ')}>
                                    <td>
                                        <div className="stack" style={{ gap: '0.25rem' }}>
                                            <span>{item.name}</span>
                                            {!item.isActive && <span className="badge muted">Inactive</span>}
                                        </div>
                                    </td>
                                    <td>{productMeta.categoryName || 'Uncategorized'}</td>
                                    <td className="stock-column">
                                        {hasDiscrepancy && (
                                            <span className="warning-icon" aria-hidden="true" style={{ marginRight: '0.25rem' }}>
                                                !
                                            </span>
                                        )}
                                        <span>{currentStockValue}</span>
                                        {hasDiscrepancy && discrepancyUnits > 0 && (
                                            <span className="badge warning" style={{ marginLeft: '0.5rem' }}>
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
                        <label htmlFor="quantity-input">New Stock Quantity</label>
                        <input
                            id="quantity-input"
                            type="number"
                            min="0"
                            value={stockQuantity}
                            onChange={(event) => setStockQuantity(event.target.value)}
                            disabled={stockMutation.isPending}
                        />
                        <div className="inline" style={{ gap: '0.5rem' }}>
                            <button
                                id="update-quantity-button"
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
