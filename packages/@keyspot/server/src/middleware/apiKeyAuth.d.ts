import { Request, Response, NextFunction } from 'express';
export declare function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
declare global {
    namespace Express {
        interface Request {
            apiKeyInfo?: {
                keyId: string;
                scopes: string[];
            };
        }
    }
}
//# sourceMappingURL=apiKeyAuth.d.ts.map