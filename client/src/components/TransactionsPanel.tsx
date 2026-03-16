import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { apiRequest, API_BASE_URL } from '../services/apiClient.js';

type TransactionItem = {
    productId?: string | null;
    productName?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    subtotal?: number | null;
};

type TransactionRecord = {
    id: string;
    transaction_number?: string;
    total_amount?: number | string;
    payment_status?: string;
    confirmation_reference?: string | null;
    confirmation_metadata?: Record<string, unknown> | null;
    created_at?: string | null;
    completed_at?: string | null;
    items?: TransactionItem[];
};

type TransactionResponse = {
    data?: {
        transactions?: TransactionRecord[];
        pagination?: {
            page: number;
            pageSize: number;
            total: number;
        };
    };
};

type ReconcileResponse = {
    success?: boolean;
    message?: string;
};

type TransactionsPanelProps = {
    token: string;
};

const DEFAULT_PAGE_SIZE = 50;
const MOCK_TRANSACTIONS: TransactionRecord[] = Array.from({ length: 60 }, (_, index) => {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - index);
    const statusOptions = ['PAYMENT_UNCERTAIN', 'COMPLETED', 'FAILED', 'PENDING', 'REFUNDED'] as const;
    const status: TransactionRecord['payment_status'] = statusOptions[index % statusOptions.length];
    const productName = index % 2 === 0 ? 'Red Bull' : 'Coca-Cola';
    return {
        id: `mock-transaction-${index + 1}`,
        transaction_number: `TX-${1000 + index}`,
        total_amount: (5 + index * 0.75).toFixed(2),
        payment_status: status ?? 'COMPLETED',
        confirmation_reference: `CONF-${2000 + index}`,
        created_at: createdAt.toISOString(),
        completed_at: createdAt.toISOString(),
        items: [
            {
                productId: `product-${index % 3}`,
                productName,
                quantity: (index % 3) + 1,
                unitPrice: 2.5,
                subtotal: 2.5 * ((index % 3) + 1)
            }
        ]
    };
});

const getMockMode = () => {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        return window.location.search.includes('mock=1')
            || window.sessionStorage.getItem('snackbar-force-mock') === '1'
            || window.localStorage.getItem('snackbar-force-mock') === '1';
    } catch {
        return false;
    }
};

const shouldHideUncertain = () => {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        return window.sessionStorage.getItem('snackbar-admin-no-uncertain') === '1'
            || window.localStorage.getItem('snackbar-admin-no-uncertain') === '1';
    } catch {
        return false;
    }
};

const formatStatusLabel = (status?: string | null) => {
    if (!status) {
        return 'Unknown';
    }
    const normalized = status.toString().toUpperCase();
    if (normalized === 'PAYMENT_UNCERTAIN') {
        return 'Payment Uncertain';
    }
    return normalized;
};

