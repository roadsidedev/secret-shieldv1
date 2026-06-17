'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useMe, useQuotas, useCreateCheckout, usePortal } from '@/hooks/useApi';
import { Card, StatCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuotaGauge } from '@/components/charts/usage-chart';
import { CreditCard, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';

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

export default function BillingPage() {
  const { data: session, status } = useSession();
  if (status === 'unauthenticated') redirect('/login');

  const user = session?.user as any;
  const currentTier = user?.subscriptionTier || 'FREE';
  const { data: me } = useMe();
  const { data: quotas } = useQuotas();
  const checkout = useCreateCheckout();
  const portal = usePortal();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function handleUpgrade(tier: string) {
    setActionLoading(tier);
    try {
      const result = await checkout.mutateAsync(tier);
      if (result.url) window.location.href = result.url;
    } catch (err: any) {
      alert(err.message || 'Failed to start checkout');
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePortal() {
    setActionLoading('portal');
    try {
      const result = await portal.mutateAsync();
      if (result.url) window.location.href = result.url;
    } catch (err: any) {
      alert(err.message || 'Failed to open billing portal');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your subscription and usage</p>
        </div>
      </div>

      {/* Current Plan Info */}
      <Card className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[2px] text-zinc-500 mb-1">Current Plan</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">{currentTier}</span>
              <Badge variant={currentTier === 'FREE' ? 'default' : currentTier === 'PRO' ? 'success' : 'info'}>
                {currentTier}
              </Badge>
            </div>
            {me?.subscription?.currentPeriodEnd && (
              <p className="text-xs text-zinc-400 mt-1">
                Current period ends {new Date(me.subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          {currentTier !== 'FREE' && (
            <Button variant="secondary" onClick={handlePortal} loading={actionLoading === 'portal'}>
              <CreditCard className="w-4 h-4 mr-1" />
              Manage billing
            </Button>
          )}
        </div>
      </Card>

      {/* Quota usage */}
      {quotas && (
        <Card title="Monthly Usage" subtitle={`${currentTier} plan limits`} className="mb-8">
          <div className="space-y-4">
            <QuotaGauge current={quotas.requestsThisMonth} max={quotas.maxRequests} label="API Requests" />
            <QuotaGauge current={quotas.keyCount} max={quotas.maxKeys} label="Active API Keys" />
          </div>
        </Card>
      )}

      {/* Plans */}
      <h3 className="text-sm font-semibold mb-4">Available Plans</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentTier;
          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 ${
                isCurrent
                  ? 'border-zinc-950 dark:border-white ring-1 ring-zinc-950 dark:ring-white'
                  : 'border-zinc-200 dark:border-zinc-800'
              } bg-white dark:bg-zinc-900`}
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-zinc-500">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="secondary" className="w-full" disabled>
                  {currentTier === 'FREE' ? 'Free Plan' : 'Current Plan'}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade(plan.id)}
                  loading={actionLoading === plan.id}
                  disabled={plan.disabled}
                >
                  {plan.cta}
                  {!plan.disabled && <ExternalLink className="w-3 h-3 ml-1" />}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
