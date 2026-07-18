import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireScope } from '../middleware/requireScope.js';
import { createKey, listKeys, revokeKey } from '../services/apiKey.js';
import { getUsageMetrics } from '../services/metrics.js';

const router: Router = Router();

const ALLOWED_SCOPES = [
  'read:secrets',
  'write:vault',
  'read:keys',
  'write:keys',
  'read:billing',
  'write:billing',
  'read:metrics',
] as const;

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(ALLOWED_SCOPES)).optional(),
  expiresAt: z.string().datetime().optional(),
});

router.post('/', requireAuth, requireScope('write:keys'), async (req: Request, res: Response) => {
  try {
    const { name, scopes, expiresAt } = createKeySchema.parse(req.body);
    const result = await createKey({
      userId: req.user!.id,
      name,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    res.status(201).json(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (err.message?.includes('Max API keys')) {
      res.status(403).json({ error: err.message });
      return;
    }
    console.error('[API Keys] Create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', requireAuth, requireScope('read:keys'), async (req: Request, res: Response) => {
  try {
    const keys = await listKeys(req.user!.id);
    res.json(keys);
  } catch (err) {
    console.error('[API Keys] List error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, requireScope('write:keys'), async (req: Request, res: Response) => {
  try {
    await revokeKey(req.params.id!, req.user!.id);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message?.includes('not found')) {
      res.status(404).json({ error: err.message });
      return;
    }
    console.error('[API Keys] Revoke error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '7d';
    const groupBy = (req.query.groupBy as string) || 'day';
    const metrics = await getUsageMetrics(
      req.user!.id,
      period as any,
      groupBy as any,
      req.params.id
    );
    res.json(metrics);
  } catch (err) {
    console.error('[API Keys] Usage error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
