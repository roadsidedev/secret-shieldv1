import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { logger } from '@roadsidelab/keyspot-core/logger';
import { requireAuth } from '../middleware/requireAuth.js';

const router: Router = Router();

const MIGRATION_SECRET = process.env.MIGRATION_SECRET;
if (!MIGRATION_SECRET) {
  console.warn('[Migration] MIGRATION_SECRET not set — migration routes will be disabled');
}

const importPassportSchema = z.object({
  passport: z.object({
    agentId: z.string(),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    agentRegistry: z.string(),
    configSnapshot: z.any(),
    vaultMapping: z.array(z.object({
      refKey: z.string(),
      provider: z.string(),
      metadata: z.any(),
    })),
    checkpoints: z.array(z.object({
      hash: z.string(),
      timestamp: z.number(),
      endpoint: z.string(),
    })),
    signature: z.string(),
  }),
  // SIWE fields accepted for forward-compat but NOT treated as proof of wallet control
  // until a real SIWE verifier is wired. Callers must use migration bearer secret.
  siweMessage: z.string().optional(),
  siweSignature: z.string().optional(),
});

const exportPassportSchema = z.object({
  agentId: z.string(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

// Migration-specific auth: checks for shared secret
async function migrationAuth(req: Request, res: Response, next: any): Promise<void> {
  if (!MIGRATION_SECRET) {
    res.status(503).json({ error: 'Migration not configured (MIGRATION_SECRET missing)' });
    return;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer migration ')) {
    res.status(401).json({ error: 'Migration authentication required (Bearer migration <token>)' });
    return;
  }
  const token = authHeader.replace('Bearer migration ', '');
  const a = Buffer.from(token);
  const b = Buffer.from(MIGRATION_SECRET);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Invalid migration token' });
    return;
  }
  next();
}

// Verify Ed25519 signature on passport data
function verifyPassportSignature(passport: any, signature: string, publicKeyHex: string): boolean {
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyHex, 'hex'),
      type: 'spki',
      format: 'der',
    });
    const verifier = crypto.createVerify('ed25519');
    verifier.update(JSON.stringify({
      agentId: passport.agentId,
      walletAddress: passport.walletAddress,
      agentRegistry: passport.agentRegistry,
      configSnapshot: passport.configSnapshot,
      vaultMapping: passport.vaultMapping,
      checkpoints: passport.checkpoints,
    }));
    return verifier.verify(publicKey, Buffer.from(signature, 'hex'));
  } catch {
    logger.warn('Migration signature verification failed (MIGRATION_SECRET is not an Ed25519 key — ERC-8004 not yet integrated)');
    return false;
  }
}

router.post('/import', requireAuth, migrationAuth, async (req: Request, res: Response) => {
  try {
    const parsed = importPassportSchema.parse(req.body);
    const { passport } = parsed;

    // Verify passport Ed25519 signature against the agent's public key
    // Public key is derived from the wallet address via ERC-8004 registry
    // For now, verify against the migration secret as a fallback
    if (!verifyPassportSignature(passport, passport.signature, MIGRATION_SECRET!)) {
      res.status(401).json({ error: 'Invalid passport signature' });
      return;
    }

    // Check agent doesn't already exist
    const existing = await prisma.agentIdentity.findUnique({
      where: { walletAddress: passport.walletAddress },
    });

    if (existing) {
      res.status(409).json({ error: 'Agent already exists' });
      return;
    }

    // Create agent identity
    const identity = await prisma.agentIdentity.create({
      data: {
        agentId: passport.agentId,
        agentRegistry: passport.agentRegistry,
        walletAddress: passport.walletAddress,
        configSnapshot: passport.configSnapshot,
        status: 'ACTIVE',
      },
    });

    res.json({
      success: true,
      agentId: identity.id,
      message: 'Agent imported successfully',
      vaultRebindRequired: passport.vaultMapping.map(v => ({
        refKey: v.refKey,
        provider: v.provider,
      })),
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    console.error('[Migration] Import error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/export', requireAuth, migrationAuth, async (req: Request, res: Response) => {
  try {
    if (!MIGRATION_SECRET) {
      res.status(503).json({ error: 'Migration not configured (MIGRATION_SECRET missing)' });
      return;
    }

    const { walletAddress } = exportPassportSchema.parse(req.body);

    // Find agent — export requires migration secret (above) to prevent cross-tenant IDOR.
    // When AgentIdentity gains userId ownership, also filter by req.user.id.
    const identity = await prisma.agentIdentity.findUnique({
      where: { walletAddress },
    });

    if (!identity) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Build passport (without raw secrets). Signature left empty until real Ed25519 key material.
    const passport = {
      agentId: identity.agentId,
      walletAddress: identity.walletAddress,
      agentRegistry: identity.agentRegistry,
      configSnapshot: identity.configSnapshot,
      vaultMapping: [] as unknown[],
      checkpoints: [] as unknown[],
      signature: '',
      exportedBy: req.user!.id,
      exportedAt: Date.now(),
    };

    res.json({ passport });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    console.error('[Migration] Export error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;