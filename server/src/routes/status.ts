import { Router, type Request, type Response, type RequestHandler } from 'express';

import statusService from '../services/statusService';
import statusEvents from '../services/statusEvents';

const router = Router();

type KioskStatus = Record<string, unknown>;

type StatusEventClient = {
    res: Response;
};

const asyncHandler = (
    handler: (req: Request, res: Response) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res).catch(next);
    };
};

router.get(
    '/kiosk',
    asyncHandler(async (_req, res) => {
        const status = (await statusService.getKioskStatus({})) as KioskStatus;
        res.status(200).json({
            success: true,
            data: status
        });
    })
);

router.get('/events', (req, res, next) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
        }

        res.write(': connected\n\n');

        const clientId = statusEvents.registerClient({ res } as StatusEventClient) as string;

        const cleanup = () => statusEvents.removeClient(clientId);
        req.on('close', cleanup);
        req.on('end', cleanup);
    } catch (error) {
        next(error);
    }
});

export default router;
