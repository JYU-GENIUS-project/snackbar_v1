import db from '../utils/database';
import { ApiError } from '../middleware/errorHandler';

type DateRange = {
    start: Date;
    end: Date;
};

type RevenuePeriod = 'daily' | 'weekly' | 'monthly';

type DbQueryResult<T = unknown> = {
    rows: T[];
};

const MAX_RANGE_DAYS = 366;

const buildDateRange = (startDate?: string, endDate?: string): DateRange => {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end);

    if (!startDate) {
        start.setDate(start.getDate() - 7);
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new ApiError(400, 'Invalid date range');
    }

    if (start.getTime() > end.getTime()) {
        throw new ApiError(400, 'End date must be after start date');
    }

    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > MAX_RANGE_DAYS) {
        throw new ApiError(400, 'Date range exceeds maximum of 1 year');
    }

    return { start, end };
};

const getSummary = async (params: { startDate?: string; endDate?: string }) => {
    const { start, end } = buildDateRange(params.startDate, params.endDate);

    const result = (await db.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue,
                COUNT(*) AS transaction_count,
                COALESCE(AVG(total_amount), 0) AS average_transaction_value
         FROM transactions
         WHERE payment_status = 'COMPLETED'
           AND COALESCE(completed_at, created_at) BETWEEN $1 AND $2`,
        [start, end],
    )) as DbQueryResult<{
        total_revenue: string;
        transaction_count: string;
        average_transaction_value: string;
    }>;

    const row = result.rows[0] ?? {
        total_revenue: '0',
        transaction_count: '0',
        average_transaction_value: '0',
    };

    return {
        range: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
        },
        totalRevenue: Number(row.total_revenue),
        transactionCount: Number(row.transaction_count),
        averageTransactionValue: Number(row.average_transaction_value),
    };
};

const getTopProducts = async (params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
}) => {
    const { start, end } = buildDateRange(params.startDate, params.endDate);
    const limit = Number.isFinite(params.limit)
        ? Math.min(50, Math.max(1, Number(params.limit)))
        : 10;

    const result = (await db.query(
        `SELECT ti.product_id,
                ti.product_name,
                SUM(ti.quantity) AS quantity_sold
         FROM transaction_items ti
         JOIN transactions t ON t.id = ti.transaction_id
         WHERE t.payment_status = 'COMPLETED'
           AND COALESCE(t.completed_at, t.created_at) BETWEEN $1 AND $2
         GROUP BY ti.product_id, ti.product_name
         ORDER BY quantity_sold DESC
         LIMIT $3`,
        [start, end, limit],
    )) as DbQueryResult<{
        product_id: string;
        product_name: string;
        quantity_sold: string;
    }>;

    return {
        range: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
        },
        items: result.rows.map((row) => ({
            productId: row.product_id,
            productName: row.product_name,
            quantitySold: Number(row.quantity_sold),
        })),
    };
};

const getRevenueSeries = async (params: {
    startDate?: string;
    endDate?: string;
    period?: RevenuePeriod;
}) => {
    const { start, end } = buildDateRange(params.startDate, params.endDate);
    const period = params.period ?? 'daily';

    const periodUnit =
        period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'day';
    const intervalValue =
        period === 'weekly' ? '1 week' : period === 'monthly' ? '1 month' : '1 day';

    const result = (await db.query(
        `WITH series AS (
            SELECT generate_series(
                date_trunc($3, $1::timestamptz),
                date_trunc($3, $2::timestamptz),
                $4::interval
            ) AS period_start
        ),
        revenue AS (
            SELECT date_trunc($3, COALESCE(completed_at, created_at)) AS period_start,
                   COUNT(*) FILTER (WHERE payment_status = 'COMPLETED') AS transaction_count,
                   COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'COMPLETED'), 0) AS total_revenue
            FROM transactions
            WHERE COALESCE(completed_at, created_at) BETWEEN $1 AND $2
            GROUP BY 1
        )
        SELECT series.period_start,
               COALESCE(revenue.transaction_count, 0) AS transaction_count,
               COALESCE(revenue.total_revenue, 0) AS total_revenue
        FROM series
        LEFT JOIN revenue USING (period_start)
        ORDER BY series.period_start`,
        [start, end, periodUnit, intervalValue],
    )) as DbQueryResult<{
        period_start: string;
        transaction_count: string;
        total_revenue: string;
    }>;

    return {
        range: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
        },
        period,
        series: result.rows.map((row) => ({
            periodStart: row.period_start,
            transactionCount: Number(row.transaction_count),
            totalRevenue: Number(row.total_revenue),
        })),
    };
};

const analyticsService = {
    getSummary,
    getTopProducts,
    getRevenueSeries,
};

export default analyticsService;
