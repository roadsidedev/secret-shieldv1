'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UsagePage;
const react_1 = require("react");
const react_2 = require("next-auth/react");
const navigation_1 = require("next/navigation");
const useApi_1 = require("@/hooks/useApi");
const card_1 = require("@/components/ui/card");
const usage_chart_1 = require("@/components/charts/usage-chart");
const button_1 = require("@/components/ui/button");
const periods = [
    { value: '24h', label: '24 hours' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
];
function UsagePage() {
    const { status } = (0, react_2.useSession)();
    if (status === 'unauthenticated')
        (0, navigation_1.redirect)('/login');
    const [period, setPeriod] = (0, react_1.useState)('7d');
    const { data: usage, isLoading } = (0, useApi_1.useUsage)(period);
    const { data: breakdown } = (0, useApi_1.useBreakdown)(period);
    return (<div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usage Metrics</h1>
          <p className="text-sm text-zinc-500 mt-1">Detailed API usage analytics</p>
        </div>
        <div className="flex gap-1">
          {periods.map((p) => (<button_1.Button key={p.value} variant={period === p.value ? 'primary' : 'secondary'} size="sm" onClick={() => setPeriod(p.value)}>
              {p.label}
            </button_1.Button>))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <card_1.StatCard label="Total Requests" value={isLoading ? '...' : (usage?.totalRequests ?? 0).toLocaleString()}/>
        <card_1.StatCard label="Total Errors" value={isLoading ? '...' : (usage?.totalErrors ?? 0).toLocaleString()} trend={usage?.totalErrors && usage.totalErrors > 0 ? { value: `${((usage.totalErrors / (usage.totalRequests || 1)) * 100).toFixed(1)}% error rate`, positive: false } : undefined}/>
        <card_1.StatCard label="Average Latency" value={isLoading ? '...' : `${Math.round(usage?.avgLatency ?? 0)}ms`}/>
      </div>

      {/* Time series */}
      <card_1.Card title="Request Volume" subtitle="Over time" className="mb-8">
        <usage_chart_1.UsageChart data={usage?.timeSeries ?? []} type="bar"/>
      </card_1.Card>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <card_1.Card title="By Endpoint">
          {breakdown?.byEndpoint ? (<div className="space-y-2 max-h-80 overflow-y-auto">
              {Object.entries(breakdown.byEndpoint).map(([endpoint, count]) => (<div key={endpoint} className="flex items-center justify-between text-sm py-1">
                  <span className="font-mono text-xs truncate">{endpoint}</span>
                  <span className="text-zinc-500 tabular-nums ml-4">{count.toLocaleString()}</span>
                </div>))}
            </div>) : (<p className="text-sm text-zinc-400 py-4">No data for this period</p>)}
        </card_1.Card>

        <card_1.Card title="By Status Code">
          {breakdown?.byStatusCode ? (<div className="space-y-3">
              {[200, 201, 400, 401, 402, 403, 404, 429, 500].map((code) => {
                const count = breakdown.byStatusCode[String(code)] || 0;
                const total = Object.values(breakdown.byStatusCode).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (<div key={code}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono">{code}</span>
                      <span className="text-zinc-500">{count.toLocaleString()} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className={`h-full rounded-full ${code >= 500 ? 'bg-red-500' : code >= 400 ? 'bg-amber-500' : 'bg-zinc-950 dark:bg-white'}`} style={{ width: `${pct}%` }}/>
                    </div>
                  </div>);
            })}
            </div>) : (<p className="text-sm text-zinc-400 py-4">No data for this period</p>)}
        </card_1.Card>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map