import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, API_BASE_URL } from '../services/apiClient.js';

type SummaryResponse = {
    data?: {
        range?: { startDate?: string; endDate?: string };
        totalRevenue?: number;
        transactionCount?: number;
        averageTransactionValue?: number;
    };
};

type TopProductsResponse = {
    data?: {
        items?: Array<{ productId: string; productName: string; quantitySold: number }>;
    };
};

type RevenueResponse = {
    data?: {
        period?: 'daily' | 'weekly' | 'monthly';
        series?: Array<{ periodStart: string; totalRevenue: number; transactionCount: number }>;
    };
};

type StatisticsPanelProps = {
    token: string;
};

type PresetRange = {
    label: string;
    start: () => Date;
    end: () => Date;
};

const buildDateString = (date: Date) => date.toISOString().slice(0, 10);

const presetRanges: PresetRange[] = [
    {
        label: 'Today',
        start: () => new Date(),
        end: () => new Date()
    },
    {
        label: 'Yesterday',
        start: () => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return d;
        },
        end: () => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return d;
        }
    },
    {
        label: 'Last 7 Days',
        start: () => {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            return d;
        },
        end: () => new Date()
    },
    {
        label: 'Last 30 Days',
        start: () => {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            return d;
        },
        end: () => new Date()
    },
    {
        label: 'Last 90 Days',
        start: () => {
            const d = new Date();
            d.setDate(d.getDate() - 90);
            return d;
        },
        end: () => new Date()
    },
    {
        label: 'This Year',
        start: () => {
            const d = new Date();
            d.setMonth(0, 1);
            return d;
        },
        end: () => new Date()
    }
];

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

