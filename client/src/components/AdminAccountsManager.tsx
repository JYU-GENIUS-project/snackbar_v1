import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

const MAX_ACCOUNTS = 10;

type AdminAccount = {
    id: string;
    email: string;
    name: string;
    isPrimary: boolean;
};

type Banner = {
    type: 'success' | 'error';
    message: string;
};

type FormValues = {
    email: string;
    password: string;
};

type SeedMode = 'default' | 'max';

type AdminAccountsBridge = {
    seed: (mode?: SeedMode) => void;
};

const baseAccounts: AdminAccount[] = [
    { id: 'admin-primary', email: 'admin@example.com', name: 'Primary Administrator', isPrimary: true },
    { id: 'admin-support', email: 'ops@example.com', name: 'Operations Administrator', isPrimary: false }
];

const buildAccountList = (mode: SeedMode): AdminAccount[] => {
    const desiredMode: SeedMode = mode === 'max' ? 'max' : 'default';
    const seeded = [...baseAccounts];

    if (desiredMode === 'max') {
        for (let index = seeded.length; index < MAX_ACCOUNTS; index += 1) {
            const slot = index + 1;
            seeded.push({
                id: `admin-seeded-${slot}`,
                email: `team${slot}@example.com`,
                name: `Team Member ${slot}`,
                isPrimary: false
            });
        }
    }

    return seeded;
};

const resolveInitialAccounts = (): AdminAccount[] => {
    if (typeof window === 'undefined') {
        return buildAccountList('default');
    }

    const stored = window.sessionStorage.getItem('snackbar-admin-accounts-seed');
    return buildAccountList(stored === 'max' ? 'max' : 'default');
};

declare global {
    interface Window {
        snackbarAdminAccounts?: AdminAccountsBridge;
    }
}

