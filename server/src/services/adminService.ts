import db from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import authService from './authService';
import { createAuditLog, AuditActions, EntityTypes } from './auditService';

const MAX_ADMIN_ACCOUNTS = 10;

type DbQueryResult<T = unknown> = {
    rows: T[];
    rowCount?: number;
};

type DbClient = {
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

type AdminRow = {
    id: string;
    username: string;
    email: string | null;
    is_primary: boolean;
    is_active: boolean;
    last_login_at?: string | null;
    created_at?: string;
    updated_at?: string | null;
};

type AdminActor = {
    id: string;
    username: string;
};

type AdminUpdatePayload = {
    username?: string;
    email?: string | null;
    is_active?: boolean;
};

type AdminCreatePayload = {
    username: string;
    email?: string | null;
    password: string;
    isPrimary?: boolean;
};

const database = db as unknown as DbClient;

const getAllAdmins = async (): Promise<AdminRow[]> => {
    const result = (await database.query(
        `SELECT id, username, email, is_primary, is_active, last_login_at, created_at, updated_at
     FROM admins
     ORDER BY is_primary DESC, created_at ASC`
    )) as DbQueryResult<AdminRow>;
    return result.rows;
};

const getAdminById = async (id: string): Promise<AdminRow | null> => {
    const result = (await database.query(
        `SELECT id, username, email, is_primary, is_active, last_login_at, created_at, updated_at
     FROM admins
     WHERE id = $1`,
        [id]
    )) as DbQueryResult<AdminRow>;
    return result.rows[0] || null;
};

const getAdminByUsername = async (username: string): Promise<Record<string, unknown> | null> => {
    const result = (await database.query('SELECT * FROM admins WHERE username = $1', [username])) as DbQueryResult<
        Record<string, unknown>
    >;
    return result.rows[0] || null;
};

const getAdminCount = async (): Promise<number> => {
    const result = (await database.query('SELECT COUNT(*) as count FROM admins')) as DbQueryResult<{
        count: string;
    }>;
    return parseInt(result.rows[0]?.count || '0', 10);
};

const createAdmin = async (adminData: AdminCreatePayload, createdBy: AdminActor) => {
    const count = await getAdminCount();
    if (count >= MAX_ADMIN_ACCOUNTS) {
        throw new ApiError(400, 'Maximum 10 admin accounts allowed');
    }

    const auth = authService as unknown as {
        hashPassword: (password: string) => Promise<string>;
        addToPasswordHistory: (adminId: string, passwordHash: string) => Promise<void>;
    };

    const passwordHash = await auth.hashPassword(adminData.password);

    const result = (await database.query(
        `INSERT INTO admins (username, email, password_hash, is_primary)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, email, is_primary, is_active, created_at`,
        [adminData.username, adminData.email || null, passwordHash, adminData.isPrimary || false]
    )) as DbQueryResult<AdminRow>;

    const newAdmin = result.rows[0];
    if (!newAdmin) {
        throw new ApiError(500, 'Failed to create admin account');
    }

    await auth.addToPasswordHistory(newAdmin.id, passwordHash);

    await createAuditLog({
        adminId: createdBy.id,
        adminUsername: createdBy.username,
        action: AuditActions.ADMIN_CREATED,
        entityType: EntityTypes.ADMIN,
        entityId: newAdmin.id,
        newValues: { username: newAdmin.username, email: newAdmin.email, isPrimary: newAdmin.is_primary }
    });

    return newAdmin;
};

const updateAdmin = async (id: string, updates: AdminUpdatePayload, updatedBy: AdminActor) => {
    const currentAdmin = await getAdminById(id);
    if (!currentAdmin) {
        throw new ApiError(404, 'Admin not found');
    }

    const allowedFields: Array<keyof AdminUpdatePayload> = ['username', 'email', 'is_active'];
    const setClause: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key as keyof AdminUpdatePayload)) {
            setClause.push(`${key} = $${paramIndex++}`);
            values.push(value);
        }
    }

    if (setClause.length === 0) {
        return currentAdmin;
    }

    values.push(id);

    const result = (await database.query(
        `UPDATE admins 
     SET ${setClause.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, username, email, is_primary, is_active, created_at, updated_at`,
        values
    )) as DbQueryResult<AdminRow>;

    const updatedAdmin = result.rows[0];
    if (!updatedAdmin) {
        throw new ApiError(500, 'Failed to update admin account');
    }

    await createAuditLog({
        adminId: updatedBy.id,
        adminUsername: updatedBy.username,
        action: AuditActions.ADMIN_UPDATED,
        entityType: EntityTypes.ADMIN,
        entityId: id,
        oldValues: currentAdmin,
        newValues: updatedAdmin
    });

    return updatedAdmin;
};