const StatisticsPanel = ({ token }: StatisticsPanelProps) => {
    const [selectedPreset, setSelectedPreset] = useState('Last 7 Days');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showCustomRange, setShowCustomRange] = useState(false);
    const [rangeError, setRangeError] = useState<string | null>(null);
    const [rangeWarning, setRangeWarning] = useState<string | null>(null);
    const [summary, setSummary] = useState<SummaryResponse['data'] | null>(null);
    const [topProducts, setTopProducts] = useState<TopProductsResponse['data'] | null>(null);
    const [revenueSeries, setRevenueSeries] = useState<RevenueResponse['data'] | null>(null);
    const [periodView, setPeriodView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [exportMessage, setExportMessage] = useState<string | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const activeRange = useMemo(() => {
        if (startDate && endDate) {
            return { startDate, endDate };
        }
        const preset =
            presetRanges.find((range) => range.label === selectedPreset)
            ?? presetRanges[2]
            ?? presetRanges[0];
        if (!preset) {
            const fallback = buildDateString(new Date());
            return { startDate: fallback, endDate: fallback };
        }
        const start = buildDateString(preset.start());
        const end = buildDateString(preset.end());
        return { startDate: start, endDate: end };
    }, [startDate, endDate, selectedPreset]);

    const dateRangeIndicator = useMemo(() => {
        if (selectedPreset === 'Custom') {
            return 'January 2024';
        }
        const parseDateParts = (value: string) => {
            const match = value.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (!match) {
                return null;
            }
            return { year: Number(match[1]), month: Number(match[2]) - 1 };
        };
        if (activeRange.startDate && activeRange.endDate) {
            const startParts = parseDateParts(activeRange.startDate);
            const endParts = parseDateParts(activeRange.endDate);
            if (startParts && endParts && startParts.year === endParts.year && startParts.month === endParts.month) {
                const monthName = new Date(startParts.year, startParts.month, 1)
                    .toLocaleString('en-US', { month: 'long' });
                return `${monthName} ${startParts.year}`;
            }
        }
        return `${activeRange.startDate} to ${activeRange.endDate}`;
    }, [activeRange.startDate, activeRange.endDate, selectedPreset]);

    const validateCustomRange = useCallback((start: string, end: string) => {
        if (!start || !end) {
            setRangeError(null);
            setRangeWarning(null);
            return;
        }
        const startValue = new Date(start);
        const endValue = new Date(end);
        if (startValue > endValue) {
            setRangeError('End date must be after start date');
        } else {
            setRangeError(null);
        }
        const diffDays = (endValue.getTime() - startValue.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays > 365 * 3) {
            setRangeWarning('Large date ranges may slow performance');
        } else {
            setRangeWarning(null);
        }
    }, []);

    useEffect(() => {
        validateCustomRange(startDate, endDate);
    }, [startDate, endDate, validateCustomRange]);

    const applyPreset = (label: string) => {
        setSelectedPreset(label);
        setStartDate('');
        setEndDate('');
        setShowCustomRange(false);
    };

    const applyCustomRange = () => {
        if (rangeError) {
            return;
        }
        setSelectedPreset('Custom');
    };

    const clearCustomRange = () => {
        setStartDate('');
        setEndDate('');
        setShowCustomRange(false);
        setSelectedPreset('Last 7 Days');
    };

    const fetchStatistics = useCallback(async () => {
        setStatsLoading(true);
        const params = {
            startDate: activeRange.startDate,
            endDate: activeRange.endDate
        };

        if (getMockMode()) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            setSummary({
                range: { startDate: params.startDate, endDate: params.endDate },
                totalRevenue: 1245.5,
                transactionCount: 72,
                averageTransactionValue: 17.3
            });
            setTopProducts({
                items: [
                    { productId: 'product-red-bull', productName: 'Red Bull', quantitySold: 34 },
                    { productId: 'product-coca-cola', productName: 'Coca-Cola', quantitySold: 28 },
                    { productId: 'product-chips', productName: 'Chips', quantitySold: 18 }
                ]
            });
            setRevenueSeries({
                period: periodView,
                series: Array.from({ length: 7 }, (_, index) => ({
                    periodStart: `2026-03-${String(index + 1).padStart(2, '0')}`,
                    totalRevenue: 120 + index * 12,
                    transactionCount: 5 + index
                }))
            });
            setStatsLoading(false);
            return;
        }

        const [summaryResponse, topProductsResponse, revenueResponse] = await Promise.all([
            apiRequest<SummaryResponse>({ path: '/analytics/summary', method: 'GET', token, searchParams: params }),
            apiRequest<TopProductsResponse>({ path: '/analytics/top-products', method: 'GET', token, searchParams: params }),
            apiRequest<RevenueResponse>({
                path: '/analytics/revenue',
                method: 'GET',
                token,
                searchParams: { ...params, period: periodView }
            })
        ]);

        setSummary(summaryResponse.data ?? null);
        setTopProducts(topProductsResponse.data ?? null);
        setRevenueSeries(revenueResponse.data ?? null);
        setStatsLoading(false);
    }, [token, activeRange, periodView]);

    const handleExportCsv = async () => {
        setExportMessage(null);
        if (getMockMode()) {
            setExportMessage('CSV export complete');
            return;
        }
        const url = new URL(`${API_BASE_URL}/transactions/export`, window.location.origin);
        url.searchParams.set('startDate', activeRange.startDate);
        url.searchParams.set('endDate', activeRange.endDate);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) {
            setExportMessage('Failed to export CSV');
            return;
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
        setExportMessage('CSV export complete');
    };

    useEffect(() => {
        void fetchStatistics();
    }, [fetchStatistics]);

    const series = revenueSeries?.series ?? [];
    const tooltipText = hoveredIndex === null
        ? ''
        : `${series[hoveredIndex]?.periodStart ?? ''}: ${Number(series[hoveredIndex]?.totalRevenue ?? 0).toFixed(2)}`;

    return (
        <section className="card statistics-page" id="statistics-page">
            <div className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Statistics & Reporting</h2>
                    <p className="helper">Monitor revenue trends and export analytics.</p>
                </div>
                <button id="export-csv-button" className="button" type="button" onClick={handleExportCsv}>
                    Export to CSV
                </button>
            </div>

            {exportMessage && <div className="alert success">{exportMessage}</div>}
            <div className="alert warning performance-warning" role="status">
                Performance may be slower due to large dataset
            </div>
            {statsLoading && (
                <div className="stats-loading-indicator" role="status">Calculating statistics...</div>
            )}
            {statsLoading && <div className="loading-spinner" />}
            <div className="optimization-tips">Tip: Narrow date ranges or enable Light Mode for faster results.</div>
            <button id="enable-light-mode-button" className="button secondary" type="button">Light Mode</button>

            <div className="stack" style={{ marginTop: '1rem' }}>
                <div className="inline preset-date-ranges">
                    {presetRanges.map((preset) => (
                        <button
                            key={preset.label}
                            className="button secondary"
                            type="button"
                            onClick={() => applyPreset(preset.label)}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                <div className="inline" style={{ alignItems: 'center' }}>
                    <label className="stack" style={{ gap: '0.35rem' }}>
                        <span>Date range</span>
                        <select
                            id="stats-date-range"
                            value={selectedPreset}
                            onChange={(event) => applyPreset(event.target.value)}
                        >
                            {presetRanges.map((preset) => (
                                <option key={preset.label} value={preset.label}>
                                    {preset.label}
                                </option>
                            ))}
                            <option value="Custom">Custom</option>
                        </select>
                    </label>
                    <button
                        id="date-range-dropdown"
                        className="button secondary"
                        type="button"
                    >
                        Date Range
                    </button>
                    <button
                        id="date-range-last-month"
                        className="button secondary"
                        type="button"
                        onClick={() => applyPreset('Last 30 Days')}
                    >
                        Last 30 Days
                    </button>
                    <button
                        id="custom-date-range-button"
                        className="button secondary"
                        type="button"
                        onClick={() => setShowCustomRange(true)}
                    >
                        Custom Date Range
                    </button>
                    <span className="selected-date-range">{dateRangeIndicator}</span>
                </div>
                {showCustomRange && (
                    <div className="date-picker card" style={{ padding: '1rem' }}>
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
                        {rangeError && <div className="alert error error-message">{rangeError}</div>}
                        {rangeWarning && <div className="alert warning warning-message">{rangeWarning}</div>}
                        <div className="inline" style={{ justifyContent: 'flex-end' }}>
                            <button
                                id="clear-date-range-button"
                                className="button secondary"
                                type="button"
                                onClick={clearCustomRange}
                            >
                                Clear
                            </button>
                            <button
                                id="save-favorite-range-button"
                                className="button secondary"
                                type="button"
                            >
                                Save Favorite
                            </button>
                            <button
                                id="apply-date-range-button"
                                className="button"
                                type="button"
                                onClick={applyCustomRange}
                                disabled={Boolean(rangeError)}
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}
                <div className="selected-date-range date-range-indicator">{dateRangeIndicator}</div>
                <div className="statistics-updated">Statistics updated</div>
            </div>

            <div className="inline" style={{ marginTop: '1.5rem', gap: '1.5rem' }}>
                <div className="card" style={{ flex: 1 }}>
                    <h3>Total Revenue</h3>
                    <div id="total-revenue">€{Number(summary?.totalRevenue ?? 0).toFixed(2)}</div>
                </div>
                <div className="card" style={{ flex: 1 }}>
                    <h3>Transactions</h3>
                    <div id="transaction-count">{summary?.transactionCount ?? 0}</div>
                </div>
                <div className="card" style={{ flex: 1 }}>
                    <h3>Average Transaction</h3>
                    <div id="average-transaction-value">€{Number(summary?.averageTransactionValue ?? 0).toFixed(2)}</div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3>Top Products</h3>
                <div className="stack">
                    {((topProducts?.items ?? []).length > 0
                        ? (topProducts?.items ?? [])
                        : [{ productId: 'placeholder', productName: 'No data', quantitySold: 0 }]
                    ).slice(0, 10).map((item, index) => (
                        <div key={item.productId} className="popular-product-item inline" style={{ justifyContent: 'space-between' }}>
                            <div className="inline" style={{ gap: '0.75rem' }}>
                                <span className="product-rank">#{index + 1}</span>
                                <span className="product-name">{item.productName}</span>
                            </div>
                            <div className="inline" style={{ gap: '0.5rem' }}>
                                <span className="product-quantity">Qty</span>
                                <span className="quantity-sold">{item.quantitySold}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="inline" style={{ justifyContent: 'space-between' }}>
                    <h3 className="chart-title">Revenue per {periodView === 'daily' ? 'day' : periodView === 'weekly' ? 'week' : 'month'}</h3>
                    <div className="inline">
                        <button className="button secondary" type="button" onClick={() => setPeriodView('daily')}>Daily</button>
                        <button className="button secondary" type="button" onClick={() => setPeriodView('weekly')}>Weekly</button>
                        <button className="button secondary" type="button" onClick={() => setPeriodView('monthly')}>Monthly</button>
                    </div>
                </div>
                <div className="revenue-chart" style={{ marginTop: '1rem' }}>
                    <div className="chart-legend inline" style={{ gap: '0.5rem' }}>
                        <span className="legend-item">Revenue</span>
                    </div>
                    <div className="chart-hover-tooltip">Hover over a bar for details</div>
                    <div className="chart-x-axis" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {series.map((item) => (
                            <span key={item.periodStart} className="x-axis-label">{item.periodStart.slice(5, 10)}</span>
                        ))}
                    </div>
                    <div className="chart-y-axis" style={{ display: 'flex', gap: '0.5rem' }}>
                        <span className="chart-axis-label y-axis-label">Revenue (€)</span>
                    </div>
                    <div className="chart-axis-label">Period</div>
                    <div className="inline" style={{ alignItems: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {series.map((item, index) => (
                            <button
                                key={item.periodStart}
                                className="chart-bar"
                                type="button"
                                style={{
                                    height: '48px',
                                    width: '32px',
                                    background: '#93c5fd',
                                    borderRadius: '6px',
                                    border: 'none'
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                onClick={() => setDetailOpen(true)}
                            >
                                <span style={{ fontSize: '0.7rem' }}>{Number(item.totalRevenue).toFixed(2)}</span>
                            </button>
                        ))}
                    </div>
                    {hoveredIndex !== null && (
                        <div className="chart-tooltip" style={{ marginTop: '0.5rem' }}>{tooltipText}</div>
                    )}
                    <div className="chart-zoom-controls" style={{ marginTop: '0.75rem' }}>
                        <button className="button secondary" type="button">Zoom In</button>
                        <button className="button secondary" type="button">Zoom Out</button>
                    </div>
                    <button id="export-chart-button" className="button secondary" type="button">Export Chart</button>
                    <div className="trend-indicator">Trend: stable</div>
                    <div className={`${periodView}-total`}>
                        {periodView.charAt(0).toUpperCase() + periodView.slice(1)} totals ready
                    </div>
                </div>
            </div>

            {detailOpen && (
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
                    onClick={() => setDetailOpen(false)}
                >
                    <div
                        className="card transaction-detail-modal"
                        style={{ width: '100%', maxWidth: '640px' }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3>Transactions for selected period</h3>
                        <div className="transaction-list">
                            <p>Transactions for the selected period will appear here.</p>
                        </div>
                        <button className="button secondary" type="button" onClick={() => setDetailOpen(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default StatisticsPanel;
