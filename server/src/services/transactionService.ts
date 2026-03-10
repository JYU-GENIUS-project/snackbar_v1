import db from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import inventoryService from './inventoryService';

type TransactionItemInput = {
    productId: string;
    quantity: number | string;
};

type TransactionPayload = {
    items: TransactionItemInput[];
    paymentStatus?: string;
    paymentMethod?: string;
    confirmationChannel?: string | null;
    confirmationReference?: string | null;
    confirmationMetadata?: Record<string, unknown> | null;
};

type ProductRow = {
    id: string;
    name: string;
    price: number | string | null;
    currency?: string | null;
    stock_quantity?: number | null;
    purchase_limit?: number | null;
    is_active?: boolean | null;
    deleted_at?: string | null;
};

type TransactionRecord = {
    id: string;
    transaction_number: string;
};

type TransactionRow = {
    id: string;
    transaction_number: string;
    total_amount: number | string;
    payment_method: string | null;
    payment_status: string;
    confirmation_channel: string | null;
    confirmation_reference: string | null;
    confirmation_metadata: Record<string, unknown> | null;
    completed_at: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

type InventoryDeduction = {
    trackingEnabled?: boolean;
    shortfall?: number;
    delta?: number;
    productId: string;
};

type InventoryPostCommitSnapshot = {
    productId: string;
    snapshot: Record<string, unknown>;
    shortfall?: number;
    delta?: number;
};

type TransactionLineItem = {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    currency: string;
};

type TransactionResult = {
    transaction: TransactionRecord;
    items: Array<Record<string, unknown>>;
    inventory: InventoryPostCommitSnapshot[];
    inventoryTracking: boolean;
    inventoryApplied: boolean;
};

type TransactionListFilters = {
    status?: string;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    reference?: string;
    kioskSessionId?: string;
};

type TransactionListResult = {
    transactions: Record<string, unknown>[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
    };
};

const PAYMENT_STATUSES = new Set([
    'PENDING',
    'COMPLETED',
    'FAILED',
    'PAYMENT_UNCERTAIN',
]);

const CONFIRMATION_OUTCOMES = new Set([
    'COMPLETED',
    'FAILED',
    'PAYMENT_UNCERTAIN',
]);

type DbQueryResult<T = unknown> = {
    rows: T[];
    rowCount?: number;
};

type DbClient = {
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

const normalizeStatus = (status?: string) => {
    const normalized = (status || 'COMPLETED').toString().trim().toUpperCase();
    if (!PAYMENT_STATUSES.has(normalized)) {
        throw new ApiError(400, 'Invalid payment status');
    }
    return normalized;
};

const normalizeQuantity = (value: number | string) => {
    const quantity = parseInt(String(value), 10);
    if (Number.isNaN(quantity) || quantity <= 0) {
        throw new ApiError(400, 'Quantity must be a positive integer');
    }
    return quantity;
};

const normalizeOutcome = (value: string) => {
    const normalized = value.toString().trim().toUpperCase();
    if (!CONFIRMATION_OUTCOMES.has(normalized)) {
        throw new ApiError(400, 'Invalid confirmation outcome');
    }
    return normalized;
};

const fetchProductsForItems = async (
    client: DbClient,
    items: TransactionItemInput[],
) => {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const { rows } = (await client.query(
        `SELECT id, name, price, currency, stock_quantity, purchase_limit, is_active, deleted_at
         FROM products
         WHERE id = ANY($1::uuid[])
         FOR UPDATE`,
        [productIds],
    )) as DbQueryResult<ProductRow>;

    const productMap = new Map(rows.map((row) => [row.id, row]));
    for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product || product.deleted_at || product.is_active === false) {
            throw new ApiError(404, `Product ${item.productId} is unavailable`);
        }
    }

    return productMap;
};