const AdminAccountsManager = () => {
    const [accounts, setAccounts] = useState<AdminAccount[]>(resolveInitialAccounts);
    const [formValues, setFormValues] = useState<FormValues>({ email: '', password: '' });
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
    const [banner, setBanner] = useState<Banner | null>(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    const selectedAdmin = useMemo(
        () => accounts.find((account) => account.id === selectedAdminId) ?? null,
        [accounts, selectedAdminId]
    );

    const isAtLimit = accounts.length >= MAX_ACCOUNTS;

    const applySeed = useCallback((mode: SeedMode = 'default') => {
        const nextMode: SeedMode = mode === 'max' ? 'max' : 'default';

        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('snackbar-admin-accounts-seed', nextMode);
        }

        setAccounts(buildAccountList(nextMode));
        setSelectedAdminId(null);
        setFormValues({ email: '', password: '' });
        setIsFormVisible(false);
        setBanner(null);
        setShowConfirmDelete(false);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        window.snackbarAdminAccounts = {
            seed: (mode?: SeedMode) => applySeed(mode)
        };

        return () => {
            delete window.snackbarAdminAccounts;
        };
    }, [applySeed]);

    const handleStartCreate = () => {
        setBanner(null);
        setIsFormVisible(true);
        setFormValues({ email: '', password: '' });
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormValues((current) => ({ ...current, [name]: value }));
    };

    const handleSelectAdmin = (accountId: string) => {
        setSelectedAdminId((current) => (current === accountId ? null : accountId));
        setBanner(null);
    };

    const handleCreateAdmin = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isAtLimit) {
            setBanner({ type: 'error', message: 'Maximum 10 admin accounts' });
            return;
        }

        const email = formValues.email.trim().toLowerCase();
        const password = formValues.password.trim();

        if (!email || !password) {
            setBanner({ type: 'error', message: 'Email and temporary password are required.' });
            return;
        }

        const alreadyExists = accounts.some((account) => account.email === email);
        if (alreadyExists) {
            setBanner({ type: 'error', message: 'An admin account with that email already exists.' });
            return;
        }

        const timestamp = Date.now();
        const createdAccount: AdminAccount = {
            id: `admin-${timestamp}`,
            email,
            name: email,
            isPrimary: false
        };

        setAccounts((current) => [...current, createdAccount]);
        setBanner({ type: 'success', message: 'Admin account created successfully' });
        setSelectedAdminId(createdAccount.id);
        setFormValues({ email: '', password: '' });
        setIsFormVisible(false);
    };

    const handleDeleteAdmin = () => {
        if (!selectedAdmin) {
            return;
        }

        setShowConfirmDelete(true);
    };

    const handleConfirmDelete = () => {
        if (!selectedAdmin) {
            setShowConfirmDelete(false);
            return;
        }

        const targetId = selectedAdmin.id;
        setAccounts((current) => current.filter((account) => account.id !== targetId));
        setBanner({ type: 'success', message: 'Admin account deleted' });
        setSelectedAdminId(null);
        setShowConfirmDelete(false);
    };

    const handleCancelDelete = () => {
        setShowConfirmDelete(false);
    };

    return (
        <div className="stack" id="admin-accounts-page">
            <header className="inline" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Admin Accounts</h2>
                    <p className="helper">Create, review, or delete administrator access.</p>
                </div>
                <button id="add-admin-button" className="button" type="button" onClick={handleStartCreate}>
                    Add New Admin
                </button>
            </header>

            {banner?.type === 'success' && (
                <div id="success-message" className="alert success">
                    <span>{banner.message}</span>
                </div>
            )}

            {(banner?.type === 'error' || isAtLimit) && (
                <div id="error-message" className="alert error">
                    <span>{banner?.type === 'error' ? banner.message : 'Maximum 10 admin accounts'}</span>
                </div>
            )}

            <div className="card" style={{ padding: '1rem' }}>
                <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {accounts.map((account) => {
                        const isSelected = account.id === selectedAdminId;
                        return (
                            <li
                                key={account.id}
                                className={`admin-list-item${isSelected ? ' selected' : ''}`}
                                data-email={account.email}
                                data-primary={account.isPrimary ? 'true' : 'false'}
                                role="presentation"
                            >
                                <button
                                    type="button"
                                    className="button secondary"
                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                    onClick={() => handleSelectAdmin(account.id)}
                                    aria-pressed={isSelected}
                                >
                                    <span>
                                        <strong>{account.name}</strong>
                                        <span style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280' }}>{account.email}</span>
                                    </span>
                                    {account.isPrimary && <span className="badge neutral">Primary</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className="inline" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                    id="delete-admin-button"
                    className="button danger"
                    type="button"
                    onClick={handleDeleteAdmin}
                    disabled={!selectedAdmin}
                >
                    Delete Admin Account
                </button>
            </div>

            {isFormVisible && (
                <form className="stack card" style={{ padding: '1rem' }} onSubmit={handleCreateAdmin}>
                    <div className="form-field">
                        <label htmlFor="new-admin-username">Admin email</label>
                        <input
                            id="new-admin-username"
                            name="email"
                            type="email"
                            value={formValues.email}
                            onChange={handleInputChange}
                            placeholder="staff@example.com"
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label htmlFor="new-admin-password">Temporary password</label>
                        <input
                            id="new-admin-password"
                            name="password"
                            type="password"
                            value={formValues.password}
                            onChange={handleInputChange}
                            placeholder="TempPass123!"
                            required
                        />
                    </div>
                    <div className="inline" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button className="button secondary" type="button" onClick={() => setIsFormVisible(false)}>
                            Cancel
                        </button>
                        <button
                            id="create-admin-button"
                            className="button"
                            type="submit"
                            disabled={isAtLimit || !formValues.email.trim() || !formValues.password.trim()}
                        >
                            Create Admin Account
                        </button>
                    </div>
                </form>
            )}

            {showConfirmDelete && (
                <div id="confirm-delete-dialog" className="card" role="dialog" aria-modal="true">
                    <p>Are you sure you want to delete this admin account?</p>
                    <div className="inline" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button className="button secondary" type="button" onClick={handleCancelDelete}>
                            Cancel
                        </button>
                        <button id="confirm-delete-button" className="button danger" type="button" onClick={handleConfirmDelete}>
                            Confirm
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAccountsManager;
