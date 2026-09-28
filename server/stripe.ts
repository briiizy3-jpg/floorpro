import Stripe from "stripe";

// Stripe SDK — initialized with webhook secret for signature verification only.
// No API key needed in the backend: checkout is handled via Stripe Payment Links,
// and webhooks are verified using the webhook signing secret.
export const stripe = new Stripe("sk_test_placeholder", {
  apiVersion: "2025-08-27.basil" as any,
  typescript: true,
});

// Stripe webhook signing secret (for verifying incoming webhook events)
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

export function isStripeConfigured(): boolean {
  return !!STRIPE_WEBHOOK_SECRET;
}
