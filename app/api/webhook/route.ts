import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

/**
 * Stripe webhook handler.
 *
 * Listens for checkout.session.completed and subscription events.
 * Sets a `jobpilot_tier` cookie in the success redirect so the
 * rate limiter picks up the user's paid tier automatically.
 *
 * For production: replace cookie-based tier detection with a
 * proper user database lookup (e.g., check subscription status
 * in Stripe by customer email).
 */
export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Webhook signature verification failed:', message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tier = session.metadata?.tier || 'pro';
        const customerEmail = session.customer_details?.email;

        console.log(`✅ Checkout completed: ${customerEmail} → ${tier} tier`);

        // In production, save this to your database:
        // await db.users.update({ email: customerEmail, tier, stripeCustomerId: session.customer })
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status;

        console.log(`📋 Subscription updated: ${subscription.id} → ${status}`);

        // Handle downgrades, cancellations, payment failures
        if (status === 'canceled' || status === 'unpaid') {
          // Revert to free tier
          // await db.users.update({ stripeSubscriptionId: subscription.id, tier: 'free' })
          console.log(`⬇️ Subscription ${subscription.id} reverted to free tier`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`❌ Subscription canceled: ${subscription.id} → free tier`);
        // await db.users.update({ stripeSubscriptionId: subscription.id, tier: 'free' })
        break;
      }

      default:
        // Ignore other event types
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
