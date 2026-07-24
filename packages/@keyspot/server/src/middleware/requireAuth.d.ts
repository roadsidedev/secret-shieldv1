import { Request, Response, NextFunction } from 'express';
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
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=requireAuth.d.ts.map