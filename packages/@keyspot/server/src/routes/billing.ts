import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireScope } from '../middleware/requireScope.js';
import { prisma } from '../utils/prisma.js';
import { createCheckoutSession, createPortalSession, getPriceIdFromTier } from '../services/stripe.js';
import { Tier } from '@prisma/client';

const router: Router = Router();

/** Resolve allowed app origin — never trust arbitrary Origin headers. */
function resolveAppOrigin(req: Request): string | null {
  const allowed = (process.env.CORS_ORIGIN || process.env.APP_URL || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) return origin;
  // Prefer first configured origin over attacker-controlled header
  return allowed[0] || null;
}

router.post('/create-checkout', requireAuth, requireScope('write:billing'), async (req: Request, res: Response) => {
  try {
    const { tier } = req.body;
    if (!tier || !['PRO', 'ENTERPRISE'].includes(tier)) {
      res.status(400).json({ error: 'Invalid tier. Must be PRO or ENTERPRISE' });
      return;
    }

    const priceId = getPriceIdFromTier(tier as Tier);
    if (!priceId) {
      res.status(400).json({ error: `No price configured for tier: ${tier}` });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { subscription: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      res.status(400).json({ error: 'No Stripe customer found. Contact support.' });
      return;
    }

    const origin = resolveAppOrigin(req);
    if (!origin) {
      res.status(500).json({ error: 'APP_URL / CORS_ORIGIN not configured' });
      return;
    }
    const session = await createCheckoutSession(
      customerId,
      priceId,
      `${origin}/dashboard/billing?success=true`,
      `${origin}/dashboard/billing?canceled=true`
    );

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Billing] Checkout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/portal', requireAuth, requireScope('read:billing'), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { subscription: true },
    });

    if (!user?.subscription?.stripeCustomerId) {
      res.status(400).json({ error: 'No subscription found' });
      return;
    }

    const origin = resolveAppOrigin(req);
    if (!origin) {
      res.status(500).json({ error: 'APP_URL / CORS_ORIGIN not configured' });
      return;
    }
    const session = await createPortalSession(
      user.subscription.stripeCustomerId,
      `${origin}/dashboard/billing`
    );

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Billing] Portal error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
