import { Request, Response, NextFunction } from 'express';

/**
 * Enforce API key scopes when the request was authenticated via API key.
 * JWT user sessions are treated as full access (scopes not applicable).
 *
 * Attach scopes on req via api key auth path: req.apiKeyScopes
 */
declare global {
  namespace Express {
    interface Request {
      apiKeyScopes?: string[];
    }
  }
}

export function requireScope(...needed: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Cookie/JWT sessions: full access
    if (!req.apiKeyScopes) {
      next();
      return;
    }
    const have = new Set(req.apiKeyScopes);
    const missing = needed.filter((s) => !have.has(s) && !have.has('*'));
    if (missing.length > 0) {
      res.status(403).json({
        error: 'Insufficient API key scope',
        required: needed,
        missing,
      });
      return;
    }
    next();
  };
}
