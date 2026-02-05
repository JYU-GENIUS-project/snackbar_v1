import bcrypt from '@node-rs/bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../utils/database';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '', 10) || 12;
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

type DbQueryResult<T = unknown> = {
    rows: T[];
    rowCount?: number;
};

type DbClient = {
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

const database = db as unknown as DbClient;

const hashPassword = async (password: string) => {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
};

const verifyPassword = async (password: string, hash: string) => {
    return bcrypt.compare(password, hash);
};

const checkPasswordHistory = async (adminId: string, password: string) => {
    const result = (await database.query(
        `SELECT password_hash FROM password_history 
     WHERE admin_id = $1 
     ORDER BY created_at DESC 
     LIMIT 5`,
        [adminId]
    )) as DbQueryResult<{ password_hash: string }>;

    for (const row of result.rows) {
        if (await verifyPassword(password, row.password_hash)) {
            return true;
        }
    }

    return false;
};

const addToPasswordHistory = async (adminId: string, passwordHash: string) => {
    await database.query('INSERT INTO password_history (admin_id, password_hash) VALUES ($1, $2)', [
        adminId,
        passwordHash
    ]);
};

const generateToken = (userId: string, sessionId: string) => {
    return jwt.sign(
        {
            userId,
            sessionId,
            type: 'access'
        },
        JWT_SECRET as jwt.Secret,
        { expiresIn: JWT_EXPIRATION } as jwt.SignOptions
    );
};

const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
};

const createSession = async (adminId: string, ipAddress: string, userAgent: string) => {
    const sessionId = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(sessionId).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await database.query(
        `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
        [sessionId, adminId, tokenHash, expiresAt, ipAddress, userAgent]
    );

    const token = generateToken(adminId, sessionId);

    return {
        sessionId,
        token,
        expiresAt
    };
};

const invalidateSession = async (sessionId: string) => {
    await database.query('DELETE FROM admin_sessions WHERE id = $1', [sessionId]);
};

const invalidateAllSessions = async (adminId: string) => {
    await database.query('DELETE FROM admin_sessions WHERE admin_id = $1', [adminId]);
};

const recordFailedLogin = async (adminId: string) => {
    await database.query(
        `UPDATE admins 
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE 
           WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
           ELSE locked_until
         END
     WHERE id = $1`,
        [adminId]
    );
};

const resetFailedLogins = async (adminId: string) => {
    await database.query(
        `UPDATE admins 
     SET failed_login_attempts = 0, 
         locked_until = NULL, 
         last_login_at = NOW()
     WHERE id = $1`,
        [adminId]
    );
};

const isAccountLocked = async (adminId: string) => {
    const result = (await database.query('SELECT locked_until FROM admins WHERE id = $1', [adminId])) as DbQueryResult<{
        locked_until: string | null;
    }>;

    if (result.rows.length === 0) {
        return false;
    }

    const lockedUntil = result.rows[0]?.locked_until;
    return Boolean(lockedUntil && new Date(lockedUntil) > new Date());
};

const authService = {
    hashPassword,
    verifyPassword,
    checkPasswordHistory,
    addToPasswordHistory,
    generateToken,
    verifyToken,
    createSession,
    invalidateSession,
    invalidateAllSessions,
    recordFailedLogin,
    resetFailedLogins,
    isAccountLocked
};

export {
    hashPassword,
    verifyPassword,
    checkPasswordHistory,
    addToPasswordHistory,
    generateToken,
    verifyToken,
    createSession,
    invalidateSession,
    invalidateAllSessions,
    recordFailedLogin,
    resetFailedLogins,
    isAccountLocked
};

export default authService;
