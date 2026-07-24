import Stripe from 'stripe';
import { Tier } from '@prisma/client';
export declare function getTierFromPriceId(priceId: string): Tier;
export declare function getPriceIdFromTier(tier: Tier): string | undefined;
export declare function createCustomer(email: string, name?: string): Promise<Stripe.Customer>;
export declare function createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string): Promise<Stripe.Checkout.Session>;
export declare function createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session>;
export declare function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
export declare function resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
export declare function syncSubscriptionFromStripe(stripeSubscription: Stripe.Subscription): Promise<void>;
export declare function ensureFreeSubscription(userId: string, email: string): Promise<void>;
export declare function constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event;
//# sourceMappingURL=stripe.d.ts.map