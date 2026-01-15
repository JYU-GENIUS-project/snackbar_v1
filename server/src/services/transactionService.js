const db = require('../utils/database');
const { ApiError } = require('../middleware/errorHandler');
const inventoryService = require('./inventoryService');

const PAYMENT_STATUSES = new Set(['PENDING', 'COMPLETED', 'FAILED', 'PAYMENT_UNCERTAIN']);

const normalizeStatus = (status) => {
    const normalized = (status || 'COMPLETED').toString().trim().toUpperCase();
    if (!PAYMENT_STATUSES.has(normalized)) {
        throw new ApiError(400, 'Invalid payment status');
    }
    return normalized;
};

const normalizeQuantity = (value) => {
    const quantity = parseInt(value, 10);
    if (Number.isNaN(quantity) || quantity <= 0) {
        throw new ApiError(400, 'Quantity must be a positive integer');
    }
    return quantity;
};

const fetchProductsForItems = async (client, items) => {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const { rows } = await client.query(
        `SELECT id, name, price, currency, stock_quantity, purchase_limit, is_active, deleted_at
         FROM products
         WHERE id = ANY($1::uuid[])
         FOR UPDATE`,
        [productIds]
    );

    const productMap = new Map(rows.map((row) => [row.id, row]));
    for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product || product.deleted_at || product.is_active === false) {
            throw new ApiError(404, `Product ${item.productId} is unavailable`);
        }
    }

    return productMap;
};

const calculateTotals = (items, productMap) => {
    let total = 0;
    const lineItems = items.map((item) => {
        const product = productMap.get(item.productId);
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

const insertTransaction = async (client, { totalAmount, paymentMethod, paymentStatus, mobilepayPaymentId = null, mobilepayQrCode = null }) => {
    const { rows } = await client.query(
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
    );

    return rows[0];
};

const insertTransactionItems = async (client, { transactionId, lineItems }) => {
    for (const item of lineItems) {
        await client.query(
            `INSERT INTO transaction_items (
                transaction_id,
                product_id,
                product_name,
                quantity,
                unit_price,
                subtotal
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [transactionId, item.productId, item.productName, item.quantity, item.unitPrice, item.subtotal]
        );
    }
};

const createTransaction = async ({
    items,
    paymentStatus,
    paymentMethod = 'mobilepay',
    mobilepayPaymentId = null,
    mobilepayQrCode = null
}) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'At least one item is required');
    }

    const normalizedStatus = normalizeStatus(paymentStatus);
    const normalizedMethod = (paymentMethod || 'mobilepay').toString().trim().toLowerCase();
    const shouldDeductInventory = normalizedStatus === 'COMPLETED';

    const result = await db.transaction(async (client) => {
        const productMap = await fetchProductsForItems(client, items);
        const { lineItems, totalAmount } = calculateTotals(items, productMap);

        const transaction = await insertTransaction(client, {
            totalAmount,
            paymentMethod: normalizedMethod,
            paymentStatus: normalizedStatus,
            mobilepayPaymentId,
            mobilepayQrCode
        });

        await insertTransactionItems(client, { transactionId: transaction.id, lineItems });

        const deductions = [];
        if (shouldDeductInventory) {
            for (const item of lineItems) {
                const deduction = await inventoryService.recordPurchaseDeduction({
                    productId: item.productId,
                    quantity: item.quantity,
                    transactionId: transaction.id,
                    metadata: {
                        transactionNumber: transaction.transaction_number,
                        subtotal: item.subtotal,
                        currency: item.currency
                    },
                    client,
                    deferPostProcessing: true
                });
                deductions.push({ ...deduction, productId: item.productId });
            }
        }

        return {
            transaction,
            lineItems,
            deductions,
            shouldDeductInventory
        };
    });

    const postCommitSnapshots = [];
    if (result.shouldDeductInventory) {
        for (const deduction of result.deductions) {
            if (!deduction.trackingEnabled) {
                continue;
            }

            const snapshot = await inventoryService.finalizeInventoryPostProcessing({
                productId: deduction.productId,
                context: {
                    source: 'purchase',
                    transactionId: result.transaction.id,
                    transactionNumber: result.transaction.transaction_number,
                    shortfall: deduction.shortfall,
                    delta: deduction.delta
                }
            });

            postCommitSnapshots.push({
                productId: deduction.productId,
                snapshot,
                shortfall: deduction.shortfall,
                delta: deduction.delta
            });
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

module.exports = {
    createTransaction
};
