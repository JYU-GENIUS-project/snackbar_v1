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

const deriveStatus = (item) => {
  if (item.negativeStock || (item.discrepancyTotal ?? 0) < 0) {
    return 'Discrepancy';
  }
  if (item.lowStock || (item.currentStock ?? 0) <= (item.lowStockThreshold ?? 0)) {
    return 'Low Stock';
  }
  return 'In Stock';
};

const buildEventSourceUrl = (token) => {
  const url = new URL(`${API_BASE_PATH}/inventory/events`, window.location.origin);
  url.searchParams.set('token', token);
  return url.toString();
};

const InventoryPanel = ({ token, trackingEnabled, onTrackingUpdate = () => {}, onAudit = () => {} }) => {
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [search, setSearch] = useState('');
  const [fallbackItems, setFallbackItems] = useState(FALLBACK_ITEMS);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [stockDialog, setStockDialog] = useState(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [adjustDialog, setAdjustDialog] = useState(null);
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  const queryClient = useQueryClient();

  const inventoryQuery = useInventorySnapshot({
    token,
    search,
    includeInactive,
    sortBy,
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

  const sortedItems = useMemo(() => {
    if (!usingFallback) {
      return items;
    }

    const next = [...items];
    next.sort((a, b) => {
      const valueA = sortBy === 'current_stock' ? Number(a.currentStock) : (a[sortBy] || '').toString().toLowerCase();
      const valueB = sortBy === 'current_stock' ? Number(b.currentStock) : (b[sortBy] || '').toString().toLowerCase();
      if (valueA < valueB) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return next;
  }, [items, usingFallback, sortBy, sortDirection]);

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
    setFeedbackMessage('');
  };

  const openAdjustmentDialog = (item) => {
    setAdjustDialog(item);
    setAdjustQuantity(item ? String(item.currentStock ?? 0) : '');
    setAdjustReason('');
    setFeedbackMessage('');
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
      setFeedbackMessage('Quantity must be a non-negative integer.');
      return;
    }

    if (usingFallback || !token) {
      applyFallbackUpdate(stockDialog.productId, (item) => ({ ...item, currentStock: parsedQuantity }));
      setFeedbackMessage('Stock updated locally.');
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
      setFeedbackMessage('Stock updated successfully.');
      onAudit({
        action: 'INVENTORY_UPDATE',
        entity: `Product: ${stockDialog.name}`,
        details: `Updated stock level to ${parsedQuantity}`
      });
      closeDialogs();
    } catch (error) {
      setFeedbackMessage(error?.message || 'Unable to update stock level.');
    }
  };

  const handleSaveAdjustment = async () => {
    if (!adjustDialog) {
      return;
    }

    const parsedQuantity = Number.parseInt(adjustQuantity, 10);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      setFeedbackMessage('Adjusted quantity must be a non-negative integer.');
      return;
    }

    if (usingFallback || !token) {
      applyFallbackUpdate(adjustDialog.productId, (item) => ({ ...item, currentStock: parsedQuantity }));
      setFeedbackMessage('Inventory adjusted locally.');
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
      setFeedbackMessage('Inventory adjusted successfully.');
      onAudit({
        action: 'INVENTORY_ADJUST',
        entity: `Product: ${adjustDialog.name}`,
        details: `Adjusted stock to ${parsedQuantity}`
      });
      closeDialogs();
    } catch (error) {
      setFeedbackMessage(error?.message || 'Unable to adjust inventory.');
    }
  };

  const renderStatusBadge = (item) => {
    const status = deriveStatus(item);
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
        <div className="alert success" id="inventory-feedback" style={{ marginTop: '1rem' }}>
          {feedbackMessage}
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
              <th scope="col" role="button" tabIndex={0} onClick={() => handleSort('name')}>
                Product
              </th>
              <th scope="col">Status</th>
              <th scope="col" role="button" tabIndex={0} onClick={() => handleSort('current_stock')}>
                Current Stock
              </th>
              <th scope="col">Threshold</th>
              <th scope="col">Last Activity</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem' }}>
                  No inventory records found.
                </td>
              </tr>
            )}
            {sortedItems.map((item) => (
              <tr key={item.productId} className="inventory-row">
                <td>
                  <div className="stack" style={{ gap: '0.25rem' }}>
                    <span>{item.name}</span>
                    {!item.isActive && <span className="badge muted">Inactive</span>}
                  </div>
                </td>
                <td>{renderStatusBadge(item)}</td>
                <td>{item.currentStock}</td>
                <td>{item.lowStockThreshold}</td>
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
            ))}
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
