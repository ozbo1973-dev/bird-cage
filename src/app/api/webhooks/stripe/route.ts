import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  activateSubscription,
  cancelSubscriptionByCustomerId,
  pauseSubscriptionByCustomerId,
  getUserIdByStripeCustomerId,
  setStripeSubscriptionId,
  resetMonthlyUsage,
  addExtraUsage,
  scheduleCancellation,
  reactivateSubscription,
} from "@/lib/dal/billing";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = (err as Error).message ?? "Invalid webhook signature";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error("Error handling Stripe event:", event.type, err);
    return NextResponse.json({ error: "Event handling failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) {
        console.warn("checkout.session.completed: no userId in metadata");
        break;
      }

      if (session.mode === "payment") {
        // One-time extra usage purchase
        const extraUsageCents = session.metadata?.extraUsageCents;
        if (extraUsageCents) {
          await addExtraUsage(userId, parseInt(extraUsageCents, 10));
        }
        break;
      }

      // Subscription checkout
      const stripeCustomerId = session.customer as string;
      const stripeSubscriptionId = session.subscription as string;

      if (stripeCustomerId && stripeSubscriptionId) {
        const sub = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
        await activateSubscription(userId, stripeCustomerId, stripeSubscriptionId, sub.current_period_end);
      }
      break;
    }

    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      // Find the user by Stripe customer ID
      const userId = await getUserIdByStripeCustomerId(customerId);
      if (!userId) {
        console.warn("customer.subscription.created: user not found for customer", customerId);
        break;
      }

      if (sub.status === "active" || sub.status === "trialing") {
        await setStripeSubscriptionId(userId, sub.id);
        await activateSubscription(userId, customerId, sub.id, sub.current_period_end);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await cancelSubscriptionByCustomerId(customerId);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      if (customerId) {
        await pauseSubscriptionByCustomerId(customerId);
      }
      break;
    }

    case "invoice.paid": {
      // Renewal: reset monthly usage for the user
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      if (customerId) {
        const userId = await getUserIdByStripeCustomerId(customerId);
        if (userId) {
          let currentPeriodEnd: number | undefined;
          const subscriptionId = invoice.subscription as string | null;
          if (subscriptionId) {
            const sub = await getStripe().subscriptions.retrieve(subscriptionId);
            currentPeriodEnd = sub.current_period_end;
          }
          await resetMonthlyUsage(userId, currentPeriodEnd);
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      const userId = await getUserIdByStripeCustomerId(customerId);
      if (!userId) {
        console.warn("customer.subscription.updated: user not found for customer", customerId);
        break;
      }

      if (sub.cancel_at_period_end) {
        await scheduleCancellation(customerId, sub.current_period_end);
      } else if (sub.status === "active") {
        await reactivateSubscription(customerId, sub.current_period_end);
      }
      break;
    }

    default:
      // Unhandled event type — not an error
      break;
  }
}
