import db from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import { createAuditLog, AuditActions, EntityTypes } from './auditService';

type DbQueryResult<T = unknown> = {
    rows: T[];
    rowCount?: number;
};

type DbClient = {
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

type CartSessionRow = {
    id: string;
    session_key: string;
    status: string;
    last_activity_at: string;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
};

type CartItemRow = {
    id: string;
    product_id: string | null;
    product_name: string;
    unit_price: number | string;
    quantity: number;
    purchase_limit: number | null;
};

type ProductRow = {
    id: string;
    name: string;
    price: number | string;
    purchase_limit: number | null;
    is_active: boolean;
};

type CartItem = {
    id: string;
    productId: string | null;
    name: string;
    unitPrice: number;
    quantity: number;
    purchaseLimit: number | null;
    subtotal: number;
};

type CartResponse = {
    sessionKey: string;
    status: string;
    lastActivityAt: string;
    expiresAt: string | null;
    items: CartItem[];
    total: number;
};

const CART_TIMEOUT_KEY = 'cart_timeout_seconds';

const parseNumber = (value: unknown, fallback: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return fallback;
};

const parseMoney = (value: number | string | null | undefined): number => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const getCartTimeoutSeconds = async (client: DbClient): Promise<number> => {
    const result = (await client.query(
        'SELECT value FROM system_config WHERE key = $1 LIMIT 1',
        [CART_TIMEOUT_KEY]
    )) as DbQueryResult<{ value: unknown }>;

    const value = result.rows[0]?.value;
    return parseNumber(value, 300);
};

const normalizeCartItems = (rows: CartItemRow[]): CartItem[] => {
    return rows.map((row) => {
        const unitPrice = parseMoney(row.unit_price);
        const quantity = Number(row.quantity || 0);
        return {
            id: row.id,
            productId: row.product_id,
            name: row.product_name,
            unitPrice,
            quantity,
            purchaseLimit: row.purchase_limit ?? null,
            subtotal: unitPrice * quantity
        };
    });
};

const buildCartResponse = (session: CartSessionRow, items: CartItemRow[]): CartResponse => {
    const normalized = normalizeCartItems(items);
    const total = normalized.reduce((sum, item) => sum + item.subtotal, 0);
    return {
        sessionKey: session.session_key,
        status: session.status,
        lastActivityAt: session.last_activity_at,
        expiresAt: session.expires_at,
        items: normalized,
        total
    };
};

const getSessionByKey = async (client: DbClient, sessionKey: string): Promise<CartSessionRow | null> => {
    const result = (await client.query(
        'SELECT * FROM cart_sessions WHERE session_key = $1 LIMIT 1',
        [sessionKey]
    )) as DbQueryResult<CartSessionRow>;
    return result.rows[0] || null;
};

const createSession = async (client: DbClient, sessionKey: string): Promise<CartSessionRow> => {
    const timeoutSeconds = await getCartTimeoutSeconds(client);
    const expiresAt = new Date(Date.now() + timeoutSeconds * 1000);
    const result = (await client.query(
        `INSERT INTO cart_sessions (session_key, status, last_activity_at, expires_at)
         VALUES ($1, 'active', CURRENT_TIMESTAMP, $2)
         RETURNING *`,
        [sessionKey, expiresAt]
    )) as DbQueryResult<CartSessionRow>;

    return result.rows[0];
};

const touchSession = async (client: DbClient, session: CartSessionRow): Promise<CartSessionRow> => {
    const timeoutSeconds = await getCartTimeoutSeconds(client);
    const expiresAt = new Date(Date.now() + timeoutSeconds * 1000);
    const result = (await client.query(
        `UPDATE cart_sessions
         SET last_activity_at = CURRENT_TIMESTAMP,
             expires_at = $2
         WHERE id = $1
         RETURNING *`,
        [session.id, expiresAt]
    )) as DbQueryResult<CartSessionRow>;

    return result.rows[0] || session;
};

const getOrCreateSession = async (client: DbClient, sessionKey: string): Promise<CartSessionRow> => {
    const existing = await getSessionByKey(client, sessionKey);
    if (existing) {
        return touchSession(client, existing);
    }
    return createSession(client, sessionKey);
};

const fetchCartItems = async (client: DbClient, sessionId: string): Promise<CartItemRow[]> => {
    const result = (await client.query(
        `SELECT id, product_id, product_name, unit_price, quantity, purchase_limit
         FROM cart_items
         WHERE cart_session_id = $1
         ORDER BY created_at ASC`,
        [sessionId]
    )) as DbQueryResult<CartItemRow>;
    return result.rows;
};

const logCartAudit = async (action: string, session: CartSessionRow, newValues?: Record<string, unknown>) => {
    await createAuditLog({
        adminId: null,
        adminUsername: 'kiosk',
        action,
        entityType: EntityTypes.CART_SESSION,
        entityId: session.id,
        newValues: newValues ?? null
    });
};

const getCart = async (sessionKey: string): Promise<CartResponse> => {
    return db.transaction(async (client) => {
        const session = await getOrCreateSession(client as DbClient, sessionKey);
        const items = await fetchCartItems(client as DbClient, session.id);
        return buildCartResponse(session, items);
    });
};

const setCartItemQuantity = async (sessionKey: string, productId: string, quantity: number) => {
    if (!Number.isFinite(quantity)) {
        throw new ApiError(400, 'Quantity must be a number');
    }

    return db.transaction(async (client) => {
        const session = await getOrCreateSession(client as DbClient, sessionKey);

        const productResult = (await client.query(
            `SELECT id, name, price, purchase_limit, is_active
             FROM products
             WHERE id = $1
             LIMIT 1`,
            [productId]
        )) as DbQueryResult<ProductRow>;

        const product = productResult.rows[0];
        if (!product || product.is_active === false) {
            throw new ApiError(404, 'Product not found');
        }

        const limit = product.purchase_limit ?? null;
        if (limit && quantity > limit) {
            throw new ApiError(409, `Maximum ${limit} of this item per purchase`, {
                code: 'PURCHASE_LIMIT',
                limit,
                productId
            });
        }

        if (quantity <= 0) {
            await client.query(
                'DELETE FROM cart_items WHERE cart_session_id = $1 AND product_id = $2',
                [session.id, productId]
            );
            await logCartAudit(AuditActions.CART_ITEM_REMOVED, session, { productId, quantity: 0 });
        } else {
            await client.query(
                `INSERT INTO cart_items
                 (cart_session_id, product_id, product_name, unit_price, quantity, purchase_limit)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (cart_session_id, product_id)
                 DO UPDATE SET
                   product_name = EXCLUDED.product_name,
                   unit_price = EXCLUDED.unit_price,
                   quantity = EXCLUDED.quantity,
                   purchase_limit = EXCLUDED.purchase_limit,
                   updated_at = CURRENT_TIMESTAMP`,
                [
                    session.id,
                    product.id,
                    product.name,
                    product.price,
                    quantity,
                    limit
                ]
            );
            await logCartAudit(AuditActions.CART_ITEM_ADDED, session, { productId, quantity });
        }

        const items = await fetchCartItems(client as DbClient, session.id);
        return buildCartResponse(session, items);
    });
};

const removeCartItem = async (sessionKey: string, productId: string) => {
    return db.transaction(async (client) => {
        const session = await getOrCreateSession(client as DbClient, sessionKey);
        await client.query(
            'DELETE FROM cart_items WHERE cart_session_id = $1 AND product_id = $2',
            [session.id, productId]
        );
        await logCartAudit(AuditActions.CART_ITEM_REMOVED, session, { productId });
        const items = await fetchCartItems(client as DbClient, session.id);
        return buildCartResponse(session, items);
    });
};

const clearCart = async (sessionKey: string) => {
    return db.transaction(async (client) => {
        const session = await getOrCreateSession(client as DbClient, sessionKey);
        await client.query('DELETE FROM cart_items WHERE cart_session_id = $1', [session.id]);
        await logCartAudit(AuditActions.CART_CLEARED, session);
        const items = await fetchCartItems(client as DbClient, session.id);
        return buildCartResponse(session, items);
    });
};

const cartService = {
    getCart,
    setCartItemQuantity,
    removeCartItem,
    clearCart
};

export default cartService;
