import { Request, Response, NextFunction } from 'express';
export interface Counter {
    inc(labels?: Record<string, string>): void;
}
export interface Histogram {
    observe(value: number, labels?: Record<string, string>): void;
}
export declare class MetricsRegistry {
    private counters;
    private histograms;
    counter(name: string, help: string, labels?: string[]): Counter;
    histogram(name: string, help: string, labels?: string[]): Histogram;
    export(): string;
}
export declare const metrics: {
    checkpointTotal: Counter;
    checkpointDuration: Histogram;
    scanTotal: Counter;
    secretsFound: Counter;
    vaultWrites: Counter;
    promptValidationTotal: Counter;
    httpRequestDuration: Histogram;
};
/** Middleware: record HTTP request duration. */
export declare function metricsMiddleware(req: Request, res: Response, next: NextFunction): void;
/** Handler: export Prometheus-format metrics. */
export declare function metricsHandler(_req: Request, res: Response): void;
//# sourceMappingURL=metrics.d.ts.map