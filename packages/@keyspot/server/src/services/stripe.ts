import Stripe from 'stripe';
import { prisma } from '../utils/prisma.js';
import { Tier, SubscriptionStatus } from '@prisma/client';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-02-24-acacia' as any });
  }
  return stripe;
}

/** Build tier map only from non-empty price IDs — never map '' → ENTERPRISE. */
function buildTierMap(): Record<string, Tier> {
  const map: Record<string, Tier> = {};
  const free = process.env.STRIPE_PRICE_FREE;
  const pro = process.env.STRIPE_PRICE_PRO;
  const enterprise = process.env.STRIPE_PRICE_ENTERPRISE;
  if (free) map[free] = Tier.FREE;
  if (pro) map[pro] = Tier.PRO;
  if (enterprise) map[enterprise] = Tier.ENTERPRISE;
  return map;
}

const TIER_MAP = buildTierMap();

const TIER_TO_PRICE: Record<Tier, string> = {
  [Tier.FREE]: process.env.STRIPE_PRICE_FREE || '',
  [Tier.PRO]: process.env.STRIPE_PRICE_PRO || '',
  [Tier.ENTERPRISE]: process.env.STRIPE_PRICE_ENTERPRISE || '',
};

export function getTierFromPriceId(priceId: string): Tier {
  if (!priceId) {
    return Tier.FREE;
  }
  const tier = TIER_MAP[priceId];
  if (!tier) {
    console.warn(`[Stripe] Unknown price ID ${priceId} — defaulting to FREE (not ENTERPRISE)`);
    return Tier.FREE;
  }
  return tier;
}

export function getPriceIdFromTier(tier: Tier): string | undefined {
  const id = TIER_TO_PRICE[tier];
  return id || undefined;
}

export async function createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
  const s = getStripe();
  const customer = await s.customers.create({ email, name });
  return customer;
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const s = getStripe();
  const session = await s.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return session;
}

export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const s = getStripe();
  return s.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const s = getStripe();
  return s.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

export async function resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const s = getStripe();
  return s.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
}

export async function syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void> {
  const customerId = stripeSubscription.customer as string;
  const priceId = stripeSubscription.items.data[0]?.price.id;
  if (!priceId) {
    console.warn(`[Stripe] Subscription ${stripeSubscription.id} has no price — skipping tier upgrade`);
    return;
  }
  const tier = getTierFromPriceId(priceId);

  const statusMap: Record<string, SubscriptionStatus> = {
    incomplete: SubscriptionStatus.INCOMPLETE,
    incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
    trialing: SubscriptionStatus.TRIALING,
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELED,
    unpaid: SubscriptionStatus.UNPAID,
  };

  const status = statusMap[stripeSubscription.status] || SubscriptionStatus.INCOMPLETE;

  const user = await prisma.user.findFirst({
    where: { subscription: { stripeCustomerId: customerId } },
  });

  if (!user) {
    console.warn(`[Stripe] No user found for customer ${customerId}`);
    return;
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      status,
      tier,
    },
    update: {
      stripeSubscriptionId: stripeSubscription.id,
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      status,
      tier,
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    },
  });
}

export async function ensureFreeSubscription(userId: string, email: string): Promise<void> {
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  if (existing) return;

  let customerId: string;
  try {
    const customer = await createCustomer(email);
    customerId = customer.id;
  } catch {
    customerId = `free_${userId}`;
  }

  await prisma.subscription.create({
    data: {
      userId,
      stripeCustomerId: customerId,
      stripePriceId: '',
      stripeCurrentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: SubscriptionStatus.ACTIVE,
      tier: Tier.FREE,
    },
  });
}

export function constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
  const s = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required when processing Stripe webhooks');
  }
  return s.webhooks.constructEvent(payload, signature, secret);
}
