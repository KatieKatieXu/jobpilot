import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const { tier } = await req.json();

    if (!tier || !['pro', 'premium'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const priceId =
      tier === 'pro'
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_PREMIUM_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for ${tier} tier` },
        { status: 500 }
      );
    }

    // Get the origin for redirect URLs
    const origin = req.headers.get('origin') || 'https://jobpilot.katexu.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // After successful payment, redirect here with the session ID
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings?canceled=true`,
      // Store the tier in metadata so the webhook knows what to activate
      metadata: {
        tier,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Checkout error:', message);
    return NextResponse.json(
      { error: 'Failed to create checkout session: ' + message },
      { status: 500 }
    );
  }
}
