'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
const react_1 = require("next-auth/react");
const navigation_1 = require("next/navigation");
const useApi_1 = require("@/hooks/useApi");
const card_1 = require("@/components/ui/card");
const badge_1 = require("@/components/ui/badge");
const usage_chart_1 = require("@/components/charts/usage-chart");
const lucide_react_1 = require("lucide-react");
function DashboardPage() {
    const { data: session, status } = (0, react_1.useSession)();
    const user = session?.user;
    if (status === 'unauthenticated')
        (0, navigation_1.redirect)('/login');
    const { data: usage, isLoading: usageLoading } = (0, useApi_1.useUsage)('7d');
    const { data: quotas, isLoading: quotasLoading } = (0, useApi_1.useQuotas)();
    const tierColor = (tier) => {
        switch (tier) {
            case 'PRO': return 'success';
            case 'ENTERPRISE': return 'info';
            default: return 'default';
        }
    };
    return (<div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        {user?.subscriptionTier && (<badge_1.Badge variant={tierColor(user.subscriptionTier)}>
            {user.subscriptionTier}
          </badge_1.Badge>)}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <card_1.StatCard label="Total Requests" value={usageLoading ? '...' : (usage?.totalRequests ?? 0).toLocaleString()} sublabel={usageLoading ? 'Loading...' : 'Current period'}/>
        <card_1.StatCard label="Errors" value={usageLoading ? '...' : (usage?.totalErrors ?? 0).toLocaleString()} sublabel={usageLoading ? 'Loading...' : usage?.totalRequests ? `${((usage.totalErrors / usage.totalRequests) * 100).toFixed(1)}% error rate` : 'No errors'} trend={usage?.totalErrors && usage.totalErrors > 0 ? { value: `${usage.totalErrors} errors`, positive: false } : undefined}/>
        <card_1.StatCard label="Avg Latency" value={usageLoading ? '...' : `${Math.round(usage?.avgLatency ?? 0)}ms`} sublabel="Across all endpoints"/>
        <card_1.StatCard label="API Keys" value={quotasLoading ? '...' : `${quotas?.keyCount ?? 0}`} sublabel={quotasLoading ? 'Loading...' : `of ${quotas?.maxKeys ?? 0} max`}/>
      </div>

      {/* Quotas */}
      <card_1.Card title="Resource Usage" subtitle="Monthly quota consumption" className="mb-8">
        <div className="space-y-4">
          <usage_chart_1.QuotaGauge current={quotas?.requestsThisMonth ?? 0} max={quotas?.maxRequests ?? 10000} label="API Requests"/>
          <usage_chart_1.QuotaGauge current={quotas?.keyCount ?? 0} max={quotas?.maxKeys ?? 3} label="Active API Keys"/>
        </div>
      </card_1.Card>

      {/* Usage Chart */}
      <card_1.Card title="Request Volume" subtitle="Last 7 days" action={<div className="flex items-center gap-2 text-xs text-zinc-400">
            <lucide_react_1.Activity className="w-3 h-3"/>
            <span>Requests / Latency</span>
          </div>}>
        <usage_chart_1.UsageChart data={usage?.timeSeries ?? []}/>
      </card_1.Card>

      {/* Endpoint breakdown */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <card_1.Card title="Top Endpoints" subtitle="By request count">
          {usage?.breakdowns?.byEndpoint ? (<div className="space-y-2">
              {Object.entries(usage.breakdowns.byEndpoint)
                .slice(0, 10)
                .map(([endpoint, count]) => (<div key={endpoint} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs truncate">{endpoint}</span>
                    <span className="text-zinc-500 tabular-nums">{count.toLocaleString()}</span>
                  </div>))}
            </div>) : (<p className="text-sm text-zinc-400">No data yet</p>)}
        </card_1.Card>

        <card_1.Card title="Status Codes" subtitle="Response distribution">
          {usage?.breakdowns?.byStatusCode ? (<div className="space-y-2">
              {Object.entries(usage.breakdowns.byStatusCode).map(([code, count]) => (<div key={code} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">{code}</span>
                  <span className="text-zinc-500 tabular-nums">{count.toLocaleString()}</span>
                </div>))}
            </div>) : (<p className="text-sm text-zinc-400">No data yet</p>)}
        </card_1.Card>
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map