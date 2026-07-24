import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { prisma } from '../utils/prisma.js';

const jwtSecretRaw = process.env.JWT_SECRET;
if (!jwtSecretRaw) throw new Error('JWT_SECRET environment variable is required');
const JWT_SECRET = new TextEncoder().encode(jwtSecretRaw);

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
  subscriptionStatus: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ks_')) {
      await handleApiKeyAuth(req, res, authHeader, next);
      return;
    }

    const token = extractJwt(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Reject refresh tokens — they must only be used on /auth/refresh
    if (payload.type === 'refresh') {
      res.status(401).json({ error: 'Refresh token cannot be used as access token' });
      return;
    }
    if (payload.type !== undefined && payload.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    const user = await loadUser(payload.sub!);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function handleApiKeyAuth(req: Request, res: Response, authHeader: string, next: NextFunction): Promise<void> {
  const { validateKey } = await import('../services/apiKey.js');
  const result = await validateKey(authHeader.replace('Bearer ', ''));

  if (!result.valid) {
    res.status(401).json({ error: 'Invalid API key', requestId: req.requestId });
    return;
  }

  if (!result.userId) {
    res.status(401).json({ error: 'API key belongs to a revoked user', requestId: req.requestId });
    return;
  }

  const user = await loadUser(result.userId);
  if (!user) {
    res.status(401).json({ error: 'User not found', requestId: req.requestId });
    return;
  }

  req.user = user;
  req.apiKeyScopes = result.scopes ?? [];
  next();
}

function extractJwt(req: Request): string | null {
  const cookie = req.headers.cookie?.split(';').find((c) => c.trim().startsWith('keyspot_token='));
  if (cookie) return cookie.split('=')[1]?.trim() ?? null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const parts = authHeader.split(' ');
    if (parts.length === 2) return parts[1] ?? null;
  }

  return null;
}

async function loadUser(sub: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: sub },
    include: { subscription: true },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    subscriptionTier: user.subscription?.tier || 'FREE',
    subscriptionStatus: user.subscription?.status || 'INACTIVE',
  };
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractJwt(req);
    if (token) {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const user = await loadUser(payload.sub!);
      if (user) req.user = user;
    }
  } catch {
    // Not authenticated — that's ok
  }
  next();
}
