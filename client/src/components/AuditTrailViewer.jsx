import { useMemo, useState } from 'react';

const parseDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
};

const AuditTrailViewer = ({ entries = [], onResetFilters }) => {
    const [adminFilter, setAdminFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [dateStartInput, setDateStartInput] = useState('');
    const [dateEndInput, setDateEndInput] = useState('');
    const [dateRange, setDateRange] = useState({ start: null, end: null });

    const administrators = useMemo(() => {
        const unique = new Set(entries.map((entry) => entry.admin).filter(Boolean));
        return Array.from(unique);
    }, [entries]);

    const actions = useMemo(() => {
        const unique = new Set(entries.map((entry) => entry.action).filter(Boolean));
        return Array.from(unique);
    }, [entries]);

    const filteredLogs = entries
        .slice()
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
        .filter((entry) => {
            if (adminFilter && entry.admin !== adminFilter) {
                return false;
            }
            if (actionFilter && entry.action !== actionFilter) {
                return false;
            }
            if (dateRange.start) {
                const entryDate = parseDate(entry.timestamp);
                if (entryDate && entryDate < dateRange.start) {
                    return false;
                }
            }
            if (dateRange.end) {
                const entryDate = parseDate(entry.timestamp);
                if (entryDate && entryDate > dateRange.end) {
                    return false;
                }
            }
            return true;
        });

    const applyDateFilters = () => {
        const start = dateStartInput ? parseDate(dateStartInput) : null;
        const endRaw = dateEndInput ? parseDate(`${dateEndInput}T23:59:59Z`) : null;
        setDateRange({ start, end: endRaw });
    };

    const handleResetFilters = () => {
        setAdminFilter('');
        setActionFilter('');
        setDateStartInput('');
        setDateEndInput('');
        setDateRange({ start: null, end: null });
        if (typeof onResetFilters === 'function') {
            onResetFilters();
        }
    };

    return (
        <div className="stack">
            <header className="inline" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2>Audit Trail</h2>
                    <p className="helper">Review recent administrator activity and system changes.</p>
                </div>
            </header>

            <section className="card" style={{ padding: '1rem' }}>
                <form className="inline" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                    <label className="stack" style={{ minWidth: '180px' }}>
                        <span className="helper">Admin</span>
                        <select
                            id="filter-admin-dropdown"
                            value={adminFilter}
                            onChange={(event) => setAdminFilter(event.target.value)}
                        >
                            <option value="">All admins</option>
                            {administrators.map((admin) => (
                                <option key={admin} value={admin}>
                                    {admin}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="stack" style={{ minWidth: '180px' }}>
                        <span className="helper">Action</span>
                        <select
                            id="filter-action-dropdown"
                            value={actionFilter}
                            onChange={(event) => setActionFilter(event.target.value)}
                        >
                            <option value="">All actions</option>
                            {actions.map((action) => (
                                <option key={action} value={action}>
                                    {action}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="stack" style={{ minWidth: '160px' }}>
                        <span className="helper">Start date</span>
                        <input
                            id="filter-date-start"
                            type="date"
                            value={dateStartInput}
                            onChange={(event) => setDateStartInput(event.target.value)}
                        />
                    </label>

                    <label className="stack" style={{ minWidth: '160px' }}>
                        <span className="helper">End date</span>
                        <input
                            id="filter-date-end"
                            type="date"
                            value={dateEndInput}
                            onChange={(event) => setDateEndInput(event.target.value)}
                        />
                    </label>

                    <div className="inline" style={{ alignItems: 'flex-end', gap: '0.75rem' }}>
                        <button
                            id="apply-filters-button"
                            className="button"
                            type="button"
                            onClick={applyDateFilters}
                        >
                            Apply filters
                        </button>
                        <button
                            className="button secondary"
                            type="button"
                            onClick={handleResetFilters}
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </section>

            <section className="card" style={{ padding: '1rem' }}>
                <table id="audit-trail-table" className="table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Admin</th>
                            <th>Action</th>
                            <th>Entity</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.map((log) => (
                            <tr
                                key={log.id}
                                className="audit-log-entry"
                                tabIndex={0}
                                data-admin={log.admin || 'unknown-admin'}
                                data-action={log.action || 'event'}
                                data-timestamp={new Date(log.timestamp).toISOString()}
                                data-entity={log.entity || 'unknown-entity'}
                                data-details={log.details || ''}
                            >
                                <td>
                                    <span className="audit-timestamp">{new Date(log.timestamp).toISOString()}</span>
                                </td>
                                <td>
                                    <span className="audit-admin">{log.admin || 'admin@example.com'}</span>
                                </td>
                                <td>
                                    <span className="audit-action">{log.action}</span>
                                </td>
                                <td>
                                    <span className="audit-entity">{log.entity}</span>
                                </td>
                                <td>
                                    <span className="audit-details">{log.details}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredLogs.length === 0 && (
                    <p className="helper">No audit entries match the selected filters.</p>
                )}
            </section>
        </div>
    );
};

export default AuditTrailViewer;
