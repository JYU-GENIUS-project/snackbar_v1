import express from 'express';
import { getLogEntries, exportCsv, cleanupOldLogs } from '../services/logService';

const router = express.Router();

const wrap = (handler: (req: express.Request, res: express.Response) => Promise<void>) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
        handler(req, res).catch(next);
    };

router.get('/', wrap(async (req, res) => {
    const { level, keyword, startDate, endDate, limit, offset } = req.query;
    const parsedLimit = limit ? Number(limit) : undefined;
    const parsedOffset = offset ? Number(offset) : undefined;
    const levelValue = typeof level === 'string' ? level : null;
    const keywordValue = typeof keyword === 'string' ? keyword : null;
    const startDateValue = typeof startDate === 'string' ? startDate : null;
    const endDateValue = typeof endDate === 'string' ? endDate : null;

    const filters = {
        level: levelValue,
        keyword: keywordValue,
        startDate: startDateValue,
        endDate: endDateValue,
        ...(Number.isFinite(parsedLimit) ? { limit: parsedLimit as number } : {}),
        ...(Number.isFinite(parsedOffset) ? { offset: parsedOffset as number } : {})
    };

    const result = await getLogEntries(filters);

    res.json({
        total: result.total,
        entries: result.entries
    });
}));

router.get('/export', wrap(async (req, res) => {
    const { level, keyword, startDate, endDate } = req.query;
    const levelValue = typeof level === 'string' ? level : null;
    const keywordValue = typeof keyword === 'string' ? keyword : null;
    const startDateValue = typeof startDate === 'string' ? startDate : null;
    const endDateValue = typeof endDate === 'string' ? endDate : null;

    const result = await getLogEntries({
        level: levelValue,
        keyword: keywordValue,
        startDate: startDateValue,
        endDate: endDateValue,
        limit: 5000,
        offset: 0
    });

    const csv = exportCsv(result.entries);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="error-logs.csv"');
    res.send(csv);
}));

router.post('/cleanup', wrap(async (_req, res) => {
    const result = await cleanupOldLogs(90);
    res.json({ success: true, ...result });
}));

export default router;