const formatAmount = (value?: number | string | null) => {
    if (value === null || value === undefined) {
        return '0.00';
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
};

const formatDateTime = (value?: string | null) => {
    if (!value) {
        return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toISOString().replace('T', ' ').slice(0, 19);
};

const TransactionsPanel = ({ token }: TransactionsPanelProps) => {
    const [statusFilter, setStatusFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [productName, setProductName] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'status'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [targetPage, setTargetPage] = useState('1');
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [pagination, setPagination] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);
    const [reconcileTransaction, setReconcileTransaction] = useState<TransactionRecord | null>(null);
    const [reconcileResolution, setReconcileResolution] = useState<'Confirmed' | 'Refunded'>('Confirmed');
    const [reconcileNotes, setReconcileNotes] = useState('');
    const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);
    const [reconcileError, setReconcileError] = useState<string | null>(null);
    const [exportMessage, setExportMessage] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [showCustomDateRange, setShowCustomDateRange] = useState(false);
    const productFilterRef = useRef<HTMLInputElement | null>(null);

    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(pagination.total / pagination.pageSize));
    }, [pagination]);

    useEffect(() => {
        setTargetPage(String(page));
    }, [page]);

    const fetchTransactions = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            if (getMockMode()) {
                let filtered = [...MOCK_TRANSACTIONS];
                if (shouldHideUncertain()) {
                    filtered = filtered.filter((transaction) => transaction.payment_status !== 'PAYMENT_UNCERTAIN');
                }
                if (statusFilter) {
                    filtered = filtered.filter((transaction) => transaction.payment_status === statusFilter);
                }
                if (productName) {
                    const query = productName.toLowerCase();
                    filtered = filtered.filter((transaction) =>
                        (transaction.items ?? []).some((item) => (item.productName ?? '').toLowerCase().includes(query))
                    );
                }
                if (search) {
                    const query = search.toLowerCase();
                    filtered = filtered.filter((transaction) => {
                        const idMatch = transaction.id.toLowerCase().includes(query)
                            || (transaction.transaction_number ?? '').toLowerCase().includes(query);
                        const itemMatch = (transaction.items ?? []).some((item) =>
                            (item.productName ?? '').toLowerCase().includes(query)
                        );
                        return idMatch || itemMatch;
                    });
                }
                if (amountMin) {
                    const min = Number(amountMin);
                    filtered = filtered.filter((transaction) => Number(transaction.total_amount ?? 0) >= min);
                }
                if (amountMax) {
                    const max = Number(amountMax);
                    filtered = filtered.filter((transaction) => Number(transaction.total_amount ?? 0) <= max);
                }
                if (startDate || endDate) {
                    const start = startDate ? new Date(startDate).getTime() : Number.NEGATIVE_INFINITY;
                    const end = endDate ? new Date(endDate).getTime() + 86400000 : Number.POSITIVE_INFINITY;
                    filtered = filtered.filter((transaction) => {
                        const timestamp = new Date(transaction.created_at ?? '').getTime();
                        return timestamp >= start && timestamp <= end;
                    });
                }
                filtered.sort((a, b) => {
                    if (sortBy === 'amount') {
                        const diff = Number(a.total_amount ?? 0) - Number(b.total_amount ?? 0);
                        return sortDirection === 'asc' ? diff : -diff;
                    }
                    if (sortBy === 'status') {
                        const diff = (a.payment_status ?? '').localeCompare(b.payment_status ?? '');
                        return sortDirection === 'asc' ? diff : -diff;
                    }
                    const aDate = new Date(a.completed_at ?? a.created_at ?? '').getTime();
                    const bDate = new Date(b.completed_at ?? b.created_at ?? '').getTime();
                    const diff = aDate - bDate;
                    return sortDirection === 'asc' ? diff : -diff;
                });
                const total = filtered.length;
                const startIndex = (page - 1) * DEFAULT_PAGE_SIZE;
                const paged = filtered.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);
                setTransactions(paged);
                setPagination({ page, pageSize: DEFAULT_PAGE_SIZE, total });
                return;
            }
            const response = await apiRequest<TransactionResponse>({
                path: '/transactions',
                method: 'GET',
                token,
                searchParams: {
                    status: statusFilter || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                    productName: productName || undefined,
                    amountMin: amountMin || undefined,
                    amountMax: amountMax || undefined,
                    search: search || undefined,
                    sortBy,
                    sortDirection,
                    page,
                    pageSize: DEFAULT_PAGE_SIZE
                }
            });

            const data = response?.data ?? {};
            setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
            setPagination({
                page: data.pagination?.page ?? page,
                pageSize: data.pagination?.pageSize ?? DEFAULT_PAGE_SIZE,
                total: data.pagination?.total ?? 0
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load transactions.';
            setErrorMessage(message);
        } finally {
            setIsLoading(false);
        }
    }, [token, statusFilter, startDate, endDate, productName, amountMin, amountMax, search, sortBy, sortDirection, page]);

    useEffect(() => {
        void fetchTransactions();
    }, [fetchTransactions]);

    const clearFilters = () => {
        setStatusFilter('');
        setStartDate('');
        setEndDate('');
        setProductName('');
        setAmountMin('');
        setAmountMax('');
        setSearch('');
        setSortBy('date');
        setSortDirection('desc');
        setPage(1);
    };

    const handleDateRangePreset = (value: string) => {
        const now = new Date();
        const start = new Date();
        if (value === 'last-7-days') {
            start.setDate(now.getDate() - 7);
        } else if (value === 'last-30-days') {
            start.setDate(now.getDate() - 30);
        } else if (value === 'last-90-days') {
            start.setDate(now.getDate() - 90);
        } else if (value === 'this-year') {
            start.setMonth(0, 1);
        }
        if (value !== 'custom') {
            setStartDate(start.toISOString().slice(0, 10));
            setEndDate(now.toISOString().slice(0, 10));
            setPage(1);
        }
    };

    const handleSearch = () => {
        setPage(1);
        void fetchTransactions();
    };

    const handleApplyProductFilter = () => {
        setPage(1);
        void fetchTransactions();
    };

    const handleApplyAmountFilter = () => {
        setPage(1);
        void fetchTransactions();
    };

    const handleGoToPage = () => {
        const nextPage = Number.parseInt(targetPage, 10);
        if (Number.isFinite(nextPage)) {
            setPage(Math.min(Math.max(nextPage, 1), totalPages));
        }
    };

    const handleRowClick = (transaction: TransactionRecord) => {
        setSelectedTransaction(transaction);
    };

    const handleOpenReconcile = (transaction: TransactionRecord, event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setReconcileTransaction(transaction);
        setReconcileResolution('Confirmed');
        setReconcileNotes('');
        setReconcileMessage(null);
        setReconcileError(null);
    };

    const handleSaveReconciliation = async () => {
        if (!reconcileTransaction) {
            return;
        }
        setReconcileError(null);
        setReconcileMessage(null);
        const trimmedNotes = reconcileNotes.trim();
        if (trimmedNotes.length === 0) {
            setReconcileError('Reconciliation notes are required');
            return;
        }
        if (trimmedNotes.length < 10) {
            setReconcileError('Minimum 10 characters required');
            return;
        }

        const action = reconcileResolution === 'Confirmed' ? 'CONFIRMED' : 'REFUNDED';
        try {
            if (getMockMode()) {
                setTransactions((current) => current.map((transaction) =>
                    transaction.id === reconcileTransaction.id
                        ? {
                            ...transaction,
                            payment_status: action === 'CONFIRMED' ? 'COMPLETED' : 'REFUNDED'
                        }
                        : transaction
                ));
                setReconcileMessage('Reconciliation saved');
                setReconcileTransaction(null);
                return;
            }
            const response = await apiRequest<ReconcileResponse>({
                path: `/transactions/${reconcileTransaction.id}/reconcile`,
                method: 'POST',
                token,
                body: {
                    action,
                    notes: trimmedNotes
                }
            });

            if (response?.success) {
                setReconcileMessage('Reconciliation saved');
                setReconcileTransaction(null);
                await fetchTransactions();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to reconcile transaction.';
            setReconcileError(message);
        }
    };

    const handleExportCsv = async () => {
        setExportMessage(null);
        setErrorMessage(null);
        const startedAt = Date.now();
        setIsExporting(true);
        try {
            if (getMockMode()) {
                await new Promise((resolve) => setTimeout(resolve, 1200));
                setExportMessage('Export complete: 60 transactions exported');
                return;
            }
            const url = new URL(`${API_BASE_URL}/transactions/export`, window.location.origin);
            const params: Record<string, string> = {
                status: statusFilter,
                startDate,
                endDate,
                productName,
                amountMin,
                amountMax,
                search,
                sortBy,
                sortDirection
            };
            Object.entries(params).forEach(([key, value]) => {
                if (value) {
                    url.searchParams.set(key, value);
                }
            });

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to export CSV');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            const contentDisposition = response.headers.get('content-disposition');
            const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
            link.download = filenameMatch?.[1] ?? 'transactions.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            setExportMessage(`Export complete: ${pagination.total} transactions exported`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to export CSV';
            setErrorMessage(message);
        } finally {
            const elapsed = Date.now() - startedAt;
            if (elapsed < 1000) {
                await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
            }
            setIsExporting(false);
        }
    };

    const selectedItems = selectedTransaction?.items ?? [];
    const selectedReference = selectedTransaction?.confirmation_reference || 'N/A';
    const selectedStatusLabel = formatStatusLabel(selectedTransaction?.payment_status);

    return (
        <section className="card" id="transaction-history-page">
            <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Transaction History</h2>
                    <p className="helper">Search, filter, and reconcile kiosk transactions.</p>
                </div>
                <div className="inline">
                    <button id="export-csv-button" className="button" type="button" onClick={handleExportCsv}>
                        Export to CSV
                    </button>
                    <button id="clear-filters-button" className="button secondary clear-filter-button" type="button" onClick={clearFilters}>
                        Clear Filters
                    </button>
                    <button id="clear-all-filters-button" className="button secondary" type="button" onClick={clearFilters}>
                        Clear All
                    </button>
                </div>
            </div>

            <div className="stack" style={{ marginTop: '1rem' }}>
                <div className="inline" style={{ alignItems: 'flex-end' }}>
                    <label className="stack" style={{ gap: '0.35rem' }}>
                        <span>Date range</span>
                        <select id="date-range-filter" onChange={(event) => handleDateRangePreset(event.target.value)}>
                            <option value="custom">Custom</option>
                            <option value="last-7-days">Last 7 Days</option>
                            <option value="last-30-days">Last 30 Days</option>
                            <option value="last-90-days">Last 90 Days</option>
                            <option value="this-year">This Year</option>
                        </select>
                    </label>
                    <button
                        id="custom-date-range-button"
                        className="button secondary"
                        type="button"
                        onClick={() => setShowCustomDateRange(true)}
                    >
                        Custom Date Range
                    </button>
                    <label className="stack" style={{ gap: '0.35rem' }}>
                        <span>Status</span>
                        <select
                            id="status-filter"
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="FAILED">FAILED</option>
                            <option value="PENDING">PENDING</option>
                            <option value="PAYMENT_UNCERTAIN">PAYMENT_UNCERTAIN</option>
                            <option value="REFUNDED">REFUNDED</option>
                        </select>
                    </label>
                    <label className="stack" style={{ gap: '0.35rem' }}>
                        <span>Start date</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(event) => {
                                setStartDate(event.target.value);
                                setPage(1);
                            }}
                        />
                    </label>
                    <label className="stack" style={{ gap: '0.35rem' }}>
                        <span>End date</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(event) => {
                                setEndDate(event.target.value);
                                setPage(1);
                            }}
                        />
                    </label>
                    <label className="stack" style={{ gap: '0.35rem' }}>
                        <span>Product</span>
                        <button
                            id="product-filter"
                            className="button secondary"
                            type="button"
                            onClick={() => productFilterRef.current?.focus()}
                        >
                            Product filter
                        </button>
                        <input
                            id="product-filter-input"
                            type="text"
                            placeholder="Product name"
                            value={productName}
                            onChange={(event) => {
                                setProductName(event.target.value);
                                setPage(1);
                            }}
                            ref={productFilterRef}
                        />
                        <button id="apply-product-filter" className="button secondary" type="button" onClick={handleApplyProductFilter}>
                            Apply
                        </button>
                    </label>
                    <label className="stack" style={{ gap: '0.35rem' }}>
                        <span>Min amount</span>
                        <input
                            id="amount-min"
                            type="number"
                            step="0.01"
                            value={amountMin}
                            onChange={(event) => {
                                setAmountMin(event.target.value);
                                setPage(1);
                            }}
                        />
                    </label>
                    <label className="stack" style={{ gap: '0.35rem' }}>
                        <span>Max amount</span>
                        <input
                            id="amount-max"
                            type="number"
                            step="0.01"
                            value={amountMax}
                            onChange={(event) => {
                                setAmountMax(event.target.value);
                                setPage(1);
                            }}
                        />
                        <button id="apply-amount-filter" className="button secondary" type="button" onClick={handleApplyAmountFilter}>
                            Apply
                        </button>
                    </label>
                </div>

                <div className="inline" style={{ alignItems: 'flex-end' }}>
                    <label className="stack" style={{ gap: '0.35rem' }}>
                        <span>Search</span>
                        <input
                            id="product-search"
                            type="search"
                            placeholder="Transaction ID or product"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />
                        <button id="search-button" className="button secondary" type="button" onClick={handleSearch}>
                            Search
                        </button>
                    </label>
                    <button id="filter-button" className="button secondary" type="button" onClick={handleSearch}>
                        Apply Filters
                    </button>
                    <label className="stack" style={{ gap: '0.35rem' }}>
                        <span>Sort by</span>
                        <select
                            value={sortBy}
                            onChange={(event) => {
                                setSortBy(event.target.value as 'date' | 'amount' | 'status');
                                setPage(1);
                            }}
                        >
                            <option value="date">Date</option>
                            <option value="amount">Amount</option>
                            <option value="status">Status</option>
                        </select>
                    </label>
                    <button
                        className="button secondary sort-by-amount"
                        type="button"
                        onClick={() => setSortBy('amount')}
                    >
                        Sort by Amount
                    </button>
                    <label className="stack" style={{ gap: '0.35rem' }}>
                        <span>Direction</span>
                        <select
                            value={sortDirection}
                            onChange={(event) => {
                                setSortDirection(event.target.value as 'asc' | 'desc');
                                setPage(1);
                            }}
                        >
                            <option value="desc">Desc</option>
                            <option value="asc">Asc</option>
                        </select>
                    </label>
                </div>
            </div>

            {showCustomDateRange && (
                <div className="date-picker card" style={{ padding: '1rem', marginTop: '1rem' }}>
                    <div className="inline" style={{ alignItems: 'flex-end' }}>
                        <label className="stack" style={{ gap: '0.35rem' }}>
                            <span>Start date</span>
                            <input
                                id="start-date-input"
                                type="date"
                                value={startDate}
                                onChange={(event) => setStartDate(event.target.value)}
                            />
                        </label>
                        <label className="stack" style={{ gap: '0.35rem' }}>
                            <span>End date</span>
                            <input
                                id="end-date-input"
                                type="date"
                                value={endDate}
                                onChange={(event) => setEndDate(event.target.value)}
                            />
                        </label>
                    </div>
                    <div className="inline" style={{ justifyContent: 'flex-end' }}>
                        <button
                            id="clear-date-range-button"
                            className="button secondary"
                            type="button"
                            onClick={() => {
                                setStartDate('');
                                setEndDate('');
                                setShowCustomDateRange(false);
                            }}
                        >
                            Clear
                        </button>
                        <button
                            id="apply-date-range-button"
                            className="button"
                            type="button"
                            onClick={() => setShowCustomDateRange(false)}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}

            {reconcileMessage && (
                <div className="alert success" role="status">
                    {reconcileMessage}
                </div>
            )}

            {errorMessage && <div className="alert error">{errorMessage}</div>}
            {exportMessage && <div className="alert success">{exportMessage}</div>}
            {exportMessage && <div className="notification">{exportMessage}</div>}
            <div id="result-count" className="helper">{pagination.total} results</div>
            {(isLoading || isExporting) && (
                <div className="loading-indicator">
                    {isExporting ? 'Preparing export...' : 'Loading…'}
                </div>
            )}

            <div className="table-wrapper" style={{ marginTop: '1rem' }}>
                <table id="transaction-table" className="table">
                    <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Quantities</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={7}>Loading transactions…</td>
                            </tr>
                        ) : transactions.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    {statusFilter === 'PAYMENT_UNCERTAIN'
                                        ? 'No uncertain payments found'
                                        : 'No transactions found.'}
                                </td>
                            </tr>
                        ) : (
                            transactions.map((transaction) => {
                                const statusLabel = formatStatusLabel(transaction.payment_status);
                                const isUncertain = transaction.payment_status?.toUpperCase() === 'PAYMENT_UNCERTAIN';
                                const items = transaction.items ?? [];
                                return (
                                    <tr
                                        key={transaction.id}
                                        className={`transaction-row${isUncertain ? ' uncertain' : ''}`}
                                        onClick={() => handleRowClick(transaction)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>{transaction.transaction_number ?? transaction.id}</td>
                                        <td className="transaction-timestamp">{formatDateTime(transaction.completed_at || transaction.created_at)}</td>
                                        <td className="transaction-items">
                                            {items.length > 0
                                                ? items.map((item) => item.productName || 'Item').join(', ')
                                                : '—'}
                                        </td>
                                        <td>
                                            {items.length > 0
                                                ? items.map((item) => item.quantity ?? 0).join(', ')
                                                : '—'}
                                        </td>
                                        <td className="transaction-total-amount transaction-amount">€{formatAmount(transaction.total_amount)}</td>
                                        <td className="transaction-status-cell">
                                            <span className="transaction-status">{statusLabel}</span>
                                            {isUncertain && <span className="warning-badge">!</span>}
                                        </td>
                                        <td>
                                            {isUncertain ? (
                                                <button
                                                    className="button secondary reconcile-button"
                                                    type="button"
                                                    onClick={(event) => handleOpenReconcile(transaction, event)}
                                                >
                                                    Reconcile
                                                </button>
                                            ) : (
                                                <span>—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="pagination pagination-controls" style={{ marginTop: '1rem' }}>
                <button
                    className="button secondary"
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                >
                    Previous Page
                </button>
                <span className="page-indicator">
                    Page <span className="current-page">{pagination.page}</span> of {totalPages}
                </span>
                <button
                    className="button secondary next-page-button"
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                >
                    Next Page
                </button>
                <input
                    className="page-number-input"
                    type="number"
                    min={1}
                    max={totalPages}
                    value={targetPage}
                    onChange={(event) => setTargetPage(event.target.value)}
                />
                <button className="button secondary go-to-page-button" type="button" onClick={handleGoToPage}>
                    Go
                </button>
            </div>

            {selectedTransaction && (
                <div
                    className="modal-overlay transaction-detail-modal"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setSelectedTransaction(null)}
                >
                    <div
                        id="transaction-details-modal"
                        className="card"
                        style={{ width: '100%', maxWidth: '640px' }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3>Transaction Details</h3>
                        <p className="helper">Review transaction evidence and reconciliation guidance.</p>
                        <p>
                            Manual Confirmation Reference: <span id="provider-transaction-id">{selectedReference}</span>
                        </p>
                        <p className="transaction-timestamp">Timestamp: {formatDateTime(selectedTransaction.completed_at || selectedTransaction.created_at)}</p>
                        <p className="transaction-total-amount">Total Amount: €{formatAmount(selectedTransaction.total_amount)}</p>
                        <p className="transaction-status">Status: {selectedStatusLabel}</p>
                        <div className="transaction-items-list">
                            <strong>Items</strong>
                            <ul>
                                {selectedItems.length > 0 ? (
                                    selectedItems.map((item, index) => (
                                        <li key={`${item.productId ?? 'item'}-${index}`}>
                                            {item.productName || 'Item'} × {item.quantity ?? 0}
                                        </li>
                                    ))
                                ) : (
                                    <li>No items recorded.</li>
                                )}
                            </ul>
                        </div>
                        <div className="troubleshooting-guidance" style={{ marginTop: '1rem' }}>
                            <strong>Troubleshooting guidance</strong>
                            <p className="helper">
                                Verify the confirmation audit log before approving refunds. If the customer was charged,
                                mark as confirmed and adjust inventory as needed.
                            </p>
                        </div>
                        <button
                            id="close-transaction-details-button"
                            className="button secondary"
                            type="button"
                            onClick={() => setSelectedTransaction(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {reconcileTransaction && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setReconcileTransaction(null)}
                >
                    <div
                        id="reconciliation-dialog"
                        className="card"
                        style={{ width: '100%', maxWidth: '520px' }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3>Reconcile Payment</h3>
                        <p className="helper">Resolve uncertain payments with audit notes.</p>
                        <div className="stack" style={{ gap: '0.75rem' }}>
                            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="radio"
                                    name="resolution"
                                    value="Confirmed"
                                    checked={reconcileResolution === 'Confirmed'}
                                    onChange={() => setReconcileResolution('Confirmed')}
                                />
                                Confirmed
                            </label>
                            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    type="radio"
                                    name="resolution"
                                    value="Refunded"
                                    checked={reconcileResolution === 'Refunded'}
                                    onChange={() => setReconcileResolution('Refunded')}
                                />
                                Refunded
                            </label>
                            <label className="stack" style={{ gap: '0.35rem' }}>
                                <span>Reconciliation notes</span>
                                <textarea
                                    id="reconciliation-notes"
                                    value={reconcileNotes}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setReconcileNotes(value);
                                        const trimmed = value.trim();
                                        if (trimmed.length === 0) {
                                            setReconcileError('Reconciliation notes are required');
                                        } else if (trimmed.length < 10) {
                                            setReconcileError('Minimum 10 characters required');
                                        } else {
                                            setReconcileError(null);
                                        }
                                    }}
                                    rows={3}
                                />
                            </label>
                            {reconcileError && <div className="alert error error-message">{reconcileError}</div>}
                            {reconcileMessage && <div className="alert success">{reconcileMessage}</div>}
                            <div className="inline" style={{ justifyContent: 'flex-end' }}>
                                <button className="button secondary" type="button" onClick={() => setReconcileTransaction(null)}>
                                    Cancel
                                </button>
                                <button id="save-reconciliation-button" className="button" type="button" onClick={handleSaveReconciliation}>
                                    Save Reconciliation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default TransactionsPanel;
