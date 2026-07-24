'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BillingPage;
const react_1 = require("next-auth/react");
const navigation_1 = require("next/navigation");
const useApi_1 = require("@/hooks/useApi");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const badge_1 = require("@/components/ui/badge");
const usage_chart_1 = require("@/components/charts/usage-chart");
const lucide_react_1 = require("lucide-react");
const react_2 = require("react");
const plans = [
    {
        id: 'FREE',
        name: 'Free',
        price: '$0',
        period: '/month',
        features: ['3 API keys', '10,000 requests/month', '100 secrets vaulted', 'Community support'],
        cta: 'Current plan',
        disabled: true,
    },
    {
        id: 'PRO',
        name: 'Pro',
        price: '$20',
        period: '/month',
        features: ['25 API keys', '1M requests/month', '10K secrets vaulted', 'Email support', '99.9% uptime SLA'],
        cta: 'Upgrade to Pro',
        disabled: false,
    },
    {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        price: '$99',
        period: '/month',
        features: ['100 API keys', '10M requests/month', '100K secrets vaulted', 'Priority support', '99.99% uptime SLA', 'Custom integrations', 'SSO'],
        cta: 'Contact sales',
        disabled: false,
    },
];
function BillingPage() {
    const { data: session, status } = (0, react_1.useSession)();
    if (status === 'unauthenticated')
        (0, navigation_1.redirect)('/login');
    const user = session?.user;
    const currentTier = user?.subscriptionTier || 'FREE';
    const { data: me } = (0, useApi_1.useMe)();
    const { data: quotas } = (0, useApi_1.useQuotas)();
    const checkout = (0, useApi_1.useCreateCheckout)();
    const portal = (0, useApi_1.usePortal)();
    const [actionLoading, setActionLoading] = (0, react_2.useState)(null);
    async function handleUpgrade(tier) {
        setActionLoading(tier);
        try {
            const result = await checkout.mutateAsync(tier);
            if (result.url)
                window.location.href = result.url;
        }
        catch (err) {
            alert(err.message || 'Failed to start checkout');
        }
        finally {
            setActionLoading(null);
        }
    }
    async function handlePortal() {
        setActionLoading('portal');
        try {
            const result = await portal.mutateAsync();
            if (result.url)
                window.location.href = result.url;
        }
        catch (err) {
            alert(err.message || 'Failed to open billing portal');
        }
        finally {
            setActionLoading(null);
        }
    }
    return (<div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your subscription and usage</p>
        </div>
      </div>

      {/* Current Plan Info */}
      <card_1.Card className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[2px] text-zinc-500 mb-1">Current Plan</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">{currentTier}</span>
              <badge_1.Badge variant={currentTier === 'FREE' ? 'default' : currentTier === 'PRO' ? 'success' : 'info'}>
                {currentTier}
              </badge_1.Badge>
            </div>
            {me?.subscription?.currentPeriodEnd && (<p className="text-xs text-zinc-400 mt-1">
                Current period ends {new Date(me.subscription.currentPeriodEnd).toLocaleDateString()}
              </p>)}
          </div>
          {currentTier !== 'FREE' && (<button_1.Button variant="secondary" onClick={handlePortal} loading={actionLoading === 'portal'}>
              <lucide_react_1.CreditCard className="w-4 h-4 mr-1"/>
              Manage billing
            </button_1.Button>)}
        </div>
      </card_1.Card>

      {/* Quota usage */}
      {quotas && (<card_1.Card title="Monthly Usage" subtitle={`${currentTier} plan limits`} className="mb-8">
          <div className="space-y-4">
            <usage_chart_1.QuotaGauge current={quotas.requestsThisMonth} max={quotas.maxRequests} label="API Requests"/>
            <usage_chart_1.QuotaGauge current={quotas.keyCount} max={quotas.maxKeys} label="Active API Keys"/>
          </div>
        </card_1.Card>)}

      {/* Plans */}
      <h3 className="text-sm font-semibold mb-4">Available Plans</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
            const isCurrent = plan.id === currentTier;
            return (<div key={plan.id} className={`rounded-xl border p-6 ${isCurrent
                    ? 'border-zinc-950 dark:border-white ring-1 ring-zinc-950 dark:ring-white'
                    : 'border-zinc-200 dark:border-zinc-800'} bg-white dark:bg-zinc-900`}>
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-zinc-500">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (<li key={f} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <lucide_react_1.Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"/>
                    {f}
                  </li>))}
              </ul>

              {isCurrent ? (<button_1.Button variant="secondary" className="w-full" disabled>
                  {currentTier === 'FREE' ? 'Free Plan' : 'Current Plan'}
                </button_1.Button>) : (<button_1.Button className="w-full" onClick={() => handleUpgrade(plan.id)} loading={actionLoading === plan.id} disabled={plan.disabled}>
                  {plan.cta}
                  {!plan.disabled && <lucide_react_1.ExternalLink className="w-3 h-3 ml-1"/>}
                </button_1.Button>)}
            </div>);
        })}
      </div>
    </div>);
}
//# sourceMappingURL=page.js.map