const calculateTotals = (
    items: TransactionItemInput[],
    productMap: Map<string, ProductRow>,
) => {
    let total = 0;
    const lineItems = items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
            throw new ApiError(404, `Product ${item.productId} is unavailable`);
        }

        const quantity = normalizeQuantity(item.quantity);

        if (product.purchase_limit && quantity > product.purchase_limit) {
            throw new ApiError(
                400,
                `Quantity exceeds purchase limit for ${product.name}`,
            );
        }

        const unitPrice = Number(product.price ?? 0);
        const subtotal = Number((unitPrice * quantity).toFixed(2));
        total += subtotal;

        return {
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice,
            subtotal,
            currency: product.currency || 'EUR',
        };
    });

    return {
        lineItems,
        totalAmount: Number(total.toFixed(2)),
    };
};

const insertTransaction = async (
    client: DbClient,
    {
        totalAmount,
        paymentMethod,
        paymentStatus,
        confirmationChannel = null,
        confirmationReference = null,
        confirmationMetadata = null,
    }: {
        totalAmount: number;
        paymentMethod: string;
        paymentStatus: string;
        confirmationChannel?: string | null;
        confirmationReference?: string | null;
        confirmationMetadata?: Record<string, unknown> | null;
    },
) => {
    const { rows } = (await client.query(
        `INSERT INTO transactions (
            total_amount,
            payment_method,
            payment_status,
            confirmation_channel,
            confirmation_reference,
            confirmation_metadata,
            completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $3 = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE NULL END)
        RETURNING id, transaction_number, total_amount, payment_method, payment_status, confirmation_channel,
                  confirmation_reference, confirmation_metadata, completed_at, created_at, updated_at`,
        [
            totalAmount,
            paymentMethod,
            paymentStatus,
            confirmationChannel,
            confirmationReference,
            confirmationMetadata,
        ],
    )) as DbQueryResult<TransactionRecord>;

    return rows[0];
};

