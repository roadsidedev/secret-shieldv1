export interface UsageMetric {
    bucket: string;
    requests: number;
    errors: number;
    avgLatency: number;
}
export interface UsageSummary {
    totalRequests: number;
    totalErrors: number;
    avgLatency: number;
    breakdowns: {
        byEndpoint: Record<string, number>;
        byStatusCode: Record<string, number>;
    };
    timeSeries: UsageMetric[];
}
export declare function getUsageMetrics(userId: string, period?: '24h' | '7d' | '30d' | '90d', groupBy?: 'hour' | 'day', apiKeyId?: string): Promise<UsageSummary>;
export declare function getUsageQuotas(userId: string): Promise<{
    keyCount: number;
    maxKeys: number;
    requestsThisMonth: number;
    maxRequests: number;
}>;
export declare function recordUsageEvent(data: {
    userId: string;
    apiKeyId?: string;
    endpoint: string;
    method: string;
    statusCode: number;
    latencyMs: number;
    metadata?: Record<string, unknown>;
}): Promise<void>;
//# sourceMappingURL=metrics.d.ts.map