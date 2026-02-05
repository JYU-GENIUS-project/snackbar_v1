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
    mobilepayPaymentId?: string | null;
    mobilepayQrCode?: string | null;
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

type TransactionResult = {
    transaction: TransactionRecord;
    items: Array<Record<string, unknown>>;
    inventory: InventoryPostCommitSnapshot[];
    inventoryTracking: boolean;
    inventoryApplied: boolean;
};

const PAYMENT_STATUSES = new Set(['PENDING', 'COMPLETED', 'FAILED', 'PAYMENT_UNCERTAIN']);

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

const fetchProductsForItems = async (client: DbClient, items: TransactionItemInput[]) => {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const { rows } = (await client.query(
        `SELECT id, name, price, currency, stock_quantity, purchase_limit, is_active, deleted_at
         FROM products
         WHERE id = ANY($1::uuid[])
         FOR UPDATE`,
        [productIds]
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

const calculateTotals = (items: TransactionItemInput[], productMap: Map<string, ProductRow>) => {
    let total = 0;
    const lineItems = items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
            throw new ApiError(404, `Product ${item.productId} is unavailable`);
        }

        const quantity = normalizeQuantity(item.quantity);

        if (product.purchase_limit && quantity > product.purchase_limit) {
            throw new ApiError(400, `Quantity exceeds purchase limit for ${product.name}`);
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
            currency: product.currency || 'EUR'
        };
    });

    return {
        lineItems,
        totalAmount: Number(total.toFixed(2))
    };
};

const insertTransaction = async (
    client: DbClient,
    {
        totalAmount,
        paymentMethod,
        paymentStatus,
        mobilepayPaymentId = null,
        mobilepayQrCode = null
    }: {
        totalAmount: number;
        paymentMethod: string;
        paymentStatus: string;
        mobilepayPaymentId?: string | null;
        mobilepayQrCode?: string | null;
    }
) => {
    const { rows } = (await client.query(
        `INSERT INTO transactions (
            total_amount,
            payment_method,
            payment_status,
            mobilepay_payment_id,
            mobilepay_qr_code,
            completed_at
        ) VALUES ($1, $2, $3, $4, $5, CASE WHEN $3 = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE NULL END)
        RETURNING id, transaction_number, total_amount, payment_method, payment_status, mobilepay_payment_id,
                  mobilepay_qr_code, completed_at, created_at, updated_at`,
        [totalAmount, paymentMethod, paymentStatus, mobilepayPaymentId, mobilepayQrCode]
    )) as DbQueryResult<TransactionRecord>;

    return rows[0];
};

const insertTransactionItems = async (
    client: DbClient,
    { transactionId, lineItems }: { transactionId: string; lineItems: Array<Record<string, unknown>> }
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
            [transactionId, record.productId, record.productName, record.quantity, record.unitPrice, record.subtotal]
        );
    }
};

const createTransaction = async ({
    items,
    paymentStatus,
    paymentMethod = 'mobilepay',
    mobilepayPaymentId = null,
    mobilepayQrCode = null
}: TransactionPayload): Promise<TransactionResult> => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'At least one item is required');
    }

    const normalizedStatus = normalizeStatus(paymentStatus);
    const normalizedMethod = (paymentMethod || 'mobilepay').toString().trim().toLowerCase();
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
        transaction: <T>(handler: (client: DbClient) => Promise<T>) => Promise<T>;
    };

    const result = await dbWithTransaction.transaction(async (client: DbClient) => {
        const productMap = await fetchProductsForItems(client, items);
        const { lineItems, totalAmount } = calculateTotals(items, productMap);

        const transaction = await insertTransaction(client, {
            totalAmount,
            paymentMethod: normalizedMethod,
            paymentStatus: normalizedStatus,
            mobilepayPaymentId,
            mobilepayQrCode
        });

        if (!transaction) {
            throw new ApiError(500, 'Failed to record transaction');
        }

        await insertTransactionItems(client, { transactionId: transaction.id, lineItems });

        const deductions: InventoryDeduction[] = [];
        if (shouldDeductInventory) {
            for (const item of lineItems) {
                const record = item as { productId: string; quantity: number; subtotal: number; currency: string };
                const deduction = await inventory.recordPurchaseDeduction({
                    productId: record.productId,
                    quantity: record.quantity,
                    transactionId: transaction.id,
                    metadata: {
                        transactionNumber: transaction.transaction_number,
                        subtotal: record.subtotal,
                        currency: record.currency
                    },
                    client,
                    deferPostProcessing: true
                });
                deductions.push({ ...(deduction as InventoryDeduction), productId: record.productId });
            }
        }

        return {
            transaction,
            lineItems,
            deductions,
            shouldDeductInventory
        } as {
            transaction: TransactionRecord;
            lineItems: Array<Record<string, unknown>>;
            deductions: InventoryDeduction[];
            shouldDeductInventory: boolean;
        };
    });

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
                    delta: deduction.delta
                }
            });

            const postCommit: InventoryPostCommitSnapshot = {
                productId: deduction.productId,
                snapshot
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
        inventoryTracking: result.deductions.every((entry) => entry.trackingEnabled !== false),
        inventoryApplied: result.shouldDeductInventory
    };
};

const transactionService = {
    createTransaction
};

export { createTransaction };
export default transactionService;