const insertTransactionItems = async (
    client: DbClient,
    {
        transactionId,
        lineItems,
    }: { transactionId: string; lineItems: Array<Record<string, unknown>> },
) => {
    for (const item of lineItems) {
        const record = item as {
            productId: string;
            productName: string;
            quantity: number;
            unitPrice: number;
            subtotal: number;
        };
        await client.query(
            `INSERT INTO transaction_items (
                transaction_id,
                product_id,
                product_name,
                quantity,
                unit_price,
                subtotal
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                transactionId,
                record.productId,
                record.productName,
                record.quantity,
                record.unitPrice,
                record.subtotal,
            ],
        );
    }
};

const fetchTransactionItems = async (client: DbClient, transactionId: string) => {
    const { rows } = (await client.query(
        `SELECT product_id,
                product_name,
                quantity,
                unit_price,
                subtotal
         FROM transaction_items
         WHERE transaction_id = $1`,
        [transactionId],
    )) as DbQueryResult<
        {
            product_id: string;
            product_name: string;
            quantity: number;
            unit_price: number | string;
            subtotal: number | string;
        }
    >;

    return rows.map((row) => ({
        productId: row.product_id,
        productName: row.product_name,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unit_price),
        subtotal: Number(row.subtotal),
        currency: 'EUR',
    }));
};

const createTransaction = async ({
    items,
    paymentStatus,
    paymentMethod = 'manual',
    confirmationChannel = 'kiosk',
    confirmationReference = null,
    confirmationMetadata = null,
}: TransactionPayload): Promise<TransactionResult> => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'At least one item is required');
    }

    const normalizedStatus = normalizeStatus(paymentStatus);
    const normalizedMethod = (paymentMethod || 'manual')
        .toString()
        .trim()
        .toLowerCase();
    const shouldDeductInventory = normalizedStatus === 'COMPLETED';

    const inventory = inventoryService as unknown as {
        recordPurchaseDeduction: (params: {
            productId: string;
            quantity: number;
            transactionId: string;
            metadata: Record<string, unknown>;
            client: DbClient;
            deferPostProcessing: boolean;
        }) => Promise<Record<string, unknown>>;
        finalizeInventoryPostProcessing: (params: {
            productId: string;
            context: Record<string, unknown>;
        }) => Promise<Record<string, unknown>>;
    };

    const dbWithTransaction = db as unknown as {
        transaction: <T>(
            handler: (client: DbClient) => Promise<T>,
        ) => Promise<T>;
    };

    const result = await dbWithTransaction.transaction(
        async (client: DbClient) => {
            const productMap = await fetchProductsForItems(client, items);
            const { lineItems, totalAmount } = calculateTotals(
                items,
                productMap,
            );

            const transaction = await insertTransaction(client, {
                totalAmount,
                paymentMethod: normalizedMethod,
                paymentStatus: normalizedStatus,
                confirmationChannel,
                confirmationReference,
                confirmationMetadata,
            });

            if (!transaction) {
                throw new ApiError(500, 'Failed to record transaction');
            }

            await insertTransactionItems(client, {
                transactionId: transaction.id,
                lineItems,
            });

            const deductions: InventoryDeduction[] = [];
            if (shouldDeductInventory) {
                for (const item of lineItems) {
                    const record = item as {
                        productId: string;
                        quantity: number;
                        subtotal: number;
                        currency: string;
                    };
                    const deduction = await inventory.recordPurchaseDeduction({
                        productId: record.productId,
                        quantity: record.quantity,
                        transactionId: transaction.id,
                        metadata: {
                            transactionNumber: transaction.transaction_number,
                            subtotal: record.subtotal,
                            currency: record.currency,
                        },
                        client,
                        deferPostProcessing: true,
                    });
                    deductions.push({
                        ...(deduction as InventoryDeduction),
                        productId: record.productId,
                    });
                }
            }

            return {
                transaction,
                lineItems,
                deductions,
                shouldDeductInventory,
            } as {
                transaction: TransactionRecord;
                lineItems: Array<Record<string, unknown>>;
                deductions: InventoryDeduction[];
                shouldDeductInventory: boolean;
            };
        },
    );

    const postCommitSnapshots: InventoryPostCommitSnapshot[] = [];
    if (result.shouldDeductInventory) {
        for (const deduction of result.deductions) {
            if (deduction.trackingEnabled === false) {
                continue;
            }

            const snapshot = await inventory.finalizeInventoryPostProcessing({
                productId: deduction.productId,
                context: {
                    source: 'purchase',
                    transactionId: result.transaction.id,
                    transactionNumber: result.transaction.transaction_number,
                    shortfall: deduction.shortfall,
                    delta: deduction.delta,
                },
            });

            const postCommit: InventoryPostCommitSnapshot = {
                productId: deduction.productId,
                snapshot,
            };
            if (deduction.shortfall !== undefined) {
                postCommit.shortfall = deduction.shortfall;
            }
            if (deduction.delta !== undefined) {
                postCommit.delta = deduction.delta;
            }
            postCommitSnapshots.push(postCommit);
        }
    }

    return {
        transaction: result.transaction,
        items: result.lineItems,
        inventory: postCommitSnapshots,
        inventoryTracking: result.deductions.every(
            (entry) => entry.trackingEnabled !== false,
        ),
        inventoryApplied: result.shouldDeductInventory,
    };
};

const listTransactions = async (
    filters: TransactionListFilters = {},
): Promise<TransactionListResult> => {
    const page = Number.isFinite(filters.page)
        ? Math.max(1, Number(filters.page))
        : 1;
    const pageSize = Number.isFinite(filters.pageSize)
        ? Math.min(100, Math.max(1, Number(filters.pageSize)))
        : 25;
    const offset = (page - 1) * pageSize;

    const whereClause: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.status) {
        const normalizedStatus = normalizeStatus(filters.status);
        whereClause.push(`payment_status = $${paramIndex++}`);
        params.push(normalizedStatus);
    }

    if (filters.startDate) {
        whereClause.push(`created_at >= $${paramIndex++}`);
        params.push(new Date(filters.startDate));
    }

    if (filters.endDate) {
        whereClause.push(`created_at <= $${paramIndex++}`);
        params.push(new Date(filters.endDate));
    }

    if (filters.reference) {
        whereClause.push(
            `(transaction_number ILIKE $${paramIndex} OR confirmation_reference ILIKE $${paramIndex})`,
        );
        params.push(`%${filters.reference}%`);
        paramIndex += 1;
    }

    if (filters.kioskSessionId) {
        whereClause.push(
            `confirmation_metadata ->> 'kioskSessionId' = $${paramIndex++}`,
        );
        params.push(filters.kioskSessionId);
    }

    const whereString =
        whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const countResult = (await db.query(
        `SELECT COUNT(*) as total FROM transactions ${whereString}`,
        params,
    )) as DbQueryResult<{ total: string }>;

    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const dataResult = (await db.query(
        `SELECT id,
                transaction_number,
                total_amount,
                payment_method,
                payment_status,
                confirmation_channel,
                confirmation_reference,
                confirmation_metadata,
                completed_at,
                created_at,
                updated_at
         FROM transactions
         ${whereString}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, pageSize, offset],
    )) as DbQueryResult<Record<string, unknown>>;

    return {
        transactions: dataResult.rows,
        pagination: {
            page,
            pageSize,
            total,
        },
    };
};