const changePassword = async (
    id: string,
    currentPassword: string,
    newPassword: string,
    changedBy: AdminActor
) => {
    const result = (await database.query('SELECT * FROM admins WHERE id = $1', [id])) as DbQueryResult<
        Record<string, unknown>
    >;
    const admin = result.rows[0] as { password_hash?: string } | undefined;

    if (!admin) {
        throw new ApiError(404, 'Admin not found');
    }

    const auth = authService as unknown as {
        verifyPassword: (password: string, hash: string) => Promise<boolean>;
        checkPasswordHistory: (adminId: string, password: string) => Promise<boolean>;
        hashPassword: (password: string) => Promise<string>;
        addToPasswordHistory: (adminId: string, passwordHash: string) => Promise<void>;
        invalidateAllSessions: (adminId: string) => Promise<void>;
    };

    const isValid = await auth.verifyPassword(currentPassword, admin.password_hash || '');
    if (!isValid) {
        throw new ApiError(400, 'Current password is incorrect');
    }

    const wasUsed = await auth.checkPasswordHistory(id, newPassword);
    if (wasUsed) {
        throw new ApiError(400, 'Password has been used recently. Please choose a different password.');
    }

    const newPasswordHash = await auth.hashPassword(newPassword);

    await database.query(
        `UPDATE admins 
     SET password_hash = $1, password_changed_at = NOW()
     WHERE id = $2`,
        [newPasswordHash, id]
    );

    await auth.addToPasswordHistory(id, newPasswordHash);
    await auth.invalidateAllSessions(id);

    await createAuditLog({
        adminId: changedBy.id,
        adminUsername: changedBy.username,
        action: AuditActions.PASSWORD_CHANGED,
        entityType: EntityTypes.ADMIN,
        entityId: id
    });

    return true;
};

const deleteAdmin = async (id: string, deletedBy: AdminActor) => {
    const admin = await getAdminById(id);
    if (!admin) {
        throw new ApiError(404, 'Admin not found');
    }

    if (admin.is_primary) {
        throw new ApiError(400, 'Cannot delete primary admin account');
    }

    if (id === deletedBy.id) {
        throw new ApiError(400, 'Cannot delete your own account');
    }

    await database.query('DELETE FROM admins WHERE id = $1', [id]);

    await createAuditLog({
        adminId: deletedBy.id,
        adminUsername: deletedBy.username,
        action: AuditActions.ADMIN_DELETED,
        entityType: EntityTypes.ADMIN,
        entityId: id,
        oldValues: admin
    });

    return true;
};

const adminService = {
    MAX_ADMIN_ACCOUNTS,
    getAllAdmins,
    getAdminById,
    getAdminByUsername,
    getAdminCount,
    createAdmin,
    updateAdmin,
    changePassword,
    deleteAdmin
};

export {
    MAX_ADMIN_ACCOUNTS,
    getAllAdmins,
    getAdminById,
    getAdminByUsername,
    getAdminCount,
    createAdmin,
    updateAdmin,
    changePassword,
    deleteAdmin
};

export default adminService;
