import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_LOG_PATHS = [
    process.env.PM2_LOG_PATH || './logs/out.log',
    process.env.PM2_ERROR_LOG_PATH || './logs/err.log',
    process.env.NGINX_ERROR_LOG_PATH || '/var/log/nginx/error.log'
];

type LogEntry = {
    timestamp: string;
    level: string;
    message: string;
    stackTrace: string | null;
    context: string | null;
    source: string;
};

type LogFilters = {
    level?: string | null;
    keyword?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    limit?: number;
    offset?: number;
};

const readLogFile = async (filePath: string) => {
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        return raw.split('\n').filter(Boolean).map((line) => ({ line, source: path.basename(filePath) }));
    } catch {
        return [] as Array<{ line: string; source: string }>;
    }
};

const parseLine = ({ line, source }: { line: string; source: string }): LogEntry => {
    const nginxMatch = /^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] .*? (.+)$/.exec(line);
    if (nginxMatch) {
        const [, rawTimestamp = '', rawLevel = 'info', rawMessage = ''] = nginxMatch;
        return {
            timestamp: new Date(rawTimestamp.replace(' ', 'T') + 'Z').toISOString(),
            level: rawLevel.toUpperCase(),
            message: rawMessage,
            stackTrace: null,
            context: source,
            source
        };
    }

    const isoMatch = /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+(\w+)\s+(.+)$/.exec(line);
    if (isoMatch) {
        const [, rawTimestamp = '', rawLevel = 'info', rawMessage = ''] = isoMatch;
        return {
            timestamp: new Date(rawTimestamp).toISOString(),
            level: rawLevel.toUpperCase(),
            message: rawMessage,
            stackTrace: null,
            context: source,
            source
        };
    }

    return {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: line,
        stackTrace: null,
        context: source,
        source
    };
};

const filterEntry = (entry: LogEntry, { level, keyword, startDate, endDate }: LogFilters) => {
    if (level && entry.level.toLowerCase() !== level.toLowerCase()) {
        return false;
    }
    if (keyword && !entry.message.toLowerCase().includes(keyword.toLowerCase())) {
        return false;
    }
    if (startDate) {
        const start = new Date(startDate).getTime();
        if (Number.isFinite(start) && new Date(entry.timestamp).getTime() < start) {
            return false;
        }
    }
    if (endDate) {
        const end = new Date(endDate).getTime();
        if (Number.isFinite(end) && new Date(entry.timestamp).getTime() > end) {
            return false;
        }
    }
    return true;
};

const getLogEntries = async (filters: LogFilters = {}) => {
    const sources = await Promise.all(DEFAULT_LOG_PATHS.map((logPath) => readLogFile(logPath)));
    const allLines = sources.flat();
    const parsed = allLines.map(parseLine);
    const filtered = parsed.filter((entry) => filterEntry(entry, filters));
    const sorted = filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;
    const paged = sorted.slice(offset, offset + limit);

    return {
        total: sorted.length,
        entries: paged
    };
};

const cleanupOldLogs = async (days = 90) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    let totalKept = 0;
    let totalRemoved = 0;

    await Promise.all(
        DEFAULT_LOG_PATHS.map(async (logPath) => {
            try {
                const raw = await fs.readFile(logPath, 'utf-8');
                const lines = raw.split('\n');
                const keptLines: string[] = [];
                lines.forEach((line) => {
                    if (!line.trim()) {
                        return;
                    }
                    const entry = parseLine({ line, source: path.basename(logPath) });
                    const timestamp = new Date(entry.timestamp).getTime();
                    if (!Number.isNaN(timestamp) && timestamp < cutoff.getTime()) {
                        totalRemoved += 1;
                        return;
                    }
                    keptLines.push(line);
                });
                totalKept += keptLines.length;
                await fs.writeFile(logPath, keptLines.join('\n'), 'utf-8');
            } catch {
                // Ignore cleanup failures for missing logs or restricted permissions.
            }
        })
    );

    return { kept: totalKept, removed: totalRemoved };
};

const exportCsv = (entries: LogEntry[]) => {
    const header = ['timestamp', 'level', 'message', 'stackTrace', 'context', 'source'];
    const rows = entries.map((entry) => [
        entry.timestamp,
        entry.level,
        entry.message.replace(/"/g, '""'),
        entry.stackTrace || '',
        entry.context || '',
        entry.source
    ]);

    return [header.join(','), ...rows.map((row) => row.map((value) => `"${value}"`).join(','))].join('\n');
};

const logService = {
    getLogEntries,
    exportCsv,
    cleanupOldLogs
};

export { getLogEntries, exportCsv, cleanupOldLogs };
export type { LogEntry, LogFilters };
export default logService;