const getTransactionAudit = async ({
    transactionId,
}: {
    transactionId: string;
}) => {
    if (!transactionId) {
        throw new ApiError(400, 'Transaction id is required');
    }

    const result = (await db.query(
        `SELECT id,
                admin_id,
                admin_username,
                action,
                entity_type,
                entity_id,
                old_values,
                new_values,
                ip_address,
                user_agent,
                created_at
         FROM audit_logs
         WHERE entity_type = 'TRANSACTION'
           AND entity_id = $1
         ORDER BY created_at DESC`,
        [transactionId],
    )) as DbQueryResult<Record<string, unknown>>;

    return {
        transactionId,
        audit: result.rows,
    };
};

const confirmTransaction = async ({
    transactionId,
    declaredOutcome,
    declaredTender,
    confirmationChannel,
    confirmationReference,
    confirmationMetadata,
}: {
    transactionId: string;
    declaredOutcome: string;
    declaredTender?: string | null;
    confirmationChannel?: string | null;
    confirmationReference?: string | null;
    confirmationMetadata?: Record<string, unknown> | null;
}): Promise<Record<string, unknown>> => {
    if (!transactionId) {
        throw new ApiError(400, 'Transaction id is required');
    }

    const normalizedOutcome = normalizeOutcome(declaredOutcome);

    const dbWithTransaction = db as unknown as {
        transaction: <T>(
            handler: (client: DbClient) => Promise<T>,
        ) => Promise<T>;
    };

    const inventory = inventoryService as unknown as {
        recordPurchaseDeduction: (params: {
            productId: string;
            quantity: number;
            transactionId: string;
            metadata: Record<string, unknown>;
            client: DbClient;
            deferPostProcessing: boolean;
        }) => Promise<Record<string, unknown>>;
        finalizeInventoryPostProcessing: (params: {
            productId: string;
            context: Record<string, unknown>;
        }) => Promise<Record<string, unknown>>;
    };

    const result = await dbWithTransaction.transaction(
        async (client: DbClient) => {
            const transactionResult = (await client.query(
                `SELECT id,
                        transaction_number,
                        total_amount,
                        payment_method,
                        payment_status,
                        confirmation_channel,
                        confirmation_reference,
                        confirmation_metadata,
                        completed_at,
                        created_at,
                        updated_at
                 FROM transactions
                 WHERE id = $1
                 FOR UPDATE`,
                [transactionId],
            )) as DbQueryResult<TransactionRow>;

            const transaction = transactionResult.rows[0];
            if (!transaction) {
                throw new ApiError(404, 'Transaction not found');
            }

            const currentStatus = transaction.payment_status
                ? transaction.payment_status.toString().toUpperCase()
                : '';
            if (currentStatus !== 'PENDING') {
                throw new ApiError(409, 'Transaction not pending', {
                    status: transaction.payment_status,
                });
            }

            const lineItems = await fetchTransactionItems(
                client,
                transactionId,
            );

            const mergedMetadata = {
                ...(transaction.confirmation_metadata ?? {}),
                ...(confirmationMetadata ?? {}),
            } as Record<string, unknown>;

            if (declaredTender) {
                mergedMetadata.declaredTender = declaredTender;
            }
            mergedMetadata.confirmedAt = new Date().toISOString();

            const updated = (await client.query(
                `UPDATE transactions
                 SET payment_status = $1,
                     confirmation_channel = COALESCE($2, confirmation_channel),
                     confirmation_reference = COALESCE($3, confirmation_reference),
                     confirmation_metadata = $4,
                     completed_at = CASE WHEN $1 = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE NULL END,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $5
                 RETURNING id,
                           transaction_number,
                           total_amount,
                           payment_method,
                           payment_status,
                           confirmation_channel,
                           confirmation_reference,
                           confirmation_metadata,
                           completed_at,
                           created_at,
                           updated_at`,
                [
                    normalizedOutcome,
                    confirmationChannel ?? null,
                    confirmationReference ?? null,
                    mergedMetadata,
                    transactionId,
                ],
            )) as DbQueryResult<TransactionRow>;

            const updatedTransaction = updated.rows[0];
            if (!updatedTransaction) {
                throw new ApiError(500, 'Failed to update transaction');
            }

            const shouldDeductInventory = normalizedOutcome === 'COMPLETED';
            const deductions: InventoryDeduction[] = [];

            if (shouldDeductInventory) {
                for (const item of lineItems) {
                    const deduction = await inventory.recordPurchaseDeduction({
                        productId: item.productId,
                        quantity: item.quantity,
                        transactionId,
                        metadata: {
                            transactionNumber:
                                updatedTransaction.transaction_number,
                            subtotal: item.subtotal,
                            currency: item.currency,
                        },
                        client,
                        deferPostProcessing: true,
                    });
                    deductions.push({
                        ...(deduction as InventoryDeduction),
                        productId: item.productId,
                    });
                }
            }

            return {
                transaction: updatedTransaction,
                lineItems,
                deductions,
                shouldDeductInventory,
            } as {
                transaction: TransactionRow;
                lineItems: TransactionLineItem[];
                deductions: InventoryDeduction[];
                shouldDeductInventory: boolean;
            };
        },
    );

    const postCommitSnapshots: InventoryPostCommitSnapshot[] = [];
    if (result.shouldDeductInventory) {
        for (const deduction of result.deductions) {
            if (deduction.trackingEnabled === false) {
                continue;
            }

            const snapshot = await inventory.finalizeInventoryPostProcessing({
                productId: deduction.productId,
                context: {
                    source: 'purchase',
                    transactionId: result.transaction.id,
                    transactionNumber: result.transaction.transaction_number,
                    shortfall: deduction.shortfall,
                    delta: deduction.delta,
                },
            });

            const postCommit: InventoryPostCommitSnapshot = {
                productId: deduction.productId,
                snapshot,
            };
            if (deduction.shortfall !== undefined) {
                postCommit.shortfall = deduction.shortfall;
            }
            if (deduction.delta !== undefined) {
                postCommit.delta = deduction.delta;
            }
            postCommitSnapshots.push(postCommit);
        }
    }

    return {
        transaction: result.transaction,
        items: result.lineItems,
        inventory: postCommitSnapshots,
        inventoryTracking: result.deductions.every(
            (entry) => entry.trackingEnabled !== false,
        ),
        inventoryApplied: result.shouldDeductInventory,
    };
};

const transactionService = {
    createTransaction,
    listTransactions,
    getTransactionAudit,
    confirmTransaction,
};

export { createTransaction };
export default transactionService;
