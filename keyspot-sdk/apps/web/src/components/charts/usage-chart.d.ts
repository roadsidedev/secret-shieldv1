interface UsageChartProps {
    data: Array<{
        bucket: string;
        requests: number;
        errors: number;
        avgLatency: number;
    }>;
    type?: 'line' | 'bar';
}
export declare function UsageChart({ data, type }: UsageChartProps): import("react").JSX.Element;
export declare function QuotaGauge({ current, max, label }: {
    current: number;
    max: number;
    label: string;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=usage-chart.d.ts.map